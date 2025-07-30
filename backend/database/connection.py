# database/connection.py - Conexión a MySQL
from flask_sqlalchemy import SQLAlchemy
import logging

# Instancia global de SQLAlchemy
db = SQLAlchemy()

def init_db(app):
    """Inicializar la base de datos con la aplicación Flask"""
    db.init_app(app)
    
    # Configurar logging para SQLAlchemy
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    
    with app.app_context():
        try:
            # Crear todas las tablas
            db.create_all()
            logging.info("✅ Tablas de base de datos creadas exitosamente")
            
            # Verificar conexión
            db.session.execute(db.text('SELECT 1'))
            logging.info("✅ Conexión a MySQL establecida correctamente")
            
        except Exception as e:
            logging.error(f"❌ Error al inicializar base de datos: {e}")
            raise
    
    return db

def get_db_session():
    """Obtener sesión de base de datos"""
    return db.session

def close_db_session():
    """Cerrar sesión de base de datos"""
    db.session.close()

class DatabaseManager:
    """Manejador de operaciones de base de datos"""
    
    @staticmethod
    def safe_execute(func, *args, **kwargs):
        """Ejecutar operación de base de datos con manejo de errores"""
        try:
            result = func(*args, **kwargs)
            db.session.commit()
            return result, None
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error en operación de base de datos: {e}")
            return None, str(e)
    
    @staticmethod
    def bulk_insert(model_class, data_list):
        """Inserción masiva de datos"""
        try:
            db.session.bulk_insert_mappings(model_class, data_list)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error en inserción masiva: {e}")
            return False, str(e)
    
    @staticmethod
    def execute_raw_query(query, params=None):
        """Ejecutar consulta SQL raw"""
        try:
            if params:
                result = db.session.execute(db.text(query), params)
            else:
                result = db.session.execute(db.text(query))
            return result.fetchall(), None
        except Exception as e:
            logging.error(f"Error en consulta raw: {e}")
            return None, str(e)