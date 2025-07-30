// frontend/src/components/Forms/ProductForm.jsx - Formulario de Productos
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  DollarSign, 
  Hash, 
  Tag, 
  Scale,
  FileText,
  Save,
  AlertCircle
} from 'lucide-react'
import { useQuery } from 'react-query'
import toast from 'react-hot-toast'
import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import Modal from '@/components/UI/Modal'
import Alert from '@/components/UI/Alert'
import { productsAPI } from '@/services/api'
import { formatCurrency } from '@/utils/formatters'
import { validateProduct } from '@/utils/validators'

const ProductForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null,
  mode = 'create' // 'create' | 'edit'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    weight_size: '',
    price: '',
    cost: '',
    current_stock: '',
    min_stock: '5',
    max_stock: '100',
    reorder_point: '10',
    sku: '',
    description: '',
    is_active: true
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Cargar categorías y marcas existentes
  const { data: categoriesData } = useQuery(
    'product-categories',
    productsAPI.getCategories,
    { staleTime: 600000 } // 10 minutos
  )

  const { data: brandsData } = useQuery(
    'product-brands',
    productsAPI.getBrands,
    { staleTime: 600000 }
  )

  // Inicializar formulario con datos existentes
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        name: initialData.name || '',
        brand: initialData.brand || '',
        category: initialData.category || '',
        weight_size: initialData.weight_size || '',
        price: initialData.price?.toString() || '',
        cost: initialData.cost?.toString() || '',
        current_stock: initialData.current_stock?.toString() || '',
        min_stock: initialData.min_stock?.toString() || '5',
        max_stock: initialData.max_stock?.toString() || '100',
        reorder_point: initialData.reorder_point?.toString() || '10',
        sku: initialData.sku || '',
        description: initialData.description || '',
        is_active: initialData.is_active !== false
      })
      setShowAdvanced(true) // Mostrar opciones avanzadas en modo edición
    }
  }, [initialData, mode])

  // Generar SKU automático
  useEffect(() => {
    if (formData.name && formData.brand && !formData.sku) {
      const namePart = formData.name.substring(0, 3).toUpperCase()
      const brandPart = formData.brand.substring(0, 3).toUpperCase()
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      
      setFormData(prev => ({
        ...prev,
        sku: `${brandPart}${namePart}${randomPart}`
      }))
    }
  }, [formData.name, formData.brand])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo cuando se modifica
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const validation = validateProduct(formData)
    setErrors(validation.errors)
    return validation.isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    setIsSubmitting(true)

    try {
      // Preparar datos para envío
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        current_stock: parseInt(formData.current_stock) || 0,
        min_stock: parseInt(formData.min_stock) || 5,
        max_stock: parseInt(formData.max_stock) || 100,
        reorder_point: parseInt(formData.reorder_point) || 10
      }

      let result
      if (mode === 'edit' && initialData) {
        result = await productsAPI.update(initialData.id, productData)
      } else {
        result = await productsAPI.create(productData)
      }

      if (result.success) {
        toast.success(mode === 'edit' ? 'Producto actualizado' : 'Producto creado exitosamente')
        onSubmit(result.data)
        onClose()
      } else {
        throw new Error(result.error || 'Error procesando producto')
      }

    } catch (error) {
      console.error('Error enviando producto:', error)
      
      if (error.response?.status === 400) {
        toast.error('Datos inválidos. Verifica la información ingresada.')
      } else {
        toast.error('Error procesando producto: ' + error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = categoriesData?.data || []
  const brands = brandsData?.data || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Editar Producto' : 'Nuevo Producto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <div className="flex items-center space-x-2 mb-4">
            <Package className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900">Información Básica</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej: Nupec Adulto"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="brands-list"
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.brand ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Ej: Nupec"
                    required
                  />
                  <datalist id="brands-list">
                    {brands.map((brand, index) => (
                      <option key={index} value={brand} />
                    ))}
                  </datalist>
                </div>
                {errors.brand && (
                  <p className="mt-1 text-sm text-red-600">{errors.brand}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="categories-list"
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="Ej: Alimento para perro"
                    required
                  />
                  <datalist id="categories-list">
                    {categories.map((category, index) => (
                      <option key={index} value={category} />
                    ))}
                  </datalist>
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso/Tamaño
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    <Scale className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.weight_size}
                    onChange={(e) => handleInputChange('weight_size', e.target.value)}
                    placeholder="Ej: 20kg, 500ml"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    <Hash className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Generado automáticamente"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descripción detallada del producto..."
              />
            </div>
          </div>
        </Card>

        {/* Precios */}
        <Card>
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900">Precios</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de Venta *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`flex-1 border rounded-r-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo (Opcional)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.cost}
                  onChange={(e) => handleInputChange('cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {formData.price && formData.cost && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Margen de ganancia:</strong> {' '}
                {formatCurrency(parseFloat(formData.price) - parseFloat(formData.cost))} ({' '}
                {(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1)}%)
              </p>
            </div>
          )}
        </Card>

        {/* Inventario */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-primary-500" />
              <h3 className="font-semibold text-gray-900">Inventario</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'} opciones avanzadas
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Actual
              </label>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.current_stock}
                onChange={(e) => handleInputChange('current_stock', e.target.value)}
                placeholder="0"
              />
            </div>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={formData.min_stock}
                      onChange={(e) => handleInputChange('min_stock', e.target.value)}
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Máximo
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={formData.max_stock}
                      onChange={(e) => handleInputChange('max_stock', e.target.value)}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Punto de Reorden
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={formData.reorder_point}
                      onChange={(e) => handleInputChange('reorder_point', e.target.value)}
                      placeholder="10"
                    />
                  </div>
                </div>

                <Alert type="info" title="Niveles de Inventario">
                  <ul className="text-sm space-y-1">
                    <li><strong>Stock Mínimo:</strong> Nivel por debajo del cual se considera stock bajo</li>
                    <li><strong>Stock Máximo:</strong> Nivel máximo recomendado para evitar sobrestock</li>
                    <li><strong>Punto de Reorden:</strong> Nivel en el que se debe hacer un nuevo pedido</li>
                  </ul>
                </Alert>
              </motion.div>
            )}
          </div>
        </Card>

        {/* Estado del producto */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            checked={formData.is_active}
            onChange={(e) => handleInputChange('is_active', e.target.checked)}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Producto activo
          </label>
        </div>

        {/* Resumen */}
        {formData.name && formData.price && (
          <Card variant="outline" className="bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">Resumen del Producto</h4>
            <div className="text-sm space-y-1">
              <p><strong>Nombre:</strong> {formData.name}</p>
              <p><strong>Marca:</strong> {formData.brand}</p>
              <p><strong>Precio:</strong> {formatCurrency(formData.price)}</p>
              {formData.weight_size && <p><strong>Tamaño:</strong> {formData.weight_size}</p>}
              <p><strong>Stock:</strong> {formData.current_stock || 0} unidades</p>
            </div>
          </Card>
        )}

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
            {mode === 'edit' ? 'Actualizar' : 'Crear'} Producto
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ProductForm