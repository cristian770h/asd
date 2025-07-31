// frontend/src/hooks/useProducts.js - Hook de Productos
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { productsAPI, inventoryAPI } from '@/services/api'
import webSocketService from '@/services/websocket'

export const useProducts = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutos
    includePredictions = false,
    includePerformance = false,
    includeStock = true,
    onDataUpdate,
    onError
  } = options

  const queryClient = useQueryClient()
  const [selectedProducts, setSelectedProducts] = useState([])

  // Query principal para obtener productos
  const {
    data: productsData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['products', { includePredictions, includePerformance, includeStock }],
    () => productsAPI.getAll({
      include_predictions: includePredictions,
      include_performance: includePerformance,
      include_stock: includeStock
    }),
    {
      staleTime: 240000, // 4 minutos
      cacheTime: 600000, // 10 minutos
      refetchInterval: autoRefresh ? refreshInterval : false,
      refetchOnWindowFocus: autoRefresh,
      onSuccess: (data) => {
        if (onDataUpdate) {
          onDataUpdate(data)
        }
      },
      onError: (error) => {
        console.error('Error obteniendo productos:', error)
        if (onError) {
          onError(error)
        }
      }
    }
  )

  const products = productsData?.data?.products || []
  const categories = productsData?.data?.categories || []

  // Query para obtener productos más vendidos
  const {
    data: bestsellersData,
    isLoading: loadingBestsellers
  } = useQuery(
    ['products', 'bestsellers'],
    () => productsAPI.getBestsellers({ limit: 10, period: '30d' }),
    {
      staleTime: 600000, // 10 minutos
      enabled: includePerformance
    }
  )

  const bestsellers = bestsellersData?.data || []

  // Query para obtener productos con stock bajo
  const {
    data: lowStockData,
    isLoading: loadingLowStock
  } = useQuery(
    ['inventory', 'low-stock'],
    () => inventoryAPI.getLowStock({ limit: 50 }),
    {
      staleTime: 120000, // 2 minutos
      enabled: includeStock
    }
  )

  const lowStockItems = lowStockData?.data?.items || []

  // Mutation para crear producto
  const createProduct = useMutation(
    (productData) => productsAPI.create(productData),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['products'])
        queryClient.invalidateQueries(['inventory'])
        toast.success('Producto creado exitosamente')
      },
      onError: (error) => {
        console.error('Error creando producto:', error)
        toast.error('Error creando producto')
      }
    }
  )

  // Mutation para actualizar producto
  const updateProduct = useMutation(
    ({ id, ...updates }) => productsAPI.update(id, updates),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['products'])
        queryClient.invalidateQueries(['inventory'])
        toast.success('Producto actualizado exitosamente')
      },
      onError: (error) => {
        console.error('Error actualizando producto:', error)
        toast.error('Error actualizando producto')
      }
    }
  )

  // Mutation para eliminar producto
  const deleteProduct = useMutation(
    (productId) => productsAPI.delete(productId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products'])
        queryClient.invalidateQueries(['inventory'])
        toast.success('Producto eliminado exitosamente')
      },
      onError: (error) => {
        console.error('Error eliminando producto:', error)
        toast.error('Error eliminando producto')
      }
    }
  )

  // Mutation para actualización masiva
  const bulkUpdate = useMutation(
    (bulkData) => productsAPI.bulkUpdate(bulkData),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['products'])
        queryClient.invalidateQueries(['inventory'])
        toast.success(`${data.data?.updated_count || 0} productos actualizados`)
      },
      onError: (error) => {
        console.error('Error en actualización masiva:', error)
        toast.error('Error en actualización masiva')
      }
    }
  )

  // Mutation para actualizar stock
  const updateStock = useMutation(
    ({ productId, newStock, reason }) => 
      inventoryAPI.updateStock({
        product_id: productId,
        new_stock: newStock,
        reason: reason || 'Ajuste manual'
      }),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['products'])
        queryClient.invalidateQueries(['inventory'])
        toast.success('Stock actualizado correctamente')
      },
      onError: (error) => {
        console.error('Error actualizando stock:', error)
        toast.error('Error actualizando stock')
      }
    }
  )

  // Función para obtener producto por ID
  const getProductById = useCallback((productId) => {
    return products.find(product => product.id === productId)
  }, [products])

  // Función para obtener productos por categoría
  const getProductsByCategory = useCallback((category) => {
    return products.filter(product => product.category === category)
  }, [products])

  // Función para buscar productos
  const searchProducts = useCallback((searchTerm) => {
    if (!searchTerm) return products
    
    const term = searchTerm.toLowerCase()
    return products.filter(product => 
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      (product.description && product.description.toLowerCase().includes(term)) ||
      product.category.toLowerCase().includes(term)
    )
  }, [products])

  // Función para filtrar productos
  const filterProducts = useCallback((filters) => {
    let filtered = products

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category)
    }

    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter(p => p.is_active)
          break
        case 'inactive':
          filtered = filtered.filter(p => !p.is_active)
          break
        case 'low_stock':
          filtered = filtered.filter(p => p.stock <= p.min_stock)
          break
        case 'out_of_stock':
          filtered = filtered.filter(p => p.stock === 0)
          break
      }
    }

    if (filters.priceRange) {
      const { min, max } = filters.priceRange
      filtered = filtered.filter(p => 
        p.unit_price >= (min || 0) && 
        p.unit_price <= (max || Infinity)
      )
    }

    return filtered
  }, [products])

  // Función para ordenar productos
  const sortProducts = useCallback((products, sortBy, sortOrder = 'asc') => {
    return [...products].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      // Manejar valores nulos
      if (aValue == null) aValue = ''
      if (bValue == null) bValue = ''

      // Convertir a string para comparación si es necesario
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      let comparison = 0
      if (aValue > bValue) comparison = 1
      if (aValue < bValue) comparison = -1

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }, [])

  // Función para obtener estadísticas de productos
  const getProductsStats = useCallback(() => {
    if (!products.length) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0
      }
    }

    return {
      total: products.length,
      active: products.filter(p => p.is_active).length,
      inactive: products.filter(p => !p.is_active).length,
      lowStock: products.filter(p => p.stock <= p.min_stock && p.stock > 0).length,
      outOfStock: products.filter(p => p.stock === 0).length,
      totalValue: products.reduce((sum, p) => sum + (p.stock * p.unit_price), 0),
      avgPrice: products.reduce((sum, p) => sum + p.unit_price, 0) / products.length
    }
  }, [products])

  // Función para obtener productos más vendidos
  const getTopProducts = useCallback((limit = 5, metric = 'sales') => {
    let sorted = [...products]
    
    switch (metric) {
      case 'sales':
        sorted = sorted.sort((a, b) => (b.sales_last_30 || 0) - (a.sales_last_30 || 0))
        break
      case 'revenue':
        sorted = sorted.sort((a, b) => 
          ((b.sales_last_30 || 0) * b.unit_price) - 
          ((a.sales_last_30 || 0) * a.unit_price)
        )
        break
      case 'stock':
        sorted = sorted.sort((a, b) => b.stock - a.stock)
        break
      case 'price':
        sorted = sorted.sort((a, b) => b.unit_price - a.unit_price)
        break
    }
    
    return sorted.slice(0, limit)
  }, [products])

  // Función para duplicar producto
  const duplicateProduct = useCallback(async (productId) => {
    const product = getProductById(productId)
    if (!product) {
      toast.error('Producto no encontrado')
      return
    }

    const duplicatedProduct = {
      ...product,
      name: `${product.name} (Copia)`,
      sku: `${product.sku}_COPY_${Date.now()}`,
      stock: 0
    }

    // Remover campos que no se deben duplicar
    delete duplicatedProduct.id
    delete duplicatedProduct.created_at
    delete duplicatedProduct.updated_at

    try {
      await createProduct.mutateAsync(duplicatedProduct)
    } catch (error) {
      console.error('Error duplicando producto:', error)
    }
  }, [getProductById, createProduct])

  // Manejo de selección múltiple
  const toggleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }, [])

  const selectAllProducts = useCallback((productIds) => {
    setSelectedProducts(productIds)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedProducts([])
  }, [])

  // Efectos para WebSocket
  React.useEffect(() => {
    const handleInventoryUpdate = (data) => {
      if (data.product_id) {
        queryClient.invalidateQueries(['products'])
        queryClient.invalidateQueries(['inventory'])
      }
    }

    const handleStockAlert = (data) => {
      queryClient.invalidateQueries(['inventory', 'low-stock'])
    }

    const unsubscribeInventory = webSocketService.on('inventory_update', handleInventoryUpdate)
    const unsubscribeStock = webSocketService.on('stock_alert', handleStockAlert)

    return () => {
      unsubscribeInventory?.()
      unsubscribeStock?.()
    }
  }, [queryClient])

  return {
    // Datos
    products,
    categories,
    bestsellers,
    lowStockItems,
    selectedProducts,

    // Estados de carga
    isLoading,
    isFetching,
    loadingBestsellers,
    loadingLowStock,
    error,

    // Funciones de datos
    getProductById,
    getProductsByCategory,
    searchProducts,
    filterProducts,
    sortProducts,
    getProductsStats,
    getTopProducts,

    // Acciones
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdate,
    updateStock,
    duplicateProduct,

    // Selección múltiple
    toggleProductSelection,
    selectAllProducts,
    clearSelection,

    // Flags de estado
    hasData: products.length > 0,
    hasLowStock: lowStockItems.length > 0,
    isCreating: createProduct.isLoading,
    isUpdating: updateProduct.isLoading,
    isDeleting: deleteProduct.isLoading,
    isBulkUpdating: bulkUpdate.isLoading,
    isUpdating