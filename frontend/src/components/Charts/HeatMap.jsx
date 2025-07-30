// frontend/src/components/Charts/HeatMap.jsx - Componente Mapa de Calor
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Layers, Zap, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { clusteringAPI } from '@/services/api'
import { formatCurrency } from '@/utils/formatters'

const HeatMap = ({ height = 300, interactive = true }) => {
  const mapRef = useRef(null)
  const [selectedZone, setSelectedZone] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Obtener datos del mapa de calor
  const { data: heatmapData, isLoading, error } = useQuery(
    'heatmap-data',
    clusteringAPI.getHeatmapData,
    {
      refetchInterval: 600000, // 10 minutos
      staleTime: 300000, // 5 minutos
    }
  )

  // Datos de ejemplo para cuando no hay datos reales
  const exampleData = [
    { id: 0, lat: 21.1619, lng: -86.8515, intensity: 45, revenue: 125000, zone_name: 'Centro', cluster_id: 0 },
    { id: 1, lat: 21.1692, lng: -86.8980, intensity: 62, revenue: 189000, zone_name: 'Zona Hotelera', cluster_id: 1 },
    { id: 2, lat: 21.1936, lng: -86.8863, intensity: 38, revenue: 98000, zone_name: 'Norte', cluster_id: 2 },
    { id: 3, lat: 21.1450, lng: -86.8350, intensity: 29, revenue: 67000, zone_name: 'Sur', cluster_id: 3 },
    { id: 4, lat: 21.1800, lng: -86.8700, intensity: 51, revenue: 142000, zone_name: 'Residencial', cluster_id: 4 }
  ]

  const displayData = heatmapData?.data?.length ? heatmapData.data : exampleData

  // Componente de zona del mapa
  const ZoneCircle = ({ zone, index }) => {
    const maxIntensity = Math.max(...displayData.map(z => z.intensity))
    const normalizedIntensity = zone.intensity / maxIntensity
    const size = Math.max(20, normalizedIntensity * 60)
    const opacity = Math.max(0.3, normalizedIntensity)

    return (
      <motion.div
        key={zone.cluster_id}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
        style={{
          left: `${((zone.lng + 87.5) / 1.0) * 100}%`,
          top: `${(1 - (zone.lat - 20.5) / 1.0) * 100}%`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => interactive && setSelectedZone(zone)}
      >
        {/* Círculo principal */}
        <div
          className="rounded-full border-2 border-white shadow-lg"
          style={{
            width: size,
            height: size,
            backgroundColor: `rgba(59, 130, 246, ${opacity})`,
          }}
        />
        
        {/* Pulso animado */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.3,
          }}
          style={{
            width: size,
            height: size,
          }}
        />
        
        {/* Icono central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="h-4 w-4 text-white drop-shadow-sm" />
        </div>
        
        {/* Label de zona */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
          <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {zone.zone_name}
          </div>
        </div>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-sm text-gray-500">Cargando mapa de calor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 opacity-50 mb-2" />
          <p className="text-sm text-gray-500">Error cargando mapa</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Mapa base */}
      <div 
        ref={mapRef}
        className="relative w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden border border-gray-200"
        style={{ height }}
      >
        {/* Fondo del mapa (simulado) */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-50 to-green-50">
          {/* Líneas de cuadrícula */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6b7280" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Elementos decorativos del mapa */}
          <div className="absolute top-4 left-4 w-8 h-8 bg-blue-200 rounded-full opacity-30"></div>
          <div className="absolute bottom-6 right-8 w-12 h-6 bg-green-200 rounded-full opacity-30"></div>
          <div className="absolute top-1/2 left-1/3 w-6 h-6 bg-yellow-200 rounded-full opacity-30"></div>
        </div>

        {/* Zonas del mapa */}
        {displayData.map((zone, index) => (
          <ZoneCircle key={zone.cluster_id} zone={zone} index={index} />
        ))}

        {/* Controles del mapa */}
        <div className="absolute top-3 right-3 flex flex-col space-y-1">
          <button className="p-2 bg-white rounded shadow-md hover:bg-gray-50 transition-colors">
            <Layers className="h-4 w-4 text-gray-600" />
          </button>
          <button className="p-2 bg-white rounded shadow-md hover:bg-gray-50 transition-colors">
            <Zap className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Leyenda */}
        <div className="absolute bottom-3 left-3 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-md">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Intensidad</h4>
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[0.3, 0.5, 0.7, 1.0].map((intensity, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border border-white"
                  style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Bajo</span>
              <span className="ml-8">Alto</span>
            </div>
          </div>
        </div>

        {/* Información de la zona seleccionada */}
        {selectedZone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-3 left-3 bg-white rounded-lg shadow-lg p-4 max-w-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{selectedZone.zone_name}</h3>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ventas:</span>
                <span className="font-medium">{selectedZone.intensity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresos:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(selectedZone.revenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cluster:</span>
                <span className="font-medium">#{selectedZone.cluster_id}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Estadísticas resumidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{displayData.length}</p>
          <p className="text-xs text-blue-600">Zonas</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">
            {displayData.reduce((sum, zone) => sum + zone.intensity, 0)}
          </p>
          <p className="text-xs text-green-600">Total Ventas</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-lg font-bold text-purple-600">
            {Math.round(displayData.reduce((sum, zone) => sum + zone.intensity, 0) / displayData.length)}
          </p>
          <p className="text-xs text-purple-600">Promedio</p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-lg font-bold text-orange-600">
            {Math.max(...displayData.map(zone => zone.intensity))}
          </p>
          <p className="text-xs text-orange-600">Máximo</p>
        </div>
      </div>
    </div>
  )
}

export default HeatMap