# backend/utils/data_processor.py - Procesador de datos para ML y análisis
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
import json
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class ProcessingResult:
    """Resultado del procesamiento de datos"""
    data: Any
    metadata: Dict
    warnings: List[str]
    errors: List[str]
    processing_time: float
    records_processed: int
    records_valid: int

class DataProcessor:
    """Procesador principal de datos para el sistema CocoPet ML"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.scalers = {}
        self.encoders = {}
        self.imputers = {}
        self.processing_stats = {
            'total_processed': 0,
            'total_errors': 0,
            'last_processing': None
        }
    
    def process_orders_data(self, orders_data: List[Dict]) -> ProcessingResult:
        """
        Procesar datos de pedidos para análisis y ML
        
        Args:
            orders_data: Lista de pedidos en formato dict
            
        Returns:
            ProcessingResult con datos procesados
        """
        start_time = datetime.now()
        warnings = []
        errors = []
        
        try:
            # Convertir a DataFrame
            df = pd.DataFrame(orders_data)
            original_count = len(df)
            
            if df.empty:
                return ProcessingResult(
                    data=df,
                    metadata={'empty_dataset': True},
                    warnings=['Dataset vacío'],
                    errors=[],
                    processing_time=0,
                    records_processed=0,
                    records_valid=0
                )
            
            # Limpiar y validar datos
            df = self._clean_orders_data(df, warnings, errors)
            
            # Extraer características temporales
            df = self._extract_temporal_features(df)
            
            # Procesar coordenadas
            df = self._process_coordinates(df, warnings)
            
            # Calcular métricas derivadas
            df = self._calculate_order_metrics(df)
            
            # Imputar valores faltantes
            df = self._impute_missing_values(df, 'orders')
            
            # Detectar anomalías
            anomalies = self._detect_anomalies(df)
            if anomalies:
                warnings.append(f"Detectadas {len(anomalies)} anomalías en los datos")
            
            valid_count = len(df)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Metadata del procesamiento
            metadata = {
                'original_records': original_count,
                'valid_records': valid_count,
                'columns': list(df.columns),
                'data_types': df.dtypes.to_dict(),
                'missing_values': df.isnull().sum().to_dict(),
                'anomalies_detected': len(anomalies),
                'processing_timestamp': datetime.now().isoformat(),
                'date_range': {
                    'start': df['created_at'].min().isoformat() if 'created_at' in df.columns else None,
                    'end': df['created_at'].max().isoformat() if 'created_at' in df.columns else None
                }
            }
            
            self.processing_stats['total_processed'] += valid_count
            self.processing_stats['last_processing'] = datetime.now()
            
            return ProcessingResult(
                data=df,
                metadata=metadata,
                warnings=warnings,
                errors=errors,
                processing_time=processing_time,
                records_processed=original_count,
                records_valid=valid_count
            )
            
        except Exception as e:
            logger.error(f"Error procesando datos de pedidos: {str(e)}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ProcessingResult(
                data=pd.DataFrame(),
                metadata={'error': str(e)},
                warnings=warnings,
                errors=[str(e)],
                processing_time=processing_time,
                records_processed=len(orders_data) if orders_data else 0,
                records_valid=0
            )
    
    def process_products_data(self, products_data: List[Dict]) -> ProcessingResult:
        """Procesar datos de productos"""
        start_time = datetime.now()
        warnings = []
        errors = []
        
        try:
            df = pd.DataFrame(products_data)
            original_count = len(df)
            
            if df.empty:
                return ProcessingResult(
                    data=df,
                    metadata={'empty_dataset': True},
                    warnings=['Dataset de productos vacío'],
                    errors=[],
                    processing_time=0,
                    records_processed=0,
                    records_valid=0
                )
            
            # Limpiar datos de productos
            df = self._clean_products_data(df, warnings, errors)
            
            # Calcular métricas de inventario
            df = self._calculate_inventory_metrics(df)
            
            # Categorizar productos
            df = self._categorize_products(df)
            
            # Procesar precios y costos
            df = self._process_pricing_data(df, warnings)
            
            # Imputar valores faltantes
            df = self._impute_missing_values(df, 'products')
            
            valid_count = len(df)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            metadata = {
                'original_records': original_count,
                'valid_records': valid_count,
                'columns': list(df.columns),
                'categories': df['category'].value_counts().to_dict() if 'category' in df.columns else {},
                'price_stats': {
                    'min': float(df['unit_price'].min()) if 'unit_price' in df.columns else None,
                    'max': float(df['unit_price'].max()) if 'unit_price' in df.columns else None,
                    'mean': float(df['unit_price'].mean()) if 'unit_price' in df.columns else None
                }
            }
            
            return ProcessingResult(
                data=df,
                metadata=metadata,
                warnings=warnings,
                errors=errors,
                processing_time=processing_time,
                records_processed=original_count,
                records_valid=valid_count
            )
            
        except Exception as e:
            logger.error(f"Error procesando datos de productos: {str(e)}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ProcessingResult(
                data=pd.DataFrame(),
                metadata={'error': str(e)},
                warnings=warnings,
                errors=[str(e)],
                processing_time=processing_time,
                records_processed=len(products_data) if products_data else 0,
                records_valid=0
            )
    
    def prepare_ml_features(self, df: pd.DataFrame, target_column: str = None) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
        """
        Preparar características para modelos de ML
        
        Args:
            df: DataFrame con datos
            target_column: Nombre de la columna objetivo
            
        Returns:
            Tuple con (features, target)
        """
        try:
            # Hacer copia para no modificar original
            features_df = df.copy()
            
            # Separar target si existe
            target = None
            if target_column and target_column in features_df.columns:
                target = features_df[target_column]
                features_df = features_df.drop(columns=[target_column])
            
            # Codificar variables categóricas
            categorical_columns = features_df.select_dtypes(include=['object']).columns
            for col in categorical_columns:
                if col not in self.encoders:
                    self.encoders[col] = LabelEncoder()
                
                # Manejar valores nuevos no vistos durante entrenamiento
                try:
                    features_df[col] = self.encoders[col].fit_transform(features_df[col].astype(str))
                except ValueError:
                    # Si hay valores nuevos, reentrenar el encoder
                    self.encoders[col] = LabelEncoder()
                    features_df[col] = self.encoders[col].fit_transform(features_df[col].astype(str))
            
            # Escalar características numéricas
            numeric_columns = features_df.select_dtypes(include=[np.number]).columns
            if len(numeric_columns) > 0:
                if 'standard_scaler' not in self.scalers:
                    self.scalers['standard_scaler'] = StandardScaler()
                
                features_df[numeric_columns] = self.scalers['standard_scaler'].fit_transform(
                    features_df[numeric_columns]
                )
            
            # Manejar valores faltantes finales
            if features_df.isnull().any().any():
                if 'final_imputer' not in self.imputers:
                    self.imputers['final_imputer'] = SimpleImputer(strategy='median')
                
                features_df = pd.DataFrame(
                    self.imputers['final_imputer'].fit_transform(features_df),
                    columns=features_df.columns,
                    index=features_df.index
                )
            
            return features_df, target
            
        except Exception as e:
            logger.error(f"Error preparando características ML: {str(e)}")
            raise
    
    def _clean_orders_data(self, df: pd.DataFrame, warnings: List[str], errors: List[str]) -> pd.DataFrame:
        """Limpiar datos de pedidos"""
        original_len = len(df)
        
        # Convertir fechas
        date_columns = ['created_at', 'delivery_date', 'updated_at']
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
                null_dates = df[col].isnull().sum()
                if null_dates > 0:
                    warnings.append(f"Fechas inválidas en {col}: {null_dates} registros")
        
        # Limpiar valores numéricos
        numeric_columns = ['total', 'quantity', 'lat', 'lng']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Remover registros con datos críticos faltantes
        critical_columns = ['total']
        for col in critical_columns:
            if col in df.columns:
                before = len(df)
                df = df.dropna(subset=[col])
                removed = before - len(df)
                if removed > 0:
                    warnings.append(f"Removidos {removed} registros sin {col}")
        
        # Validar rangos de valores
        if 'total' in df.columns:
            invalid_totals = df[(df['total'] <= 0) | (df['total'] > 100000)]
            if not invalid_totals.empty:
                warnings.append(f"Totales inválidos: {len(invalid_totals)} registros")
                df = df[(df['total'] > 0) & (df['total'] <= 100000)]
        
        # Validar coordenadas
        if 'lat' in df.columns and 'lng' in df.columns:
            invalid_coords = df[
                (df['lat'].abs() > 90) | 
                (df['lng'].abs() > 180) |
                (df['lat'].isnull()) |
                (df['lng'].isnull())
            ]
            if not invalid_coords.empty:
                warnings.append(f"Coordenadas inválidas: {len(invalid_coords)} registros")
                df = df[
                    (df['lat'].abs() <= 90) & 
                    (df['lng'].abs() <= 180) &
                    (df['lat'].notnull()) &
                    (df['lng'].notnull())
                ]
        
        final_len = len(df)
        if final_len < original_len:
            warnings.append(f"Datos limpiados: {original_len} -> {final_len} registros")
        
        return df
    
    def _clean_products_data(self, df: pd.DataFrame, warnings: List[str], errors: List[str]) -> pd.DataFrame:
        """Limpiar datos de productos"""
        original_len = len(df)
        
        # Limpiar precios y stock
        numeric_columns = ['unit_price', 'cost_price', 'stock', 'min_stock']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                df[col] = df[col].fillna(0)
        
        # Validar precios
        if 'unit_price' in df.columns:
            invalid_prices = df[df['unit_price'] < 0]
            if not invalid_prices.empty:
                warnings.append(f"Precios negativos corregidos: {len(invalid_prices)} registros")
                df.loc[df['unit_price'] < 0, 'unit_price'] = 0
        
        # Limpiar nombres y SKUs
        if 'name' in df.columns:
            df['name'] = df['name'].astype(str).str.strip()
            df = df[df['name'] != '']
        
        if 'sku' in df.columns:
            df['sku'] = df['sku'].astype(str).str.strip().str.upper()
            df = df[df['sku'] != '']
            
            # Verificar SKUs duplicados
            duplicated_skus = df[df['sku'].duplicated()]
            if not duplicated_skus.empty:
                warnings.append(f"SKUs duplicados encontrados: {len(duplicated_skus)} registros")
        
        return df
    
    def _extract_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extraer características temporales"""
        if 'created_at' in df.columns:
            df['hour'] = df['created_at'].dt.hour
            df['day_of_week'] = df['created_at'].dt.dayofweek
            df['day_of_month'] = df['created_at'].dt.day
            df['month'] = df['created_at'].dt.month
            df['quarter'] = df['created_at'].dt.quarter
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
            df['is_business_hours'] = df['hour'].between(9, 18).astype(int)
        
        return df
    
    def _process_coordinates(self, df: pd.DataFrame, warnings: List[str]) -> pd.DataFrame:
        """Procesar coordenadas geográficas"""
        if 'lat' in df.columns and 'lng' in df.columns:
            # Calcular distancia desde centro (Cancún centro como referencia)
            cancun_center_lat, cancun_center_lng = 21.1619, -86.8515
            
            df['distance_from_center'] = np.sqrt(
                (df['lat'] - cancun_center_lat) ** 2 + 
                (df['lng'] - cancun_center_lng) ** 2
            ) * 111  # Aproximación km por grado
            
            # Detectar coordenadas atípicas
            distance_threshold = 50  # km
            outliers = df[df['distance_from_center'] > distance_threshold]
            if not outliers.empty:
                warnings.append(f"Coordenadas lejanas detectadas: {len(outliers)} registros (>{distance_threshold}km)")
        
        return df
    
    def _calculate_order_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calcular métricas derivadas de pedidos"""
        # Ticket promedio por cliente
        if 'customer_id' in df.columns and 'total' in df.columns:
            customer_avg = df.groupby('customer_id')['total'].mean()
            df['customer_avg_ticket'] = df['customer_id'].map(customer_avg)
        
        # Tiempo desde último pedido
        if 'created_at' in df.columns and 'customer_id' in df.columns:
            df = df.sort_values(['customer_id', 'created_at'])
            df['days_since_last_order'] = df.groupby('customer_id')['created_at'].diff().dt.days
            df['days_since_last_order'] = df['days_since_last_order'].fillna(0)
        
        return df
    
    def _calculate_inventory_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calcular métricas de inventario"""
        if 'stock' in df.columns and 'min_stock' in df.columns:
            df['stock_ratio'] = df['stock'] / (df['min_stock'] + 1)  # +1 para evitar división por 0
            df['is_low_stock'] = (df['stock'] <= df['min_stock']).astype(int)
        
        if 'unit_price' in df.columns and 'stock' in df.columns:
            df['inventory_value'] = df['unit_price'] * df['stock']
        
        return df
    
    def _categorize_products(self, df: pd.DataFrame) -> pd.DataFrame:
        """Categorizar productos automáticamente si no tienen categoría"""
        if 'category' not in df.columns or df['category'].isnull().any():
            if 'name' in df.columns:
                # Mapeo simple basado en palabras clave
                category_keywords = {
                    'alimento': ['alimento', 'comida', 'croquetas', 'pienso'],
                    'juguete': ['juguete', 'pelota', 'hueso', 'cuerda'],
                    'accesorio': ['collar', 'correa', 'arnés', 'plato'],
                    'higiene': ['shampoo', 'jabón', 'toalla', 'cepillo'],
                    'medicina': ['medicina', 'vitamina', 'tratamiento', 'medicamento']
                }
                
                def auto_categorize(name):
                    name_lower = str(name).lower()
                    for category, keywords in category_keywords.items():
                        if any(keyword in name_lower for keyword in keywords):
                            return category
                    return 'otros'
                
                if 'category' not in df.columns:
                    df['category'] = df['name'].apply(auto_categorize)
                else:
                    df['category'] = df['category'].fillna(df['name'].apply(auto_categorize))
        
        return df
    
    def _process_pricing_data(self, df: pd.DataFrame, warnings: List[str]) -> pd.DataFrame:
        """Procesar datos de precios"""
        if 'unit_price' in df.columns and 'cost_price' in df.columns:
            # Calcular margen de ganancia
            df['profit_margin'] = ((df['unit_price'] - df['cost_price']) / df['unit_price'] * 100).fillna(0)
            
            # Detectar márgenes anómalos
            negative_margins = df[df['profit_margin'] < 0]
            if not negative_margins.empty:
                warnings.append(f"Márgenes negativos detectados: {len(negative_margins)} productos")
            
            high_margins = df[df['profit_margin'] > 90]
            if not high_margins.empty:
                warnings.append(f"Márgenes muy altos detectados: {len(high_margins)} productos")
        
        return df
    
    def _impute_missing_values(self, df: pd.DataFrame, data_type: str) -> pd.DataFrame:
        """Imputar valores faltantes"""
        imputer_key = f"{data_type}_imputer"
        
        # Diferentes estrategias según el tipo de dato
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        categorical_columns = df.select_dtypes(include=['object']).columns
        
        # Imputar numéricas con mediana
        if len(numeric_columns) > 0 and df[numeric_columns].isnull().any().any():
            if f"{imputer_key}_numeric" not in self.imputers:
                self.imputers[f"{imputer_key}_numeric"] = SimpleImputer(strategy='median')
            
            df[numeric_columns] = self.imputers[f"{imputer_key}_numeric"].fit_transform(df[numeric_columns])
        
        # Imputar categóricas con moda
        if len(categorical_columns) > 0 and df[categorical_columns].isnull().any().any():
            if f"{imputer_key}_categorical" not in self.imputers:
                self.imputers[f"{imputer_key}_categorical"] = SimpleImputer(strategy='most_frequent')
            
            df[categorical_columns] = self.imputers[f"{imputer_key}_categorical"].fit_transform(df[categorical_columns])
        
        return df
    
    def _detect_anomalies(self, df: pd.DataFrame) -> List[int]:
        """Detectar anomalías usando métodos estadísticos simples"""
        anomalies = []
        
        # Detectar outliers en columnas numéricas usando IQR
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            if col in df.columns and not df[col].empty:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)].index.tolist()
                anomalies.extend(outliers)
        
        return list(set(anomalies))  # Remover duplicados
    
    def get_processing_stats(self) -> Dict:
        """Obtener estadísticas de procesamiento"""
        return self.processing_stats.copy()
    
    def reset_processors(self):
        """Resetear procesadores entrenados"""
        self.scalers.clear()
        self.encoders.clear()
        self.imputers.clear()
        logger.info("Procesadores reseteados")
    
    def export_processors(self) -> Dict:
        """Exportar procesadores entrenados para reutilización"""
        return {
            'scalers': {k: v.__dict__ for k, v in self.scalers.items()},
            'encoders': {k: v.classes_.tolist() if hasattr(v, 'classes_') else [] for k, v in self.encoders.items()},
            'processing_stats': self.processing_stats
        }

# Funciones de utilidad standalone
def validate_data_quality(df: pd.DataFrame) -> Dict:
    """Validar calidad de datos"""
    quality_report = {
        'total_records': len(df),
        'total_columns': len(df.columns),
        'missing_values': df.isnull().sum().to_dict(),
        'duplicate_records': df.duplicated().sum(),
        'data_types': df.dtypes.to_dict(),
        'memory_usage': df.memory_usage(deep=True).sum(),
        'numeric_columns': len(df.select_dtypes(include=[np.number]).columns),
        'categorical_columns': len(df.select_dtypes(include=['object']).columns),
        'datetime_columns': len(df.select_dtypes(include=['datetime64']).columns)
    }
    
    # Calcular score de calidad
    total_cells = len(df) * len(df.columns) if not df.empty else 1
    missing_ratio = df.isnull().sum().sum() / total_cells
    duplicate_ratio = df.duplicated().sum() / len(df) if not df.empty else 0
    
    quality_score = (1 - missing_ratio - duplicate_ratio) * 100
    quality_report['quality_score'] = max(0, min(100, quality_score))
    
    return quality_report

def aggregate_time_series(df: pd.DataFrame, date_column: str, 
                         value_column: str, frequency: str = 'D') -> pd.DataFrame:
    """Agregar datos de series de tiempo"""
    if date_column not in df.columns or value_column not in df.columns:
        raise ValueError(f"Columnas {date_column} o {value_column} no encontradas")
    
    df[date_column] = pd.to_datetime(df[date_column])
    
    # Agregar por frecuencia especificada
    aggregated = df.set_index(date_column).resample(frequency)[value_column].agg({
        'sum': 'sum',
        'mean': 'mean',
        'count': 'count',
        'min': 'min',
        'max': 'max'
    }).reset_index()
    
    return aggregated