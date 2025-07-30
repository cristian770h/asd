# backend/utils/whatsapp_parser.py - Parser de WhatsApp Completo
import re
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import json

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
        
        # Patrones de regex mejorados
        self.patterns = {
            # Información del cliente
            'client_number': [
                r'cliente[:\s#]*([0-9]+)',
                r'client[e]?[:\s#]*([0-9]+)',
                r'#([0-9]+)',
                r'numero[:\s]*([0-9]+)'
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
            
            # Coordenadas
            'coordinates': [
                r'(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)',
                r'lat[itud]*[:\s]*(-?\d+\.?\d*)\s*,?\s*lng?[:\s]*(-?\d+\.?\d*)',
                r'ubicación[:\s]*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)'
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
                r'(\d+)\s*(?:pzas?|piezas?|unidades?|kg|g|ml|litros?|lts?)\s+(.+?)(?:\n|\$|precio|total|$)',
                r'(.+?)\s+(\d+)\s*(?:pzas?|piezas?|unidades?|kg|g|ml|litros?|lts?)(?:\n|\$|precio|total|$)',
                r'cantidad[:\s]*(\d+)\s*(?:de\s+)?(.+?)(?:\n|\$|precio|total|$)'
            ],
            
            # Precios
            'prices': [
                r'\$\s*([0-9]+(?:\.[0-9]{2})?)',
                r'precio[:\s]*\$?\s*([0-9]+(?:\.[0-9]{2})?)',
                r'total[:\s]*\$?\s*([0-9]+(?:\.[0-9]{2})?)',
                r'([0-9]+(?:\.[0-9]{2})?)\s*pesos'
            ],
            
            # Horarios de entrega
            'delivery_time': [
                r'(?:entrega|delivery|envío)[:\s]*([0-9]{1,2}:[0-9]{2})\s*(?:hrs?|horas?|am|pm)',
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
        
        # Productos conocidos del sistema
        self.known_products = {
            'croquetas': ['croquetas', 'alimento', 'comida perro'],
            'collar': ['collar', 'correa'],
            'juguete': ['juguete', 'pelota', 'hueso'],
            'shampoo': ['shampoo', 'champú', 'jabón']
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
            result.metadata['parsed_at'] = datetime.now().isoformat()
            
            # 1. Extraer coordenadas
            coords_result = self._extract_coordinates(clean_message)
            if coords_result:
                result.coordinates = coords_result
                result.confidence += 0.25
            else:
                result.warnings.append("No se encontraron coordenadas")
            
            # 2. Extraer información del cliente
            customer_info = self._extract_customer_info(clean_message)
            result.customer_info = customer_info
            if customer_info.get('name') or customer_info.get('phone'):
                result.confidence += 0.15
            
            # 3. Extraer productos
            products = self._extract_products(clean_message)
            result.products = products
            if products:
                result.confidence += 0.35
                result.metadata['products_found'] = len(products)
            else:
                result.errors.append("No se encontraron productos válidos")
            
            # 4. Extraer información de entrega
            delivery_info = self._extract_delivery_info(clean_message)
            result.delivery_info = delivery_info
            if delivery_info:
                result.confidence += 0.15
            
            # 5. Extraer información de pago
            payment_info = self._extract_payment_info(clean_message)
            result.payment_info = payment_info
            if payment_info.get('total') or payment_info.get('method'):
                result.confidence += 0.10
            
            # Validar resultado final
            result = self._validate_parsed_data(result)
            
            logger.info(f"Mensaje parseado con confianza: {result.confidence:.2f}")
            
        except Exception as e:
            logger.error(f"Error parseando mensaje: {str(e)}")
            result.errors.append(f"Error de parseo: {str(e)}")
            result.confidence = 0.0
            
        return result
    
    def _clean_message(self, message: str) -> str:
        """Limpiar y normalizar mensaje"""
        # Convertir a minúsculas
        clean = message.lower()
        
        # Remover caracteres especiales innecesarios
        clean = re.sub(r'[^\w\s\n\$\.,:\-\(\)#]', ' ', clean)
        
        # Normalizar espacios
        clean = re.sub(r'\s+', ' ', clean)
        
        # Normalizar saltos de línea
        clean = re.sub(r'\n+', '\n', clean)
        
        return clean.strip()
    
    def _extract_coordinates(self, message: str) -> Optional[Tuple[float, float]]:
        """Extraer coordenadas del mensaje"""
        for pattern in self.patterns['coordinates']:
            matches = re.findall(pattern, message)
            if matches:
                try:
                    for match in matches:
                        lat, lng = float(match[0]), float(match[1])
                        # Validar rango de coordenadas (aproximado para México)
                        if -120 <= lng <= -80 and 10 <= lat <= 35:
                            return (lat, lng)
                except (ValueError, IndexError):
                    continue
        return None
    
    def _extract_customer_info(self, message: str) -> Dict:
        """Extraer información del cliente"""
        customer_info = {}
        
        # Extraer nombre
        for pattern in self.patterns['customer_name']:
            match = re.search(pattern, message)
            if match:
                name = match.group(1).strip().title()
                if len(name) > 2:
                    customer_info['name'] = name
                    break
        
        # Extraer teléfono
        for pattern in self.patterns['phone']:
            match = re.search(pattern, message)
            if match:
                phone = re.sub(r'[^\d]', '', match.group(1))
                if len(phone) >= 10:
                    customer_info['phone'] = phone
                    break
        
        # Extraer número de cliente
        for pattern in self.patterns['client_number']:
            match = re.search(pattern, message)
            if match:
                customer_info['client_number'] = match.group(1)
                break
        
        return customer_info
    
    def _extract_products(self, message: str) -> List[Dict]:
        """Extraer productos del mensaje"""
        products = []
        
        # Buscar patrones de cantidad + producto
        for pattern in self.patterns['product_quantity']:
            matches = re.findall(pattern, message)
            for match in matches:
                if len(match) == 2:
                    try:
                        # Determinar si el primer elemento es cantidad o producto
                        if match[0].isdigit():
                            quantity, product_name = int(match[0]), match[1].strip()
                        else:
                            product_name, quantity = match[0].strip(), int(match[1])
                        
                        # Normalizar nombre del producto
                        product_name = self._normalize_product_name(product_name)
                        
                        if product_name and quantity > 0:
                            products.append({
                                'name': product_name,
                                'quantity': quantity,
                                'unit': self._extract_unit(message, product_name),
                                'price': self._extract_product_price(message, product_name)
                            })
                    except ValueError:
                        continue
        
        return products
    
    def _normalize_product_name(self, product_name: str) -> str:
        """Normalizar nombre del producto"""
        product_name = product_name.lower().strip()
        
        # Buscar coincidencias con productos conocidos
        for category, keywords in self.known_products.items():
            for keyword in keywords:
                if keyword in product_name:
                    return category.title()
        
        # Si no se encuentra coincidencia, limpiar y devolver
        product_name = re.sub(r'\b(?:de|del|la|el|un|una)\b', '', product_name)
        product_name = re.sub(r'\s+', ' ', product_name).strip()
        
        return product_name.title() if len(product_name) > 2 else None
    
    def _extract_unit(self, message: str, product_name: str) -> str:
        """Extraer unidad del producto"""
        units = ['pzas', 'piezas', 'unidades', 'kg', 'g', 'ml', 'litros', 'lts']
        
        for unit in units:
            pattern = rf'{re.escape(product_name)}.*?(\d+)\s*{unit}'
            if re.search(pattern, message, re.IGNORECASE):
                return unit
        
        return 'piezas'  # Unidad por defecto
    
    def _extract_product_price(self, message: str, product_name: str) -> Optional[float]:
        """Extraer precio específico del producto"""
        # Buscar precio cerca del nombre del producto
        product_area = self._get_text_around_product(message, product_name, 50)
        
        for pattern in self.patterns['prices']:
            match = re.search(pattern, product_area)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        
        return None
    
    def _get_text_around_product(self, message: str, product_name: str, window: int) -> str:
        """Obtener texto alrededor del nombre del producto"""
        match = re.search(re.escape(product_name), message, re.IGNORECASE)
        if match:
            start = max(0, match.start() - window)
            end = min(len(message), match.end() + window)
            return message[start:end]
        return message
    
    def _extract_delivery_info(self, message: str) -> Dict:
        """Extraer información de entrega"""
        delivery_info = {}
        
        # Extraer referencias
        for pattern in self.patterns['references']:
            match = re.search(pattern, message)
            if match:
                reference = match.group(1).strip()
                if len(reference) > 5:
                    delivery_info['reference'] = reference
                    break
        
        # Extraer horarios
        for pattern in self.patterns['delivery_time']:
            match = re.search(pattern, message)
            if match:
                if len(match.groups()) == 1:
                    delivery_info['preferred_time'] = match.group(1)
                else:
                    delivery_info['time_range'] = f"{match.group(1)} - {match.group(2)}"
                break
        
        # Extraer instrucciones especiales
        for pattern in self.patterns['special_instructions']:
            match = re.search(pattern, message)
            if match:
                instruction = match.group(1).strip()
                if len(instruction) > 3:
                    delivery_info['special_instructions'] = instruction
                    break
        
        return delivery_info
    
    def _extract_payment_info(self, message: str) -> Dict:
        """Extraer información de pago"""
        payment_info = {}
        
        # Extraer precios/totales
        prices = []
        for pattern in self.patterns['prices']:
            matches = re.findall(pattern, message)
            for match in matches:
                try:
                    prices.append(float(match))
                except ValueError:
                    continue
        
        if prices:
            # Asumir que el precio más alto es el total
            payment_info['total'] = max(prices)
            payment_info['subtotals'] = prices
        
        # Detectar método de pago
        payment_methods = {
            'efectivo': ['efectivo', 'cash', 'dinero'],
            'tarjeta': ['tarjeta', 'card', 'bancario'],
            'transferencia': ['transferencia', 'transfer', 'depósito']
        }
        
        for method, keywords in payment_methods.items():
            for keyword in keywords:
                if keyword in message:
                    payment_info['method'] = method
                    break
            if 'method' in payment_info:
                break
        
        return payment_info
    
    def _validate_parsed_data(self, result: ParsedOrder) -> ParsedOrder:
        """Validar y mejorar datos parseados"""
        
        # Validar productos
        if not result.products:
            result.errors.append("No se identificaron productos en el mensaje")
            result.confidence *= 0.1
        
        # Validar coordenadas
        if not result.coordinates:
            result.warnings.append("No se encontraron coordenadas de entrega")
        
        # Validar información del cliente
        if not result.customer_info.get('name') and not result.customer_info.get('phone'):
            result.warnings.append("Información limitada del cliente")
            result.confidence *= 0.8
        
        # Validar coherencia de precios
        if result.payment_info.get('total'):
            total = result.payment_info['total']
            if total < 10 or total > 10000:  # Rangos razonables
                result.warnings.append(f"Total parece inusual: ${total}")
        
        # Calcular confianza final
        if result.errors:
            result.confidence *= 0.5
        if result.warnings:
            result.confidence *= 0.9
        
        result.metadata['validation_completed'] = True
        result.metadata['final_confidence'] = result.confidence
        
        return result