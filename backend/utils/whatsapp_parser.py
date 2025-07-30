# backend/utils/whatsapp_parser.py - Parser de WhatsApp
import re
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

from .coordinates_extractor import CoordinatesExtractor
from models.nlp_processor import NLPProcessor
from database.models import Product

logger = logging.getLogger(__name__)

@dataclass
class ParsedOrder:
    """Estructura de datos para un pedido parseado"""
    coordinates: Optional[Tuple[float, float]]
    products: List[Dict]
    customer_info: Dict
    delivery_info: Dict
    payment_info: Dict
    metadata: Dict
    confidence: float
    errors: List[str]
    warnings: List[str]

class WhatsAppParser:
    """Parser especializado para mensajes de WhatsApp de pedidos"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.coords_extractor = CoordinatesExtractor()
        self.nlp_processor = NLPProcessor(config)
        
        # Patrones de regex mejorados
        self.patterns = {
            # Información del cliente
            'client_number': [
                r'cliente[:\s#]*([0-9]+)',
                r'client[e]?[:\s#]*([0-9]+)',
                r'#([0-9]+)',
                r'numero[:\s]*([0-9]+)',
                r'tel[éeéfono]*[:\s]*([0-9\-\s\(\)]{10,})'
            ],
            
            # Información de contacto
            'phone': [
                r'tel[éeéfono]*[:\s]*([0-9\-\s\(\)]{10,})',
                r'celular[:\s]*([0-9\-\s\(\)]{10,})',
                r'whatsapp[:\s]*([0-9\-\s\(\)]{10,})',
                r'contacto[:\s]*([0-9\-\s\(\)]{10,})'
            ],
            
            # Nombre del cliente
            'customer_name': [
                r'nombre[:\s]+([\w\s]+?)(?:\n|tel|cliente|dirección|ubicación|$)',
                r'para[:\s]+([\w\s]+?)(?:\n|tel|cliente|dirección|ubicación|$)',
                r'client[e]?[:\s]+([\w\s]+?)(?:\n|tel|numero|dirección|ubicación|$)'
            ],
            
            # Referencias y direcciones
            'references': [
                r'referencia[s]?[:\s]+(.*?)(?:\n|precio|total|cantidad|$)',
                r'ref[:\s]+(.*?)(?:\n|precio|total|cantidad|$)',
                r'dirección[:\s]+(.*?)(?:\n|precio|total|cantidad|$)',
                r'entre[:\s]+(.*?)(?:\n|precio|total|cantidad|$)',
                r'cerca de[:\s]+(.*?)(?:\n|precio|total|cantidad|$)'
            ],
            
            # Información de productos y cantidades
            'product_quantity': [
                r'(\d+)\s*(?:pzas?|piezas?|unidades?|kg|g|ml|litros?|lts?)\s+(.+?)(?:\n|precio|\$|total|$)',
                r'(.+?)\s+(\d+)\s*(?:pzas?|piezas?|unidades?|kg|g|ml|litros?|lts?)(?:\n|precio|\$|total|$)',
                r'cantidad[:\s]*(\d+)\s*(?:de\s+)?(.+?)(?:\n|precio|\$|total|$)'
            ],
            
            # Precios
            'prices': [
                r'precio[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)',
                r'total[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)',
                r'\$([0-9,]+(?:\.[0-9]{2})?)',
                r'([0-9,]+(?:\.[0-9]{2})?)\s*pesos',
                r'costo[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)'
            ],
            
            # Métodos de pago
            'payment_method': [
                r'pago[:\s]*(efectivo|tarjeta|transferencia|oxxo)',
                r'forma de pago[:\s]*(efectivo|tarjeta|transferencia|oxxo)',
                r'(efectivo|tarjeta|transferencia|oxxo)',
                r'pagar\s+(con\s+)?(efectivo|tarjeta|transferencia|oxxo)'
            ],
            
            # Horarios de entrega
            'delivery_time': [
                r'entrega[:\s]*([0-9]{1,2}:[0-9]{2})',
                r'hora[:\s]*([0-9]{1,2}:[0-9]{2})',
                r'a las[:\s]*([0-9]{1,2}:[0-9]{2})',
                r'([0-9]{1,2}:[0-9]{2})\s*(?:hrs?|horas?|am|pm)',
                r'entre\s+([0-9]{1,2}:[0-9]{2})\s*y\s*([0-9]{1,2}:[0-9]{2})'
            ],
            
            # Comentarios especiales
            'special_instructions': [
                r'nota[s]?[:\s]+(.*?)(?:\n|precio|total|$)',
                r'instruccione[s]?[:\s]+(.*?)(?:\n|precio|total|$)',
                r'comentario[s]?[:\s]+(.*?)(?:\n|precio|total|$)',
                r'observación[es]?[:\s]+(.*?)(?:\n|precio|total|$)'
            ]
        }
        
        # Palabras clave para limpiar texto
        self.stop_words = {
            'productos', 'producto', 'pedido', 'orden', 'compra', 'venta',
            'entrega', 'envío', 'delivery', 'whatsapp', 'mensaje'
        }
        
    def parse_message(self, message: str) -> ParsedOrder:
        """
        Parsear mensaje completo de WhatsApp
        
        Args:
            message: Texto del mensaje de WhatsApp
            
        Returns:
            ParsedOrder con toda la información extraída
        """
        
        # Inicializar resultado
        result = ParsedOrder(
            coordinates=None,
            products=[],
            customer_info={},
            delivery_info={},
            payment_info={},
            metadata={},
            confidence=0.0,
            errors=[],
            warnings=[]
        )
        
        try:
            # Limpiar y normalizar mensaje
            clean_message = self._clean_message(message)
            result.metadata['original_message'] = message
            result.metadata['cleaned_message'] = clean_message
            result.metadata['message_length'] = len(message)
            
            # 1. Extraer coordenadas
            coords_result = self._extract_coordinates(clean_message)
            if coords_result['coordinates']:
                result.coordinates = coords_result['coordinates']
                result.delivery_info.update(coords_result)
                result.confidence += 0.25
            else:
                result.errors.append("No se encontraron coordenadas válidas")
            
            # 2. Extraer información del cliente
            customer_info = self._extract_customer_info(clean_message)
            result.customer_info = customer_info
            if customer_info:
                result.confidence += 0.15
            
            # 3. Extraer productos
            products_result = self._extract_products(clean_message)
            result.products = products_result['products']
            if products_result['products']:
                result.confidence += 0.35
                result.metadata['products_found'] = len(products_result['products'])
            else:
                result.errors.append("No se encontraron productos válidos")
            
            # 4. Extraer información de pago
            payment_info = self._extract_payment_info(clean_message)
            result.payment_info = payment_info
            if payment_info:
                result.confidence += 0.10
            
            # 5. Extraer información de entrega
            delivery_info = self._extract_delivery_info(clean_message)
            result.delivery_info.update(delivery_info)
            if delivery_info:
                result.confidence += 0.10
            
            # 6. Extraer referencias y comentarios
            references = self._extract_references(clean_message)
            if references:
                result.delivery_info['references'] = references
                result.confidence += 0.05
            
            # 7. Validaciones finales
            self._validate_parsed_data(result)
            
            # 8. Calcular confianza final
            result.confidence = min(1.0, result.confidence)
            result.metadata['parsing_timestamp'] = datetime.now().isoformat()
            
            logger.info(f"Mensaje parseado con confianza: {result.confidence:.2f}")
            
        except Exception as e:
            logger.error(f"Error parseando mensaje: {e}")
            result.errors.append(f"Error crítico: {str(e)}")
            result.confidence = 0.0
        
        return result
    
    def _clean_message(self, message: str) -> str:
        """Limpiar y normalizar el mensaje"""
        
        # Remover caracteres especiales innecesarios
        clean = re.sub(r'[^\w\s.,:\-()/$@]', ' ', message)
        
        # Normalizar espacios en blanco
        clean = re.sub(r'\s+', ' ', clean)
        
        # Remover URLs de imágenes y archivos
        clean = re.sub(r'https?://\S+\.(jpg|jpeg|png|gif|pdf|doc)', '', clean, flags=re.IGNORECASE)
        
        # Normalizar caracteres especiales
        clean = clean.replace('$', ' $ ')
        clean = clean.replace(':', ': ')
        clean = clean.replace(',', ', ')
        
        # Convertir a minúsculas manteniendo algunos caracteres importantes
        # clean = clean.lower()  # Comentado para mantener mayúsculas en nombres
        
        return clean.strip()
    
    def _extract_coordinates(self, message: str) -> Dict:
        """Extraer coordenadas del mensaje"""
        
        result = {
            'coordinates': None,
            'address': None,
            'location_type': 'unknown',
            'confidence': 0.0
        }
        
        try:
            # Usar el extractor de coordenadas
            coords_data = self.coords_extractor.extract_with_context(message)
            
            if coords_data['coordinates']:
                result['coordinates'] = coords_data['coordinates']
                result['location_type'] = coords_data['source_type']
                result['confidence'] = coords_data['confidence']
                
                # Intentar obtener dirección
                lat, lng = coords_data['coordinates']
                address = self.coords_extractor.get_address_from_coordinates(lat, lng)
                if address:
                    result['address'] = address
                
                logger.debug(f"Coordenadas extraídas: {coords_data['coordinates']}")
            
        except Exception as e:
            logger.error(f"Error extrayendo coordenadas: {e}")
        
        return result
    
    def _extract_customer_info(self, message: str) -> Dict:
        """Extraer información del cliente"""
        
        customer_info = {}
        
        # Extraer número de cliente
        for pattern in self.patterns['client_number']:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                customer_info['client_number'] = match.group(1)
                break
        
        # Extraer teléfono
        for pattern in self.patterns['phone']:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                phone = re.sub(r'[^\d]', '', match.group(1))
                if len(phone) >= 10:
                    customer_info['phone'] = phone
                break
        
        # Extraer nombre
        for pattern in self.patterns['customer_name']:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                if len(name) > 2 and not any(char.isdigit() for char in name):
                    customer_info['name'] = name
                break
        
        return customer_info
    
    def _extract_products(self, message: str) -> Dict:
        """Extraer productos y cantidades"""
        
        # Usar el procesador NLP para extracción inicial
        nlp_result = self.nlp_processor.parse_whatsapp_message(message)
        
        products = []
        
        # Si NLP encontró productos, usarlos
        if nlp_result.get('products'):
            products = nlp_result['products']
        
        # Complementar con extracción manual por patrones
        manual_products = self._extract_products_manual(message)
        
        # Combinar resultados, priorizando NLP
        for manual_product in manual_products:
            # Verificar si ya existe un producto similar
            found = False
            for existing in products:
                if self._products_similar(existing.get('name', ''), manual_product.get('name', '')):
                    found = True
                    break
            
            if not found:
                products.append(manual_product)
        
        return {
            'products': products,
            'extraction_method': 'nlp+manual' if nlp_result.get('products') else 'manual',
            'nlp_confidence': nlp_result.get('confidence', 0.0)
        }
    
    def _extract_products_manual(self, message: str) -> List[Dict]:
        """Extracción manual de productos por patrones"""
        
        products = []
        
        # Patrones para cantidad + producto
        for pattern in self.patterns['product_quantity']:
            matches = re.finditer(pattern, message, re.IGNORECASE)
            for match in matches:
                try:
                    # Determinar cuál grupo es cantidad y cuál es producto
                    group1, group2 = match.group(1), match.group(2)
                    
                    if group1.isdigit():
                        quantity, product_text = int(group1), group2
                    elif group2.isdigit():
                        quantity, product_text = int(group2), group1
                    else:
                        continue
                    
                    # Limpiar nombre del producto
                    product_name = self._clean_product_name(product_text)
                    
                    if product_name and quantity > 0:
                        # Buscar producto en base de datos
                        product_match = self._find_product_in_db(product_name)
                        
                        if product_match:
                            products.append({
                                'name': product_match['name'],
                                'product_id': product_match['id'],
                                'brand': product_match['brand'],
                                'category': product_match['category'],
                                'quantity': quantity,
                                'price': product_match['price'],
                                'confidence': 0.8,
                                'matched_text': product_text,
                                'extraction_method': 'manual_pattern'
                            })
                
                except (ValueError, IndexError) as e:
                    logger.debug(f"Error procesando match de producto: {e}")
                    continue
        
        return products
    
    def _clean_product_name(self, product_text: str) -> str:
        """Limpiar nombre de producto"""
        
        # Remover palabras irrelevantes
        for stop_word in self.stop_words:
            product_text = re.sub(rf'\b{stop_word}\b', '', product_text, flags=re.IGNORECASE)
        
        # Remover números sueltos y caracteres especiales
        product_text = re.sub(r'\b\d+\b', '', product_text)
        product_text = re.sub(r'[^\w\s]', ' ', product_text)
        
        # Normalizar espacios
        product_text = re.sub(r'\s+', ' ', product_text).strip()
        
        return product_text
    
    def _find_product_in_db(self, product_text: str) -> Optional[Dict]:
        """Buscar producto en base de datos por similitud"""
        
        try:
            from database.connection import db
            
            # Buscar por coincidencia exacta primero
            exact_match = db.session.query(Product).filter(
                Product.name.ilike(f'%{product_text}%'),
                Product.is_active == True
            ).first()
            
            if exact_match:
                return {
                    'id': exact_match.id,
                    'name': exact_match.name,
                    'brand': exact_match.brand,
                    'category': exact_match.category,
                    'price': float(exact_match.price)
                }
            
            # Usar NLP processor para similitud
            similar_products = self.nlp_processor.suggest_product_corrections(product_text, max_suggestions=1)
            
            if similar_products and similar_products[0]['similarity_score'] > 70:
                product_id = similar_products[0]['product_id']
                product = db.session.query(Product).get(product_id)
                
                if product:
                    return {
                        'id': product.id,
                        'name': product.name,