// frontend/src/components/Charts/SalesChart.jsx - Gráfico de Ventas
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react'
import { useQuery } from 'react-query'
import { ordersAPI } from '@/services/api'
import { formatCurrency, formatDate } from '@/utils/formatters'

const SalesChart = ({ type = 'line', period = 30, height = 300 }) => {
  const [chartType, setChartType] = useState(type)
  
  // Obtener datos de ventas
  const { data: salesData, isLoading, error } = useQuery(
    ['sales-chart', period],
    () => ordersAPI.getDailySummary({ days: period }),
    {
      refetchInterval: 300000, // 5 minutos
      staleTime: 240000, // 4 minutos
    }
  )

  // Procesar datos para el gráfico
  const processedData = salesData?.data?.map(item => ({
    date: formatDate(item.date, { dateStyle: 'short' }),
    fullDate: item.date,
    ventas: item.sales_count,
    ingresos: item.total_revenue,
    cantidad: item.total_quantity,
    promedio: item.avg_order_value
  })) || []

  // Componente de tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700"
        >
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize">{entry.dataKey}:</span>
              <span className="font-medium">
                {entry.dataKey === 'ingresos' || entry.dataKey === 'promedio' 
                  ? formatCurrency(entry.value)
                  : entry.value
                }
              </span>
            </div>
          ))}
        </motion.div>
      )
    }
    return null
  }

  // Componente de loading
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-sm text-gray-500">Cargando datos de ventas...</p>
        </div>
      </div>
    )
  }

  // Componente de error
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <TrendingUp className="h-12 w-12 mx-auto opacity-50" />
          </div>
          <p className="text-sm text-gray-500">Error cargando datos</p>
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

  // Si no hay datos
  if (!processedData.length) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No hay datos de ventas</p>
          <p className="text-xs text-gray-400 mt-1">para el período seleccionado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {/* Controles del gráfico */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-700">
            Últimos {period} días
          </h4>
          <span className="text-xs text-gray-500">
            ({processedData.length} registros)
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded transition-colors ${
              chartType === 'line' 
                ? 'bg-primary-100 text-primary-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Gráfico de líneas"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded transition-colors ${
              chartType === 'bar' 
                ? 'bg-primary-100 text-primary-600' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Gráfico de barras"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'line' ? (
          <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ventas"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name="Ventas"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ingresos"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
              name="Ingresos"
            />
          </LineChart>
        ) : (
          <BarChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="rect"
            />
            <Bar
              dataKey="ventas"
              fill="#3b82f6"
              name="Ventas"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="cantidad"
              fill="#22c55e"
              name="Cantidad"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Estadísticas resumidas */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {processedData.reduce((sum, item) => sum + item.ventas, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Total Ventas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(processedData.reduce((sum, item) => sum + item.ingresos, 0))}
          </p>
          <p className="text-xs text-gray-500">Total Ingresos</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(
              processedData.reduce((sum, item) => sum + item.promedio, 0) / processedData.length || 0
            )}
          </p>
          <p className="text-xs text-gray-500">Ticket Promedio</p>
        </div>
      </div>
    </div>
  )
}

export default SalesChart