// frontend/src/pages/Analytics.jsx - Página de Análisis
import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Target,
  PieChart,
  Users,
  MapPin,
  Package,
  DollarSign,
  Download,
  RefreshCw
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Card from '../components/UI/Card'
import Button from '../components/UI/Button'
import SalesChart from '../components/Charts/SalesChart'
import PredictionChart from '../components/Charts/PredictionChart'
import HeatMap from '../components/Charts/HeatMap'
import { ordersAPI, productsAPI, clusteringAPI, predictionsAPI } from '../services/api'
import { formatCurrency, formatNumber, formatPercentage, formatDate } from '@/utils/formatters'

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(30)
  const [selectedMetric, setSelectedMetric] = useState('sales')

  // Queries para obtener datos analíticos
  const { data: salesSummary, isLoading: salesLoading } = useQuery(
    ['analytics-sales', selectedPeriod],
    () => ordersAPI.getDailySummary({ days: selectedPeriod }),
    { staleTime: 300000 }
  )

  const { data: productPerformance, isLoading: productsLoading } = useQuery(
    ['analytics-products', selectedPeriod],
    () => ordersAPI.getProductPerformance({ days: selectedPeriod, limit: 10 }),
    { staleTime: 300000 }
  )

  const { data: zoneComparison, isLoading: zonesLoading } = useQuery(
    ['analytics-zones', selectedPeriod],
    () => clusteringAPI.getZoneComparison({ days: selectedPeriod }),
    { staleTime: 300000 }
  )

  const { data: predictionAccuracy } = useQuery(
    ['analytics-accuracy'],
    () => predictionsAPI.getAccuracy({ days_back: 30 }),
    { staleTime: 600000 }
  )

  const { data: inventoryStats } = useQuery(
    'analytics-inventory',
    () => productsAPI.getStats(),
    { staleTime: 300000 }
  )

  // Calcular métricas principales
  const calculateMetrics = () => {
    if (!salesSummary?.data) return null

    const data = salesSummary.data
    const totalSales = data.reduce((sum, day) => sum + day.sales_count, 0)
    const totalRevenue = data.reduce((sum, day) => sum + day.total_revenue, 0)
    const avgOrderValue = totalRevenue / totalSales || 0

    // Calcular crecimiento
    const halfPoint = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, halfPoint)
    const secondHalf = data.slice(halfPoint)
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.sales_count, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.sales_count, 0) / secondHalf.length
    
    const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0

    return {
      totalSales,
      totalRevenue,
      avgOrderValue,
      growthRate,
      dailyAverage: totalSales / data.length
    }
  }

  const metrics = calculateMetrics()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análisis y Reportes</h1>
          <p className="text-gray-600 mt-1">
            Insights profundos sobre el rendimiento del negocio
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Selector de período */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
          >
            Exportar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Métricas principales */}
      <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(metrics?.totalSales || 0)}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className={`h-4 w-4 mr-1 ${
                  (metrics?.growthRate || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`} />
                <span className={`text-sm font-medium ${
                  (metrics?.growthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics?.growthRate >= 0 ? '+' : ''}{formatPercentage(metrics?.growthRate || 0)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.totalRevenue || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Promedio: {formatCurrency((metrics?.totalRevenue || 0) / selectedPeriod)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.avgOrderValue || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Por transacción
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Precisión ML</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(predictionAccuracy?.data?.average_accuracy || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Predicciones
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de ventas */}
        <motion.div variants={cardVariants}>
          <Card className="h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Tendencia de Ventas
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedMetric('sales')}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedMetric === 'sales' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setSelectedMetric('revenue')}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedMetric === 'revenue' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ingresos
                </button>
              </div>
            </div>
            <SalesChart period={selectedPeriod} type="line" />
          </Card>
        </motion.div>

        {/* Predicciones */}
        <motion.div variants={cardVariants}>
          <Card className="h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Predicciones ML
              </h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <PredictionChart type="daily" height={300} />
          </Card>
        </motion.div>
      </div>

      {/* Análisis por productos y zonas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top productos */}
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Productos Más Vendidos
              </h3>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-3">
              {productPerformance?.data?.slice(0, 8).map((product, index) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
                      <span className="text-sm font-semibold text-primary-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.product_name}</p>
                      <p className="text-sm text-gray-600">{product.brand}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatNumber(product.total_quantity)} unidades
                    </p>
                    <p className="text-sm text-green-600">
                      {formatCurrency(product.total_revenue)}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {productsLoading && (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3 p-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Análisis de inventario */}
        <motion.div variants={cardVariants}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Estado del Inventario
              </h3>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(inventoryStats?.data?.total_products || 0)}
                </p>
                <p className="text-sm text-green-700">Productos Activos</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-600">
                    {formatNumber(inventoryStats?.data?.critical_stock_count || 0)}
                  </p>
                  <p className="text-xs text-red-700">Stock Crítico</p>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-lg font-bold text-yellow-600">
                    {formatNumber(inventoryStats?.data?.low_stock_count || 0)}
                  </p>
                  <p className="text-xs text-yellow-700">Stock Bajo</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Valor Total</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(inventoryStats?.data?.total_inventory_value || 0)}
                </p>
              </div>

              {/* Distribución por categoría */}
              {inventoryStats?.data?.by_category && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Por Categoría
                  </p>
                  <div className="space-y-2">
                    {inventoryStats.data.by_category.slice(0, 3).map((cat, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate">{cat.category}</span>
                        <span className="font-medium">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Mapa de calor y análisis geográfico */}
      <motion.div variants={cardVariants}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Análisis Geográfico
            </h3>
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <HeatMap height={400} />
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Zonas Principales</h4>
              
              {zoneComparison?.data?.slice(0, 5).map((zone, index) => (
                <div key={zone.cluster_id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {zone.zone_name}
                    </span>
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ventas:</span>
                      <span className="font-medium">{formatNumber(zone.performance.sales_count)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ingresos:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(zone.performance.total_revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ticket promedio:</span>
                      <span className="font-medium">
                        {formatCurrency(zone.performance.avg_order_value)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {zonesLoading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse p-3 bg-gray-50 rounded-lg">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Insights y recomendaciones */}
      <motion.div variants={cardVariants}>
        <Card className="bg-gradient-to-r from-primary-50 to-blue-50">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Insights y Recomendaciones
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Tendencia General</h4>
              <p className="text-sm text-gray-600">
                {metrics?.growthRate > 0 
                  ? `Las ventas están creciendo un ${formatPercentage(metrics.growthRate)} en el período analizado.`
                  : `Las ventas han disminuido un ${formatPercentage(Math.abs(metrics?.growthRate || 0))} en el período.`
                }
              </p>
            </div>
            
            <div className="p-4 bg-white rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Oportunidades</h4>
              <p className="text-sm text-gray-600">
                Los productos de {productPerformance?.data?.[0]?.brand} muestran alto rendimiento. 
                Considera expandir el inventario de esta marca.
              </p>
            </div>
            
            <div className="p-4 bg-white rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Alertas</h4>
              <p className="text-sm text-gray-600">
                {inventoryStats?.data?.low_stock_count > 0 
                  ? `${inventoryStats.data.low_stock_count} productos necesitan restock urgente.`
                  : 'Todos los productos tienen stock adecuado.'
                }
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default Analytics