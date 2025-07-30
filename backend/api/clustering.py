# backend/api/clustering.py - API de Clustering
from flask import Blueprint, request, jsonify
from database.connection import db
from database.models import ClusterInfo, Sale, Product
from models.clustering_model import GeographicClustering
from datetime import datetime, date, timedelta
import logging

clustering_bp = Blueprint('clustering', __name__)
logger = logging.getLogger(__name__)

@clustering_bp.route('/zones', methods=['GET'])
def get_zones():
    """Obtener información de todas las zonas/clusters"""
    try:
        zones = ClusterInfo.query.filter(ClusterInfo.is_active == True)\
            .order_by(ClusterInfo.total_revenue.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [zone.to_dict() for zone in zones]
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo zonas: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/zones/<int:zone_id>', methods=['GET'])
def get_zone_details(zone_id):
    """Obtener detalles de una zona específica"""
    try:
        zone = ClusterInfo.query.filter_by(cluster_id=zone_id).first_or_404()
        
        # Obtener ventas recientes de esta zona
        recent_sales = Sale.query.filter(
            Sale.cluster_id == zone_id
        ).join(Product).order_by(Sale.created_at.desc()).limit(20).all()
        
        # Estadísticas adicionales
        sales_by_day = db.session.query(
            Sale.sale_date,
            db.func.count(Sale.id).label('count'),
            db.func.sum(Sale.total_price).label('revenue')
        ).filter(
            Sale.cluster_id == zone_id,
            Sale.sale_date >= date.today() - timedelta(days=30)
        ).group_by(Sale.sale_date).order_by(Sale.sale_date).all()
        
        # Top productos en esta zona
        top_products = db.session.query(
            Product.name,
            Product.brand,
            db.func.count(Sale.id).label('sales_count'),
            db.func.sum(Sale.quantity).label('total_quantity'),
            db.func.sum(Sale.total_price).label('total_revenue')
        ).join(Sale).filter(
            Sale.cluster_id == zone_id
        ).group_by(Product.id, Product.name, Product.brand)\
         .order_by(db.desc('total_revenue')).limit(10).all()
        
        return jsonify({
            'success': True,
            'data': {
                'zone_info': zone.to_dict(),
                'recent_sales': [sale.to_dict() for sale in recent_sales],
                'daily_stats': [
                    {
                        'date': day.isoformat(),
                        'sales_count': count,
                        'revenue': float(revenue)
                    }
                    for day, count, revenue in sales_by_day
                ],
                'top_products': [
                    {
                        'name': name,
                        'brand': brand,
                        'sales_count': sales_count,
                        'total_quantity': total_quantity,
                        'total_revenue': float(total_revenue)
                    }
                    for name, brand, sales_count, total_quantity, total_revenue in top_products
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo detalles de zona {zone_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/heatmap', methods=['GET'])
def get_heatmap_data():
    """Obtener datos para mapa de calor"""
    try:
        # Inicializar modelo de clustering
        clustering = GeographicClustering()
        
        # Obtener datos del mapa de calor
        heatmap_data = clustering.get_cluster_heatmap_data()
        
        return jsonify({
            'success': True,
            'data': heatmap_data
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo datos de mapa de calor: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/predict-zone', methods=['POST'])
def predict_zone():
    """Predecir zona para nuevas coordenadas"""
    try:
        data = request.get_json()
        
        if 'latitude' not in data or 'longitude' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requieren latitude y longitude'
            }), 400
        
        latitude = float(data['latitude'])
        longitude = float(data['longitude'])
        
        # Validar coordenadas
        if not (20.5 <= latitude <= 21.5 and -87.5 <= longitude <= -86.5):
            return jsonify({
                'success': False,
                'error': 'Coordenadas fuera del área de servicio'
            }), 400
        
        # Inicializar modelo y predecir
        clustering = GeographicClustering()
        predicted_zone = clustering.predict_zone(latitude, longitude)
        
        # Obtener información de la zona predicha
        zone_info = None
        if predicted_zone is not None:
            zone_info = ClusterInfo.query.filter_by(cluster_id=predicted_zone).first()
        
        return jsonify({
            'success': True,
            'data': {
                'predicted_zone': predicted_zone,
                'zone_info': zone_info.to_dict() if zone_info else None,
                'coordinates': {
                    'latitude': latitude,
                    'longitude': longitude
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Error prediciendo zona: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/zone-predictions', methods=['GET'])
def get_zone_predictions():
    """Obtener predicciones de demanda por zona"""
    try:
        days_ahead = request.args.get('days_ahead', 7, type=int)
        
        # Inicializar modelo
        clustering = GeographicClustering()
        
        # Obtener predicciones por zona
        zone_predictions = clustering.get_zone_predictions(days_ahead)
        
        # Enriquecer con información de zona
        enriched_predictions = []
        for pred in zone_predictions:
            zone_info = ClusterInfo.query.filter_by(cluster_id=pred['cluster_id']).first()
            
            enriched_predictions.append({
                **pred,
                'zone_info': zone_info.to_dict() if zone_info else None
            })
        
        return jsonify({
            'success': True,
            'data': enriched_predictions
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo predicciones por zona: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/retrain', methods=['POST'])
def retrain_clustering():
    """Re-entrenar modelos de clustering"""
    try:
        data = request.get_json() or {}
        force_retrain = data.get('force', False)
        
        # Verificar si es necesario re-entrenar
        last_update = db.session.query(db.func.max(ClusterInfo.last_updated)).scalar()
        
        if not force_retrain and last_update:
            hours_since_last = (datetime.now() - last_update).total_seconds() / 3600
            if hours_since_last < 24:  # Re-entrenar solo si han pasado más de 24 horas
                return jsonify({
                    'success': True,
                    'message': 'Clustering actualizado recientemente',
                    'last_update': last_update.isoformat()
                })
        
        # Re-entrenar clustering
        try:
            clustering = GeographicClustering()
            training_results = clustering.train_models()
            
            return jsonify({
                'success': True,
                'data': training_results,
                'message': 'Clustering re-entrenado exitosamente'
            })
            
        except Exception as e:
            logger.error(f"Error re-entrenando clustering: {e}")
            return jsonify({
                'success': False,
                'error': f'Error en re-entrenamiento: {str(e)}'
            }), 500
        
    except Exception as e:
        logger.error(f"Error en endpoint de re-entrenamiento: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/zone-comparison', methods=['GET'])
def get_zone_comparison():
    """Obtener comparación entre zonas"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        # Estadísticas por zona en el período
        zone_stats = db.session.query(
            Sale.cluster_id,
            db.func.count(Sale.id).label('sales_count'),
            db.func.sum(Sale.total_price).label('total_revenue'),
            db.func.avg(Sale.total_price).label('avg_order_value'),
            db.func.sum(Sale.quantity).label('total_quantity')
        ).filter(
            Sale.sale_date >= start_date,
            Sale.cluster_id.isnot(None)
        ).group_by(Sale.cluster_id).all()
        
        # Enriquecer con información de zona
        comparison_data = []
        for stats in zone_stats:
            zone_info = ClusterInfo.query.filter_by(cluster_id=stats.cluster_id).first()
            
            comparison_data.append({
                'cluster_id': stats.cluster_id,
                'zone_name': zone_info.zone_name if zone_info else f'Zona {stats.cluster_id}',
                'center_coordinates': {
                    'latitude': zone_info.center_latitude if zone_info else None,
                    'longitude': zone_info.center_longitude if zone_info else None
                },
                'performance': {
                    'sales_count': stats.sales_count,
                    'total_revenue': float(stats.total_revenue),
                    'avg_order_value': float(stats.avg_order_value),
                    'total_quantity': stats.total_quantity,
                    'revenue_per_sale': float(stats.total_revenue / stats.sales_count) if stats.sales_count > 0 else 0
                },
                'period_days': days
            })
        
        # Ordenar por revenue total
        comparison_data.sort(key=lambda x: x['performance']['total_revenue'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': comparison_data
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo comparación de zonas: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/delivery-optimization', methods=['GET'])
def get_delivery_optimization():
    """Obtener optimización de rutas de entrega"""
    try:
        target_date = request.args.get('date', date.today().isoformat())
        target_date = datetime.fromisoformat(target_date).date()
        
        # Obtener pedidos del día por zona
        orders_by_zone = db.session.query(
            Sale.cluster_id,
            db.func.count(Sale.id).label('order_count'),
            db.func.avg(Sale.latitude).label('avg_lat'),
            db.func.avg(Sale.longitude).label('avg_lng')
        ).filter(
            Sale.sale_date == target_date,
            Sale.cluster_id.isnot(None)
        ).group_by(Sale.cluster_id).all()
        
        # Obtener información adicional de cada zona
        optimization_data = []
        total_orders = 0
        
        for zone_data in orders_by_zone:
            zone_info = ClusterInfo.query.filter_by(cluster_id=zone_data.cluster_id).first()
            
            optimization_data.append({
                'cluster_id': zone_data.cluster_id,
                'zone_name': zone_info.zone_name if zone_info else f'Zona {zone_data.cluster_id}',
                'order_count': zone_data.order_count,
                'center_coordinates': {
                    'latitude': float(zone_data.avg_lat),
                    'longitude': float(zone_data.avg_lng)
                },
                'priority': 'high' if zone_data.order_count > 5 else 'medium' if zone_data.order_count > 2 else 'low'
            })
            
            total_orders += zone_data.order_count
        
        # Ordenar por prioridad (número de pedidos)
        optimization_data.sort(key=lambda x: x['order_count'], reverse=True)
        
        # Calcular ruta sugerida (simple: por proximidad y volumen)
        suggested_route = []
        if optimization_data:
            # Empezar por la zona con más pedidos
            suggested_route = [zone['cluster_id'] for zone in optimization_data]
        
        return jsonify({
            'success': True,
            'data': {
                'date': target_date.isoformat(),
                'total_orders': total_orders,
                'zones_with_orders': len(optimization_data),
                'zone_details': optimization_data,
                'suggested_route': suggested_route,
                'optimization_notes': [
                    f"Total de {total_orders} pedidos en {len(optimization_data)} zonas",
                    "Ruta sugerida ordenada por volumen de pedidos",
                    "Priorizar zonas 'high' en horarios de mayor demanda"
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo optimización de entrega: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@clustering_bp.route('/stats', methods=['GET'])
def get_clustering_stats():
    """Obtener estadísticas generales de clustering"""
    try:
        # Estadísticas básicas
        total_zones = ClusterInfo.query.filter(ClusterInfo.is_active == True).count()
        
        # Zona más activa
        most_active_zone = ClusterInfo.query.filter(ClusterInfo.is_active == True)\
            .order_by(ClusterInfo.total_sales.desc()).first()
        
        # Zona con mayor revenue
        highest_revenue_zone = ClusterInfo.query.filter(ClusterInfo.is_active == True)\
            .order_by(ClusterInfo.total_revenue.desc()).first()
        
        # Ventas sin zona asignada
        unassigned_sales = Sale.query.filter(Sale.cluster_id.is_(None)).count()
        total_sales = Sale.query.count()
        
        assignment_rate = ((total_sales - unassigned_sales) / total_sales * 100) if total_sales > 0 else 0
        
        # Distribución de ventas por zona
        zone_distribution = db.session.query(
            ClusterInfo.zone_name,
            ClusterInfo.total_sales,
            ClusterInfo.total_revenue
        ).filter(ClusterInfo.is_active == True)\
         .order_by(ClusterInfo.total_revenue.desc()).all()
        
        return jsonify({
            'success': True,
            'data': {
                'total_active_zones': total_zones,
                'assignment_rate': round(assignment_rate, 2),
                'unassigned_sales': unassigned_sales,
                'most_active_zone': {
                    'zone_name': most_active_zone.zone_name,
                    'total_sales': most_active_zone.total_sales
                } if most_active_zone else None,
                'highest_revenue_zone': {
                    'zone_name': highest_revenue_zone.zone_name,
                    'total_revenue': float(highest_revenue_zone.total_revenue)
                } if highest_revenue_zone else None,
                'zone_distribution': [
                    {
                        'zone_name': name,
                        'sales': sales,
                        'revenue': float(revenue)
                    }
                    for name, sales, revenue in zone_distribution
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de clustering: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500