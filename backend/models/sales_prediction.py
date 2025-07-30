# models/sales_prediction.py - Modelo de Predicción de Ventas
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.seasonal import seasonal_decompose
import joblib
import warnings
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

from database.connection import db
from database.models import Sale, Product, Prediction

warnings.filterwarnings('ignore')

class SalesPredictor:
    """Modelo de predicción de ventas usando ARIMA y Random Forest"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.arima_order = self.config.get('arima_order', (1, 1, 1))
        self.seasonal_periods = self.config.get('seasonal_periods', 7)
        self.forecast_days = self.config.get('forecast_days', 30)
        self.confidence_interval = self.config.get('confidence_interval', 0.95)
        
        self.arima_model = None
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=10
        )
        self.scaler = StandardScaler()
        
        self.is_trained = False
        self.logger = logging.getLogger(__name__)
    
    def prepare_time_series_data(self, start_date: Optional[datetime] = None,
                               end_date: Optional[datetime] = None) -> pd.DataFrame:
        """Preparar datos de series temporales para ARIMA"""
        try:
            # Query para obtener ventas diarias
            query = db.session.query(
                Sale.sale_date,
                db.func.count(Sale.id).label('daily_sales'),
                db.func.sum(Sale.total_price).label('daily_revenue'),
                db.func.sum(Sale.quantity).label('daily_quantity')
            )
            
            if start_date:
                query = query.filter(Sale.sale_date >= start_date)
            if end_date:
                query = query.filter(Sale.sale_date <= end_date)
            
            query = query.group_by(Sale.sale_date).order_by(Sale.sale_date)
            
            # Convertir a DataFrame
            data = pd.read_sql(query.statement, db.session.bind)
            
            if data.empty:
                raise ValueError("No hay datos de ventas disponibles")
            
            # Convertir fecha a datetime y establecer como índice
            data['sale_date'] = pd.to_datetime(data['sale_date'])
            data = data.set_index('sale_date')
            
            # Completar fechas faltantes con 0
            date_range = pd.date_range(
                start=data.index.min(),
                end=data.index.max(),
                freq='D'
            )
            data = data.reindex(date_range, fill_value=0)
            
            self.logger.info(f"Datos de series temporales preparados: {len(data)} días")
            return data
            
        except Exception as e:
            self.logger.error(f"Error preparando datos de series temporales: {e}")
            raise
    
    def prepare_feature_data(self) -> pd.DataFrame:
        """Preparar datos con características para Random Forest"""
        try:
            # Query con joins para obtener características
            query = db.session.query(
                Sale.sale_date,
                Sale.quantity,
                Sale.total_price,
                Sale.cluster_id,
                Product.category,
                Product.brand,
                Product.price
            ).join(Product).filter(
                Sale.sale_date >= datetime.now() - timedelta(days=365)
            )
            
            data = pd.read_sql(query.statement, db.session.bind)
            
            if data.empty:
                raise ValueError("No hay datos disponibles para características")
            
            # Convertir fecha a datetime
            data['sale_date'] = pd.to_datetime(data['sale_date'])
            
            # Crear características temporales
            data['day_of_week'] = data['sale_date'].dt.dayofweek
            data['day_of_month'] = data['sale_date'].dt.day
            data['month'] = data['sale_date'].dt.month
            data['quarter'] = data['sale_date'].dt.quarter
            data['is_weekend'] = data['day_of_week'].isin([5, 6]).astype(int)
            
            # Encoding categórico
            data = pd.get_dummies(data, columns=['category', 'brand'], prefix=['cat', 'brand'])
            
            # Características de lag (ventas de días anteriores)
            daily_sales = data.groupby('sale_date')['quantity'].sum().reset_index()
            daily_sales['sales_lag_1'] = daily_sales['quantity'].shift(1)
            daily_sales['sales_lag_7'] = daily_sales['quantity'].shift(7)
            daily_sales['sales_rolling_7'] = daily_sales['quantity'].rolling(7).mean()
            
            # Merge con datos principales
            data = data.merge(daily_sales[['sale_date', 'sales_lag_1', 'sales_lag_7', 'sales_rolling_7']], 
                            on='sale_date', how='left')
            
            self.logger.info(f"Datos de características preparados: {len(data)} registros")
            return data
            
        except Exception as e:
            self.logger.error(f"Error preparando datos de características: {e}")
            raise
    
    def train_arima_model(self, data: pd.DataFrame, target_column: str = 'daily_sales') -> Dict:
        """Entrenar modelo ARIMA para predicción de series temporales"""
        try:
            series = data[target_column]
            
            # Verificar estacionariedad básica
            if series.std() == 0:
                raise ValueError("Serie temporal constante, no se puede entrenar ARIMA")
            
            # Entrenar modelo ARIMA
            self.arima_model = ARIMA(series, order=self.arima_order)
            fitted_model = self.arima_model.fit()
            
            # Hacer predicciones en datos de entrenamiento
            fitted_values = fitted_model.fittedvalues
            
            # Calcular métricas
            mae = mean_absolute_error(series[1:], fitted_values[1:])  # Excluir primer valor
            mse = mean_squared_error(series[1:], fitted_values[1:])
            rmse = np.sqrt(mse)
            
            # Generar predicciones futuras
            forecast_result = fitted_model.forecast(steps=self.forecast_days)
            forecast_conf_int = fitted_model.get_forecast(steps=self.forecast_days).conf_int()
            
            results = {
                'model': fitted_model,
                'mae': mae,
                'mse': mse,
                'rmse': rmse,
                'aic': fitted_model.aic,
                'bic': fitted_model.bic,
                'forecast': forecast_result,
                'confidence_intervals': forecast_conf_int,
                'fitted_values': fitted_values
            }
            
            self.logger.info(f"ARIMA entrenado - MAE: {mae:.2f}, RMSE: {rmse:.2f}, AIC: {fitted_model.aic:.2f}")
            return results
            
        except Exception as e:
            self.logger.error(f"Error entrenando ARIMA: {e}")
            raise
    
    def train_random_forest(self, data: pd.DataFrame) -> Dict:
        """Entrenar modelo Random Forest para predicción basada en características"""
        try:
            # Preparar características y target
            feature_columns = [col for col in data.columns if col not in 
                             ['sale_date', 'quantity', 'total_price']]
            
            X = data[feature_columns].fillna(0)
            y = data['quantity']
            
            # Dividir datos temporalmente (80% entrenamiento, 20% prueba)
            split_idx = int(len(data) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            # Escalar características
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Entrenar modelo
            self.rf_model.fit(X_train_scaled, y_train)
            
            # Predicciones
            y_pred_train = self.rf_model.predict(X_train_scaled)
            y_pred_test = self.rf_model.predict(X_test_scaled)
            
            # Métricas
            train_mae = mean_absolute_error(y_train, y_pred_train)
            test_mae = mean_absolute_error(y_test, y_pred_test)
            train_r2 = r2_score(y_train, y_pred_train)
            test_r2 = r2_score(y_test, y_pred_test)
            
            # Importancia de características
            feature_importance = dict(zip(feature_columns, self.rf_model.feature_importances_))
            
            results = {
                'train_mae': train_mae,
                'test_mae': test_mae,
                'train_r2': train_r2,
                'test_r2': test_r2,
                'feature_importance': feature_importance,
                'feature_columns': feature_columns
            }
            
            self.logger.info(f"Random Forest entrenado - Test MAE: {test_mae:.2f}, Test R²: {test_r2:.3f}")
            return results
            
        except Exception as e:
            self.logger.error(f"Error entrenando Random Forest: {e}")
            raise
    
    def generate_daily_predictions(self, days_ahead: int = 7) -> List[Dict]:
        """Generar predicciones diarias"""
        try:
            if not self.arima_model:
                raise ValueError("Modelo ARIMA no entrenado")
            
            # Obtener datos recientes para ARIMA
            time_series_data = self.prepare_time_series_data(
                start_date=datetime.now() - timedelta(days=90)
            )
            
            # Entrenar ARIMA con datos recientes
            arima_results = self.train_arima_model(time_series_data)
            
            predictions = []
            base_date = datetime.now().date()
            
            for i in range(days_ahead):
                target_date = base_date + timedelta(days=i+1)
                predicted_value = float(arima_results['forecast'][i])
                
                # Intervalos de confianza
                conf_int = arima_results['confidence_intervals'].iloc[i]
                conf_lower = float(conf_int.iloc[0])
                conf_upper = float(conf_int.iloc[1])
                
                predictions.append({
                    'date': target_date.isoformat(),
                    'predicted_sales': max(0, round(predicted_value)),
                    'confidence_lower': max(0, round(conf_lower)),
                    'confidence_upper': round(conf_upper),
                    'model': 'arima',
                    'type': 'daily'
                })
            
            return predictions
            
        except Exception as e:
            self.logger.error(f"Error generando predicciones diarias: {e}")
            return []
    
    def generate_weekly_predictions(self, weeks_ahead: int = 4) -> List[Dict]:
        """Generar predicciones semanales"""
        try:
            daily_preds = self.generate_daily_predictions(days_ahead=weeks_ahead * 7)
            
            weekly_predictions = []
            
            for week in range(weeks_ahead):
                start_idx = week * 7
                end_idx = start_idx + 7
                week_preds = daily_preds[start_idx:end_idx]
                
                if week_preds:
                    weekly_sales = sum(pred['predicted_sales'] for pred in week_preds)
                    weekly_conf_lower = sum(pred['confidence_lower'] for pred in week_preds)
                    weekly_conf_upper = sum(pred['confidence_upper'] for pred in week_preds)
                    
                    week_start = datetime.now().date() + timedelta(days=start_idx + 1)
                    
                    weekly_predictions.append({
                        'week_start': week_start.isoformat(),
                        'predicted_sales': weekly_sales,
                        'confidence_lower': weekly_conf_lower,
                        'confidence_upper': weekly_conf_upper,
                        'model': 'arima_aggregated',
                        'type': 'weekly'
                    })
            
            return weekly_predictions
            
        except Exception as e:
            self.logger.error(f"Error generando predicciones semanales: {e}")
            return []
    
    def generate_monthly_predictions(self, months_ahead: int = 3) -> List[Dict]:
        """Generar predicciones mensuales"""
        try:
            monthly_predictions = []
            
            for month in range(months_ahead):
                # Calcular días del mes
                target_date = datetime.now().replace(day=1) + timedelta(days=32 * (month + 1))
                target_date = target_date.replace(day=1)
                
                # Obtener días del mes
                if target_date.month == 12:
                    next_month = target_date.replace(year=target_date.year + 1, month=1)
                else:
                    next_month = target_date.replace(month=target_date.month + 1)
                
                days_in_month = (next_month - target_date).days
                
                # Predicción simple basada en promedio de días recientes
                recent_data = self.prepare_time_series_data(
                    start_date=datetime.now() - timedelta(days=30)
                )
                
                avg_daily_sales = recent_data['daily_sales'].mean()
                monthly_sales = avg_daily_sales * days_in_month
                
                # Agregar variabilidad estacional simple
                seasonal_factor = 1.0
                if target_date.month in [11, 12]:  # Nov-Dic mayor demanda
                    seasonal_factor = 1.15
                elif target_date.month in [1, 2]:  # Ene-Feb menor demanda
                    seasonal_factor = 0.9
                
                monthly_sales *= seasonal_factor
                
                monthly_predictions.append({
                    'month': target_date.strftime('%Y-%m'),
                    'predicted_sales': round(monthly_sales),
                    'confidence_lower': round(monthly_sales * 0.8),
                    'confidence_upper': round(monthly_sales * 1.2),
                    'model': 'seasonal_average',
                    'type': 'monthly',
                    'seasonal_factor': seasonal_factor
                })
            
            return monthly_predictions
            
        except Exception as e:
            self.logger.error(f"Error generando predicciones mensuales: {e}")
            return []
    
    def generate_product_predictions(self, product_id: int, days_ahead: int = 7) -> List[Dict]:
        """Generar predicciones específicas por producto"""
        try:
            # Obtener datos del producto
            product_data = db.session.query(Sale).filter(
                Sale.product_id == product_id,
                Sale.sale_date >= datetime.now() - timedelta(days=90)
            ).all()
            
            if not product_data:
                return []
            
            # Convertir a DataFrame
            df = pd.DataFrame([{
                'date': sale.sale_date,
                'quantity': sale.quantity,
                'price': float(sale.total_price)
            } for sale in product_data])
            
            # Agrupar por día
            daily_product_sales = df.groupby('date').agg({
                'quantity': 'sum',
                'price': 'sum'
            }).reset_index()
            
            if len(daily_product_sales) < 7:
                # Datos insuficientes, usar promedio simple
                avg_daily_quantity = df['quantity'].mean()
                avg_daily_price = df['price'].mean()
                
                predictions = []
                for i in range(days_ahead):
                    target_date = datetime.now().date() + timedelta(days=i+1)
                    predictions.append({
                        'date': target_date.isoformat(),
                        'product_id': product_id,
                        'predicted_quantity': round(avg_daily_quantity),
                        'predicted_revenue': round(avg_daily_price, 2),
                        'model': 'simple_average',
                        'confidence': 0.6
                    })
                
                return predictions
            
            # Usar promedio móvil para productos con datos suficientes
            window = min(7, len(daily_product_sales))
            recent_avg_quantity = daily_product_sales['quantity'].tail(window).mean()
            recent_avg_price = daily_product_sales['price'].tail(window).mean()
            
            predictions = []
            for i in range(days_ahead):
                target_date = datetime.now().date() + timedelta(days=i+1)
                
                # Aplicar factor de tendencia simple
                trend_factor = 1.0
                if len(daily_product_sales) >= 14:
                    recent_avg = daily_product_sales['quantity'].tail(7).mean()
                    older_avg = daily_product_sales['quantity'].tail(14).head(7).mean()
                    if older_avg > 0:
                        trend_factor = recent_avg / older_avg
                
                predicted_quantity = recent_avg_quantity * trend_factor
                predicted_revenue = recent_avg_price * trend_factor
                
                predictions.append({
                    'date': target_date.isoformat(),
                    'product_id': product_id,
                    'predicted_quantity': max(0, round(predicted_quantity)),
                    'predicted_revenue': max(0, round(predicted_revenue, 2)),
                    'model': 'moving_average_with_trend',
                    'confidence': 0.75,
                    'trend_factor': trend_factor
                })
            
            return predictions
            
        except Exception as e:
            self.logger.error(f"Error generando predicciones de producto {product_id}: {e}")
            return []
    
    def save_predictions_to_db(self, predictions: List[Dict], prediction_type: str):
        """Guardar predicciones en base de datos"""
        try:
            # Limpiar predicciones anteriores del mismo tipo
            db.session.query(Prediction).filter(
                Prediction.prediction_type == prediction_type,
                Prediction.is_active == True
            ).update({'is_active': False})
            
            # Guardar nuevas predicciones
            for pred in predictions:
                prediction = Prediction(
                    prediction_type=prediction_type,
                    target_date=datetime.fromisoformat(pred['date']) if 'date' in pred else None,
                    product_id=pred.get('product_id'),
                    predicted_value=pred.get('predicted_sales', pred.get('predicted_quantity', 0)),
                    confidence_lower=pred.get('confidence_lower'),
                    confidence_upper=pred.get('confidence_upper'),
                    confidence_level=pred.get('confidence', 0.95),
                    model_name=pred.get('model', 'unknown'),
                    accuracy_score=pred.get('confidence', 0.7)
                )
                
                db.session.add(prediction)
            
            db.session.commit()
            self.logger.info(f"Predicciones guardadas: {len(predictions)} de tipo {prediction_type}")
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error guardando predicciones: {e}")
            raise
    
    def train_all_models(self) -> Dict:
        """Entrenar todos los modelos de predicción"""
        try:
            self.logger.info("Iniciando entrenamiento de modelos de predicción")
            
            # Preparar datos
            time_series_data = self.prepare_time_series_data()
            feature_data = self.prepare_feature_data()
            
            # Entrenar modelos
            arima_results = self.train_arima_model(time_series_data)
            rf_results = self.train_random_forest(feature_data)
            
            self.is_trained = True
            
            # Generar y guardar predicciones
            daily_preds = self.generate_daily_predictions()
            weekly_preds = self.generate_weekly_predictions()
            monthly_preds = self.generate_monthly_predictions()
            
            self.save_predictions_to_db(daily_preds, 'daily')
            self.save_predictions_to_db(weekly_preds, 'weekly')
            self.save_predictions_to_db(monthly_preds, 'monthly')
            
            results = {
                'arima_results': {
                    'mae': arima_results['mae'],
                    'rmse': arima_results['rmse'],
                    'aic': arima_results['aic']
                },
                'random_forest_results': {
                    'test_mae': rf_results['test_mae'],
                    'test_r2': rf_results['test_r2'],
                    'top_features': sorted(rf_results['feature_importance'].items(), 
                                         key=lambda x: x[1], reverse=True)[:5]
                },
                'predictions_generated': {
                    'daily': len(daily_preds),
                    'weekly': len(weekly_preds),
                    'monthly': len(monthly_preds)
                },
                'training_date': datetime.now().isoformat(),
                'data_points': len(time_series_data)
            }
            
            self.logger.info("Entrenamiento completado exitosamente")
            return results
            
        except Exception as e:
            self.logger.error(f"Error en entrenamiento de modelos: {e}")
            raise
    
    def save_model(self, model_path: str):
        """Guardar modelos entrenados"""
        try:
            import os
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            
            model_data = {
                'arima_model': self.arima_model,
                'rf_model': self.rf_model,
                'scaler': self.scaler,
                'config': self.config,
                'is_trained': self.is_trained,
                'timestamp': datetime.now().isoformat()
            }
            
            joblib.dump(model_data, model_path)
            self.logger.info(f"Modelos de predicción guardados en: {model_path}")
            
        except Exception as e:
            self.logger.error(f"Error guardando modelos: {e}")
            raise
    
    def load_model(self, model_path: str):
        """Cargar modelos entrenados"""
        try:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"No se encontró el archivo: {model_path}")
            
            model_data = joblib.load(model_path)
            
            self.arima_model = model_data.get('arima_model')
            self.rf_model = model_data.get('rf_model')
            self.scaler = model_data.get('scaler')
            self.config = model_data.get('config', {})
            self.is_trained = model_data.get('is_trained', False)
            
            self.logger.info(f"Modelos de predicción cargados desde: {model_path}")
            
        except Exception as e:
            self.logger.error(f"Error cargando modelos: {e}")
            raise