# backend/api/products.py - API de Productos
from flask import Blueprint, request, jsonify
from database.connection import db
from database.models import Product, StockMovement
from datetime import datetime
import logging

products_bp = Blueprint('products', __name__)
logger = logging.getLogger(__name__)

@products_bp.route('/', methods=['GET'])
def get_products():
    """Obtener lista de productos con filtros"""
    try:
        # Parámetros de consulta
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category = request.args.get('category')
        brand = request.args.get('brand')
        search = request.args.get('search')
        stock_status = request.args.get('stock_status')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        # Query base
        query = Product.query
        
        # Filtros
        if active_only:
            query = query.filter(Product.is_active == True)
        
        if category:
            query = query.filter(Product.category == category)
        
        if brand:
            query = query.filter(Product.brand == brand)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Product.name.ilike(search_term),
                    Product.brand.ilike(search_term),
                    Product.sku.ilike(search_term)
                )
            )
        
        # Filtro por estado de stock
        if stock_status:
            if stock_status == 'low':
                query = query.filter(Product.current_stock <= Product.min_stock)
            elif stock_status == 'critical':
                query = query.filter(Product.current_stock <= Product.min_stock * 0.5)
            elif stock_status == 'high':
                query = query.filter(Product.current_stock >= Product.max_stock * 0.9)
        
        # Paginación
        products = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [product.to_dict() for product in products.items],
            'pagination': {
                'page': page,
                'pages': products.pages,
                'per_page': per_page,
                'total': products.total,
                'has_next': products.has_next,
                'has_prev': products.has_prev
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo productos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Obtener producto específico"""
    try:
        product = Product.query.get_or_404(product_id)
        return jsonify({
            'success': True,
            'data': product.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo producto {product_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/', methods=['POST'])
def create_product():
    """Crear nuevo producto"""
    try:
        data = request.get_json()
        
        # Validaciones básicas
        required_fields = ['name', 'brand', 'category', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False, 
                    'error': f'Campo requerido: {field}'
                }), 400
        
        # Verificar que el producto no exista
        existing = Product.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({
                'success': False,
                'error': 'Ya existe un producto con ese nombre'
            }), 400
        
        # Crear producto
        product = Product(
            name=data['name'],
            brand=data['brand'],
            category=data['category'],
            weight_size=data.get('weight_size'),
            price=data['price'],
            cost=data.get('cost'),
            current_stock=data.get('current_stock', 0),
            min_stock=data.get('min_stock', 5),
            max_stock=data.get('max_stock', 100),
            reorder_point=data.get('reorder_point', 10),
            sku=data.get('sku'),
            description=data.get('description')
        )
        
        db.session.add(product)
        db.session.commit()
        
        # Registrar movimiento inicial de stock si hay
        if product.current_stock > 0:
            movement = StockMovement(
                product_id=product.id,
                movement_type='in',
                quantity=product.current_stock,
                previous_stock=0,
                new_stock=product.current_stock,
                reason='initial_stock',
                created_by='system'
            )
            db.session.add(movement)
            db.session.commit()
        
        logger.info(f"Producto creado: {product.name}")
        
        return jsonify({
            'success': True,
            'data': product.to_dict(),
            'message': 'Producto creado exitosamente'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creando producto: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Actualizar producto"""
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        # Actualizar campos permitidos
        updatable_fields = [
            'name', 'brand', 'category', 'weight_size', 'price', 'cost',
            'min_stock', 'max_stock', 'reorder_point', 'sku', 'description', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(product, field, data[field])
        
        product.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Producto actualizado: {product.name}")
        
        return jsonify({
            'success': True,
            'data': product.to_dict(),
            'message': 'Producto actualizado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error actualizando producto {product_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/<int:product_id>/stock', methods=['POST'])
def update_stock(product_id):
    """Actualizar stock de producto"""
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        if 'quantity' not in data or 'type' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requieren quantity y type'
            }), 400
        
        quantity = int(data['quantity'])
        movement_type = data['type']  # 'in', 'out', 'adjustment'
        reason = data.get('reason', 'manual')
        notes = data.get('notes', '')
        
        if movement_type not in ['in', 'out', 'adjustment']:
            return jsonify({
                'success': False,
                'error': 'Tipo de movimiento inválido'
            }), 400
        
        # Calcular nuevo stock
        previous_stock = product.current_stock
        
        if movement_type == 'in':
            new_stock = previous_stock + quantity
        elif movement_type == 'out':
            new_stock = previous_stock - quantity
            if new_stock < 0:
                return jsonify({
                    'success': False,
                    'error': 'Stock insuficiente'
                }), 400
        else:  # adjustment
            new_stock = quantity
        
        # Actualizar producto
        product.current_stock = new_stock
        product.updated_at = datetime.utcnow()
        
        # Registrar movimiento
        movement = StockMovement(
            product_id=product.id,
            movement_type=movement_type,
            quantity=abs(quantity) if movement_type != 'adjustment' else abs(new_stock - previous_stock),
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=reason,
            notes=notes,
            created_by=data.get('user', 'system')
        )
        
        db.session.add(movement)
        db.session.commit()
        
        logger.info(f"Stock actualizado para {product.name}: {previous_stock} -> {new_stock}")
        
        return jsonify({
            'success': True,
            'data': {
                'product': product.to_dict(),
                'movement': movement.to_dict()
            },
            'message': 'Stock actualizado exitosamente'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error actualizando stock del producto {product_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/<int:product_id>/movements', methods=['GET'])
def get_product_movements(product_id):
    """Obtener movimientos de stock de un producto"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        product = Product.query.get_or_404(product_id)
        
        movements = StockMovement.query.filter_by(product_id=product_id)\
            .order_by(StockMovement.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'data': [movement.to_dict() for movement in movements.items],
            'pagination': {
                'page': page,
                'pages': movements.pages,
                'per_page': per_page,
                'total': movements.total
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo movimientos del producto {product_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/categories', methods=['GET'])
def get_categories():
    """Obtener categorías disponibles"""
    try:
        categories = db.session.query(Product.category)\
            .filter(Product.is_active == True)\
            .distinct().all()
        
        return jsonify({
            'success': True,
            'data': [cat[0] for cat in categories]
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo categorías: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/brands', methods=['GET'])
def get_brands():
    """Obtener marcas disponibles"""
    try:
        brands = db.session.query(Product.brand)\
            .filter(Product.is_active == True)\
            .distinct().all()
        
        return jsonify({
            'success': True,
            'data': [brand[0] for brand in brands]
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo marcas: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@products_bp.route('/stats', methods=['GET'])
def get_product_stats():
    """Obtener estadísticas de productos"""
    try:
        total_products = Product.query.filter(Product.is_active == True).count()
        
        # Stock bajo
        low_stock = Product.query.filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock
        ).count()
        
        # Stock crítico
        critical_stock = Product.query.filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock * 0.5
        ).count()
        
        # Valor total del inventario
        total_value = db.session.query(
            db.func.sum(Product.current_stock * Product.price)
        ).filter(Product.is_active == True).scalar() or 0
        
        # Por categoría
        by_category = db.session.query(
            Product.category,
            db.func.count(Product.id).label('count'),
            db.func.sum(Product.current_stock * Product.price).label('value')
        ).filter(Product.is_active == True)\
         .group_by(Product.category).all()
        
        return jsonify({
            'success': True,
            'data': {
                'total_products': total_products,
                'low_stock_count': low_stock,
                'critical_stock_count': critical_stock,
                'total_inventory_value': float(total_value),
                'by_category': [
                    {
                        'category': cat,
                        'count': count,
                        'value': float(value or 0)
                    }
                    for cat, count, value in by_category
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de productos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500