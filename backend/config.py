# config.py - Configuración de la Aplicación
import os
from datetime import timedelta

class Config:
    """Configuración base de la aplicación"""
    
    # Configuración básica de Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'cocopet-ml-secret-key-2025'
    
    # Configuración de base de datos MySQL
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT') or 3306)
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE') or 'cocopet_ml'
    
    # URI de conexión SQLAlchemy
    SQLALCHEMY_DATABASE_URI = (
        f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@'
        f'{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Configuración de CORS
    CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
    
    # Configuración de SocketIO
    SOCKETIO_ASYNC_MODE = 'threading'
    
    # Configuración de archivos
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB máximo
    
    # Configuración de modelos ML
    MODELS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'trained_models')
    DATASETS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'datasets')
    
    # Configuración de clustering
    CLUSTERING_CONFIG = {
        'kmeans_clusters': 5,  # Número de clusters para K-Means
        'dbscan_eps': 0.01,    # Radio para DBSCAN
        'dbscan_min_samples': 5,  # Mínimo de muestras para DBSCAN
        'update_frequency': 24  # Horas entre actualizaciones de clustering
    }
    
    # Configuración de predicciones
    PREDICTION_CONFIG = {
        'arima_order': (1, 1, 1),  # Orden ARIMA por defecto
        'seasonal_periods': 7,      # Periodicidad semanal
        'forecast_days': 30,        # Días a predecir por defecto
        'confidence_interval': 0.95,  # Intervalo de confianza
        'retrain_frequency': 7      # Días entre reentrenamientos
    }
    
    # Configuración de stock
    INVENTORY_CONFIG = {
        'low_stock_threshold': 0.2,  # 20% del stock máximo
        'critical_stock_threshold': 0.1,  # 10% del stock máximo
        'reorder_multiplier': 1.5,   # Multiplicador para reorden automática
        'alert_frequency': 6         # Horas entre alertas del mismo producto
    }
    
    # Configuración de NLP
    NLP_CONFIG = {
        'similarity_threshold': 0.7,  # Umbral de similitud para productos
        'spacy_model': 'es_core_news_sm',  # Modelo de spaCy en español
        'max_product_distance': 3,    # Distancia máxima para fuzzy matching
        'cache_embeddings': True      # Cache de embeddings de productos
    }
    
    # Configuración de WhatsApp parsing
    WHATSAPP_CONFIG = {
        'google_maps_patterns': [
            r'https://maps\.google\.com/\?q=([0-9.-]+),([0-9.-]+)',
            r'https://goo\.gl/maps/[a-zA-Z0-9]+',
            r'ubicación:\s*([0-9.-]+),\s*([0-9.-]+)'
        ],
        'product_patterns': [
            r'(nupec|nexgard|pro plan|nucan|fulltrus|hills|royal canin)',
            r'(\d+)\s*(kg|g|ml|pzas?|unidades?)',
            r'cantidad:\s*(\d+)',
            r'precio:\s*\$?(\d+(?:\.\d{2})?)'
        ],
        'client_patterns': [
            r'cliente:\s*(\d+)',
            r'#(\d+)'
        ],
        'reference_patterns': [
            r'referencia[s]?:\s*(.+?)(?:\n|$)',
            r'ref:\s*(.+?)(?:\n|$)'
        ]
    }
    
    # Configuración de logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs', 'cocopet.log')
    
    # Configuración de cache
    CACHE_CONFIG = {
        'prediction_cache_ttl': 3600,  # 1 hora
        'clustering_cache_ttl': 7200,  # 2 horas
        'product_similarity_ttl': 1800,  # 30 minutos
        'redis_url': os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    }
    
    # Configuración de API rate limiting
    RATE_LIMIT_CONFIG = {
        'default': '100 per minute',
        'prediction': '10 per minute',
        'training': '1 per hour'
    }

class DevelopmentConfig(Config):
    """Configuración para desarrollo"""
    DEBUG = True
    TESTING = False
    
class TestingConfig(Config):
    """Configuración para testing"""
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
class ProductionConfig(Config):
    """Configuración para producción"""
    DEBUG = False
    TESTING = False
    
    # Configuraciones más estrictas para producción
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
        'pool_size': 20,
        'max_overflow': 0
    }

# Diccionario de configuraciones disponibles
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}