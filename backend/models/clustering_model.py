# models/clustering_model.py - Modelo de Clustering Geográfico
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import joblib
import os
from datetime import datetime, timedelta
import logging
from typing import Tuple, List, Dict, Optional

from database.connection import db
from database.models import Sale, ClusterInfo, Prediction

class GeographicClustering:
    """Modelo de clustering geográfico para análisis de zonas de entrega"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.kmeans_clusters = self.config.get('kmeans_clusters', 5)
        self.dbscan_eps = self.config.get('dbscan_eps', 0.01)
        self.dbscan_min_samples = self.config.get('dbscan_min_samples', 5)
        
        self.kmeans_model = None
        self.dbscan_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        
        self.logger = logging.getLogger(__name__)
    
    def prepare_data(self, start_date: Optional[datetime] = None, 
                    end_date: Optional[datetime] = None) -> pd.DataFrame:
        """Preparar datos de coordenadas para clustering"""
        try:
            # Query para obtener datos de ventas
            query = db.session.query(Sale.latitude, Sale.longitude, Sale.sale_date, 
                                   Sale.total_price, Sale.product_id)
            
            # Filtrar por fechas si se especifican
            if start_date:
                query = query.filter(Sale.sale_date >= start_date)
            if end_date:
                query = query.filter(Sale.sale_date <= end_date)
            
            # Convertir a DataFrame
            data = pd.read_sql(query.statement, db.session.bind)
            
            if data.empty:
                raise ValueError("No hay datos de ventas disponibles para clustering")
            
            # Limpiar datos faltantes
            data = data.dropna(subset=['latitude', 'longitude'])
            
            # Verificar que las coordenadas estén en rangos válidos
            data = data[
                (data['latitude'].between(-90, 90)) & 
                (data['longitude'].between(-180, 180))
            ]
            
            self.logger.info(f"Datos preparados: {len(data)} registros de ventas")
            return data
            
        except Exception as e:
            self.logger.error(f"Error preparando datos: {e}")
            raise
    
    def train_kmeans(self, data: pd.DataFrame) -> Dict:
        """Entrenar modelo K-Means"""
        try:
            # Preparar coordenadas
            coordinates = data[['latitude', 'longitude']].values
            
            # Escalar coordenadas
            coordinates_scaled = self.scaler.fit_transform(coordinates)
            
            # Determinar número óptimo de clusters usando método del codo
            optimal_clusters = self._find_optimal_clusters(coordinates_scaled)
            
            # Entrenar K-Means
            self.kmeans_model = KMeans(
                n_clusters=optimal_clusters,
                random_state=42,
                n_init=10,
                max_iter=300
            )
            
            clusters = self.kmeans_model.fit_predict(coordinates_scaled)
            
            # Calcular métricas
            silhouette_avg = silhouette_score(coordinates_scaled, clusters)
            inertia = self.kmeans_model.inertia_
            
            # Agregar clusters al DataFrame
            data_with_clusters = data.copy()
            data_with_clusters['cluster'] = clusters
            
            results = {
                'algorithm': 'kmeans',
                'n_clusters': optimal_clusters,
                'silhouette_score': silhouette_avg,
                'inertia': inertia,
                'cluster_centers': self.kmeans_model.cluster_centers_,
                'data_with_clusters': data_with_clusters
            }
            
            self.logger.info(f"K-Means entrenado: {optimal_clusters} clusters, "
                           f"silhouette score: {silhouette_avg:.3f}")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error entrenando K-Means: {e}")
            raise
    
    def train_dbscan(self, data: pd.DataFrame) -> Dict:
        """Entrenar modelo DBSCAN"""
        try:
            # Preparar coordenadas
            coordinates = data[['latitude', 'longitude']].values
            
            # Escalar coordenadas
            coordinates_scaled = self.scaler.fit_transform(coordinates)
            
            # Entrenar DBSCAN
            self.dbscan_model = DBSCAN(
                eps=self.dbscan_eps,
                min_samples=self.dbscan_min_samples,
                metric='euclidean'
            )
            
            clusters = self.dbscan_model.fit_predict(coordinates_scaled)
            
            # Calcular métricas
            n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
            n_noise = list(clusters).count(-1)
            
            silhouette_avg = None
            if n_clusters > 1:
                # Solo calcular silhouette si hay más de 1 cluster
                mask = clusters != -1
                if np.sum(mask) > 1:
                    silhouette_avg = silhouette_score(
                        coordinates_scaled[mask], clusters[mask]
                    )
            
            # Agregar clusters al DataFrame
            data_with_clusters = data.copy()
            data_with_clusters['cluster'] = clusters
            
            results = {
                'algorithm': 'dbscan',
                'n_clusters': n_clusters,
                'n_noise': n_noise,
                'silhouette_score': silhouette_avg,
                'eps': self.dbscan_eps,
                'min_samples': self.dbscan_min_samples,
                'data_with_clusters': data_with_clusters
            }
            
            self.logger.info(f"DBSCAN entrenado: {n_clusters} clusters, "
                           f"{n_noise} puntos de ruido")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error entrenando DBSCAN: {e}")
            raise
    
    def _find_optimal_clusters(self, data: np.ndarray, max_clusters: int = 10) -> int:
        """Encontrar número óptimo de clusters usando método del codo"""
        inertias = []
        silhouette_scores = []
        k_range = range(2, min(max_clusters + 1, len(data)))
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(data)
            
            inertias.append(kmeans.inertia_)
            silhouette_scores.append(silhouette_score(data, clusters))
        
        # Encontrar codo usando diferencias de segunda derivada
        if len(inertias) >= 3:
            diffs = np.diff(inertias)
            second_diffs = np.diff(diffs)
            elbow_idx = np.argmax(second_diffs) + 2  # +2 porque empezamos en k=2
            optimal_k = k_range[elbow_idx]
        else:
            # Si no hay suficientes datos, usar el k con mejor silhouette score
            optimal_k = k_range[np.argmax(silhouette_scores)]
        
        return min(optimal_k, self.kmeans_clusters)
    
    def train_models(self, start_date: Optional[datetime] = None,
                    end_date: Optional[datetime] = None) -> Dict:
        """Entrenar ambos modelos de clustering"""
        try:
            # Preparar datos
            data = self.prepare_data(start_date, end_date)
            
            # Entrenar ambos modelos
            kmeans_results = self.train_kmeans(data)
            dbscan_results = self.train_dbscan(data)
            
            # Seleccionar mejor modelo basado en silhouette score
            best_model = 'kmeans'
            if (dbscan_results['silhouette_score'] and 
                kmeans_results['silhouette_score'] and
                dbscan_results['silhouette_score'] > kmeans_results['silhouette_score']):
                best_model = 'dbscan'
            
            # Actualizar clusters en base de datos
            self._update_clusters_in_db(
                kmeans_results['data_with_clusters'] if best_model == 'kmeans' 
                else dbscan_results['data_with_clusters'],
                best_model
            )
            
            # Guardar información de clusters
            self._save_cluster_info(
                kmeans_results if best_model == 'kmeans' else dbscan_results
            )
            
            self.is_trained = True
            
            results = {
                'kmeans': kmeans_results,
                'dbscan': dbscan_results,
                'best_model': best_model,
                'training_date': datetime.now().isoformat(),
                'data_points': len(data)
            }
            
            self.logger.info(f"Modelos entrenados exitosamente. Mejor modelo: {best_model}")
            return results
            
        except Exception as e:
            self.logger.error(f"Error entrenando modelos: {e}")
            raise
    
    def _update_clusters_in_db(self, data_with_clusters: pd.DataFrame, algorithm: str):
        """Actualizar clusters en base de datos"""
        try:
            # Agrupar por sale_id para evitar duplicados
            for _, row in data_with_clusters.iterrows():
                # Buscar venta por coordenadas y fecha (aproximada)
                sale = db.session.query(Sale).filter(
                    Sale.latitude == row['latitude'],
                    Sale.longitude == row['longitude'],
                    Sale.sale_date == row['sale_date']
                ).first()
                
                if sale:
                    sale.cluster_id = int(row['cluster']) if row['cluster'] != -1 else None
            
            db.session.commit()
            self.logger.info(f"Clusters actualizados en base de datos usando {algorithm}")
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error actualizando clusters: {e}")
            raise
    
    def _save_cluster_info(self, results: Dict):
        """Guardar información de clusters en base de datos"""
        try:
            # Limpiar información anterior
            db.session.query(ClusterInfo).delete()
            
            data_with_clusters = results['data_with_clusters']
            algorithm = results['algorithm']
            
            # Calcular estadísticas por cluster
            cluster_stats = data_with_clusters.groupby('cluster').agg({
                'latitude': 'mean',
                'longitude': 'mean',
                'total_price': ['count', 'sum', 'mean']
            }).round(6)
            
            cluster_stats.columns = [
                'center_lat', 'center_lng', 'total_sales', 'total_revenue', 'avg_order_value'
            ]
            
            # Guardar información de cada cluster
            for cluster_id, stats in cluster_stats.iterrows():
                if cluster_id == -1:  # Ignorar puntos de ruido
                    continue
                
                cluster_info = ClusterInfo(
                    cluster_id=int(cluster_id),
                    center_latitude=stats['center_lat'],
                    center_longitude=stats['center_lng'],
                    total_sales=int(stats['total_sales']),
                    total_revenue=float(stats['total_revenue']),
                    avg_order_value=float(stats['avg_order_value']),
                    algorithm_used=algorithm,
                    zone_name=f"Zona {cluster_id}",
                    zone_description=f"Cluster {cluster_id} generado por {algorithm}",
                    last_updated=datetime.now()
                )
                
                db.session.add(cluster_info)
            
            db.session.commit()
            self.logger.info(f"Información de clusters guardada: {len(cluster_stats)} clusters")
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error guardando información de clusters: {e}")
            raise
    
    def predict_zone(self, latitude: float, longitude: float) -> Optional[int]:
        """Predecir zona/cluster para nuevas coordenadas"""
        try:
            if not self.is_trained or not self.kmeans_model:
                raise ValueError("Modelo no entrenado")
            
            # Escalar coordenadas
            coords_scaled = self.scaler.transform([[latitude, longitude]])
            
            # Predecir cluster
            cluster = self.kmeans_model.predict(coords_scaled)[0]
            
            return int(cluster)
            
        except Exception as e:
            self.logger.error(f"Error prediciendo zona: {e}")
            return None
    
    def get_cluster_heatmap_data(self) -> List[Dict]:
        """Obtener datos para mapa de calor de clusters"""
        try:
            clusters = db.session.query(ClusterInfo).filter(
                ClusterInfo.is_active == True
            ).all()
            
            heatmap_data = []
            for cluster in clusters:
                heatmap_data.append({
                    'lat': cluster.center_latitude,
                    'lng': cluster.center_longitude,
                    'intensity': cluster.total_sales,
                    'revenue': float(cluster.total_revenue),
                    'zone_name': cluster.zone_name,
                    'cluster_id': cluster.cluster_id
                })
            
            return heatmap_data
            
        except Exception as e:
            self.logger.error(f"Error obteniendo datos de mapa de calor: {e}")
            return []
    
    def get_zone_predictions(self, days_ahead: int = 7) -> List[Dict]:
        """Obtener predicciones de demanda por zona"""
        try:
            # Obtener datos históricos por cluster
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            query = db.session.query(
                Sale.cluster_id,
                Sale.sale_date,
                db.func.count(Sale.id).label('sales_count'),
                db.func.sum(Sale.total_price).label('total_revenue')
            ).filter(
                Sale.sale_date >= thirty_days_ago,
                Sale.cluster_id.isnot(None)
            ).group_by(
                Sale.cluster_id, Sale.sale_date
            ).all()
            
            # Convertir a DataFrame para análisis
            df = pd.DataFrame([
                {
                    'cluster_id': row.cluster_id,
                    'date': row.sale_date,
                    'sales_count': row.sales_count,
                    'total_revenue': float(row.total_revenue)
                }
                for row in query
            ])
            
            predictions = []
            
            if not df.empty:
                # Calcular predicciones simples basadas en promedio móvil
                for cluster_id in df['cluster_id'].unique():
                    cluster_data = df[df['cluster_id'] == cluster_id]
                    
                    # Promedio de ventas y revenue de últimos 7 días
                    recent_data = cluster_data.tail(7)
                    avg_sales = recent_data['sales_count'].mean()
                    avg_revenue = recent_data['total_revenue'].mean()
                    
                    # Predicción simple: proyectar promedio
                    predicted_sales = avg_sales * days_ahead
                    predicted_revenue = avg_revenue * days_ahead
                    
                    predictions.append({
                        'cluster_id': cluster_id,
                        'predicted_sales': round(predicted_sales),
                        'predicted_revenue': round(predicted_revenue, 2),
                        'confidence': 0.7,  # Confianza básica
                        'days_ahead': days_ahead
                    })
            
            return predictions
            
        except Exception as e:
            self.logger.error(f"Error obteniendo predicciones por zona: {e}")
            return []
    
    def save_model(self, model_path: str):
        """Guardar modelos entrenados"""
        try:
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            
            model_data = {
                'kmeans_model': self.kmeans_model,
                'dbscan_model': self.dbscan_model,
                'scaler': self.scaler,
                'config': self.config,
                'is_trained': self.is_trained,
                'timestamp': datetime.now().isoformat()
            }
            
            joblib.dump(model_data, model_path)
            self.logger.info(f"Modelos guardados en: {model_path}")
            
        except Exception as e:
            self.logger.error(f"Error guardando modelos: {e}")
            raise
    
    def load_model(self, model_path: str):
        """Cargar modelos entrenados"""
        try:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"No se encontró el archivo: {model_path}")
            
            model_data = joblib.load(model_path)
            
            self.kmeans_model = model_data.get('kmeans_model')
            self.dbscan_model = model_data.get('dbscan_model')
            self.scaler = model_data.get('scaler')
            self.config = model_data.get('config', {})
            self.is_trained = model_data.get('is_trained', False)
            
            self.logger.info(f"Modelos cargados desde: {model_path}")
            
        except Exception as e:
            self.logger.error(f"Error cargando modelos: {e}")
            raise