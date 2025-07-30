# models/nlp_processor.py - Procesador de Lenguaje Natural
import re
import spacy
import pandas as pd
from fuzzywuzzy import fuzz, process
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
from datetime import datetime

from database.connection import db
from database.models import Product

class NLPProcessor:
    """Procesador de lenguaje natural para parsing de mensajes de WhatsApp"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.similarity_threshold = self.config.get('similarity_threshold', 0.7)
        self.max_product_distance = self.config.get('max_product_distance', 3)
        
        # Inicializar spaCy (si está disponible)
        try:
            self.nlp = spacy.load('es_core_news_sm')
        except OSError:
            self.nlp = None
            logging.warning("Modelo de spaCy no encontrado. Usando métodos alternativos.")
        
        # Vectorizador TF-IDF para similitud de productos
        self.tfidf = TfidfVectorizer(
            lowercase=True,
            stop_words=None,  # Mantenemos stop words para productos
            ngram_range=(1, 3),
            max_features=1000
        )
        
        # Cache de productos y embeddings
        self.products_cache = {}
        self.product_embeddings = None
        self.product_names = []
        
        self.logger = logging.getLogger(__name__)
        self._load_products()
    
    def _load_products(self):
        """Cargar productos desde base de datos"""
        try:
            products = db.session.query(Product).filter(Product.is_active == True).all()
            
            self.products_cache = {}
            product_texts = []
            
            for product in products:
                # Crear texto searchable del producto
                search_text = f"{product.name} {product.brand} {product.category}"
                if product.weight_size:
                    search_text += f" {product.weight_size}"
                
                self.products_cache[product.id] = {
                    'name': product.name,
                    'brand': product.brand,
                    'category': product.category,
                    'weight_size': product.weight_size,
                    'price': float(product.price),
                    'search_text': search_text.lower()
                }
                
                product_texts.append(search_text.lower())
                self.product_names.append(product.name.lower())
            
            # Generar embeddings TF-IDF
            if product_texts:
                self.product_embeddings = self.tfidf.fit_transform(product_texts)
            
            self.logger.info(f"Productos cargados: {len(self.products_cache)}")
            
        except Exception as e:
            self.logger.error(f"Error cargando productos: {e}")
            self.products_cache = {}
    
    def parse_whatsapp_message(self, message: str) -> Dict:
        """Parsear mensaje de WhatsApp para extraer información de pedido"""
        try:
            parsed_data = {
                'coordinates': None,
                'products': [],
                'client_number': None,
                'references': None,
                'total_price': None,
                'raw_message': message,
                'confidence': 0.0
            }
            
            # Limpiar mensaje
            clean_message = self._clean_message(message)
            
            # Extraer coordenadas
            coordinates = self._extract_coordinates(clean_message)
            if coordinates:
                parsed_data['coordinates'] = coordinates
                parsed_data['confidence'] += 0.3
            
            # Extraer productos
            products = self._extract_products(clean_message)
            if products:
                parsed_data['products'] = products
                parsed_data['confidence'] += 0.4
            
            # Extraer número de cliente
            client_number = self._extract_client_number(clean_message)
            if client_number:
                parsed_data['client_number'] = client_number
                parsed_data['confidence'] += 0.1
            
            # Extraer referencias
            references = self._extract_references(clean_message)
            if references:
                parsed_data['references'] = references
                parsed_data['confidence'] += 0.1
            
            # Extraer precio total
            total_price = self._extract_total_price(clean_message)
            if total_price:
                parsed_data['total_price'] = total_price
                parsed_data['confidence'] += 0.1
            
            self.logger.info(f"Mensaje parseado con confianza: {parsed_data['confidence']:.2f}")
            return parsed_data
            
        except Exception as e:
            self.logger.error(f"Error parseando mensaje: {e}")
            return {'error': str(e), 'confidence': 0.0}
    
    def _clean_message(self, message: str) -> str:
        """Limpiar y normalizar mensaje"""
        # Remover caracteres especiales innecesarios
        clean = re.sub(r'[^\w\s.,:\-()/$]', ' ', message)
        
        # Normalizar espacios
        clean = re.sub(r'\s+', ' ', clean)
        
        # Convertir a minúsculas
        clean = clean.lower().strip()
        
        return clean
    
    def _extract_coordinates(self, message: str) -> Optional[Tuple[float, float]]:
        """Extraer coordenadas de Google Maps"""
        patterns = self.config.get('google_maps_patterns', [
            r'https://maps\.google\.com/\?q=([0-9.-]+),([0-9.-]+)',
            r'https://goo\.gl/maps/[a-zA-Z0-9]+',
            r'ubicación[:\s]*([0-9.-]+)[,\s]+([0-9.-]+)',
            r'coordenadas[:\s]*([0-9.-]+)[,\s]+([0-9.-]+)',
            r'([0-9]{2}\.[0-9]+)[,\s]+(-[0-9]{2}\.[0-9]+)'
        ])
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                try:
                    if 'goo.gl' in pattern:
                        # Para links acortados, necesitaríamos expandir la URL
                        # Por ahora retornamos None y pedimos coordenadas directas
                        continue
                    
                    lat = float(match.group(1))
                    lng = float(match.group(2))
                    
                    # Validar que las coordenadas estén en Cancún/Riviera Maya
                    if (20.5 <= lat <= 21.5) and (-87.5 <= lng <= -86.5):
                        return (lat, lng)
                        
                except (ValueError, IndexError):
                    continue
        
        return None
    
    def _extract_products(self, message: str) -> List[Dict]:
        """Extraer productos del mensaje"""
        products = []
        
        # Buscar productos por similitud
        similar_products = self._find_similar_products(message)
        
        for product_match in similar_products:
            product_info = product_match['product']
            
            # Buscar cantidad cerca del producto
            quantity = self._extract_quantity_near_product(
                message, product_match['matched_text']
            )
            
            products.append({
                'product_id': product_match['product_id'],
                'name': product_info['name'],
                'brand': product_info['brand'],
                'category': product_info['category'],
                'weight_size': product_info['weight_size'],
                'price': product_info['price'],
                'quantity': quantity,
                'confidence': product_match['confidence'],
                'matched_text': product_match['matched_text']
            })
        
        return products
    
    def _find_similar_products(self, message: str) -> List[Dict]:
        """Encontrar productos similares en el mensaje"""
        if not self.products_cache or self.product_embeddings is None:
            return []
        
        similar_products = []
        
        # Método 1: Búsqueda por similitud TF-IDF
        message_vector = self.tfidf.transform([message])
        similarities = cosine_similarity(message_vector, self.product_embeddings).flatten()
        
        for idx, similarity in enumerate(similarities):
            if similarity > self.similarity_threshold:
                product_id = list(self.products_cache.keys())[idx]
                similar_products.append({
                    'product_id': product_id,
                    'product': self.products_cache[product_id],
                    'confidence': similarity,
                    'matched_text': self.products_cache[product_id]['search_text'],
                    'method': 'tfidf'
                })
        
        # Método 2: Búsqueda fuzzy por nombre de producto
        for product_id, product_info in self.products_cache.items():
            # Buscar por nombre completo
            ratio = fuzz.partial_ratio(message, product_info['name'].lower())
            if ratio > 80:  # 80% de similitud
                similar_products.append({
                    'product_id': product_id,
                    'product': product_info,
                    'confidence': ratio / 100.0,
                    'matched_text': product_info['name'],
                    'method': 'fuzzy_name'
                })
            
            # Buscar por marca + características
            brand_pattern = product_info['brand'].lower()
            if brand_pattern in message:
                # Buscar peso/tamaño cerca de la marca
                weight_match = re.search(
                    f"{brand_pattern}.*?([0-9]+)\\s*(kg|g|ml)",
                    message, re.IGNORECASE
                )
                if weight_match and product_info['weight_size']:
                    weight_in_product = re.search(r'([0-9]+)', product_info['weight_size'])
                    if weight_in_product:
                        if weight_match.group(1) == weight_in_product.group(1):
                            similar_products.append({
                                'product_id': product_id,
                                'product': product_info,
                                'confidence': 0.9,
                                'matched_text': f"{brand_pattern} {weight_match.group(1)}{weight_match.group(2)}",
                                'method': 'brand_weight'
                            })
        
        # Remover duplicados y ordenar por confianza
        unique_products = {}
        for product in similar_products:
            product_id = product['product_id']
            if product_id not in unique_products or product['confidence'] > unique_products[product_id]['confidence']:
                unique_products[product_id] = product
        
        return sorted(unique_products.values(), key=lambda x: x['confidence'], reverse=True)
    
    def _extract_quantity_near_product(self, message: str, product_text: str) -> int:
        """Extraer cantidad cerca del texto del producto"""
        # Buscar números cerca del producto mencionado
        product_pos = message.find(product_text.lower())
        if product_pos == -1:
            # Buscar patrones generales de cantidad
            quantity_patterns = [
                r'cantidad[:\s]*([0-9]+)',
                r'([0-9]+)\s*piezas?',
                r'([0-9]+)\s*unidades?',
                r'([0-9]+)\s*pzas?'
            ]
            
            for pattern in quantity_patterns:
                match = re.search(pattern, message, re.IGNORECASE)
                if match:
                    return int(match.group(1))
            
            return 1  # Cantidad por defecto
        
        # Buscar en un rango de 50 caracteres antes y después del producto
        start = max(0, product_pos - 50)
        end = min(len(message), product_pos + len(product_text) + 50)
        context = message[start:end]
        
        # Buscar números en el contexto
        numbers = re.findall(r'([0-9]+)', context)
        if numbers:
            # Tomar el primer número encontrado
            try:
                quantity = int(numbers[0])
                return min(quantity, 1000)  # Límite máximo de 1000
            except ValueError:
                pass
        
        return 1
    
    def _extract_client_number(self, message: str) -> Optional[str]:
        """Extraer número de cliente"""
        patterns = self.config.get('client_patterns', [
            r'cliente[:\s]*([0-9]+)',
            r'#([0-9]+)',
            r'client[e]?[:\s]*([0-9]+)'
        ])
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_references(self, message: str) -> Optional[str]:
        """Extraer referencias del mensaje"""
        patterns = self.config.get('reference_patterns', [
            r'referencia[s]?[:\s]*(.+?)(?:\n|precio|total|$)',
            r'ref[:\s]*(.+?)(?:\n|precio|total|$)',
            r'referencias?[:\s]*(.+?)(?:\n|precio|total|$)'
        ])
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_total_price(self, message: str) -> Optional[float]:
        """Extraer precio total del mensaje"""
        patterns = [
            r'total[:\s]*\$?([0-9]+(?:\.[0-9]{2})?)',
            r'precio[:\s]*\$?([0-9]+(?:\.[0-9]{2})?)',
            r'\$([0-9]+(?:\.[0-9]{2})?)',
            r'([0-9]+(?:\.[0-9]{2})?)\s*pesos'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        
        return None
    
    def suggest_product_corrections(self, message: str, max_suggestions: int = 3) -> List[Dict]:
        """Sugerir correcciones para productos no encontrados"""
        suggestions = []
        
        if not self.products_cache:
            return suggestions
        
        # Extraer posibles nombres de productos del mensaje
        words = message.split()
        potential_products = []
        
        # Buscar secuencias de palabras que podrían ser productos
        for i in range(len(words)):
            for j in range(i + 1, min(i + 4, len(words) + 1)):  # Hasta 3 palabras
                phrase = ' '.join(words[i:j])
                if len(phrase) > 3:  # Mínimo 3 caracteres
                    potential_products.append(phrase)
        
        # Para cada frase potencial, buscar productos similares
        for phrase in potential_products:
            matches = process.extract(
                phrase,
                self.product_names,
                scorer=fuzz.partial_ratio,
                limit=max_suggestions
            )
            
            for match, score in matches:
                if score > 60:  # Umbral mínimo de similitud
                    # Encontrar el producto correspondiente
                    for product_id, product_info in self.products_cache.items():
                        if product_info['name'].lower() == match:
                            suggestions.append({
                                'original_text': phrase,
                                'suggested_product': product_info['name'],
                                'product_id': product_id,
                                'similarity_score': score,
                                'brand': product_info['brand'],
                                'category': product_info['category']
                            })
                            break
        
        # Remover duplicados y ordenar por score
        unique_suggestions = {}
        for suggestion in suggestions:
            key = suggestion['suggested_product']
            if key not in unique_suggestions or suggestion['similarity_score'] > unique_suggestions[key]['similarity_score']:
                unique_suggestions[key] = suggestion
        
        return sorted(unique_suggestions.values(), 
                     key=lambda x: x['similarity_score'], reverse=True)[:max_suggestions]
    
    def validate_parsed_data(self, parsed_data: Dict) -> Dict:
        """Validar y completar datos parseados"""
        validation_result = {
            'is_valid': True,
            'warnings': [],
            'errors': [],
            'suggested_corrections': []
        }
        
        # Validar coordenadas
        if not parsed_data.get('coordinates'):
            validation_result['errors'].append('No se encontraron coordenadas válidas')
            validation_result['is_valid'] = False
        
        # Validar productos
        if not parsed_data.get('products'):
            validation_result['errors'].append('No se encontraron productos válidos')
            validation_result['is_valid'] = False
            
            # Sugerir correcciones
            suggestions = self.suggest_product_corrections(parsed_data.get('raw_message', ''))
            if suggestions:
                validation_result['suggested_corrections'] = suggestions
        else:
            # Validar que los productos tengan cantidad
            for product in parsed_data['products']:
                if product['quantity'] <= 0:
                    validation_result['warnings'].append(
                        f"Cantidad no válida para {product['name']}: {product['quantity']}"
                    )
        
        # Validar confianza general
        if parsed_data.get('confidence', 0) < 0.5:
            validation_result['warnings'].append('Confianza baja en el parsing del mensaje')
        
        return validation_result
    
    def refresh_products_cache(self):
        """Refrescar cache de productos"""
        self._load_products()
        self.logger.info("Cache de productos actualizado")