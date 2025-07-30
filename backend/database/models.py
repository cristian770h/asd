# database/models.py - Modelos de Base de Datos
from datetime import datetime, timezone
from database.connection import db
from sqlalchemy import Index

class Product(db.Model):
    """Modelo de productos"""
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(191), nullable=False, unique=True)
    brand = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    weight_size = db.Column(db.String(50))  # ej: "20kg", "15ml"
    price = db.Column(db.Numeric(10, 2), nullable=False)
    cost = db.Column(db.Numeric(10, 2))  # Costo del producto
    
    # Control de inventario
    current_stock = db.Column(db.Integer, default=0)
    min_stock = db.Column(db.Integer, default=5)
    max_stock = db.Column(db.Integer, default=100)
    reorder_point = db.Column(db.Integer, default=10)
    
    # Metadatos
    sku = db.Column(db.String(50), unique=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    sales = db.relationship('Sale', backref='product', lazy=True)
    stock_movements = db.relationship('StockMovement', backref='product', lazy=True)
    
    def __repr__(self):
        return f'<Product {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'brand': self.brand,
            'category': self.category,
            'weight_size': self.weight_size,
            'price': float(self.price),
            'cost': float(self.cost) if self.cost else None,
            'current_stock': self.current_stock,
            'min_stock': self.min_stock,
            'max_stock': self.max_stock,
            'reorder_point': self.reorder_point,
            'sku': self.sku,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @property
    def stock_status(self):
        """Determina el estado del stock"""
        if self.current_stock <= self.min_stock * 0.5:
            return 'critical'
        elif self.current_stock <= self.min_stock:
            return 'low'
        elif self.current_stock >= self.max_stock * 0.9:
            return 'high'
        return 'normal'

class Customer(db.Model):
    """Modelo de clientes"""
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), unique=True)
    name = db.Column(db.String(255))
    email = db.Column(db.String(255))
    address = db.Column(db.Text)
    
    # Coordenadas por defecto del cliente
    default_latitude = db.Column(db.Float)
    default_longitude = db.Column(db.Float)
    
    # Metadatos
    total_orders = db.Column(db.Integer, default=0)
    total_spent = db.Column(db.Numeric(12, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    sales = db.relationship('Sale', backref='customer', lazy=True)
    
    def __repr__(self):
        return f'<Customer {self.phone}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'phone': self.phone,
            'name': self.name,
            'email': self.email,
            'address': self.address,
            'default_latitude': self.default_latitude,
            'default_longitude': self.default_longitude,
            'total_orders': self.total_orders,
            'total_spent': float(self.total_spent) if self.total_spent else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Sale(db.Model):
    """Modelo de ventas"""
    __tablename__ = 'sales'
    
    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.String(20), unique=True, nullable=False)  # ej: VTA7063
    
    # Referencias a otras tablas
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    
    # Datos de la venta
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(12, 2), nullable=False)
    
    # Datos geográficos
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.Text)
    
    # Datos temporales
    sale_date = db.Column(db.Date, nullable=False)
    sale_time = db.Column(db.Time)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Metadatos
    source = db.Column(db.String(50), default='whatsapp')  # whatsapp, web, manual
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='confirmed')  # pending, confirmed, delivered, cancelled
    
    # Clustering
    cluster_id = db.Column(db.Integer)  # ID del cluster geográfico
    
    def __repr__(self):
        return f'<Sale {self.sale_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'sale_id': self.sale_id,
            'product_id': self.product_id,
            'customer_id': self.customer_id,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'total_price': float(self.total_price),
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'sale_date': self.sale_date.isoformat() if self.sale_date else None,
            'sale_time': self.sale_time.isoformat() if self.sale_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'source': self.source,
            'notes': self.notes,
            'status': self.status,
            'cluster_id': self.cluster_id,
            'product': self.product.to_dict() if self.product else None,
            'customer': self.customer.to_dict() if self.customer else None
        }

class StockMovement(db.Model):
    """Modelo de movimientos de inventario"""
    __tablename__ = 'stock_movements'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    movement_type = db.Column(db.String(20), nullable=False)  # in, out, adjustment
    quantity = db.Column(db.Integer, nullable=False)
    previous_stock = db.Column(db.Integer, nullable=False)
    new_stock = db.Column(db.Integer, nullable=False)
    
    reason = db.Column(db.String(100))  # sale, purchase, adjustment, return
    reference_id = db.Column(db.String(50))  # ID de venta, compra, etc.
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))  # Usuario que hizo el movimiento
    
    def __repr__(self):
        return f'<StockMovement {self.product_id}: {self.movement_type} {self.quantity}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'movement_type': self.movement_type,
            'quantity': self.quantity,
            'previous_stock': self.previous_stock,
            'new_stock': self.new_stock,
            'reason': self.reason,
            'reference_id': self.reference_id,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'product': self.product.to_dict() if self.product else None
        }

class Prediction(db.Model):
    """Modelo de predicciones"""
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    prediction_type = db.Column(db.String(50), nullable=False)  # daily, weekly, monthly, product, zone
    
    # Datos de la predicción
    target_date = db.Column(db.Date)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    cluster_id = db.Column(db.Integer)
    
    predicted_value = db.Column(db.Float, nullable=False)
    confidence_lower = db.Column(db.Float)
    confidence_upper = db.Column(db.Float)
    confidence_level = db.Column(db.Float, default=0.95)
    
    # Metadatos del modelo
    model_name = db.Column(db.String(50), nullable=False)
    model_version = db.Column(db.String(20))
    accuracy_score = db.Column(db.Float)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<Prediction {self.prediction_type}: {self.predicted_value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'prediction_type': self.prediction_type,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'product_id': self.product_id,
            'cluster_id': self.cluster_id,
            'predicted_value': self.predicted_value,
            'confidence_lower': self.confidence_lower,
            'confidence_upper': self.confidence_upper,
            'confidence_level': self.confidence_level,
            'model_name': self.model_name,
            'model_version': self.model_version,
            'accuracy_score': self.accuracy_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'product': self.product.to_dict() if self.product else None
        }

class ClusterInfo(db.Model):
    """Información de clusters geográficos"""
    __tablename__ = 'clusters_info'
    
    id = db.Column(db.Integer, primary_key=True)
    cluster_id = db.Column(db.Integer, nullable=False, unique=True)
    
    # Centroide del cluster
    center_latitude = db.Column(db.Float, nullable=False)
    center_longitude = db.Column(db.Float, nullable=False)
    
    # Estadísticas del cluster
    total_sales = db.Column(db.Integer, default=0)
    total_revenue = db.Column(db.Numeric(12, 2), default=0)
    avg_order_value = db.Column(db.Numeric(10, 2), default=0)
    
    # Zona geográfica aproximada
    zone_name = db.Column(db.String(100))
    zone_description = db.Column(db.Text)
    
    # Metadatos
    algorithm_used = db.Column(db.String(20))  # kmeans, dbscan
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<ClusterInfo {self.cluster_id}: {self.zone_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'cluster_id': self.cluster_id,
            'center_latitude': self.center_latitude,
            'center_longitude': self.center_longitude,
            'total_sales': self.total_sales,
            'total_revenue': float(self.total_revenue),
            'avg_order_value': float(self.avg_order_value),
            'zone_name': self.zone_name,
            'zone_description': self.zone_description,
            'algorithm_used': self.algorithm_used,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'is_active': self.is_active
        }

# Índices para optimizar consultas
Index('idx_sales_date', Sale.sale_date)
Index('idx_sales_location', Sale.latitude, Sale.longitude)
Index('idx_sales_product', Sale.product_id)
Index('idx_sales_cluster', Sale.cluster_id)
Index('idx_predictions_date', Prediction.target_date)
Index('idx_predictions_type', Prediction.prediction_type)
Index('idx_stock_movements_product', StockMovement.product_id)
Index('idx_products_brand_category', Product.brand, Product.category)