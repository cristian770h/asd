# backend/api/orders.py - API de Pedidos
from flask import Blueprint, request, jsonify
from database.connection import db
from database.models import Sale, Product, Customer
from models.nlp_processor import NLPProcessor
from datetime import datetime, date
import logging

orders_bp = Blueprint('orders', __name__)
logger = logging.getLogger(__name__)

# Inicializar procesador NLP
nlp_processor = NLPProcessor()

@orders_bp.route('/', methods=['GET'])
def get_orders():
    """Obtener lista de pedidos/ventas"""
    try:
        # Parámetros de consulta
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        product_id = request.args.get('product_id', type=int)
        customer_id = request.args.get('customer_id', type=int)
        
        # Query base con joins
        query = Sale.query.join(Product).outerjoin(Customer)
        
        # Filtros
        if start_date:
            query = query.filter(Sale.sale_date >= datetime.fromisoformat(start_date).date())
        
        if end_date:
            query = query.filter(Sale.sale_date <= datetime.fromisoformat(end_date).date())
        
        if status:
            query = query.filter(Sale.status == status)
        
        if product_id:
            query = query.filter(Sale.product_id == product_id)
        
        if customer_id:
            query = query.filter(Sale.customer_id == customer_id)
        
        # Ordenar por fecha descendente
        query = query.order_by(Sale.created_at.desc())
        
        # Paginación
        orders = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [order.to_dict() for order in orders.items],
            'pagination': {
                'page': page,
                'pages': orders.pages,
                'per_page': per_page,
                'total': orders.total,
                'has_next': orders.has_next,
                'has_prev': orders.has_prev
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo pedidos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """Obtener pedido específico"""
    try:
        order = Sale.query.get_or_404(order_id)
        return jsonify({
            'success': True,
            'data': order.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo pedido {order_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/', methods=['POST'])
def create_order():
    """Crear nuevo pedido manualmente"""
    try:
        data = request.get_json()
        
        # Validaciones básicas
        required_fields = ['product_id', 'quantity', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Campo requerido: {field}'
                }), 400
        
        # Verificar producto
        product = Product.query.get_or_404(data['product_id'])
        
        # Verificar stock disponible
        if product.current_stock < data['quantity']:
            return jsonify({
                'success': False,
                'error': 'Stock insuficiente'
            }), 400
        
        # Generar ID de venta único
        import random
        import string
        sale_id = 'VTA' + ''.join(random.choices(string.digits, k=4))
        
        # Verificar que no exista
        while Sale.query.filter_by(sale_id=sale_id).first():
            sale_id = 'VTA' + ''.join(random.choices(string.digits, k=4))
        
        # Calcular precios
        unit_price = data.get('unit_price', product.price)
        total_price = unit_price * data['quantity']
        
        # Crear venta
        sale = Sale(
            sale_id=sale_id,
            product_id=data['product_id'],
            customer_id=data.get('customer_id'),
            quantity=data['quantity'],
            unit_price=unit_price,
            total_price=total_price,
            latitude=data['latitude'],
            longitude=data['longitude'],
            address=data.get('address'),
            sale_date=date.today(),
            source='manual',
            notes=data.get('notes'),
            status='confirmed'
        )
        
        db.session.add(sale)
        db.session.commit()
        
        logger.info(f"Pedido creado manualmente: {sale.sale_id}")
        
        return jsonify({
            'success': True,
            'data': sale.to_dict(),
            'message': 'Pedido creado exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creando pedido: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/parse-whatsapp', methods=['POST'])
def parse_whatsapp_message():
    """Parsear mensaje de WhatsApp para crear pedido"""
    try:
        data = request.get_json()
        
        if 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Campo message requerido'
            }), 400
        
        # Parsear mensaje con NLP
        parsed_data = nlp_processor.parse_whatsapp_message(data['message'])
        
        # Validar datos parseados
        validation = nlp_processor.validate_parsed_data(parsed_data)
        
        return jsonify({
            'success': True,
            'data': {
                'parsed_data': parsed_data,
                'validation': validation,
                'can_create_order': validation['is_valid']
            }
        })
        
    except Exception as e:
        logger.error(f"Error parseando mensaje WhatsApp: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/create-from-whatsapp', methods=['POST'])
def create_order_from_whatsapp():
    """Crear pedido desde datos parseados de WhatsApp"""
    try:
        data = request.get_json()
        
        if 'parsed_data' not in data:
            return jsonify({
                'success': False,
                'error': 'Datos parseados requeridos'
            }), 400
        
        parsed_data = data['parsed_data']
        
        # Validar que tengamos los datos mínimos
        if not parsed_data.get('coordinates') or not parsed_data.get('products'):
            return jsonify({
                'success': False,
                'error': 'Datos insuficientes para crear pedido'
            }), 400
        
        created_orders = []
        
        # Crear pedido para cada producto
        for product_data in parsed_data['products']:
            # Verificar que el producto existe
            product = Product.query.get(product_data['product_id'])
            if not product:
                continue
            
            # Verificar stock
            if product.current_stock < product_data['quantity']:
                logger.warning(f"Stock insuficiente para {product.name}")
                continue
            
            # Generar ID único
            import random
            import string
            sale_id = 'WA' + ''.join(random.choices(string.digits, k=5))
            while Sale.query.filter_by(sale_id=sale_id).first():
                sale_id = 'WA' + ''.join(random.choices(string.digits, k=5))
            
            # Buscar o crear cliente si hay número
            customer_id = None
            if parsed_data.get('client_number'):
                phone = parsed_data['client_number']
                customer = Customer.query.filter_by(phone=phone).first()
                if not customer:
                    customer = Customer(
                        phone=phone,
                        default_latitude=parsed_data['coordinates'][0],
                        default_longitude=parsed_data['coordinates'][1]
                    )
                    db.session.add(customer)
                    db.session.flush()  # Para obtener el ID
                customer_id = customer.id
            
            # Crear venta
            sale = Sale(
                sale_id=sale_id,
                product_id=product_data['product_id'],
                customer_id=customer_id,
                quantity=product_data['quantity'],
                unit_price=product_data['price'],
                total_price=product_data['price'] * product_data['quantity'],
                latitude=parsed_data['coordinates'][0],
                longitude=parsed_data['coordinates'][1],
                sale_date=date.today(),
                source='whatsapp',
                notes=f"Parseado automáticamente. Confianza: {parsed_data.get('confidence', 0):.2f}",
                status='confirmed'
            )
            
            db.session.add(sale)
            created_orders.append(sale)
        
        db.session.commit()
        
        logger.info(f"Creados {len(created_orders)} pedidos desde WhatsApp")
        
        return jsonify({
            'success': True,
            'data': [order.to_dict() for order in created_orders],
            'message': f'{len(created_orders)} pedidos creados exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creando pedidos desde WhatsApp: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    """Actualizar estado del pedido"""
    try:
        order = Sale.query.get_or_404(order_id)
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({
                'success': False,
                'error': 'Campo status requerido'
            }), 400
        
        valid_statuses = ['pending', 'confirmed', 'delivered', 'cancelled']
        if data['status'] not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'Estado inválido. Válidos: {valid_statuses}'
            }), 400
        
        old_status = order.status
        order.status = data['status']
        
        if data.get('notes'):
            order.notes = data['notes']
        
        db.session.commit()
        
        logger.info(f"Estado de pedido {order.sale_id} cambiado: {old_status} -> {data['status']}")
        
        return jsonify({
            'success': True,
            'data': order.to_dict(),
            'message': 'Estado actualizado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error actualizando estado del pedido {order_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/recent', methods=['GET'])
def get_recent_orders():
    """Obtener pedidos recientes para dashboard"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        recent_orders = Sale.query.join(Product)\
            .order_by(Sale.created_at.desc())\
            .limit(limit).all()
        
        orders_data = []
        for order in recent_orders:
            order_dict = order.to_dict()
            orders_data.append({
                'id': order.id,
                'saleId': order.sale_id,
                'productName': order.product.name,
                'productBrand': order.product.brand,
                'quantity': order.quantity,
                'totalPrice': float(order.total_price),
                'status': order.status,
                'createdAt': order.created_at.isoformat() if order.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': orders_data
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo pedidos recientes: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/stats', methods=['GET'])
def get_order_stats():
    """Obtener estadísticas de pedidos"""
    try:
        today = date.today()
        
        # Ventas de hoy
        today_sales = Sale.query.filter(Sale.sale_date == today).all()
        today_count = len(today_sales)
        today_revenue = sum(float(sale.total_price) for sale in today_sales)
        
        # Ventas de ayer para comparación
        from datetime import timedelta
        yesterday = today - timedelta(days=1)
        yesterday_sales = Sale.query.filter(Sale.sale_date == yesterday).all()
        yesterday_count = len(yesterday_sales)
        
        # Calcular crecimiento
        growth = 0
        if yesterday_count > 0:
            growth = ((today_count - yesterday_count) / yesterday_count) * 100
        
        # Pedidos pendientes
        pending_orders = Sale.query.filter(Sale.status == 'pending').count()
        
        # Ventas por estado
        status_stats = db.session.query(
            Sale.status,
            db.func.count(Sale.id).label('count')
        ).group_by(Sale.status).all()
        
        # Ventas por fuente
        source_stats = db.session.query(
            Sale.source,
            db.func.count(Sale.id).label('count')
        ).group_by(Sale.source).all()
        
        return jsonify({
            'success': True,
            'data': {
                'today_sales': {
                    'count': today_count,
                    'revenue': today_revenue,
                    'growth': round(growth, 2)
                },
                'pending_orders': {
                    'count': pending_orders
                },
                'by_status': [
                    {'status': status, 'count': count}
                    for status, count in status_stats
                ],
                'by_source': [
                    {'source': source, 'count': count}
                    for source, count in source_stats
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de pedidos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/daily-summary', methods=['GET'])
def get_daily_summary():
    """Obtener resumen diario de ventas"""
    try:
        days = request.args.get('days', 30, type=int)
        
        from datetime import timedelta
        start_date = date.today() - timedelta(days=days)
        
        # Query para resumen diario
        daily_data = db.session.query(
            Sale.sale_date,
            db.func.count(Sale.id).label('sales_count'),
            db.func.sum(Sale.total_price).label('total_revenue'),
            db.func.sum(Sale.quantity).label('total_quantity')
        ).filter(
            Sale.sale_date >= start_date
        ).group_by(Sale.sale_date).order_by(Sale.sale_date).all()
        
        summary_data = []
        for row in daily_data:
            summary_data.append({
                'date': row.sale_date.isoformat(),
                'sales_count': row.sales_count,
                'total_revenue': float(row.total_revenue),
                'total_quantity': row.total_quantity,
                'avg_order_value': float(row.total_revenue / row.sales_count) if row.sales_count > 0 else 0
            })
        
        return jsonify({
            'success': True,
            'data': summary_data
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo resumen diario: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@orders_bp.route('/product-performance', methods=['GET'])
def get_product_performance():
    """Obtener rendimiento de productos"""
    try:
        days = request.args.get('days', 30, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        from datetime import timedelta
        start_date = date.today() - timedelta(days=days)
        
        # Query para rendimiento de productos
        product_performance = db.session.query(
            Product.id,
            Product.name,
            Product.brand,
            Product.category,
            db.func.count(Sale.id).label('sales_count'),
            db.func.sum(Sale.quantity).label('total_quantity'),
            db.func.sum(Sale.total_price).label('total_revenue')
        ).join(Sale).filter(
            Sale.sale_date >= start_date
        ).group_by(
            Product.id, Product.name, Product.brand, Product.category
        ).order_by(
            db.desc('total_revenue')
        ).limit(limit).all()
        
        performance_data = []
        for row in product_performance:
            performance_data.append({
                'product_id': row.id,
                'product_name': row.name,
                'brand': row.brand,
                'category': row.category,
                'sales_count': row.sales_count,
                'total_quantity': row.total_quantity,
                'total_revenue': float(row.total_revenue),
                'avg_sale_value': float(row.total_revenue / row.sales_count) if row.sales_count > 0 else 0
            })
        
        return jsonify({
            'success': True,
            'data': performance_data
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo rendimiento de productos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500