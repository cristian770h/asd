# backend/api/inventory.py - API de Inventario
from flask import Blueprint, request, jsonify
from database.connection import db
from database.models import Product, StockMovement
from datetime import datetime, date, timedelta
import logging

inventory_bp = Blueprint('inventory', __name__)
logger = logging.getLogger(__name__)

@inventory_bp.route('/low-stock', methods=['GET'])
def get_low_stock_items():
    """Obtener productos con stock bajo"""
    try:
        threshold_type = request.args.get('type', 'low')  # 'low', 'critical', 'all'
        
        query = Product.query.filter(Product.is_active == True)
        
        if threshold_type == 'critical':
            # Stock crítico (50% del mínimo)
            query = query.filter(Product.current_stock <= Product.min_stock * 0.5)
        elif threshold_type == 'low':
            # Stock bajo (menor o igual al mínimo)
            query = query.filter(Product.current_stock <= Product.min_stock)
        # 'all' no filtra
        
        products = query.order_by(
            (Product.current_stock / Product.min_stock.cast(db.Float))
        ).all()
        
        # Agregar información adicional
        low_stock_data = []
        for product in products:
            stock_ratio = product.current_stock / product.min_stock if product.min_stock > 0 else 0
            
            status = 'normal'
            if stock_ratio <= 0.5:
                status = 'critical'
            elif stock_ratio <= 1.0:
                status = 'low'
            elif stock_ratio >= 0.9:
                status = 'high'
            
            low_stock_data.append({
                **product.to_dict(),
                'stock_ratio': round(stock_ratio, 2),
                'status': status,
                'days_until_out': self._calculate_days_until_out_of_stock(product),
                'suggested_reorder': max(product.reorder_point - product.current_stock, 0)
            })
        
        return jsonify({
            'success': True,
            'data': low_stock_data
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo productos con stock bajo: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def _calculate_days_until_out_of_stock(product):
    """Calcular días estimados hasta agotar stock"""
    try:
        # Obtener promedio de ventas de los últimos 30 días
        thirty_days_ago = date.today() - timedelta(days=30)
        
        avg_daily_sales = db.session.query(
            db.func.avg(db.func.count(StockMovement.id))
        ).filter(
            StockMovement.product_id == product.id,
            StockMovement.movement_type == 'out',
            StockMovement.created_at >= thirty_days_ago
        ).group_by(db.func.date(StockMovement.created_at)).scalar()
        
        if not avg_daily_sales or avg_daily_sales == 0:
            return None  # No hay datos suficientes
        
        days_remaining = product.current_stock / avg_daily_sales
        return int(days_remaining) if days_remaining > 0 else 0
        
    except Exception as e:
        logger.error(f"Error calculando días hasta agotamiento: {e}")
        return None

@inventory_bp.route('/movements', methods=['GET'])
def get_inventory_movements():
    """Obtener movimientos de inventario"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        product_id = request.args.get('product_id', type=int)
        movement_type = request.args.get('type')  # 'in', 'out', 'adjustment'
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Query base con join a productos
        query = StockMovement.query.join(Product)
        
        # Filtros
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        
        if movement_type:
            query = query.filter(StockMovement.movement_type == movement_type)
        
        if start_date:
            query = query.filter(StockMovement.created_at >= datetime.fromisoformat(start_date))
        
        if end_date:
            query = query.filter(StockMovement.created_at <= datetime.fromisoformat(end_date))
        
        # Ordenar por fecha descendente
        query = query.order_by(StockMovement.created_at.desc())
        
        # Paginación
        movements = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [movement.to_dict() for movement in movements.items],
            'pagination': {
                'page': page,
                'pages': movements.pages,
                'per_page': per_page,
                'total': movements.total,
                'has_next': movements.has_next,
                'has_prev': movements.has_prev
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo movimientos de inventario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@inventory_bp.route('/valuation', methods=['GET'])
def get_inventory_valuation():
    """Obtener valoración del inventario"""
    try:
        # Valoración total del inventario
        total_cost_value = db.session.query(
            db.func.sum(Product.current_stock * Product.cost)
        ).filter(
            Product.is_active == True,
            Product.cost.isnot(None)
        ).scalar() or 0
        
        total_retail_value = db.session.query(
            db.func.sum(Product.current_stock * Product.price)
        ).filter(Product.is_active == True).scalar() or 0
        
        # Valoración por categoría
        category_valuation = db.session.query(
            Product.category,
            db.func.sum(Product.current_stock * Product.price).label('retail_value'),
            db.func.sum(Product.current_stock * Product.cost).label('cost_value'),
            db.func.sum(Product.current_stock).label('total_units'),
            db.func.count(Product.id).label('product_count')
        ).filter(Product.is_active == True)\
         .group_by(Product.category).all()
        
        # Valoración por marca
        brand_valuation = db.session.query(
            Product.brand,
            db.func.sum(Product.current_stock * Product.price).label('retail_value'),
            db.func.sum(Product.current_stock).label('total_units'),
            db.func.count(Product.id).label('product_count')
        ).filter(Product.is_active == True)\
         .group_by(Product.brand)\
         .order_by(db.desc('retail_value')).limit(10).all()
        
        # Top productos por valor
        top_value_products = db.session.query(
            Product.name,
            Product.brand,
            Product.category,
            Product.current_stock,
            Product.price,
            (Product.current_stock * Product.price).label('total_value')
        ).filter(Product.is_active == True)\
         .order_by(db.desc('total_value')).limit(10).all()
        
        return jsonify({
            'success': True,
            'data': {
                'total_valuation': {
                    'retail_value': float(total_retail_value),
                    'cost_value': float(total_cost_value),
                    'potential_profit': float(total_retail_value - total_cost_value),
                    'margin_percentage': round(((total_retail_value - total_cost_value) / total_retail_value * 100), 2) if total_retail_value > 0 else 0
                },
                'by_category': [
                    {
                        'category': cat,
                        'retail_value': float(retail_val or 0),
                        'cost_value': float(cost_val or 0),
                        'total_units': int(units),
                        'product_count': count
                    }
                    for cat, retail_val, cost_val, units, count in category_valuation
                ],
                'by_brand': [
                    {
                        'brand': brand,
                        'retail_value': float(retail_val),
                        'total_units': int(units),
                        'product_count': count
                    }
                    for brand, retail_val, units, count in brand_valuation
                ],
                'top_value_products': [
                    {
                        'name': name,
                        'brand': brand,
                        'category': category,
                        'current_stock': stock,
                        'unit_price': float(price),
                        'total_value': float(total_val)
                    }
                    for name, brand, category, stock, price, total_val in top_value_products
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo valoración de inventario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@inventory_bp.route('/turnover', methods=['GET'])
def get_inventory_turnover():
    """Obtener rotación de inventario"""
    try:
        days = request.args.get('days', 90, type=int)
        start_date = date.today() - timedelta(days=days)
        
        # Calcular rotación por producto
        turnover_data = db.session.query(
            Product.id,
            Product.name,
            Product.brand,
            Product.category,
            Product.current_stock,
            Product.price,
            db.func.sum(StockMovement.quantity).label('total_sold'),
            db.func.count(StockMovement.id).label('movement_count')
        ).outerjoin(
            StockMovement,
            db.and_(
                StockMovement.product_id == Product.id,
                StockMovement.movement_type == 'out',
                StockMovement.created_at >= start_date
            )
        ).filter(Product.is_active == True)\
         .group_by(Product.id, Product.name, Product.brand, Product.category, Product.current_stock, Product.price)\
         .all()
        
        # Calcular métricas de rotación
        turnover_analysis = []
        for data in turnover_data:
            total_sold = data.total_sold or 0
            avg_stock = (data.current_stock + total_sold) / 2 if total_sold > 0 else data.current_stock
            
            # Turnover ratio (ventas / stock promedio)
            turnover_ratio = total_sold / avg_stock if avg_stock > 0 else 0
            
            # Días de inventario (días que dura el stock actual)
            days_of_inventory = (data.current_stock / (total_sold / days)) if total_sold > 0 else float('inf')
            
            # Clasificación ABC
            velocity = 'A' if turnover_ratio > 2 else 'B' if turnover_ratio > 0.5 else 'C'
            
            turnover_analysis.append({
                'product_id': data.id,
                'product_name': data.name,
                'brand': data.brand,
                'category': data.category,
                'current_stock': data.current_stock,
                'unit_price': float(data.price),
                'total_sold': int(total_sold),
                'movement_count': data.movement_count,
                'turnover_ratio': round(turnover_ratio, 2),
                'days_of_inventory': int(days_of_inventory) if days_of_inventory != float('inf') else None,
                'velocity_class': velocity,
                'stock_value': float(data.current_stock * data.price)
            })
        
        # Ordenar por ratio de rotación
        turnover_analysis.sort(key=lambda x: x['turnover_ratio'], reverse=True)
        
        # Estadísticas generales
        total_products = len(turnover_analysis)
        fast_movers = len([p for p in turnover_analysis if p['velocity_class'] == 'A'])
        slow_movers = len([p for p in turnover_analysis if p['velocity_class'] == 'C'])
        
        return jsonify({
            'success': True,
            'data': {
                'analysis_period_days': days,
                'total_products_analyzed': total_products,
                'fast_movers_count': fast_movers,
                'slow_movers_count': slow_movers,
                'turnover_details': turnover_analysis
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo rotación de inventario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@inventory_bp.route('/reorder-suggestions', methods=['GET'])
def get_reorder_suggestions():
    """Obtener sugerencias de reorden"""
    try:
        # Productos que necesitan reorden
        reorder_products = Product.query.filter(
            Product.is_active == True,
            Product.current_stock <= Product.reorder_point
        ).all()
        
        suggestions = []
        for product in reorder_products:
            # Calcular cantidad sugerida basada en ventas históricas
            thirty_days_ago = date.today() - timedelta(days=30)
            
            # Obtener ventas promedio diarias
            daily_sales = db.session.query(
                db.func.avg(db.func.sum(StockMovement.quantity))
            ).filter(
                StockMovement.product_id == product.id,
                StockMovement.movement_type == 'out',
                StockMovement.created_at >= thirty_days_ago
            ).group_by(db.func.date(StockMovement.created_at)).scalar()
            
            if not daily_sales:
                daily_sales = 1  # Valor por defecto
            
            # Calcular stock de seguridad (15 días de ventas)
            safety_stock = daily_sales * 15
            
            # Cantidad sugerida: llevar al máximo considerando stock de seguridad
            suggested_quantity = max(
                product.max_stock - product.current_stock,
                safety_stock
            )
            
            # Costo estimado del reorden
            estimated_cost = suggested_quantity * (product.cost or product.price * 0.7)
            
            suggestions.append({
                'product': product.to_dict(),
                'suggested_quantity': int(suggested_quantity),
                'estimated_cost': float(estimated_cost),
                'priority': 'high' if product.current_stock <= product.min_stock * 0.5 else 'medium',
                'daily_sales_avg': round(daily_sales, 2),
                'days_until_out': int(product.current_stock / daily_sales) if daily_sales > 0 else None,
                'safety_stock_suggested': int(safety_stock)
            })
        
        # Ordenar por prioridad y días hasta agotamiento
        suggestions.sort(key=lambda x: (
            x['priority'] == 'high',
            x['days_until_out'] or 0
        ), reverse=True)
        
        # Calcular totales
        total_cost = sum(s['estimated_cost'] for s in suggestions)
        high_priority_count = len([s for s in suggestions if s['priority'] == 'high'])
        
        return jsonify({
            'success': True,
            'data': {
                'total_products_to_reorder': len(suggestions),
                'high_priority_count': high_priority_count,
                'estimated_total_cost': round(total_cost, 2),
                'suggestions': suggestions
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo sugerencias de reorden: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@inventory_bp.route('/bulk-update', methods=['POST'])
def bulk_update_stock():
    """Actualización masiva de stock"""
    try:
        data = request.get_json()
        
        if 'updates' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requiere array de updates'
            }), 400
        
        updates = data['updates']
        reason = data.get('reason', 'bulk_update')
        user = data.get('user', 'system')
        
        successful_updates = []
        failed_updates = []
        
        for update in updates:
            try:
                product_id = update['product_id']
                new_stock = int(update['new_stock'])
                notes = update.get('notes', '')
                
                # Obtener producto
                product = Product.query.get(product_id)
                if not product:
                    failed_updates.append({
                        'product_id': product_id,
                        'error': 'Producto no encontrado'
                    })
                    continue
                
                # Guardar stock anterior
                previous_stock = product.current_stock
                
                # Actualizar stock
                product.current_stock = new_stock
                product.updated_at = datetime.utcnow()
                
                # Registrar movimiento
                movement = StockMovement(
                    product_id=product_id,
                    movement_type='adjustment',
                    quantity=abs(new_stock - previous_stock),
                    previous_stock=previous_stock,
                    new_stock=new_stock,
                    reason=reason,
                    notes=notes,
                    created_by=user
                )
                
                db.session.add(movement)
                
                successful_updates.append({
                    'product_id': product_id,
                    'product_name': product.name,
                    'previous_stock': previous_stock,
                    'new_stock': new_stock
                })
                
            except Exception as e:
                failed_updates.append({
                    'product_id': update.get('product_id', 'unknown'),
                    'error': str(e)
                })
        
        # Confirmar cambios si todo salió bien
        if not failed_updates:
            db.session.commit()
        else:
            db.session.rollback()
        
        logger.info(f"Actualización masiva: {len(successful_updates)} exitosas, {len(failed_updates)} fallidas")
        
        return jsonify({
            'success': len(failed_updates) == 0,
            'data': {
                'successful_updates': successful_updates,
                'failed_updates': failed_updates,
                'total_processed': len(updates)
            },
            'message': f'Procesadas {len(successful_updates)} actualizaciones exitosas'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error en actualización masiva de stock: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@inventory_bp.route('/alerts', methods=['GET'])
def get_inventory_alerts():
    """Obtener alertas de inventario"""
    try:
        alerts = []
        
        # Productos con stock crítico
        critical_products = Product.query.filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock * 0.5
        ).all()
        
        for product in critical_products:
            alerts.append({
                'type': 'critical_stock',
                'severity': 'high',
                'product_id': product.id,
                'product_name': product.name,
                'current_stock': product.current_stock,
                'min_stock': product.min_stock,
                'message': f'Stock crítico: {product.name} ({product.current_stock} unidades)',
                'created_at': datetime.now().isoformat()
            })
        
        # Productos con stock bajo
        low_products = Product.query.filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock,
            Product.current_stock > Product.min_stock * 0.5
        ).all()
        
        for product in low_products:
            alerts.append({
                'type': 'low_stock',
                'severity': 'medium',
                'product_id': product.id,
                'product_name': product.name,
                'current_stock': product.current_stock,
                'min_stock': product.min_stock,
                'message': f'Stock bajo: {product.name} ({product.current_stock} unidades)',
                'created_at': datetime.now().isoformat()
            })
        
        # Productos sin movimiento en 30 días
        thirty_days_ago = datetime.now() - timedelta(days=30)
        no_movement_products = Product.query.filter(
            Product.is_active == True,
            ~Product.id.in_(
                db.session.query(StockMovement.product_id).filter(
                    StockMovement.created_at >= thirty_days_ago
                )
            )
        ).limit(5).all()  # Limitar a 5 para no saturar
        
        for product in no_movement_products:
            alerts.append({
                'type': 'no_movement',
                'severity': 'low',
                'product_id': product.id,
                'product_name': product.name,
                'message': f'Sin movimiento: {product.name} (30+ días)',
                'created_at': datetime.now().isoformat()
            })
        
        # Productos con sobrestock
        overstock_products = Product.query.filter(
            Product.is_active == True,
            Product.current_stock >= Product.max_stock * 1.1
        ).all()
        
        for product in overstock_products:
            alerts.append({
                'type': 'overstock',
                'severity': 'low',
                'product_id': product.id,
                'product_name': product.name,
                'current_stock': product.current_stock,
                'max_stock': product.max_stock,
                'message': f'Sobrestock: {product.name} ({product.current_stock} unidades)',
                'created_at': datetime.now().isoformat()
            })
        
        # Ordenar por severidad
        severity_order = {'high': 3, 'medium': 2, 'low': 1}
        alerts.sort(key=lambda x: severity_order[x['severity']], reverse=True)
        
        return jsonify({
            'success': True,
            'data': {
                'total_alerts': len(alerts),
                'critical_count': len([a for a in alerts if a['severity'] == 'high']),
                'medium_count': len([a for a in alerts if a['severity'] == 'medium']),
                'low_count': len([a for a in alerts if a['severity'] == 'low']),
                'alerts': alerts
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo alertas de inventario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@inventory_bp.route('/stats', methods=['GET'])
def get_inventory_stats():
    """Obtener estadísticas generales de inventario"""
    try:
        # Estadísticas básicas
        total_products = Product.query.filter(Product.is_active == True).count()
        
        # Productos por estado de stock
        low_stock = Product.query.filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock
        ).count()
        
        critical_stock = Product.query.filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock * 0.5
        ).count()
        
        normal_stock = total_products - low_stock
        
        # Valor total del inventario
        total_value = db.session.query(
            db.func.sum(Product.current_stock * Product.price)
        ).filter(Product.is_active == True).scalar() or 0
        
        # Movimientos recientes (últimos 7 días)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_movements = StockMovement.query.filter(
            StockMovement.created_at >= seven_days_ago
        ).count()
        
        # Productos más vendidos (últimos 30 días)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        top_selling = db.session.query(
            Product.name,
            db.func.sum(StockMovement.quantity).label('total_sold')
        ).join(StockMovement).filter(
            StockMovement.movement_type == 'out',
            StockMovement.created_at >= thirty_days_ago
        ).group_by(Product.id, Product.name)\
         .order_by(db.desc('total_sold')).limit(5).all()
        
        return jsonify({
            'success': True,
            'data': {
                'total_products': total_products,
                'stock_status': {
                    'normal': normal_stock,
                    'low': low_stock,
                    'critical': critical_stock
                },
                'total_inventory_value': float(total_value),
                'recent_movements_7days': recent_movements,
                'top_selling_products': [
                    {
                        'name': name,
                        'total_sold': int(sold)
                    }
                    for name, sold in top_selling
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de inventario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500