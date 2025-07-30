# backend/api/predictions.py - API de Predicciones
from flask import Blueprint, request, jsonify
from database.connection import db
from database.models import Prediction, Product, Sale
from models.sales_prediction import SalesPredictor
from datetime import datetime, date, timedelta
import logging

predictions_bp = Blueprint('predictions', __name__)
logger = logging.getLogger(__name__)

@predictions_bp.route('/daily', methods=['GET'])
def get_daily_predictions():
    """Obtener predicciones diarias"""
    try:
        days_ahead = request.args.get('days_ahead', 7, type=int)
        
        # Obtener predicciones de la base de datos
        predictions = Prediction.query.filter(
            Prediction.prediction_type == 'daily',
            Prediction.is_active == True,
            Prediction.target_date >= date.today(),
            Prediction.target_date <= date.today() + timedelta(days=days_ahead)
        ).order_by(Prediction.target_date).all()
        
        # Si no hay predicciones recientes, generar nuevas
        if not predictions:
            try:
                predictor = SalesPredictor()
                daily_preds = predictor.generate_daily_predictions(days_ahead)
                predictor.save_predictions_to_db(daily_preds, 'daily')
                
                # Volver a consultar
                predictions = Prediction.query.filter(
                    Prediction.prediction_type == 'daily',
                    Prediction.is_active == True,
                    Prediction.target_date >= date.today(),
                    Prediction.target_date <= date.today() + timedelta(days=days_ahead)
                ).order_by(Prediction.target_date).all()
                
            except Exception as e:
                logger.warning(f"Error generando predicciones diarias: {e}")
        
        return jsonify({
            'success': True,
            'data': [pred.to_dict() for pred in predictions]
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo predicciones diarias: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@predictions_bp.route('/weekly', methods=['GET'])
def get_weekly_predictions():
    """Obtener predicciones semanales"""
    try:
        weeks_ahead = request.args.get('weeks_ahead', 4, type=int)
        
        predictions = Prediction.query.filter(
            Prediction.prediction_type == 'weekly',
            Prediction.is_active == True
        ).order_by(Prediction.target_date).limit(weeks_ahead).all()
        
        if not predictions:
            try:
                predictor = SalesPredictor()
                weekly_preds = predictor.generate_weekly_predictions(weeks_ahead)
                predictor.save_predictions_to_db(weekly_preds, 'weekly')
                
                predictions = Prediction.query.filter(
                    Prediction.prediction_type == 'weekly',
                    Prediction.is_active == True
                ).order_by(Prediction.target_date).limit(weeks_ahead).all()
                
            except Exception as e:
                logger.warning(f"Error generando predicciones semanales: {e}")
        
        return jsonify({
            'success': True,
            'data': [pred.to_dict() for pred in predictions]
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo predicciones semanales: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@predictions_bp.route('/monthly', methods=['GET'])
def get_monthly_predictions():
    """Obtener predicciones mensuales"""
    try:
        months_ahead = request.args.get('months_ahead', 3, type=int)
        
        predictions = Prediction.query.filter(
            Prediction.prediction_type == 'monthly',
            Prediction.is_active == True
        ).order_by(Prediction.target_date).limit(months_ahead).all()
        
        if not predictions:
            try:
                predictor = SalesPredictor()
                monthly_preds = predictor.generate_monthly_predictions(months_ahead)
                predictor.save_predictions_to_db(monthly_preds, 'monthly')
                
                predictions = Prediction.query.filter(
                    Prediction.prediction_type == 'monthly',
                    Prediction.is_active == True
                ).order_by(Prediction.target_date).limit(months_ahead).all()
                
            except Exception as e:
                logger.warning(f"Error generando predicciones mensuales: {e}")
        
        return jsonify({
            'success': True,
            'data': [pred.to_dict() for pred in predictions]
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo predicciones mensuales: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@predictions_bp.route('/product/<int:product_id>', methods=['GET'])
def get_product_predictions(product_id):
    """Obtener predicciones específicas de un producto"""
    try:
        days_ahead = request.args.get('days_ahead', 7, type=int)
        
        # Verificar que el producto existe
        product = Product.query.get_or_404(product_id)
        
        # Buscar predicciones existentes
        predictions = Prediction.query.filter(
            Prediction.prediction_type == 'product',
            Prediction.product_id == product_id,
            Prediction.is_active == True,
            Prediction.target_date >= date.today()
        ).order_by(Prediction.target_date).all()
        
        # Si no hay predicciones recientes, generar nuevas
        if not predictions:
            try:
                predictor = SalesPredictor()
                product_preds = predictor.generate_product_predictions(product_id, days_ahead)
                
                # Convertir formato y guardar
                formatted_preds = []
                for pred in product_preds:
                    formatted_preds.append({
                        'date': pred['date'],
                        'predicted_sales': pred['predicted_quantity'],
                        'model': pred['model'],
                        'confidence': pred['confidence']
                    })
                
                predictor.save_predictions_to_db(formatted_preds, 'product')
                
                # Volver a consultar
                predictions = Prediction.query.filter(
                    Prediction.prediction_type == 'product',
                    Prediction.product_id == product_id,
                    Prediction.is_active == True,
                    Prediction.target_date >= date.today()
                ).order_by(Prediction.target_date).all()
                
            except Exception as e:
                logger.warning(f"Error generando predicciones de producto {product_id}: {e}")
        
        return jsonify({
            'success': True,
            'data': {
                'product': product.to_dict(),
                'predictions': [pred.to_dict() for pred in predictions]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo predicciones del producto {product_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@predictions_bp.route('/accuracy', methods=['GET'])
def get_prediction_accuracy():
    """Obtener precisión de las predicciones"""
    try:
        days_back = request.args.get('days_back', 30, type=int)
        
        # Obtener predicciones pasadas para comparar
        start_date = date.today() - timedelta(days=days_back)
        
        past_predictions = Prediction.query.filter(
            Prediction.target_date >= start_date,
            Prediction.target_date < date.today(),
            Prediction.is_active == True
        ).all()
        
        accuracy_data = []
        
        for pred in past_predictions:
            # Obtener ventas reales para esa fecha
            if pred.prediction_type == 'daily':
                actual_sales = Sale.query.filter(
                    Sale.sale_date == pred.target_date
                ).count()
                
                if actual_sales > 0:
                    accuracy = 1 - abs(pred.predicted_value - actual_sales) / max(pred.predicted_value, actual_sales)
                    accuracy = max(0, accuracy)  # No negativo
                    
                    accuracy_data.append({
                        'date': pred.target_date.isoformat(),
                        'predicted': pred.predicted_value,
                        'actual': actual_sales,
                        'accuracy': round(accuracy * 100, 2),
                        'model': pred.model_name,
                        'type': pred.prediction_type
                    })
        
        # Calcular precisión promedio
        avg_accuracy = 0
        if accuracy_data:
            avg_accuracy = sum(item['accuracy'] for item in accuracy_data) / len(accuracy_data)
        
        return jsonify({
            'success': True,
            'data': {
                'average_accuracy': round(avg_accuracy, 2),
                'total_predictions_evaluated': len(accuracy_data),
                'detailed_accuracy': accuracy_data[-10:]  # Últimas 10
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo precisión de predicciones: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@predictions_bp.route('/retrain', methods=['POST'])
def retrain_models():
    """Re-entrenar modelos de predicción"""
    try:
        data = request.get_json() or {}
        force_retrain = data.get('force', False)
        
        # Verificar si es necesario re-entrenar
        last_prediction = Prediction.query.order_by(Prediction.created_at.desc()).first()
        
        if not force_retrain and last_prediction:
            hours_since_last = (datetime.now() - last_prediction.created_at).total_seconds() / 3600
            if hours_since_last < 24:  # Re-entrenar solo si han pasado más de 24 horas
                return jsonify({
                    'success': True,
                    'message': 'Modelos re-entrenados recientemente',
                    'last_training': last_prediction.created_at.isoformat()
                })
        
        # Re-entrenar modelos
        try:
            predictor = SalesPredictor()
            training_results = predictor.train_all_models()
            
            return jsonify({
                'success': True,
                'data': training_results,
                'message': 'Modelos re-entrenados exitosamente'
            })
            
        except Exception as e:
            logger.error(f"Error re-entrenando modelos: {e}")
            return jsonify({
                'success': False,
                'error': f'Error en re-entrenamiento: {str(e)}'
            }), 500
        
    except Exception as e:
        logger.error(f"Error en endpoint de re-entrenamiento: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@predictions_bp.route('/today', methods=['GET'])
def get_today_predictions():
    """Obtener predicciones para hoy (para dashboard)"""
    try:
        today = date.today()
        
        # Predicción de ventas para hoy
        daily_pred = Prediction.query.filter(
            Prediction.prediction_type == 'daily',
            Prediction.target_date == today,
            Prediction.is_active == True
        ).first()
        
        # Ventas reales hasta ahora
        actual_sales_today = Sale.query.filter(Sale.sale_date == today).count()
        actual_revenue_today = db.session.query(
            db.func.sum(Sale.total_price)
        ).filter(Sale.sale_date == today).scalar() or 0
        
        # Top productos predichos para hoy
        top_product_preds = Prediction.query.filter(
            Prediction.prediction_type == 'product',
            Prediction.target_date == today,
            Prediction.is_active == True
        ).join(Product).order_by(
            Prediction.predicted_value.desc()
        ).limit(5).all()
        
        return jsonify({
            'success': True,
            'data': {
                'daily_prediction': daily_pred.to_dict() if daily_pred else None,
                'actual_sales_today': actual_sales_today,
                'actual_revenue_today': float(actual_revenue_today),
                'top_product_predictions': [
                    {
                        'product': pred.product.to_dict(),
                        'prediction': pred.to_dict()
                    }
                    for pred in top_product_preds
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo predicciones de hoy: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@predictions_bp.route('/trends', methods=['GET'])
def get_prediction_trends():
    """Obtener tendencias de predicciones"""
    try:
        days = request.args.get('days', 30, type=int)
        
        # Datos históricos reales
        start_date = date.today() - timedelta(days=days)
        
        historical_data = db.session.query(
            Sale.sale_date,
            db.func.count(Sale.id).label('sales_count'),
            db.func.sum(Sale.total_price).label('revenue')
        ).filter(
            Sale.sale_date >= start_date,
            Sale.sale_date < date.today()
        ).group_by(Sale.sale_date).order_by(Sale.sale_date).all()
        
        # Predicciones futuras
        future_predictions = Prediction.query.filter(
            Prediction.prediction_type == 'daily',
            Prediction.target_date >= date.today(),
            Prediction.target_date <= date.today() + timedelta(days=7),
            Prediction.is_active == True
        ).order_by(Prediction.target_date).all()
        
        # Formatear datos
        historical = []
        for row in historical_data:
            historical.append({
                'date': row.sale_date.isoformat(),
                'actual_sales': row.sales_count,
                'actual_revenue': float(row.revenue),
                'type': 'historical'
            })
        
        future = []
        for pred in future_predictions:
            future.append({
                'date': pred.target_date.isoformat(),
                'predicted_sales': pred.predicted_value,
                'confidence_lower': pred.confidence_lower,
                'confidence_upper': pred.confidence_upper,
                'type': 'prediction'
            })
        
        return jsonify({
            'success': True,
            'data': {
                'historical': historical,
                'predictions': future,
                'trends_summary': {
                    'historical_avg': sum(h['actual_sales'] for h in historical) / len(historical) if historical else 0,
                    'predicted_avg': sum(f['predicted_sales'] for f in future) / len(future) if future else 0
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo tendencias: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500