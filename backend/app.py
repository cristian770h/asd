# app.py - Aplicación Flask Principal
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
from datetime import datetime
import logging

# Imports locales
from config import Config
from database.connection import db, init_db
from api.products import products_bp
from api.orders import orders_bp
from api.predictions import predictions_bp
from api.clustering import clustering_bp
from api.inventory import inventory_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configurar CORS
    CORS(app, origins=["http://localhost:5173"])
    
    # Configurar SocketIO para tiempo real
    socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173")
    
    # Configurar logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Inicializar base de datos
    init_db(app)
    
    # Registrar blueprints
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(clustering_bp, url_prefix='/api/clustering')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    
    # Rutas principales
    @app.route('/')
    def index():
        return jsonify({
            "message": "CocoPet ML API",
            "version": "1.0.0",
            "status": "active",
            "timestamp": datetime.now().isoformat()
        })
    
    @app.route('/api/health')
    def health_check():
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        })
    
    # WebSocket events para notificaciones en tiempo real
    @socketio.on('connect')
    def handle_connect():
        logger.info('Cliente conectado')
        emit('status', {'msg': 'Conectado al servidor CocoPet ML'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info('Cliente desconectado')
    
    # Función para enviar alertas de stock bajo
    def send_stock_alert(product_name, current_stock, min_stock):
        socketio.emit('stock_alert', {
            'product': product_name,
            'current_stock': current_stock,
            'min_stock': min_stock,
            'timestamp': datetime.now().isoformat()
        })
    
    # Función para enviar actualizaciones de predicciones
    def send_prediction_update(prediction_type, data):
        socketio.emit('prediction_update', {
            'type': prediction_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
    
    # Manejo de errores
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endpoint no encontrado'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Solicitud mal formada'}), 400
    
    # Middleware para logging de requests
    @app.before_request
    def log_request_info():
        logger.info(f'{request.method} {request.url} - {request.remote_addr}')
    
    # Almacenar instancias para uso en otros módulos
    app.socketio = socketio
    app.send_stock_alert = send_stock_alert
    app.send_prediction_update = send_prediction_update
    
    return app, socketio

if __name__ == '__main__':
    app, socketio = create_app()
    
    # Crear tablas si no existen
    with app.app_context():
        db.create_all()
        print("✅ Base de datos inicializada")
    
    print("🚀 Iniciando servidor CocoPet ML...")
    print("📱 API disponible en: http://localhost:5000")
    print("📊 Dashboard en: http://localhost:5173")
    
    # Ejecutar servidor con SocketIO
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)