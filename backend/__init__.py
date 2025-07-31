# backend/__init__.py - Inicialización del paquete backend

# Importaciones principales que se usarán frecuentemente
from .config import Config, config  # Expone la configuración
from .database.connection import db, init_db  # Expone la base de datos

# Versión del paquete
__version__ = '1.0.0'

# Inicialización de extensiones (si usas Flask u otros)
def init_app(app):
    """Inicializa extensiones para la aplicación"""
    init_db(app)
    # Otras inicializaciones aquí
    
# Exporta los símbolos principales
__all__ = ['Config', 'config', 'db', 'init_db', 'init_app']