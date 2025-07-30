# backend/models/model_trainer.py - Entrenador de Modelos
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

from database.connection import db
from database.models import Sale, Product, Prediction
from .clustering_model import GeographicClustering
from .sales_prediction import SalesPredictor
from .nlp_processor import NLPProcessor

logger = logging.getLogger(__name__)

class ModelTrainer:
    """Clase para entrenar y evaluar todos los modelos ML"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.models = {}
        self.training_results = {}
        self.models_dir = self.config.get('MODELS_FOLDER', 'data/trained_models')
        
        # Crear directorio de modelos si no existe
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.logger = logging.getLogger(__name__)
    
    def train_all_models(self, force_retrain=False) -> Dict:
        """Entrenar todos los modelos del sistema"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'success': True,
            'models_trained': [],
            'errors': [],
            'performance': {}
        }
        
        try:
            self.logger.info("=== INICIANDO ENTRENAMIENTO COMPLETO ===")
            
            # 1. Validar datos antes del entrenamiento
            if not self._validate_training_data():
                raise ValueError("Datos insuficientes para entrenamiento")
            
            # 2. Entrenar clustering geográfico
            try:
                clustering_results = self._train_clustering_model(force_retrain)
                results['models_trained'].append('clustering')
                results['performance']['clustering'] = clustering_results
                self.logger.info("✅ Clustering entrenado exitosamente")
            except Exception as e:
                error_msg = f"Error entrenando clustering: {e}"
                self.logger.error(error_msg)
                results['errors'].append(error_msg)
            
            # 3. Entrenar modelo de predicción de ventas
            try:
                prediction_results = self._train_prediction_model(force_retrain)
                results['models_trained'].append('sales_prediction')
                results['performance']['sales_prediction'] = prediction_results
                self.logger.info("✅ Predicción de ventas entrenada exitosamente")
            except Exception as e:
                error_msg = f"Error entrenando predicción: {e}"
                self.logger.error(error_msg)
                results['errors'].append(error_msg)
            
            # 4. Entrenar modelos específicos por producto
            try:
                product_results = self._train_product_models()
                results['models_trained'].append('product_models')
                results['performance']['product_models'] = product_results
                self.logger.info("✅ Modelos por producto entrenados")
            except Exception as e:
                error_msg = f"Error entrenando modelos por producto: {e}"
                self.logger.error(error_msg)
                results['errors'].append(error_msg)
            
            # 5. Actualizar procesador NLP
            try:
                nlp_results = self._update_nlp_model()
                results['models_trained'].append('nlp_processor')
                results['performance']['nlp_processor'] = nlp_results
                self.logger.info("✅ NLP actualizado exitosamente")
            except Exception as e:
                error_msg = f"Error actualizando NLP: {e}"
                self.logger.error(error_msg)
                results['errors'].append(error_msg)
            
            # 6. Evaluar rendimiento conjunto
            try:
                ensemble_results = self._evaluate_ensemble_performance()
                results['performance']['ensemble'] = ensemble_results
                self.logger.info("✅ Evaluación de conjunto completada")
            except Exception as e:
                error_msg = f"Error en evaluación de conjunto: {e}"
                self.logger.error(error_msg)
                results['errors'].append(error_msg)
            
            # 7. Guardar metadatos del entrenamiento
            self._save_training_metadata(results)
            
            if results['errors']:
                results['success'] = False
                self.logger.warning(f"Entrenamiento completado con {len(results['errors'])} errores")
            else:
                self.logger.info("🎉 Entrenamiento completado exitosamente")
                
        except Exception as e:
            results['success'] = False
            results['errors'].append(f"Error crítico en entrenamiento: {e}")
            self.logger.error(f"Error crítico: {e}")
        
        return results
    
    def _validate_training_data(self) -> bool:
        """Validar que hay suficientes datos para entrenar"""
        try:
            # Verificar cantidad de ventas
            total_sales = db.session.query(Sale).count()
            if total_sales < 100:
                self.logger.warning(f"Pocas ventas para entrenamiento: {total_sales}")
                return False
            
            # Verificar productos activos
            active_products = db.session.query(Product).filter(Product.is_active == True).count()
            if active_products < 5:
                self.logger.warning(f"Pocos productos activos: {active_products}")
                return False
            
            # Verificar distribución temporal (últimos 30 días)
            recent_sales = db.session.query(Sale).filter(
                Sale.sale_date >= datetime.now().date() - timedelta(days=30)
            ).count()
            
            if recent_sales < 20:
                self.logger.warning(f"Pocas ventas recientes: {recent_sales}")
                return False
            
            # Verificar calidad de coordenadas
            valid_coords = db.session.query(Sale).filter(
                Sale.latitude.between(20.5, 21.5),
                Sale.longitude.between(-87.5, -86.5)
            ).count()
            
            coord_quality = (valid_coords / total_sales) * 100
            if coord_quality < 70:
                self.logger.warning(f"Baja calidad de coordenadas: {coord_quality:.1f}%")
            
            self.logger.info(f"Validación exitosa: {total_sales} ventas, {active_products} productos")
            return True
            
        except Exception as e:
            self.logger.error(f"Error validando datos: {e}")
            return False
    
    def _train_clustering_model(self, force_retrain=False) -> Dict:
        """Entrenar modelo de clustering geográfico"""
        model_path = os.path.join(self.models_dir, 'clustering_model.joblib')
        
        # Verificar si necesita reentrenamiento
        if not force_retrain and os.path.exists(model_path):
            model_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(model_path))
            if model_age.days < 7:  # Reentrenar cada 7 días
                self.logger.info("Modelo de clustering es reciente, saltando entrenamiento")
                return {'status': 'skipped', 'reason': 'model_recent'}
        
        clustering = GeographicClustering(self.config.get('CLUSTERING_CONFIG', {}))
        results = clustering.train_models()
        
        # Guardar modelo
        clustering.save_model(model_path)
        self.models['clustering'] = clustering
        
        return {
            'status': 'trained',
            'best_model': results['best_model'],
            'n_clusters': results['kmeans']['n_clusters'],
            'silhouette_score': results[results['best_model']]['silhouette_score'],
            'data_points': results['data_points'],
            'model_path': model_path
        }
    
    def _train_prediction_model(self, force_retrain=False) -> Dict:
        """Entrenar modelo de predicción de ventas"""
        model_path = os.path.join(self.models_dir, 'sales_prediction.joblib')
        
        # Verificar si necesita reentrenamiento
        if not force_retrain and os.path.exists(model_path):
            model_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(model_path))
            if model_age.days < 3:  # Reentrenar cada 3 días
                self.logger.info("Modelo de predicción es reciente, saltando entrenamiento")
                return {'status': 'skipped', 'reason': 'model_recent'}
        
        predictor = SalesPredictor(self.config.get('PREDICTION_CONFIG', {}))
        results = predictor.train_all_models()
        
        # Guardar modelo
        predictor.save_model(model_path)
        self.models['predictor'] = predictor
        
        return {
            'status': 'trained',
            'arima_mae': results['arima_results']['mae'],
            'arima_rmse': results['arima_results']['rmse'],
            'rf_test_r2': results['random_forest_results']['test_r2'],
            'rf_test_mae': results['random_forest_results']['test_mae'],
            'predictions_generated': results['predictions_generated'],
            'model_path': model_path
        }
    
    def _train_product_models(self) -> Dict:
        """Entrenar modelos específicos por producto top"""
        try:
            # Obtener productos con más ventas (top 10)
            top_products = db.session.query(
                Product.id,
                Product.name,
                db.func.count(Sale.id).label('sales_count')
            ).join(Sale).filter(
                Product.is_active == True,
                Sale.sale_date >= datetime.now().date() - timedelta(days=90)
            ).group_by(Product.id, Product.name)\
             .order_by(db.desc('sales_count')).limit(10).all()
            
            product_results = {}
            predictor = self.models.get('predictor') or SalesPredictor()
            
            for product_id, product_name, sales_count in top_products:
                try:
                    # Entrenar modelo específico para este producto
                    predictions = predictor.generate_product_predictions(product_id, 7)
                    
                    if predictions:
                        # Evaluar precisión si hay datos históricos
                        accuracy = self._evaluate_product_model_accuracy(product_id, predictions)
                        
                        product_results[product_id] = {
                            'name': product_name,
                            'sales_count': sales_count,
                            'predictions_generated': len(predictions),
                            'accuracy_score': accuracy,
                            'status': 'trained'
                        }
                        
                        # Guardar predicciones en BD
                        predictor.save_predictions_to_db(predictions, 'product')
                        
                except Exception as e:
                    self.logger.warning(f"Error entrenando producto {product_name}: {e}")
                    product_results[product_id] = {
                        'name': product_name,
                        'status': 'failed',
                        'error': str(e)
                    }
            
            return {
                'status': 'completed',
                'products_trained': len([p for p in product_results.values() if p.get('status') == 'trained']),
                'products_failed': len([p for p in product_results.values() if p.get('status') == 'failed']),
                'average_accuracy': np.mean([p.get('accuracy_score', 0) for p in product_results.values() if p.get('accuracy_score')]),
                'details': product_results
            }
            
        except Exception as e:
            self.logger.error(f"Error en entrenamiento por productos: {e}")
            return {'status': 'failed', 'error': str(e)}
    
    def _evaluate_product_model_accuracy(self, product_id: int, predictions: List[Dict]) -> float:
        """Evaluar precisión del modelo de producto comparando con datos históricos"""
        try:
            # Obtener ventas reales de los últimos días
            recent_sales = db.session.query(
                Sale.sale_date,
                db.func.sum(Sale.quantity).label('actual_quantity')
            ).filter(
                Sale.product_id == product_id,
                Sale.sale_date >= datetime.now().date() - timedelta(days=7)
            ).group_by(Sale.sale_date).all()
            
            if not recent_sales:
                return 0.0
            
            # Comparar predicciones con realidad
            accuracy_scores = []
            
            for prediction in predictions:
                pred_date = datetime.fromisoformat(prediction['date']).date()
                
                # Buscar venta real para esa fecha
                actual_sale = next((s for s in recent_sales if s.sale_date == pred_date), None)
                
                if actual_sale:
                    predicted = prediction.get('predicted_quantity', 0)
                    actual = actual_sale.actual_quantity
                    
                    if actual > 0:
                        # Calcular precisión como 1 - error_relativo
                        error = abs(predicted - actual) / actual
                        accuracy = max(0, 1 - error)
                        accuracy_scores.append(accuracy)
            
            return np.mean(accuracy_scores) * 100 if accuracy_scores else 0.0
            
        except Exception as e:
            self.logger.warning(f"Error evaluando precisión producto {product_id}: {e}")
            return 0.0
    
    def _update_nlp_model(self) -> Dict:
        """Actualizar cache y configuración del procesador NLP"""
        try:
            nlp_processor = NLPProcessor(self.config.get('NLP_CONFIG', {}))
            
            # Refrescar cache de productos
            nlp_processor.refresh_products_cache()
            
            # Evaluar calidad del procesamiento con mensajes de ejemplo
            test_messages = [
                "Ubicación: https://maps.google.com/?q=21.1619,-86.8515 Cliente: 123 nupec adulto 20kg cantidad: 2 precio: $3600",
                "nexgard spectra 15-30kg 1 pieza $360 ref: casa azul",
                "pro plan adult 15kg x3 total $6300 coordenadas: 21.1692, -86.8980"
            ]
            
            parsing_results = []
            for msg in test_messages:
                try:
                    result = nlp_processor.parse_whatsapp_message(msg)
                    validation = nlp_processor.validate_parsed_data(result)
                    parsing_results.append({
                        'confidence': result.get('confidence', 0),
                        'valid': validation.get('is_valid', False)
                    })
                except Exception as e:
                    self.logger.warning(f"Error parseando mensaje de prueba: {e}")
            
            avg_confidence = np.mean([r['confidence'] for r in parsing_results]) if parsing_results else 0
            success_rate = len([r for r in parsing_results if r['valid']]) / len(parsing_results) if parsing_results else 0
            
            return {
                'status': 'updated',
                'products_cached': len(nlp_processor.products_cache),
                'avg_parsing_confidence': avg_confidence,
                'parsing_success_rate': success_rate * 100,
                'test_messages_processed': len(parsing_results)
            }
            
        except Exception as e:
            self.logger.error(f"Error actualizando NLP: {e}")
            return {'status': 'failed', 'error': str(e)}
    
    def _evaluate_ensemble_performance(self) -> Dict:
        """Evaluar rendimiento conjunto de todos los modelos"""
        try:
            results = {
                'evaluation_date': datetime.now().isoformat(),
                'models_evaluated': 0,
                'overall_score': 0,
                'recommendations': []
            }
            
            # Evaluar clustering
            if 'clustering' in self.models:
                clustering_score = self._evaluate_clustering_quality()
                results['clustering_quality'] = clustering_score
                results['models_evaluated'] += 1
            
            # Evaluar predicciones recientes
            prediction_accuracy = self._evaluate_recent_predictions()
            results['prediction_accuracy'] = prediction_accuracy
            if prediction_accuracy > 0:
                results['models_evaluated'] += 1
            
            # Calcular score general
            scores = [s for s in [
                results.get('clustering_quality', 0),
                results.get('prediction_accuracy', 0)
            ] if s > 0]
            
            results['overall_score'] = np.mean(scores) if scores else 0
            
            # Generar recomendaciones
            if results['overall_score'] < 70:
                results['recommendations'].append("Considerar reentrenamiento con más datos")
            
            if results.get('clustering_quality', 0) < 60:
                results['recommendations'].append("Ajustar parámetros de clustering")
            
            if results.get('prediction_accuracy', 0) < 75:
                results['recommendations'].append("Revisar modelos de predicción")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error evaluando conjunto: {e}")
            return {'status': 'failed', 'error': str(e)}
    
    def _evaluate_clustering_quality(self) -> float:
        """Evaluar calidad del clustering actual"""
        try:
            # Obtener ventas con cluster asignado
            clustered_sales = db.session.query(Sale).filter(
                Sale.cluster_id.isnot(None)
            ).count()
            
            total_sales = db.session.query(Sale).count()
            
            if total_sales == 0:
                return 0.0
            
            # Porcentaje de ventas asignadas a clusters
            assignment_rate = (clustered_sales / total_sales) * 100
            
            # Evaluar distribución entre clusters
            cluster_distribution = db.session.query(
                Sale.cluster_id,
                db.func.count(Sale.id).label('count')
            ).filter(
                Sale.cluster_id.isnot(None)
            ).group_by(Sale.cluster_id).all()
            
            if not cluster_distribution:
                return assignment_rate * 0.5  # Penalizar si no hay distribución
            
            # Calcular balance entre clusters (evitar clusters muy desbalanceados)
            cluster_counts = [c.count for c in cluster_distribution]
            balance_score = 1 - (np.std(cluster_counts) / np.mean(cluster_counts)) if cluster_counts else 0
            balance_score = max(0, min(1, balance_score)) * 100
            
            # Score final combinado
            quality_score = (assignment_rate * 0.7) + (balance_score * 0.3)
            
            return min(100, quality_score)
            
        except Exception as e:
            self.logger.warning(f"Error evaluando clustering: {e}")
            return 0.0
    
    def _evaluate_recent_predictions(self) -> float:
        """Evaluar precisión de predicciones recientes"""
        try:
            # Obtener predicciones de los últimos 7 días
            week_ago = datetime.now().date() - timedelta(days=7)
            
            recent_predictions = db.session.query(Prediction).filter(
                Prediction.target_date >= week_ago,
                Prediction.target_date < datetime.now().date(),
                Prediction.prediction_type == 'daily',
                Prediction.is_active == True
            ).all()
            
            if not recent_predictions:
                return 0.0
            
            accuracy_scores = []
            
            for pred in recent_predictions:
                # Obtener ventas reales para esa fecha
                actual_sales = db.session.query(Sale).filter(
                    Sale.sale_date == pred.target_date
                ).count()
                
                if actual_sales > 0:
                    predicted = pred.predicted_value
                    error = abs(predicted - actual_sales) / actual_sales
                    accuracy = max(0, 1 - error)
                    accuracy_scores.append(accuracy)
            
            return np.mean(accuracy_scores) * 100 if accuracy_scores else 0.0
            
        except Exception as e:
            self.logger.warning(f"Error evaluando predicciones: {e}")
            return 0.0
    
    def _save_training_metadata(self, results: Dict):
        """Guardar metadatos del entrenamiento"""
        try:
            metadata_path = os.path.join(self.models_dir, 'training_metadata.json')
            
            import json
            with open(metadata_path, 'w') as f:
                json.dump(results, f, indent=2, default=str)
                
            self.logger.info(f"Metadatos guardados en: {metadata_path}")
            
        except Exception as e:
            self.logger.warning(f"Error guardando metadatos: {e}")
    
    def get_model_status(self) -> Dict:
        """Obtener estado de todos los modelos"""
        try:
            status = {
                'timestamp': datetime.now().isoformat(),
                'models': {}
            }
            
            # Verificar archivos de modelos
            model_files = {
                'clustering': 'clustering_model.joblib',
                'sales_prediction': 'sales_prediction.joblib',
                'training_metadata': 'training_metadata.json'
            }
            
            for model_name, filename in model_files.items():
                file_path = os.path.join(self.models_dir, filename)
                
                if os.path.exists(file_path):
                    stat = os.stat(file_path)
                    status['models'][model_name] = {
                        'exists': True,
                        'size_mb': round(stat.st_size / (1024 * 1024), 2),
                        'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'age_days': (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).days
                    }
                else:
                    status['models'][model_name] = {
                        'exists': False,
                        'size_mb': 0,
                        'last_modified': None,
                        'age_days': None
                    }
            
            return status
            
        except Exception as e:
            self.logger.error(f"Error obteniendo estado de modelos: {e}")
            return {'error': str(e)}
    
    def cleanup_old_models(self, days_old=30):
        """Limpiar modelos antiguos"""
        try:
            cleaned_files = []
            
            for filename in os.listdir(self.models_dir):
                if filename.endswith('.joblib') or filename.endswith('.pkl'):
                    file_path = os.path.join(self.models_dir, filename)
                    
                    # Verificar edad del archivo
                    file_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_age.days > days_old:
                        os.remove(file_path)
                        cleaned_files.append(filename)
                        self.logger.info(f"Archivo limpiado: {filename}")
            
            return {
                'cleaned_files': cleaned_files,
                'count': len(cleaned_files)
            }
            
        except Exception as e:
            self.logger.error(f"Error limpiando modelos: {e}")
            return {'error': str(e)}