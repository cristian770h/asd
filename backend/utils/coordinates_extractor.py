# backend/utils/coordinates_extractor.py - Extractor de Coordenadas
import re
import requests
import logging
from typing import Tuple, Optional, Dict
from urllib.parse import urlparse, parse_qs
import time

logger = logging.getLogger(__name__)

class CoordinatesExtractor:
    """Extractor de coordenadas desde URLs de Google Maps y otros formatos"""
    
    def __init__(self, timeout=10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # Cache para URLs procesadas
        self.cache = {}
        
        # Patrones de regex para diferentes formatos
        self.patterns = {
            'google_maps_direct': r'https://maps\.google\.com/\?q=([0-9.-]+),([0-9.-]+)',
            'google_maps_coordinates': r'https://www\.google\.com/maps/.*@([0-9.-]+),([0-9.-]+)',
            'google_maps_place': r'https://maps\.google\.com/maps\?.*ll=([0-9.-]+),([0-9.-]+)',
            'coordinates_text': r'(?:lat|latitude|coord)[:\s]*([0-9.-]+)[,\s]+(?:lng|longitude|long)[:\s]*([0-9.-]+)',
            'simple_coordinates': r'([0-9]{2}\.[0-9]+)[,\s]+(-[0-9]{2}\.[0-9]+)',
            'decimal_coordinates': r'([0-9]+\.[0-9]+)[,\s]+(-[0-9]+\.[0-9]+)',
            'google_short_url': r'https://goo\.gl/maps/[a-zA-Z0-9]+',
            'google_share_url': r'https://maps\.app\.goo\.gl/[a-zA-Z0-9]+',
        }
    
    def extract_coordinates(self, text: str) -> Optional[Tuple[float, float]]:
        """
        Extraer coordenadas de texto que puede contener URLs o coordenadas directas
        
        Args:
            text: Texto que puede contener URLs de mapas o coordenadas
            
        Returns:
            Tuple con (latitud, longitud) o None si no se encuentran
        """
        if not text:
            return None
        
        text = text.strip()
        
        # 1. Buscar URLs de Google Maps directas con coordenadas
        coords = self._extract_from_direct_url(text)
        if coords:
            return coords
        
        # 2. Buscar coordenadas en texto plano
        coords = self._extract_from_text(text)
        if coords:
            return coords
        
        # 3. Intentar expandir URLs cortas
        coords = self._extract_from_short_url(text)
        if coords:
            return coords
        
        # 4. Buscar patrones específicos de Cancún
        coords = self._extract_cancun_specific(text)
        if coords:
            return coords
        
        logger.debug(f"No se pudieron extraer coordenadas de: {text[:100]}...")
        return None
    
    def _extract_from_direct_url(self, text: str) -> Optional[Tuple[float, float]]:
        """Extraer coordenadas de URLs directas de Google Maps"""
        
        # Patrón 1: ?q=lat,lng
        match = re.search(self.patterns['google_maps_direct'], text, re.IGNORECASE)
        if match:
            try:
                lat, lng = float(match.group(1)), float(match.group(2))
                if self._validate_coordinates(lat, lng):
                    return (lat, lng)
            except ValueError:
                pass
        
        # Patrón 2: @lat,lng
        match = re.search(self.patterns['google_maps_coordinates'], text, re.IGNORECASE)
        if match:
            try:
                lat, lng = float(match.group(1)), float(match.group(2))
                if self._validate_coordinates(lat, lng):
                    return (lat, lng)
            except ValueError:
                pass
        
        # Patrón 3: ll=lat,lng
        match = re.search(self.patterns['google_maps_place'], text, re.IGNORECASE)
        if match:
            try:
                lat, lng = float(match.group(1)), float(match.group(2))
                if self._validate_coordinates(lat, lng):
                    return (lat, lng)
            except ValueError:
                pass
        
        return None
    
    def _extract_from_text(self, text: str) -> Optional[Tuple[float, float]]:
        """Extraer coordenadas de texto plano"""
        
        # Patrón 1: "lat: X, lng: Y" o variaciones
        match = re.search(self.patterns['coordinates_text'], text, re.IGNORECASE)
        if match:
            try:
                lat, lng = float(match.group(1)), float(match.group(2))
                if self._validate_coordinates(lat, lng):
                    return (lat, lng)
            except ValueError:
                pass
        
        # Patrón 2: Coordenadas simples "21.1234, -86.5678"
        match = re.search(self.patterns['simple_coordinates'], text)
        if match:
            try:
                lat, lng = float(match.group(1)), float(match.group(2))
                if self._validate_coordinates(lat, lng):
                    return (lat, lng)
            except ValueError:
                pass
        
        # Patrón 3: Coordenadas decimales generales
        match = re.search(self.patterns['decimal_coordinates'], text)
        if match:
            try:
                lat, lng = float(match.group(1)), float(match.group(2))
                if self._validate_coordinates(lat, lng):
                    return (lat, lng)
            except ValueError:
                pass
        
        return None
    
    def _extract_from_short_url(self, text: str) -> Optional[Tuple[float, float]]:
        """Extraer coordenadas expandiendo URLs cortas"""
        
        # Buscar URLs cortas de Google Maps
        short_urls = []
        
        # goo.gl/maps/
        match = re.search(self.patterns['google_short_url'], text)
        if match:
            short_urls.append(match.group(0))
        
        # maps.app.goo.gl/
        match = re.search(self.patterns['google_share_url'], text)
        if match:
            short_urls.append(match.group(0))
        
        for url in short_urls:
            # Verificar cache primero
            if url in self.cache:
                return self.cache[url]
            
            coords = self._expand_short_url(url)
            if coords:
                self.cache[url] = coords
                return coords
        
        return None
    
    def _expand_short_url(self, short_url: str) -> Optional[Tuple[float, float]]:
        """Expandir URL corta para obtener coordenadas"""
        try:
            # Hacer request sin seguir redirecciones
            response = self.session.head(short_url, allow_redirects=True, timeout=self.timeout)
            
            if response.status_code == 200:
                final_url = response.url
                logger.debug(f"URL expandida: {final_url}")
                
                # Extraer coordenadas de la URL expandida
                return self._extract_from_direct_url(final_url)
            
        except requests.RequestException as e:
            logger.warning(f"Error expandiendo URL {short_url}: {e}")
        
        return None
    
    def _extract_cancun_specific(self, text: str) -> Optional[Tuple[float, float]]:
        """Buscar patrones específicos de ubicaciones en Cancún"""
        
        # Diccionario de ubicaciones conocidas en Cancún
        cancun_locations = {
            'centro': (21.1619, -86.8515),
            'zona hotelera': (21.1692, -86.8980),
            'aeropuerto': (21.0365, -86.8770),
            'downtown': (21.1619, -86.8515),
            'hotel zone': (21.1692, -86.8980),
            'playa delfines': (21.1325, -86.7739),
            'playa norte': (21.2417, -86.7468),
            'mercado 28': (21.1653, -86.8467),
            'parque de las palapas': (21.1613, -86.8472),
        }
        
        text_lower = text.lower()
        
        for location, coords in cancun_locations.items():
            if location in text_lower:
                logger.info(f"Ubicación conocida encontrada: {location}")
                return coords
        
        return None
    
    def _validate_coordinates(self, lat: float, lng: float) -> bool:
        """Validar que las coordenadas estén en el área de Cancún"""
        
        # Límites aproximados de Cancún y área metropolitana
        # Latitud: 20.5 a 21.5
        # Longitud: -87.5 a -86.5
        
        if not (20.5 <= lat <= 21.5):
            logger.debug(f"Latitud fuera de rango: {lat}")
            return False
        
        if not (-87.5 <= lng <= -86.5):
            logger.debug(f"Longitud fuera de rango: {lng}")
            return False
        
        return True
    
    def extract_multiple_coordinates(self, text: str) -> list[Tuple[float, float]]:
        """Extraer múltiples coordenadas de un texto"""
        coordinates = []
        
        # Buscar todos los patrones posibles
        patterns_to_try = [
            self.patterns['google_maps_direct'],
            self.patterns['google_maps_coordinates'],
            self.patterns['simple_coordinates'],
            self.patterns['decimal_coordinates']
        ]
        
        for pattern in patterns_to_try:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    lat, lng = float(match.group(1)), float(match.group(2))
                    if self._validate_coordinates(lat, lng):
                        coords = (lat, lng)
                        if coords not in coordinates:
                            coordinates.append(coords)
                except (ValueError, IndexError):
                    continue
        
        return coordinates
    
    def get_address_from_coordinates(self, lat: float, lng: float) -> Optional[str]:
        """Obtener dirección aproximada desde coordenadas (reverse geocoding básico)"""
        try:
            # URL de la API de geocoding inverso de OpenStreetMap (gratuita)
            url = f"https://nominatim.openstreetmap.org/reverse"
            params = {
                'lat': lat,
                'lon': lng,
                'format': 'json',
                'addressdetails': 1,
                'zoom': 18
            }
            
            response = self.session.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'display_name' in data:
                    address = data['display_name']
                    
                    # Limpiar y formatear dirección
                    address_parts = address.split(',')
                    if len(address_parts) >= 3:
                        # Tomar las primeras 3 partes más relevantes
                        return ', '.join(address_parts[:3]).strip()
                    
                    return address
            
        except Exception as e:
            logger.warning(f"Error obteniendo dirección para {lat}, {lng}: {e}")
        
        return None
    
    def validate_coordinates_quality(self, lat: float, lng: float) -> Dict[str, any]:
        """Validar y evaluar la calidad de las coordenadas"""
        
        quality_info = {
            'valid': False,
            'precision': 'unknown',
            'area': 'unknown',
            'confidence': 0.0,
            'warnings': []
        }
        
        # Validación básica
        if not self._validate_coordinates(lat, lng):
            quality_info['warnings'].append('Coordenadas fuera del área de Cancún')
            return quality_info
        
        quality_info['valid'] = True
        
        # Evaluar precisión basada en decimales
        lat_decimals = len(str(lat).split('.')[-1]) if '.' in str(lat) else 0
        lng_decimals = len(str(lng).split('.')[-1]) if '.' in str(lng) else 0
        
        min_decimals = min(lat_decimals, lng_decimals)
        
        if min_decimals >= 6:
            quality_info['precision'] = 'very_high'  # ~1 metro
            quality_info['confidence'] = 0.95
        elif min_decimals >= 4:
            quality_info['precision'] = 'high'       # ~10 metros
            quality_info['confidence'] = 0.85
        elif min_decimals >= 3:
            quality_info['precision'] = 'medium'     # ~100 metros
            quality_info['confidence'] = 0.70
        else:
            quality_info['precision'] = 'low'        # >100 metros
            quality_info['confidence'] = 0.50
            quality_info['warnings'].append('Baja precisión en coordenadas')
        
        # Determinar área aproximada
        if 21.13 <= lat <= 21.20 and -86.77 <= lng <= -86.74:
            quality_info['area'] = 'zona_hotelera'
        elif 21.15 <= lat <= 21.17 and -86.86 <= lng <= -86.84:
            quality_info['area'] = 'centro'
        elif 21.18 <= lat <= 21.25 and -86.89 <= lng <= -86.85:
            quality_info['area'] = 'norte'
        elif 21.12 <= lat <= 21.15 and -86.86 <= lng <= -86.82:
            quality_info['area'] = 'sur'
        else:
            quality_info['area'] = 'area_metropolitana'
        
        return quality_info
    
    def extract_with_context(self, text: str) -> Dict[str, any]:
        """Extraer coordenadas con información contextual"""
        
        result = {
            'coordinates': None,
            'source_type': 'unknown',
            'confidence': 0.0,
            'context': {},
            'quality': {}
        }
        
        # Intentar extraer coordenadas
        coords = self.extract_coordinates(text)
        
        if not coords:
            return result
        
        result['coordinates'] = coords
        lat, lng = coords
        
        # Determinar tipo de fuente
        if 'google.com/maps' in text.lower() or 'maps.google.com' in text.lower():
            result['source_type'] = 'google_maps'
            result['confidence'] = 0.9
        elif 'goo.gl' in text.lower():
            result['source_type'] = 'google_short_url'
            result['confidence'] = 0.8
        elif re.search(r'[0-9]+\.[0-9]+.*[0-9]+\.[0-9]+', text):
            result['source_type'] = 'text_coordinates'
            result['confidence'] = 0.7
        
        # Información contextual
        result['context'] = {
            'original_text': text[:200],  # Primeros 200 caracteres
            'extracted_from': 'direct_match'
        }
        
        # Evaluar calidad
        result['quality'] = self.validate_coordinates_quality(lat, lng)
        
        # Ajustar confianza basada en calidad
        result['confidence'] *= result['quality']['confidence']
        
        return result
    
    def batch_extract_coordinates(self, texts: list[str]) -> list[Dict[str, any]]:
        """Extraer coordenadas de múltiples textos"""
        
        results = []
        
        for i, text in enumerate(texts):
            try:
                result = self.extract_with_context(text)
                result['index'] = i
                results.append(result)
                
                # Pequeña pausa para evitar rate limiting
                if i % 10 == 0 and i > 0:
                    time.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Error procesando texto {i}: {e}")
                results.append({
                    'index': i,
                    'coordinates': None,
                    'error': str(e)
                })
        
        return results
    
    def get_distance_between_coordinates(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Calcular distancia en metros entre dos coordenadas usando fórmula de Haversine"""
        
        import math
        
        lat1, lng1 = coord1
        lat2, lng2 = coord2
        
        # Radio de la Tierra en metros
        R = 6371000
        
        # Convertir a radianes
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        # Fórmula de Haversine
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * 
             math.sin(delta_lng / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        
        return distance
    
    def clear_cache(self):
        """Limpiar cache de URLs procesadas"""
        self.cache.clear()
        logger.info("Cache de coordenadas limpiado")
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Obtener estadísticas del cache"""
        return {
            'cached_urls': len(self.cache),
            'successful_extractions': len([v for v in self.cache.values() if v is not None])
        }