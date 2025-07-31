// frontend/src/components/Products/Products.jsx - Componente de Productos
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package2, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Tag,
  Image as ImageIcon,
  Download,
  Upload
} from 'lucide-react'
import toast from 'react-hot-toast'

import Card from '../components/UI/Card'
import Button from '../components/UI/Button'
import Input from '../components/UI/Input'
import Select from '../components/UI/Select'
import Modal from '../components/UI/Modal'
import Badge from '../components/UI/Badge'
import { useProducts } from '../hooks/useProducts'
import { usePredictions } from '../hooks/usePredictions'
import { formatCurrency, formatDate } from '../utils/formatters'

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [viewMode, setViewMode] = useState('grid')

  const {
    products,
    categories,
    isLoading,
    error,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdate
  } = useProducts({
    include_predictions: true,
    include_performance: true
  })

  // Filtrar y ordenar productos
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  // Manejar selección múltiple
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id))
    }
  }

  // Manejar acciones masivas
  const handleBulkAction = async (action, data) => {
    try {
      await bulkUpdate.mutateAsync({
        product_ids: selectedProducts,
        action,
        data
      })
      toast.success(`${selectedProducts.length} productos actualizados`)
      setSelectedProducts([])
      setShowBulkActions(false)
    } catch (error) {
      toast.error('Error en actualización masiva')
    }
  }

  // Obtener estadísticas del producto
  const getProductStats = (product) => {
    const stats = {
      trend: 'stable',
      performance: 'normal',
      predicted_demand: product.predicted_demand || 0,
      sales_last_30: product.sales_last_30 || 0
    }

    if (product.sales_trend > 10) stats.trend = 'up'
    else if (product.sales_trend < -10) stats.trend = 'down'

    if (product.performance_score > 0.8) stats.performance = 'high'
    else if (product.performance_score < 0.4) stats.performance = 'low'

    return stats
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error cargando productos</h3>
          <p className="text-gray-600 mb-4">No se pudo cargar la información de productos</p>
          <Button onClick={refetch}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600">Catálogo y gestión de productos</p>
        </div>
        
        <div className="flex gap-2">
          {selectedProducts.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowBulkActions(true)}
            >
              Acciones ({selectedProducts.length})
            </Button>
          )}
          
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          
          <Button onClick={() => setShowProductModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <Package2 className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categorías</p>
              <p className="text-2xl font-bold">{categories.length}</p>
            </div>
            <Tag className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Productos Activos</p>
              <p className="text-2xl font-bold">
                {products.filter(p => p.is_active).length}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valor Promedio</p>
              <p className="text-2xl font-bold">
                {formatCurrency(products.reduce((sum, p) => sum + p.unit_price, 0) / products.length || 0)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filtros y controles */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar productos por nombre, SKU o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'Todas las categorías' },
                ...categories.map(cat => ({ value: cat.name, label: cat.name }))
              ]}
            />

            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'name', label: 'Nombre' },
                { value: 'unit_price', label: 'Precio' },
                { value: 'stock', label: 'Stock' },
                { value: 'created_at', label: 'Fecha creación' },
                { value: 'sales_last_30', label: 'Ventas recientes' }
              ]}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          {/* Modo de vista */}
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
          </div>
        </div>

        {/* Selección masiva */}
        {filteredProducts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedProducts.length === filteredProducts.length}
                onChange={handleSelectAll}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">
                Seleccionar todos ({filteredProducts.length} productos)
              </span>
            </label>
          </div>
        )}
      </Card>

      {/* Lista de productos */}
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
        }>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
        }>
          <AnimatePresence>
            {filteredProducts.map((product) => {
              const stats = getProductStats(product)
              const isSelected = selectedProducts.includes(product.id)
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`p-4 hover:shadow-md transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  } ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
                    
                    {/* Checkbox de selección */}
                    <div className={`${viewMode === 'list' ? 'flex items-center space-x-4 flex-1' : 'space-y-3'}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectProduct(product.id)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Imagen del producto */}
                      <div className={`${viewMode === 'list' ? 'w-16 h-16' : 'w-full h-48'} bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden`}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      {/* Información del producto */}
                      <div className={viewMode === 'list' ? 'flex-1' : ''}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          </div>
                          
                          {/* Badges de estado */}
                          <div className="flex flex-col items-end space-y-1">
                            {!product.is_active && (
                              <Badge variant="gray" size="sm">Inactivo</Badge>
                            )}
                            
                            {stats.performance === 'high' && (
                              <Badge variant="green" size="sm">Top Seller</Badge>
                            )}
                            
                            {stats.performance === 'low' && (
                              <Badge variant="red" size="sm">Bajo rendimiento</Badge>
                            )}
                          </div>
                        </div>

                        {/* Detalles del producto */}
                        <div className={`${viewMode === 'list' ? 'flex items-center space-x-6' : 'space-y-2'}`}>
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Precio:</span>
                            <span className="ml-1 font-semibold">{formatCurrency(product.unit_price)}</span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Stock:</span>
                            <span className={`ml-1 font-semibold ${
                              product.stock <= product.min_stock ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {product.stock}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Categoría:</span>
                            <span className="ml-1">{product.category}</span>
                          </div>
                        </div>

                        {/* Métricas de rendimiento */}
                        {viewMode === 'grid' && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                {stats.trend === 'up' ? (
                                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                                ) : stats.trend === 'down' ? (
                                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                                ) : (
                                  <BarChart3 className="w-4 h-4 text-gray-400 mr-1" />
                                )}
                                <span className="text-gray-600">
                                  Ventas 30d: {stats.sales_last_30}
                                </span>
                              </div>
                              
                              {stats.predicted_demand > 0 && (
                                <div className="text-blue-600">
                                  Pred: {stats.predicted_demand}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Descripción (solo en vista de lista) */}
                        {viewMode === 'list' && product.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className={`${viewMode === 'list' ? 'flex space-x-2' : 'flex justify-between mt-4'}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedProduct(product)
                          setShowProductModal(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        {viewMode === 'grid' && <span className="ml-1">Ver</span>}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedProduct(product)
                          setShowProductModal(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                        {viewMode === 'grid' && <span className="ml-1">Editar</span>}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`¿Eliminar "${product.name}"?`)) {
                            deleteProduct.mutate(product.id)
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || categoryFilter !== 'all' 
              ? 'Prueba ajustando los filtros de búsqueda'
              : 'Comienza agregando tu primer producto al catálogo'
            }
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <Button onClick={() => setShowProductModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          )}
        </div>
      )}

      {/* Modales */}
      <ProductModal
        product={selectedProduct}
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false)
          setSelectedProduct(null)
        }}
        onSave={(productData) => {
          if (selectedProduct) {
            updateProduct.mutate({ id: selectedProduct.id, ...productData })
          } else {
            createProduct.mutate(productData)
          }
          setShowProductModal(false)
          setSelectedProduct(null)
        }}
      />

      <BulkActionsModal
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        selectedCount={selectedProducts.length}
        onAction={handleBulkAction}
      />
    </div>
  )
}

// Modal para crear/editar producto
const ProductModal = ({ product, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    unit_price: 0,
    stock: 0,
    min_stock: 0,
    is_active: true,
    image_url: ''
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category: product.category || '',
        unit_price: product.unit_price || 0,
        stock: product.stock || 0,
        min_stock: product.min_stock || 0,
        is_active: product.is_active ?? true,
        image_url: product.image_url || ''
      })
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        category: '',
        unit_price: 0,
        stock: 0,
        min_stock: 0,
        is_active: true,
        image_url: ''
      })
    }
  }, [product])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombre del producto"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          
          <Input
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({...formData, sku: e.target.value})}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Categoría"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          />
          
          <Input
            label="URL de imagen"
            value={formData.image_url}
            onChange={(e) => setFormData({...formData, image_url: e.target.value})}
          />
        </div>

        {/* Inventario y precios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Precio unitario"
            type="number"
            step="0.01"
            value={formData.unit_price}
            onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
            required
          />
          
          <Input
            label="Stock actual"
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
            required
          />
          
          <Input
            label="Stock mínimo"
            type="number"
            value={formData.min_stock}
            onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value) || 0})}
            required
          />
        </div>

        {/* Estado */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="mr-2"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Producto activo
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {product ? 'Actualizar' : 'Crear'} Producto
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Modal para acciones masivas
const BulkActionsModal = ({ isOpen, onClose, selectedCount, onAction }) => {
  const [action, setAction] = useState('')
  const [actionData, setActionData] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    onAction(action, actionData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Acciones masivas (${selectedCount} productos)`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Seleccionar acción"
          value={action}
          onChange={setAction}
          options={[
            { value: '', label: 'Seleccionar acción...' },
            { value: 'update_category', label: 'Cambiar categoría' },
            { value: 'update_price', label: 'Actualizar precios' },
            { value: 'toggle_active', label: 'Activar/Desactivar' },
            { value: 'delete', label: 'Eliminar productos' }
          ]}
          required
        />

        {action === 'update_category' && (
          <Input
            label="Nueva categoría"
            value={actionData.category || ''}
            onChange={(e) => setActionData({...actionData, category: e.target.value})}
            required
          />
        )}

        {action === 'update_price' && (
          <div className="space-y-3">
            <Select
              label="Tipo de actualización"
              value={actionData.price_type || ''}
              onChange={(value) => setActionData({...actionData, price_type: value})}
              options={[
                { value: 'percentage', label: 'Porcentaje' },
                { value: 'fixed', label: 'Cantidad fija' },
                { value: 'set', label: 'Establecer precio' }
              ]}
              required
            />
            
            <Input
              label={actionData.price_type === 'percentage' ? 'Porcentaje (%)' : 'Cantidad'}
              type="number"
              step="0.01"
              value={actionData.price_value || ''}
              onChange={(e) => setActionData({...actionData, price_value: parseFloat(e.target.value)})}
              required
            />
          </div>
        )}

        {action === 'toggle_active' && (
          <Select
            label="Estado"
            value={actionData.is_active || ''}
            onChange={(value) => setActionData({...actionData, is_active: value === 'true'})}
            options={[
              { value: 'true', label: 'Activar' },
              { value: 'false', label: 'Desactivar' }
            ]}
            required
          />
        )}

        {action === 'delete' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">¡Atención!</p>
            <p className="text-red-700 text-sm mt-1">
              Esta acción eliminará permanentemente {selectedCount} productos y no se puede deshacer.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant={action === 'delete' ? 'danger' : 'primary'}
            disabled={!action}
          >
            Ejecutar Acción
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default Products