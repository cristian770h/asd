// frontend/src/components/Forms/OrderForm.jsx - Formulario de Pedidos
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  MapPin, 
  User, 
  Phone, 
  DollarSign, 
  Calendar,
  Plus,
  Minus,
  X,
  Save,
  Search
} from 'lucide-react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import Modal from '@/components/UI/Modal'
import { productsAPI, ordersAPI } from '@/services/api'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useGeolocation } from '@/hooks/useGeolocation'

const OrderForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null,
  mode = 'create' // 'create' | 'edit'
}) => {
  const [formData, setFormData] = useState({
    customer: {
      name: '',
      phone: '',
      client_number: ''
    },
    location: {
      latitude: null,
      longitude: null,
      address: '',
      references: ''
    },
    products: [],
    payment: {
      method: 'efectivo',
      total: 0
    },
    delivery: {
      date: new Date().toISOString().split('T')[0],
      time: '',
      instructions: ''
    },
    notes: ''
  })

  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { 
    getCurrentLocation, 
    isLoading: locationLoading, 
    error: locationError 
  } = useGeolocation()

  // Cargar productos disponibles
  const { data: productsData, isLoading: productsLoading } = useQuery(
    ['products-list', productSearch],
    () => productsAPI.getAll({ 
      search: productSearch,
      per_page: 20,
      active_only: true
    }),
    {
      enabled: showProductSearch && productSearch.length >= 2,
      staleTime: 300000
    }
  )

  // Inicializar formulario con datos existentes
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        customer: {
          name: initialData.customer?.name || '',
          phone: initialData.customer?.phone || '',
          client_number: initialData.customer_id?.toString() || ''
        },
        location: {
          latitude: initialData.latitude || null,
          longitude: initialData.longitude || null,
          address: initialData.address || '',
          references: ''
        },
        products: initialData.products || [],
        payment: {
          method: 'efectivo',
          total: initialData.total_price || 0
        },
        delivery: {
          date: formatDate(initialData.sale_date, { dateStyle: 'short' }) || new Date().toISOString().split('T')[0],
          time: '',
          instructions: ''
        },
        notes: initialData.notes || ''
      })
    }
  }, [initialData, mode])

  // Calcular total automáticamente
  useEffect(() => {
    const total = formData.products.reduce((sum, product) => {
      return sum + (product.price * product.quantity)
    }, 0)
    
    setFormData(prev => ({
      ...prev,
      payment: { ...prev.payment, total }
    }))
  }, [formData.products])

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleGetCurrentLocation = async () => {
    try {
      const position = await getCurrentLocation()
      handleInputChange('location', 'latitude', position.latitude)
      handleInputChange('location', 'longitude', position.longitude)
      toast.success('Ubicación obtenida exitosamente')
    } catch (error) {
      toast.error('Error obteniendo ubicación: ' + error.message)
    }
  }

  const addProduct = (product) => {
    const existingIndex = formData.products.findIndex(p => p.id === product.id)
    
    if (existingIndex >= 0) {
      // Incrementar cantidad si ya existe
      updateProductQuantity(existingIndex, formData.products[existingIndex].quantity + 1)
    } else {
      // Agregar nuevo producto
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, {
          id: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          quantity: 1,
          weight_size: product.weight_size
        }]
      }))
    }
    
    setShowProductSearch(false)
    setProductSearch('')
  }

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }))
  }

  const updateProductQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeProduct(index)
      return
    }

    setFormData(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, quantity: newQuantity } : product
      )
    }))
  }

  const validateForm = () => {
    const errors = []

    // Validar productos
    if (formData.products.length === 0) {
      errors.push('Debe agregar al menos un producto')
    }

    // Validar ubicación
    if (!formData.location.latitude || !formData.location.longitude) {
      errors.push('Debe especificar las coordenadas de entrega')
    }

    // Validar datos del cliente
    if (!formData.customer.name.trim()) {
      errors.push('El nombre del cliente es requerido')
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    setIsSubmitting(true)

    try {
      const orderData = {
        // Datos del primer producto (para compatibilidad con API)
        product_id: formData.products[0].id,
        quantity: formData.products[0].quantity,
        unit_price: formData.products[0].price,
        
        // Ubicación
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        address: formData.location.address,
        
        // Notas
        notes: `Productos: ${formData.products.map(p => `${p.name} x${p.quantity}`).join(', ')}. ${formData.notes}`,
        
        // Metadatos adicionales
        customer_info: formData.customer,
        delivery_info: formData.delivery,
        all_products: formData.products
      }

      let result
      if (mode === 'edit' && initialData) {
        result = await ordersAPI.update(initialData.id, orderData)
      } else {
        result = await ordersAPI.create(orderData)
      }

      if (result.success) {
        toast.success(mode === 'edit' ? 'Pedido actualizado' : 'Pedido creado exitosamente')
        onSubmit(result.data)
        onClose()
      } else {
        throw new Error(result.error || 'Error procesando pedido')
      }

    } catch (error) {
      console.error('Error enviando pedido:', error)
      toast.error('Error procesando pedido: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Editar Pedido' : 'Nuevo Pedido'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Cliente */}
        <Card>
          <div className="flex items-center space-x-2 mb-4">
            <User className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900">Información del Cliente</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.customer.name}
                onChange={(e) => handleInputChange('customer', 'name', e.target.value)}
                placeholder="Nombre del cliente"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  <Phone className="h-4 w-4" />
                </span>
                <input
                  type="tel"
                  className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.customer.phone}
                  onChange={(e) => handleInputChange('customer', 'phone', e.target.value)}
                  placeholder="9981234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Cliente
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.customer.client_number}
                onChange={(e) => handleInputChange('customer', 'client_number', e.target.value)}
                placeholder="Ej: 123"
              />
            </div>
          </div>
        </Card>

        {/* Ubicación */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">Ubicación de Entrega</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetCurrentLocation}
              loading={locationLoading}
              icon={<MapPin className="h-4 w-4" />}
            >
              Obtener ubicación
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitud *
              </label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.location.latitude || ''}
                onChange={(e) => handleInputChange('location', 'latitude', parseFloat(e.target.value))}
                placeholder="21.1619"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitud *
              </label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.location.longitude || ''}
                onChange={(e) => handleInputChange('location', 'longitude', parseFloat(e.target.value))}
                placeholder="-86.8515"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.location.address}
                onChange={(e) => handleInputChange('location', 'address', e.target.value)}
                placeholder="Calle, número, colonia"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencias
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.location.references}
                onChange={(e) => handleInputChange('location', 'references', e.target.value)}
                placeholder="Casa azul, portón negro, entre..."
              />
            </div>
          </div>
        </Card>

        {/* Productos */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">Productos</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowProductSearch(true)}
              icon={<Plus className="h-4 w-4" />}
            >
              Agregar producto
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {formData.products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      {product.brand} • {formatCurrency(product.price)} • {product.weight_size}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => updateProductQuantity(index, product.quantity - 1)}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    
                    <span className="w-8 text-center font-medium">{product.quantity}</span>
                    
                    <button
                      type="button"
                      onClick={() => updateProductQuantity(index, product.quantity + 1)}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(product.price * product.quantity)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {formData.products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay productos agregados</p>
                <p className="text-xs">Haz clic en "Agregar producto" para comenzar</p>
              </div>
            )}
          </div>

          {/* Total */}
          {formData.products.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-primary-600">
                  {formatCurrency(formData.payment.total)}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Información de Entrega */}
        <Card>
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900">Información de Entrega</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de entrega
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.delivery.date}
                onChange={(e) => handleInputChange('delivery', 'date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora preferida
              </label>
              <input
                type="time"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.delivery.time}
                onChange={(e) => handleInputChange('delivery', 'time', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instrucciones especiales
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                value={formData.delivery.instructions}
                onChange={(e) => handleInputChange('delivery', 'instructions', e.target.value)}
                placeholder="Instrucciones especiales para la entrega..."
              />
            </div>
          </div>
        </Card>

        {/* Notas adicionales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas adicionales
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas adicionales sobre el pedido..."
          />
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-3 justify-end pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            loading={isSubmitting}
            icon={<Save className="h-4 w-4" />}
          >
            {mode === 'edit' ? 'Actualizar' : 'Crear'} Pedido
          </Button>
        </div>
      </form>

      {/* Modal de búsqueda de productos */}
      <Modal
        isOpen={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        title="Buscar Productos"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Buscar productos..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {productsLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
              </div>
            )}

            {productsData?.data?.map((product) => (
              <motion.div
                key={product.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => addProduct(product)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    {product.brand} • {product.category} • {product.weight_size}
                  </div>
                  <div className="text-sm text-gray-500">
                    Stock: {product.current_stock}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary-600">
                    {formatCurrency(product.price)}
                  </div>
                </div>
              </motion.div>
            ))}

            {productSearch.length >= 2 && !productsLoading && (!productsData?.data || productsData.data.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron productos</p>
                <p className="text-xs">Intenta con otro término de búsqueda</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Modal>
  )
}

export default OrderForm