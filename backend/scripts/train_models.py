# scripts/train_models.py - Script de Entrenamiento de Modelos
import sys
import os
import logging
from datetime import datetime
import argparse

# Agregar el directorio backend al path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from flask import Flask
from config import Config
from database.connection import init_db
from models.clustering_model import GeographicClustering
from models.sales_prediction import SalesPredictor
from models.nlp_processor import NLPProcessor

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def create_app():
    """Crear aplicación Flask para contexto de base de datos"""
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app)
    return app

def train_clustering_model(app, save_model=True):
    """Entrenar modelo de clustering geográfico"""
    logger.info("=== ENTRENANDO MODELO DE CLUSTERING ===")
    
    with app.app_context():
        try:
            # Inicializar modelo
            clustering = GeographicClustering(app.config.get('CLUSTERING_CONFIG', {}))
            
            # Entrenar modelos
            results = clustering.train_models()
            
            logger.info(f"Clustering completado:")
            logger.info(f"- Mejor modelo: {results['best_model']}")
            logger.info(f"- Puntos de datos: {results['data_points']}")
            
            # Mostrar resultados de K-Means
            kmeans = results['kmeans']
            logger.info(f"K-Means - Clusters: {kmeans['n_clusters']}, "
                       f"Silhouette: {kmeans['silhouette_score']:.3f}")
            
            # Mostrar resultados de DBSCAN
            dbscan = results['dbscan']
            logger.info(f"DBSCAN - Clusters: {dbscan['n_clusters']}, "
                       f"Ruido: {dbscan['n_noise']}, "
                       f"Silhouette: {dbscan.get('silhouette_score', 'N/A')}")
            
            # Guardar modelo si se especifica
            if save_model:
                model_path = os.path.join(
                    app.config.get('MODELS_FOLDER', 'data/trained_models'),
                    'clustering_model.joblib'
                )
                clustering.save_model(model_path)
                logger.info(f"Modelo guardado en: {model_path}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error entrenando clustering: {e}")
            raise

def train_prediction_model(app, save_model=True):
    """Entrenar modelo de predicción de ventas"""
    logger.info("=== ENTRENANDO MODELO DE PREDICCIÓN ===")
    
    with app.app_context():
        try:
            # Inicializar modelo
            predictor = SalesPredictor(app.config.get('PREDICTION_CONFIG', {}))
            
            # Entrenar modelos
            results = predictor.train_all_models()
            
            logger.info(f"Predicción completada:")
            logger.info(f"- Puntos de datos: {results['data_points']}")
            
            # Mostrar resultados de ARIMA
            arima = results['arima_results']
            logger.info(f"ARIMA - MAE: {arima['mae']:.2f}, "
                       f"RMSE: {arima['rmse']:.2f}, "
                       f"AIC: {arima['aic']:.2f}")
            
            # Mostrar resultados de Random Forest
            rf = results['random_forest_results']
            logger.info(f"Random Forest - Test MAE: {rf['test_mae']:.2f}, "
                       f"Test R²: {rf['test_r2']:.3f}")
            
            # Mostrar top características
            logger.info("Top 5 características importantes:")
            for feature, importance in rf['top_features']:
                logger.info(f"  - {feature}: {importance:.4f}")
            
            # Mostrar predicciones generadas
            preds = results['predictions_generated']
            logger.info(f"Predicciones generadas:")
            logger.info(f"  - Diarias: {preds['daily']}")
            logger.info(f"  - Semanales: {preds['weekly']}")
            logger.info(f"  - Mensuales: {preds['monthly']}")
            
            # Guardar modelo si se especifica
            if save_model:
                model_path = os.path.join(
                    app.config.get('MODELS_FOLDER', 'data/trained_models'),
                    'prediction_model.joblib'
                )
                predictor.save_model(model_path)
                logger.info(f"Modelo guardado en: {model_path}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error entrenando predicción: {e}")
            raise

def update_nlp_cache(app):
    """Actualizar cache de NLP"""
    logger.info("=== ACTUALIZANDO CACHE DE NLP ===")
    
    with app.app_context():
        try:
            # Inicializar procesador NLP
            nlp_processor = NLPProcessor(app.config.get('NLP_CONFIG', {}))
            
            # Refrescar cache de productos
            nlp_processor.refresh_products_cache()
            
            logger.info("Cache de NLP actualizado exitosamente")
            return True
            
        except Exception as e:
            logger.error(f"Error actualizando NLP: {e}")
            raise

def validate_data_quality(app):
    """Validar calidad de los datos antes del entrenamiento"""
    logger.info("=== VALIDANDO CALIDAD DE DATOS ===")
    
    with app.app_context():
        from database.connection import db
        from database.models import Sale, Product
        
        try:
            # Verificar cantidad de datos
            total_sales = db.session.query(Sale).count()
            total_products = db.session.query(Product).filter(Product.is_active == True).count()
            
            logger.info(f"Total de ventas: {total_sales}")
            logger.info(f"Total de productos activos: {total_products}")
            
            # Validaciones mínimas
            if total_sales < 100:
                logger.warning(f"Pocas ventas para entrenamiento: {total_sales}")
                return False
            
            if total_products < 10:
                logger.warning(f"Pocos productos para análisis: {total_products}")
                return False
            
            # Verificar calidad de coordenadas
            sales_with_coords = db.session.query(Sale).filter(
                Sale.latitude.isnot(None),
                Sale.longitude.isnot(None),
                Sale.latitude.between(20.5, 21.5),
                Sale.longitude.between(-87.5, -86.5)
            ).count()
            
            coord_quality = (sales_with_coords / total_sales) * 100
            logger.info(f"Calidad de coordenadas: {coord_quality:.1f}%")
            
            if coord_quality < 80:
                logger.warning(f"Baja calidad de coordenadas: {coord_quality:.1f}%")
            
            # Verificar distribución temporal
            from datetime import datetime, timedelta
            recent_sales = db.session.query(Sale).filter(
                Sale.sale_date >= datetime.now().date() - timedelta(days=30)
            ).count()
            
            recent_percentage = (recent_sales / total_sales) * 100
            logger.info(f"Ventas recientes (30 días): {recent_percentage:.1f}%")
            
            logger.info("Validación de datos completada")
            return True
            
        except Exception as e:
            logger.error(f"Error validando datos: {e}")
            return False

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(description='Entrenar modelos ML de CocoPet')
    parser.add_argument('--clustering', action='store_true', 
                       help='Entrenar modelo de clustering')
    parser.add_argument('--prediction', action='store_true', 
                       help='Entrenar modelo de predicción')
    parser.add_argument('--nlp', action='store_true', 
                       help='Actualizar cache de NLP')
    parser.add_argument('--all', action='store_true', 
                       help='Entrenar todos los modelos')
    parser.add_argument('--no-save', action='store_true', 
                       help='No guardar modelos entrenados')
    parser.add_argument('--skip-validation', action='store_true', 
                       help='Saltar validación de datos')
    
    args = parser.parse_args()
    
    # Si no se especifica nada, entrenar todo
    if not any([args.clustering, args.prediction, args.nlp, args.all]):
        args.all = True
    
    logger.info("=== INICIANDO ENTRENAMIENTO DE MODELOS COCOPET ===")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    
    try:
        # Crear aplicación
        app = create_app()
        
        # Crear directorios necesarios
        models_dir = app.config.get('MODELS_FOLDER', 'data/trained_models')
        os.makedirs(models_dir, exist_ok=True)
        
        # Validar datos si no se salta
        if not args.skip_validation:
            if not validate_data_quality(app):
                logger.error("Validación de datos falló. Use --skip-validation para omitir.")
                return 1
        
        save_models = not args.no_save
        success_count = 0
        total_tasks = 0
        
        # Entrenar clustering
        if args.clustering or args.all:
            total_tasks += 1
            try:
                train_clustering_model(app, save_models)
                success_count += 1
                logger.info("✅ Clustering completado exitosamente")
            except Exception as e:
                logger.error(f"❌ Error en clustering: {e}")
        
        # Entrenar predicción
        if args.prediction or args.all:
            total_tasks += 1
            try:
                train_prediction_model(app, save_models)
                success_count += 1
                logger.info("✅ Predicción completada exitosamente")
            except Exception as e:
                logger.error(f"❌ Error en predicción: {e}")
        
        # Actualizar NLP
        if args.nlp or args.all:
            total_tasks += 1
            try:
                update_nlp_cache(app)
                success_count += 1
                logger.info("✅ NLP actualizado exitosamente")
            except Exception as e:
                logger.error(f"❌ Error en NLP: {e}")
        
        # Resumen final
        logger.info("=== RESUMEN DE ENTRENAMIENTO ===")
        logger.info(f"Tareas completadas: {success_count}/{total_tasks}")
        
        if success_count == total_tasks:
            logger.info("🎉 Todos los modelos entrenados exitosamente")
            return 0
        else:
            logger.warning(f"⚠️ {total_tasks - success_count} tareas fallaron")
            return 1
    
    except Exception as e:
        logger.error(f"Error crítico: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)