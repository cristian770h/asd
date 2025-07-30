// frontend/src/components/Charts/PredictionChart.jsx - Gráfico de Predicciones
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, Calendar, Target } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { predictionsAPI } from '@/services/api'
import { formatDate, formatNumber } from '@/utils/formatters'

const PredictionChart = ({ data: propData, type = 'daily', height = 300 }) => {
  const [showConfidence, setShowConfidence] = useState(true)
  const [predictionType, setPredictionType] = useState(type)

  // Obtener predicciones si no se pasan por props
  const { data: fetchedData, isLoading, error } = useQuery(
    ['predictions', predictionType],
    () => {
      switch (predictionType) {
        case 'daily':
          return predictionsAPI.getDaily({ days_ahead: 7 })
        case 'weekly':
          return predictionsAPI.getWeekly({ weeks_ahead: 4 })
        case 'monthly':
          return predictionsAPI.getMonthly({ months_ahead: 3 })
        default:
          return predictionsAPI.getDaily({ days_ahead: 7 })
      }
    },
    {
      enabled: !propData,
      refetchInterval: 600000, // 10 minutos
      staleTime: 300000, // 5 minutos
    }
  )

  // Usar datos pasados por props o datos obtenidos
  const predictions = propData || fetchedData?.data || []

  // Procesar datos para el gráfico
  const processedData = predictions.map(pred => ({
    fecha: predictionType === 'monthly' 
      ? pred.month 
      : formatDate(pred.target_date || pred.date, { dateStyle: 'short' }),
    fullDate: pred.target_date || pred.date,
    prediccion: Math.round(pred.predicted_value || pred.predicted_sales || 0),
    confianza_min: Math.round(pred.confidence_lower || 0),
    confianza_max: Math.round(pred.confidence_upper || pred.predicted_value * 1.2 || 0),
    modelo: pred.model_name || pred.model || 'ARIMA',
    precision: pred.accuracy_score || 85
  }))

  // Tooltip personalizado
        const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 text-white p-4 rounded-lg shadow-xl border border-gray-700"
        >
          <p className="font-semibold mb-2 flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            {label}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Predicción:</span>
              <span className="font-medium text-blue-400">
                {formatNumber(data.prediccion)} ventas
              </span>
            </div>
            {showConfidence && (
              <>
                <div className="flex justify-between">
                  <span>Rango min:</span>
                  <span className="text-gray-300">
                    {formatNumber(data.confianza_min)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rango max:</span>
                  <span className="text-gray-300">
                    {formatNumber(data.confianza_max)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span>Modelo:</span>
              <span className="text-green-400">{data.modelo}</span>
            </div>
            <div className="flex justify-between">
              <span>Precisión:</span>
              <span className="text-yellow-400">{data.precision}%</span>
            </div>
          </div>
        </motion.div>
      )
    }
    return null
  }

  if (isLoading && !propData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-pulse flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary-500" />
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
          <p className="text-sm text-gray-500">Generando predicciones...</p>
        </div>
      </div>
    )
  }

  if (error && !propData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto text-red-500 opacity-50 mb-2" />
          <p className="text-sm text-gray-500">Error cargando predicciones</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-xs text-primary-500 hover:text-primary-600 mt-2"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!processedData.length) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Target className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No hay predicciones disponibles</p>
          <p className="text-xs text-gray-400 mt-1">
            Los modelos se están entrenando
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {/* Controles */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Brain className="h-4 w-4 mr-2 text-primary-500" />
            Predicciones {predictionType === 'daily' ? 'Diarias' : 
                         predictionType === 'weekly' ? 'Semanales' : 'Mensuales'}
          </h4>
          <span className="text-xs text-gray-500">
            ({processedData.length} períodos)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Selector de tipo */}
          <select
            value={predictionType}
            onChange={(e) => setPredictionType(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="daily">Diarias</option>
            <option value="weekly">Semanales</option>
            <option value="monthly">Mensuales</option>
          </select>

          {/* Toggle intervalo de confianza */}
          <button
            onClick={() => setShowConfidence(!showConfidence)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              showConfidence 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Confianza
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={processedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis 
            dataKey="fecha" 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis 
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatNumber(value)}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            iconType="circle"
          />

          {/* Área de intervalo de confianza */}
          {showConfidence && (
            <Area
              type="monotone"
              dataKey="confianza_max"
              stroke="none"
              fill="url(#confidenceGradient)"
              fillOpacity={0.3}
              name="Intervalo Superior"
            />
          )}

          {/* Línea principal de predicción */}
          <Area
            type="monotone"
            dataKey="prediccion"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#predictionGradient)"
            fillOpacity={0.4}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
            name="Predicción"
          />

          {/* Línea de confianza mínima */}
          {showConfidence && (
            <Line
              type="monotone"
              dataKey="confianza_min"
              stroke="#6b7280"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Límite Inferior"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Métricas del modelo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-lg font-bold text-primary-600">
            {formatNumber(processedData.reduce((sum, item) => sum + item.prediccion, 0))}
          </p>
          <p className="text-xs text-gray-500">Total Predicho</p>
        </div>
        
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">
            {Math.round(processedData.reduce((sum, item) => sum + item.precision, 0) / processedData.length)}%
          </p>
          <p className="text-xs text-gray-500">Precisión Avg</p>
        </div>
        
        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">
            {Math.round(processedData.reduce((sum, item) => sum + item.prediccion, 0) / processedData.length)}
          </p>
          <p className="text-xs text-gray-500">Promedio</p>
        </div>
        
        <div className="text-center">
          <p className="text-lg font-bold text-orange-600">
            {processedData.length > 0 ? processedData[0].modelo : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Modelo</p>
        </div>
      </div>

      {/* Indicador de tendencia */}
      {processedData.length >= 2 && (
        <div className="flex items-center justify-center mt-3">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-600">Tendencia:</span>
            {processedData[processedData.length - 1].prediccion > processedData[0].prediccion ? (
              <div className="flex items-center text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Creciente</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <TrendingUp className="h-4 w-4 mr-1 rotate-180" />
                <span>Decreciente</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PredictionChart