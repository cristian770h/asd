// frontend/src/pages/Products.jsx - Página de Productos
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Eye,
  Archive,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Tag,
  DollarSign,
  Layers
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import Modal, { ConfirmModal } from '@/components/UI/Modal'
import Alert from '@/components/UI/Alert'
import ProductForm from '@/components/Forms/ProductForm'
import { usePagination } from '@/hooks/useApi'
import { productsAPI } from '@/services/api'
import { formatCurrency, formatNumber, formatStockStatus, formatDate } from '@/utils/formatters'

const Products = () => {
  const [showProductForm, setShowProductForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [showConfirmArchive, setShowConfirmArchive] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedView, setSelectedView] = useState('grid') // grid, list

  // Paginación de productos
  const {
    data: products,
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
    (params) => productsAPI.getAll({
      ...params,
      category: categoryFilter || undefined,
      brand: brandFilter || undefined,
      stock_status: stockFilter || undefined,
      search: searchTerm || undefined,
      active_only: true
    }),
    'products',
    { 
      perPage: 20,
      refetchInterval: 300000 // 5 minutos
    }
  )

  // Datos auxiliares
  const { data: categories } = useQuery(
    'product-categories',
    productsAPI.getCategories,
    { staleTime: 1800000 }
  )

  const { data: brands } = useQuery(
    'product-brands',
    productsAPI.getBrands,
    { staleTime: 1800000 }
  )

  const { data: productStats } = useQuery(
    'product-stats',
    productsAPI.getStats,
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

  // Manejar creación/edición de producto
  const handleSaveProduct = (productData) => {
    toast.success(selectedProduct ? 'Producto actualizado' : 'Producto creado exitosamente')
    updateFilters({}) // Refrescar lista
  }

  // Ver detalles del producto
  const handleViewProduct = (product) => {
    setSelectedProduct(product)
    setShowProductDetails(true)
  }

  // Editar producto
  const handleEditProduct = (product) => {
    setSelectedProduct(product)
    setShowProductForm(true)
  }

  // Archivar producto
  const handleArchiveProduct = async (product) => {
    try {
      const result = await productsAPI.update(product.id, { is_active: false })
      
      if (result.success) {
        toast.success('Producto archivado exitosamente')
        updateFilters({})
      }
    } catch (error) {
      toast.error('Error archivando producto: ' + error.message)
    }
  }

  // Renderizar tarjeta de producto (vista grid)
  const renderProductCard = (product, index) => {
    const stockStatus = formatStockStatus(product.current_stock, product.min_stock, product.max_stock)
    
    return (
      <motion.div
        key={product.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -4 }}
      >
        <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex flex-col h-full">
            {/* Header con estado */}
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                stockStatus.level === 'critical' ? 'bg-red-100 text-red-800' :
                stockStatus.level === 'low' ? 'bg-yellow-100 text-yellow-800' :
                stockStatus.level === 'high' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {stockStatus.text}
              </span>
              
              {product.sku && (
                <span className="text-xs text-gray-500 font-mono">
                  {product.sku}
                </span>
              )}
            </div>

            {/* Información principal */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {product.brand} • {product.category}
              </p>
              {product.weight_size && (
                <p className="text-xs text-gray-500 mb-2">
                  {product.weight_size}
                </p>
              )}
              
              {/* Precio y stock */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                  {product.cost && (
                    <span className="text-sm text-gray-500">
                      Costo: {formatCurrency(product.cost)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Stock:</span>
                  <span className={`font-medium ${
                    stockStatus.level === 'critical' ? 'text-red-600' :
                    stockStatus.level === 'low' ? 'text-yellow-600' :
                    'text-gray-900'
                  }`}>
                    {product.current_stock} / {product.min_stock}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="xs"
                icon={<Eye className="h-3 w-3" />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleViewProduct(product)
                }}
              >
                Ver
              </Button>
              
              <Button
                variant="outline"
                size="xs"
                icon={<Edit className="h-3 w-3" />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditProduct(product)
                }}
              >
                Editar
              </Button>
              
              <Button
                variant="ghost"
                size="xs"
                icon={<Archive className="h-3 w-3" />}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedProduct(product)
                  setShowConfirmArchive(true)
                }}
              >
                Archivar
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Renderizar fila de producto (vista lista)
  const renderProductRow = (product, index) => {
    const stockStatus = formatStockStatus(product.current_stock, product.min_stock, product.max_stock)
    
    return (
      <motion.tr
        key={product.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        className="border-b border-gray-100 hover:bg-gray-50"
      >
        <td className="py-3 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{product.name}</p>
              <p className="text-sm text-gray-600">{product.brand}</p>
            </div>
          </div>
        </td>
        
        <td className="py-3 px-4 text-sm text-gray-600">
          {product.category}
        </td>
        
        <td className="py-3 px-4 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            stockStatus.level === 'critical' ? 'bg-red-100 text-red-800' :
            stockStatus.level === 'low' ? 'bg-yellow-100 text-yellow-800' :
            stockStatus.level === 'high' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }`}>
            {product.current_stock}
          </span>
        </td>
        
        <td className="py-3 px-4 font-medium text-gray-900">
          {formatCurrency(product.price)}
        </td>
        
        <td className="py-3 px-4 text-sm text-gray-600">
          {product.sku || 'N/A'}
        </td>
        
        <td className="py-3 px-4 text-sm text-gray-500">
          {formatDate(product.updated_at)}
        </td>
        
        <td className="py-3 px-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="xs"
              icon={<Eye className="h-3 w-3" />}
              onClick={() => handleViewProduct(product)}
            >
              Ver
            </Button>
            
            <Button
              variant="outline"
              size="xs"
              icon={<Edit className="h-3 w-3" />}
              onClick={() => handleEditProduct(product)}
            >
              Editar
            </Button>
          </div>
        </td>
      </motion.tr>
    )
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-gray-600 mt-1">
            Administra el catálogo completo de productos
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
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowProductForm(true)}
          >
            Nuevo Producto
          </Button>
        </div>
      </motion.div>

      {/* Estadísticas rápidas */}
      <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(productStats?.data?.total_products || 0)}
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
              <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatNumber(productStats?.data?.low_stock_count || 0)}
              </p>
              <p className="text-sm text-yellow-600 mt-1">Requiere atención</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Valor Inventario</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(productStats?.data?.total_inventory_value || 0)}
              </p>
              <p className="text-sm text-green-600 mt-1">Valor total</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="glass">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Categorías</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatNumber(categories?.data?.length || 0)}
              </p>
              <p className="text-sm text-purple-600 mt-1">Diferentes categorías</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Layers className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filtros y búsqueda */}
      <motion.div variants={cardVariants}>
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              {/* Filtros */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                {categories?.data?.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todas las marcas</option>
                {brands?.data?.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos los stocks</option>
                <option value="low">Stock bajo</option>
                <option value="critical">Stock crítico</option>
                <option value="high">Stock alto</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              {/* Vista */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setSelectedView('grid')}
                  className={`p-2 ${selectedView === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedView('list')}
                  className={`p-2 ${selectedView === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Layers className="h-4 w-4" />
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => updateFilters({})}
                loading={isFetching}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Lista/Grid de productos */}
      <motion.div variants={cardVariants}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Catálogo de Productos
            </h3>
            <span className="text-sm text-gray-500">
              {pagination.total} productos encontrados
            </span>
          </div>

          {isLoading ? (
            <div className={selectedView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  {selectedView === 'grid' ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4 p-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || categoryFilter || brandFilter || stockFilter 
                  ? 'No se encontraron productos con los filtros aplicados'
                  : 'Aún no hay productos registrados'
                }
              </p>
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowProductForm(true)}
              >
                Crear Primer Producto
              </Button>
            </div>
          ) : selectedView === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {products.map((product, index) => renderProductCard(product, index))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Producto</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Categoría</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Stock</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Precio</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actualizado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {products.map((product, index) => renderProductRow(product, index))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {hasData && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                Mostrando {((page - 1) * pagination.per_page) + 1} a {Math.min(page * pagination.per_page, pagination.total)} de {pagination.total} productos
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

      {/* Modal de formulario de producto */}
      <ProductForm
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false)
          setSelectedProduct(null)
        }}
        onSubmit={handleSaveProduct}
        initialData={selectedProduct}
        mode={selectedProduct ? 'edit' : 'create'}
      />

      {/* Modal de detalles del producto */}
      <ProductDetailsModal
        isOpen={showProductDetails}
        onClose={() => {
          setShowProductDetails(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
        onEdit={handleEditProduct}
      />

      {/* Confirmación de archivo */}
      <ConfirmModal
        isOpen={showConfirmArchive}
        onClose={() => {
          setShowConfirmArchive(false)
          setSelectedProduct(null)
        }}
        onConfirm={() => {
          handleArchiveProduct(selectedProduct)
          setShowConfirmArchive(false)
          setSelectedProduct(null)
        }}
        title="Archivar Producto"
        message={`¿Estás seguro que deseas archivar "${selectedProduct?.name}"? El producto no estará disponible para nuevos pedidos.`}
        confirmText="Archivar"
        variant="danger"
      />
    </motion.div>
  )
}

// Modal de detalles del producto
const ProductDetailsModal = ({ isOpen, onClose, product, onEdit }) => {
  if (!product) return null

  const stockStatus = formatStockStatus(product.current_stock, product.min_stock, product.max_stock)
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Estado del stock */}
        <Alert 
          type={stockStatus.level === 'critical' ? 'error' : 
               stockStatus.level === 'low' ? 'warning' : 'info'}
          title={`Stock: ${stockStatus.text}`}
        >
          {stockStatus.level === 'critical' && 'Este producto tiene stock crítico y requiere reabastecimiento inmediato.'}
          {stockStatus.level === 'low' && 'Este producto tiene stock bajo y debería ser reabastecido pronto.'}
          {stockStatus.level === 'normal' && 'Este producto tiene un nivel de stock adecuado.'}
          {stockStatus.level === 'high' && 'Este producto tiene un nivel de stock alto.'}
        </Alert>

        {/* Información del producto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h4 className="font-semibold text-gray-900 mb-3">Información General</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Marca:</span>
                <span className="font-medium">{product.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Categoría:</span>
                <span className="font-medium">{product.category}</span>
              </div>
              {product.weight_size && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Peso/Tamaño:</span>
                  <span className="font-medium">{product.weight_size}</span>
                </div>
              )}
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-medium font-mono">{product.sku}</span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h4 className="font-semibold text-gray-900 mb-3">Precios e Inventario</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Precio de venta:</span>
                <span className="font-medium">{formatCurrency(product.price)}</span>
              </div>
              {product.cost && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo:</span>
                  <span className="font-medium">{formatCurrency(product.cost)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Stock actual:</span>
                <span className="font-medium">{product.current_stock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stock mínimo:</span>
                <span className="font-medium">{product.min_stock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stock máximo:</span>
                <span className="font-medium">{product.max_stock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Punto de reorden:</span>
                <span className="font-medium">{product.reorder_point}</span>
              </div>
            </div>
          </Card>
        </div>

        {product.description && (
          <Card>
            <h4 className="font-semibold text-gray-900 mb-3">Descripción</h4>
            <p className="text-sm text-gray-600">{product.description}</p>
          </Card>
        )}

        {/* Información adicional */}
        <Card>
          <h4 className="font-semibold text-gray-900 mb-3">Información Adicional</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Creado:</span>
              <p className="font-medium">{formatDate(product.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-600">Última actualización:</span>
              <p className="font-medium">{formatDate(product.updated_at)}</p>
            </div>
            <div>
              <span className="text-gray-600">Estado:</span>
              <p className="font-medium">{product.is_active ? 'Activo' : 'Inactivo'}</p>
            </div>
            {product.cost && product.price && (
              <div>
                <span className="text-gray-600">Margen:</span>
                <p className="font-medium text-green-600">
                  {formatCurrency(product.price - product.cost)} 
                  ({(((product.price - product.cost) / product.price) * 100).toFixed(1)}%)
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Acciones */}
        <div className="flex space-x-3 justify-end pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            icon={<Edit className="h-4 w-4" />}
            onClick={() => {
              onEdit(product)
              onClose()
            }}
          >
            Editar Producto
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default Products