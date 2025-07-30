// frontend/src/pages/Dashboard.jsx - Página Principal Dashboard
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign,
  AlertTriangle,
  MapPin,
  Brain,
  Clock
} from 'lucide-react'
import { useQuery } from 'react-query'
import SalesChart from '@/components/Charts/SalesChart'
import HeatMap from '@/components/Charts/HeatMap'
import PredictionChart from '@/components/Charts/PredictionChart'
import Card from '@/components/UI/Card'
import { api } from '@/services/api'
import { formatCurrency, formatNumber } from '@/utils/formatters'

const Dashboard = () => {
  // Queries para obtener datos del dashboard
  const { data: dashboardStats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => api.get('/api/dashboard/stats'),
    { refetchInterval: 30000 } // Actualizar cada 30 segundos
  )

  const { data: recentSales } = useQuery(
    'recent-sales',
    () => api.get('/api/orders/recent'),
    { refetchInterval: 60000 }
  )

  const { data: lowStockItems } = useQuery(
    'low-stock',
    () => api.get('/api/inventory/low-stock'),
    { refetchInterval: 120000 }
  )

  const { data: todayPredictions } = useQuery(
    'today-predictions',
    () => api.get('/api/predictions/today'),
    { refetchInterval: 300000 } // Actualizar cada 5 minutos
  )

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  }

  // Datos de ejemplo mientras cargan los reales
  const defaultStats = {
    todaySales: { count: 0, revenue: 0, growth: 0 },
    totalProducts: { count: 0, lowStock: 0 },
    pendingOrders: { count: 0 },
    mlAccuracy: { score: 0 }
  }

  const stats = dashboardStats?.data || defaultStats

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Bienvenido al sistema de predicción ML de CocoPet
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Actualizado: {new Date().toLocaleTimeString()}</span>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        variants={cardVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Ventas de Hoy */}
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.todaySales.count)}
                </p>
                <span className={`text-xs font-medium ${
                  stats.todaySales.growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.todaySales.growth >= 0 ? '+' : ''}{stats.todaySales.growth}%
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(stats.todaySales.revenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Productos */}
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Productos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.totalProducts.count)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalProducts.lowStock} con stock bajo
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Pedidos Pendientes */}
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pedidos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.pendingOrders.count)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Para procesar
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        {/* Precisión ML */}
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Precisión ML</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.mlAccuracy.score}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Modelo activo
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ventas */}
        <motion.div variants={cardVariants}>
          <Card className="h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Tendencia de Ventas
              </h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <SalesChart />
          </Card>
        </motion.div>

        {/* Mapa de Calor */}
        <motion.div variants={cardVariants}>
          <Card className="h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Zonas de Entrega
              </h3>
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <HeatMap />
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predicciones */}
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Predicciones de Hoy
              </h3>
              <Brain className="h-5 w-5 text-gray-400" />
            </div>
            <PredictionChart data={todayPredictions?.data} />
          </Card>
        </motion.div>

        {/* Alertas y Stock Bajo */}
        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Alertas
              </h3>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            
            <div className="space-y-3">
              {/* Stock Bajo */}
              {lowStockItems?.data?.slice(0, 5).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Stock: {item.currentStock}/{item.minStock}
                    </p>
                  </div>
                  <div className="text-xs text-red-600 font-medium">
                    Bajo
                  </div>
                </motion.div>
              ))}

              {(!lowStockItems?.data || lowStockItems.data.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin alertas de stock</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Ventas Recientes */}
      <motion.div variants={cardVariants}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Ventas Recientes
            </h3>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Pedido</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Producto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Cantidad</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Hora</th>
                </tr>
              </thead>
              <tbody>
                {recentSales?.data?.slice(0, 8).map((sale, index) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">
                        {sale.saleId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {sale.productName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sale.productBrand}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {sale.quantity}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(sale.totalPrice)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!recentSales?.data || recentSales.data.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay ventas recientes</p>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default Dashboard