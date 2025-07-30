// frontend/src/pages/Inventory.jsx - Página de Inventario
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Edit,
  Plus,
  Minus,
  DollarSign,
  BarChart3,
  Archive
} from 'lucide-react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import Alert from '@/components/UI/Alert'
import Modal from '@/components/UI/Modal'
import { inventoryAPI, productsAPI } from '@/services/api'
import { formatCurrency, formatNumber, formatDate, formatStockStatus } from '@/utils/formatters'

const Inventory = () => {
  const [selectedView, setSelectedView] = useState('overview') // overview, lowStock, movements, reorder
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])

  // Queries principales
  const { data: lowStockData, isLoading: lowStockLoading, refetch: refetchLowStock } = useQuery(
    'inventory-low-stock',
    () => inventoryAPI.getLowStock({ type: 'all' }),
    { 
      staleTime: 180000, // 3 minutos
      refetchInterval: 300000 // 5 minutos
    }
  )

  const { data: inventoryStats, isLoading: statsLoading } = useQuery(
    'inventory-stats',
    inventoryAPI.getStats,
    { staleTime: 300000 }
  )

  const { data: reorderSuggestions, isLoading: reorderLoading } = useQuery(
    'inventory-reorder',
    inventoryAPI.getReorderSuggestions,
    { staleTime: 600000 }
  )

  const { data: inventoryValuation } = useQuery(
    'inventory-valuation',
    inventoryAPI.getValuation,
    { staleTime: 600000 }
  )

  const { data: inventoryMovements } = useQuery(
    ['inventory-movements', selectedView],
    () => inventoryAPI.getMovements({ per_page: 50 }),
    {
      enabled: selectedView === 'movements',
      staleTime: 180000
    }
  )

  const { data: categories } = useQuery(
    'product-categories',
    productsAPI.getCategories,
    { staleTime: 1800000 } // 30 minutos
  )

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

  // Filtrar productos por búsqueda y categoría
  const filteredProducts = (products) => {
    if (!products) return []
    
    return products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }

  const handleBulkStockUpdate = async (updates) => {
    try {
      const result = await inventoryAPI.bulkUpdateStock({
        updates: updates.map(update => ({
          product_id: update.product_id,
          new_stock: update.new_stock,
          notes: update.notes || 'Actualización masiva'
        })),
        reason: 'bulk_adjustment',
        user: 'admin'
      })

      if (result.success) {
        toast.success(`${result.data.successful_updates.length} productos actualizados`)
        setShowBulkUpdate(false)
        setSelectedProducts([])
        refetchLowStock()
      }
    } catch (error) {
      toast.error('Error actualizando inventario: ' + error.message)
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(inventoryStats?.data?.total_products || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Productos activos</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Stock Crítico</p>
              <p className="text-2xl font-bold text-red-600">
                {formatNumber(inventoryStats?.data?.stock_status?.critical || 0)}
              </p>
              <p className="text-sm text-red-500 mt-1">Requiere atención</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatNumber(inventoryStats?.data?.stock_status?.low || 0)}
              </p>
              <p className="text-sm text-yellow-600 mt-1">Necesita reorden</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(inventoryStats?.data?.total_inventory_value || 0)}
              </p>
              <p className="text-sm text-green-600 mt-1">Inventario</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Valoración del inventario */}
      {inventoryValuation?.data && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Valoración del Inventario</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(inventoryValuation.data.total_valuation.cost_value)}
              </p>
              <p className="text-sm text-green-700">Valor de Costo</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(inventoryValuation.data.total_valuation.potential_profit)}
              </p>
              <p className="text-sm text-purple-700">
                Ganancia Potencial ({inventoryValuation.data.total_valuation.margin_percentage}%)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Top productos por valor */}
      {inventoryValuation?.data?.top_value_products && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Productos de Mayor Valor
          </h3>
          
          <div className="space-y-3">
            {inventoryValuation.data.top_value_products.slice(0, 8).map((product, index) => (
              <motion.div
                key={index}
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
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      {product.brand} • {product.category}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(product.total_value)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {product.current_stock} × {formatCurrency(product.unit_price)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )

  const renderLowStock = () => {
    const products = filteredProducts(lowStockData?.data || [])
    
    return (
      <div className="space-y-6">
        <Alert 
          type="warning" 
          title="Productos con Stock Bajo"
          dismissible={false}
        >
          {products.length} productos requieren atención inmediata para evitar desabasto.
        </Alert>

        <div className="space-y-4">
          {products.map((product, index) => {
            const stockStatus = formatStockStatus(product.current_stock, product.min_stock, product.max_stock)
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`border-l-4 ${
                  stockStatus.level === 'critical' ? 'border-red-500' : 'border-yellow-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          stockStatus.level === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            {product.brand} • {product.category}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Stock Actual</p>
                          <p className="font-semibold text-gray-900">{product.current_stock}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Stock Mínimo</p>
                          <p className="font-semibold">{product.min_stock}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Punto de Reorden</p>
                          <p className="font-semibold">{product.reorder_point}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Sugerido</p>
                          <p className="font-semibold text-green-600">
                            {product.suggested_reorder || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        stockStatus.level === 'critical' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {stockStatus.text}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Edit className="h-4 w-4" />}
                        onClick={() => {
                          // Abrir modal de edición de stock
                          setSelectedProducts([product])
                          setShowBulkUpdate(true)
                        }}
                      >
                        Ajustar
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
          
          {lowStockLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMovements = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Movimientos Recientes de Inventario
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Producto</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Tipo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Cantidad</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Stock Anterior</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Stock Nuevo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {inventoryMovements?.data?.map((movement, index) => (
                <motion.tr
                  key={movement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(movement.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {movement.product?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {movement.product?.brand}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      movement.movement_type === 'in' 
                        ? 'bg-green-100 text-green-800'
                        : movement.movement_type === 'out'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {movement.movement_type === 'in' ? 'Entrada' : 
                       movement.movement_type === 'out' ? 'Salida' : 'Ajuste'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {movement.movement_type === 'out' ? '-' : '+'}{movement.quantity}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {movement.previous_stock}
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {movement.new_stock}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {movement.reason || 'No especificado'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )

  const renderReorderSuggestions = () => (
    <div className="space-y-6">
      <Alert 
        type="info" 
        title="Sugerencias de Reorden"
        dismissible={false}
      >
        Basado en el análisis de ventas y niveles actuales de inventario.
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-semibold text-gray-900 mb-2">Resumen</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Productos a reordenar:</span>
              <span className="font-medium">
                {reorderSuggestions?.data?.total_products_to_reorder || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Alta prioridad:</span>
              <span className="font-medium text-red-600">
                {reorderSuggestions?.data?.high_priority_count || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Costo estimado:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(reorderSuggestions?.data?.estimated_total_cost || 0)}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-2">Acciones</h4>
          <div className="space-y-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              fullWidth
            >
              Exportar Lista de Reorden
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              fullWidth
            >
              Recalcular Sugerencias
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {reorderSuggestions?.data?.suggestions?.map((suggestion, index) => (
          <motion.div
            key={suggestion.product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-l-4 ${
              suggestion.priority === 'high' ? 'border-red-500' : 'border-yellow-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      suggestion.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {suggestion.product.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {suggestion.product.brand} • {suggestion.product.category}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Stock Actual</p>
                      <p className="font-semibold">{suggestion.product.current_stock}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cantidad Sugerida</p>
                      <p className="font-semibold text-blue-600">
                        {suggestion.suggested_quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Costo Estimado</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(suggestion.estimated_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Días hasta agotarse</p>
                      <p className="font-semibold">
                        {suggestion.days_until_out || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Ventas promedio</p>
                      <p className="font-semibold">
                        {suggestion.daily_sales_avg?.toFixed(1) || 'N/A'}/día
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    suggestion.priority === 'high' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {suggestion.priority === 'high' ? 'Alta' : 'Media'} Prioridad
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
        
        {reorderLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-5 gap-4 mt-3">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="text-gray-600 mt-1">
            Control y análisis del inventario en tiempo real
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="h-4 w-4" />}
          >
            Importar
          </Button>
          
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
            onClick={() => {
              refetchLowStock()
              toast.success('Datos actualizados')
            }}
          >
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Navegación de vistas */}
      <motion.div variants={cardVariants}>
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex space-x-1">
              {[
                { id: 'overview', label: 'Resumen', icon: BarChart3 },
                { id: 'lowStock', label: 'Stock Bajo', icon: AlertTriangle },
                { id: 'movements', label: 'Movimientos', icon: Archive },
                { id: 'reorder', label: 'Reorden', icon: RefreshCw }
              ].map(view => {
                const Icon = view.icon
                return (
                  <button
                    key={view.id}
                    onClick={() => setSelectedView(view.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedView === view.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{view.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Filtros */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                {categories?.data?.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {selectedView === 'lowStock' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Edit className="h-4 w-4" />}
                  onClick={() => setShowBulkUpdate(true)}
                  disabled={selectedProducts.length === 0}
                >
                  Actualización Masiva
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Contenido principal */}
      <motion.div variants={cardVariants}>
        <AnimatePresence mode="wait">
          {selectedView === 'overview' && renderOverview()}
          {selectedView === 'lowStock' && renderLowStock()}
          {selectedView === 'movements' && renderMovements()}
          {selectedView === 'reorder' && renderReorderSuggestions()}
        </AnimatePresence>
      </motion.div>

      {/* Modal de actualización masiva */}
      <BulkUpdateModal
        isOpen={showBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
        products={selectedProducts}
        onSubmit={handleBulkStockUpdate}
      />
    </motion.div>
  )
}

// Componente auxiliar para actualización masiva
const BulkUpdateModal = ({ isOpen, onClose, products, onSubmit }) => {
  const [updates, setUpdates] = useState([])

  useEffect(() => {
    if (products.length > 0) {
      setUpdates(products.map(product => ({
        product_id: product.id,
        product_name: product.name,
        current_stock: product.current_stock,
        new_stock: product.current_stock,
        notes: ''
      })))
    }
  }, [products])

  const handleUpdateChange = (index, field, value) => {
    setUpdates(prev => prev.map((update, i) => 
      i === index ? { ...update, [field]: value } : update
    ))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(updates)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Actualización Masiva de Stock"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-h-96 overflow-y-auto space-y-3">
          {updates.map((update, index) => (
            <div key={update.product_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{update.product_name}</p>
                <p className="text-sm text-gray-600">Stock actual: {update.current_stock}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  value={update.new_stock}
                  onChange={(e) => handleUpdateChange(index, 'new_stock', parseInt(e.target.value))}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                />
                
                <input
                  type="text"
                  placeholder="Notas..."
                  value={update.notes}
                  onChange={(e) => handleUpdateChange(index, 'notes', e.target.value)}
                  className="w-32 border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-3 justify-end pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" icon={<Save className="h-4 w-4" />}>
            Actualizar Stock
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default Inventoryblue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(inventoryValuation.data.total_valuation.retail_value)}
              </p>
              <p className="text-sm text-blue-700">Valor de Venta</p>
            </div>
            
            <div className="text-center p-4 bg-