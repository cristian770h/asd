// frontend/src/pages/Orders.jsx - Página de Pedidos
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter,
  MapPin,
  Clock,
  Eye,
  Edit,
  MessageSquare,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package
} from 'lucide-react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import Modal, { ConfirmModal } from '@/components/UI/Modal'
import Alert from '@/components/UI/Alert'
import OrderForm from '@/components/Forms/OrderForm'
import WhatsAppParser from '@/components/Forms/WhatsAppParser'
import { usePagination } from '@/hooks/useApi'
import { ordersAPI } from '@/services/api'
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters'

const Orders = () => {
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showWhatsAppParser, setShowWhatsAppParser] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Paginación de pedidos
  const {
    data: orders,
    pagination,
    isLoading,
    isFetching,
    error,
    page,
    goToPage,
    nextPage,
    prevPage,
    updateFilters,
    hasData,
    isEmpty
  } = usePagination(
    (params) => ordersAPI.getAll({
      ...params,
      status: statusFilter || undefined,
      start_date: dateFilter || undefined,
      search: searchTerm || undefined
    }),
    'orders',
    { 
      perPage: 20,
      refetchInterval: 300000 // 5 minutos
    }
  )

  // Estadísticas de pedidos
  const { data: orderStats } = useQuery(
    'order-stats',
    ordersAPI.getStats,
    { staleTime: 300000 }
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

  // Aplicar filtros
  const handleFilterChange = (filters) => {
    updateFilters(filters)
  }

  // Crear nuevo pedido
  const handleCreateOrder = (orderData) => {
    toast.success('Pedido creado exitosamente')
    // Refrescar lista
    handleFilterChange({})
  }

  // Actualizar estado del pedido
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const result = await ordersAPI.updateStatus(orderId, { status: newStatus })
      
      if (result.success) {
        toast.success('Estado del pedido actualizado')
        handleFilterChange({})
      }
    } catch (error) {
      toast.error('Error actualizando el pedido: ' + error.message)
    }
  }

  // Ver detalles del pedido
  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  // Editar pedido
  const handleEditOrder = (order) => {
    setSelectedOrder(order)
    setShowOrderForm(true)
  }

  // Obtener color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Obtener icono del estado
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'delivered':
        return <Package className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  // Obtener texto del estado
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'confirmed':
        return 'Confirmado'
      case 'delivered':
        return 'Entregado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return 'Desconocido'
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-600 mt-1">
            Administra y rastrea todos los pedidos del sistema
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            icon={<MessageSquare className="h-4 w-4" />}
            onClick={() => setShowWhatsAppParser(true)}
          >
            Parser WhatsApp
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowOrderForm(true)}
          >
            Nuevo Pedido
          </Button>
        </div>
      </motion.div>

      {/* Estadísticas rápidas */}
      <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {orderStats?.data?.today_sales?.count || 0}
              </p>
              <div className="flex items-center mt-1">
                <span className={`text-sm font-medium ${
                  (orderStats?.data?.today_sales?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {orderStats?.data?.today_sales?.growth >= 0 ? '+' : ''}{orderStats?.data?.today_sales?.growth}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ingresos Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(orderStats?.data?.today_sales?.revenue || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total del día</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">
                {orderStats?.data?.pending_orders?.count || 0}
              </p>
              <p className="text-sm text-orange-600 mt-1">Por procesar</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-green-600">
                {orderStats?.data?.by_status?.find(s => s.status === 'delivered')?.count || 0}
              </p>
              <p className="text-sm text-green-600 mt-1">Entregados</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filtros y búsqueda */}
      <motion.div variants={cardVariants}>
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por ID, cliente, producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              {/* Filtro por estado */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="confirmed">Confirmados</option>
                <option value="delivered">Entregados</option>
                <option value="cancelled">Cancelados</option>
              </select>

              {/* Filtro por fecha */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
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
                onClick={() => handleFilterChange({})}
                loading={isFetching}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Lista de pedidos */}
      <motion.div variants={cardVariants}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Pedidos Recientes
            </h3>
            <span className="text-sm text-gray-500">
              {pagination.total} pedidos encontrados
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter || dateFilter 
                  ? 'No se encontraron pedidos con los filtros aplicados'
                  : 'Aún no hay pedidos registrados'
                }
              </p>
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowOrderForm(true)}
              >
                Crear Primer Pedido
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {orders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-primary-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-semibold text-gray-900">
                              #{order.sale_id || order.id}
                            </h4>
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              <span>{getStatusText(order.status)}</span>
                            </span>
                          </div>
                          
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-gray-600">
                              <strong>Producto:</strong> {order.product?.name || 'N/A'} 
                              {order.product?.brand && ` • ${order.product.brand}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Cantidad:</strong> {order.quantity} unidades
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatRelativeTime(order.created_at)}</span>
                              </span>
                              {order.latitude && order.longitude && (
                                <span className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>Ubicación disponible</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(order.total_price)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.sale_date)}
                        </p>
                        
                        <div className="flex items-center space-x-2 mt-3">
                          <Button
                            variant="outline"
                            size="xs"
                            icon={<Eye className="h-3 w-3" />}
                            onClick={() => handleViewOrder(order)}
                          >
                            Ver
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="xs"
                            icon={<Edit className="h-3 w-3" />}
                            onClick={() => handleEditOrder(order)}
                          >
                            Editar
                          </Button>

                          {order.status === 'pending' && (
                            <Button
                              variant="success"
                              size="xs"
                              icon={<CheckCircle className="h-3 w-3" />}
                              onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                            >
                              Confirmar
                            </Button>
                          )}

                          {order.status === 'confirmed' && (
                            <Button
                              variant="success"
                              size="xs"
                              icon={<Package className="h-3 w-3" />}
                              onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            >
                              Entregar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Paginación */}
          {hasData && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                Mostrando {((page - 1) * pagination.per_page) + 1} a {Math.min(page * pagination.per_page, pagination.total)} de {pagination.total} pedidos
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!pagination.has_prev}
                >
                  Anterior
                </Button>
                
                <span className="px-3 py-1 text-sm">
                  Página {page} de {pagination.pages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!pagination.has_next}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal de formulario de pedido */}
      <OrderForm
        isOpen={showOrderForm}
        onClose={() => {
          setShowOrderForm(false)
          setSelectedOrder(null)
        }}
        onSubmit={handleCreateOrder}
        initialData={selectedOrder}
        mode={selectedOrder ? 'edit' : 'create'}
      />

      {/* Modal de parser de WhatsApp */}
      <Modal
        isOpen={showWhatsAppParser}
        onClose={() => setShowWhatsAppParser(false)}
        title="Parser de WhatsApp"
        size="xl"
      >
        <WhatsAppParser
          onOrderCreated={(orders) => {
            setShowWhatsAppParser(false)
            handleFilterChange({})
            toast.success(`${orders.length} pedidos creados desde WhatsApp`)
          }}
        />
      </Modal>

      {/* Modal de detalles del pedido */}
      <OrderDetailsModal
        isOpen={showOrderDetails}
        onClose={() => {
          setShowOrderDetails(false)
          setSelectedOrder(null)
        }}
        order={selectedOrder}
        onUpdateStatus={handleUpdateOrderStatus}
      />
    </motion.div>
  )
}

// Componente de detalles del pedido
const OrderDetailsModal = ({ isOpen, onClose, order, onUpdateStatus }) => {
  if (!order) return null

  const statusActions = {
    pending: [
      { action: 'confirmed', label: 'Confirmar', variant: 'primary', icon: CheckCircle },
      { action: 'cancelled', label: 'Cancelar', variant: 'danger', icon: XCircle }
    ],
    confirmed: [
      { action: 'delivered', label: 'Marcar como Entregado', variant: 'success', icon: Package },
      { action: 'cancelled', label: 'Cancelar', variant: 'danger', icon: XCircle }
    ],
    delivered: [],
    cancelled: []
  }

  const availableActions = statusActions[order.status] || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pedido #${order.sale_id || order.id}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Estado actual */}
        <Alert 
          type={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'info'}
          title={`Estado: ${order.status === 'pending' ? 'Pendiente' : 
                           order.status === 'confirmed' ? 'Confirmado' : 
                           order.status === 'delivered' ? 'Entregado' : 'Cancelado'}`}
        >
          {order.status === 'pending' && 'Este pedido está esperando confirmación.'}
          {order.status === 'confirmed' && 'Este pedido ha sido confirmado y está listo para entrega.'}
          {order.status === 'delivered' && 'Este pedido ha sido entregado exitosamente.'}
          {order.status === 'cancelled' && 'Este pedido ha sido cancelado.'}
        </Alert>

        {/* Información del pedido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h4 className="font-semibold text-gray-900 mb-3">Información del Producto</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Producto:</span>
                <span className="font-medium">{order.product?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Marca:</span>
                <span className="font-medium">{order.product?.brand || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cantidad:</span>
                <span className="font-medium">{order.quantity} unidades</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Precio unitario:</span>
                <span className="font-medium">{formatCurrency(order.unit_price)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600 font-medium">Total:</span>
                <span className="font-bold text-lg">{formatCurrency(order.total_price)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="font-semibold text-gray-900 mb-3">Información de Entrega</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium">{formatDate(order.sale_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hora:</span>
                <span className="font-medium">{formatDate(order.created_at, { timeStyle: 'short' })}</span>
              </div>
              {order.latitude && order.longitude && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Coordenadas:</span>
                  <span className="font-medium font-mono">
                    {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              {order.address && (
                <div>
                  <span className="text-gray-600">Dirección:</span>
                  <p className="font-medium mt-1">{order.address}</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <span className="text-gray-600">Notas:</span>
                  <p className="font-medium mt-1">{order.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Información del cliente */}
        {order.customer && (
          <Card>
            <h4 className="font-semibold text-gray-900 mb-3">Información del Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {order.customer.name && (
                <div>
                  <span className="text-gray-600">Nombre:</span>
                  <p className="font-medium">{order.customer.name}</p>
                </div>
              )}
              {order.customer.phone && (
                <div>
                  <span className="text-gray-600">Teléfono:</span>
                  <p className="font-medium">{order.customer.phone}</p>
                </div>
              )}
              {order.customer_id && (
                <div>
                  <span className="text-gray-600">ID Cliente:</span>
                  <p className="font-medium">#{order.customer_id}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Acciones */}
        {availableActions.length > 0 && (
          <div className="flex space-x-3 justify-end pt-4 border-t border-gray-200">
            {availableActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.action}
                  variant={action.variant}
                  icon={<Icon className="h-4 w-4" />}
                  onClick={() => {
                    onUpdateStatus(order.id, action.action)
                    onClose()
                  }}
                >
                  {action.label}
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default Orders