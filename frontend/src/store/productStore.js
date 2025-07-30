// frontend/src/stores/productStore.js - Store de Productos
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'
import { productsAPI, inventoryAPI } from '@/services/api'
import webSocketService from '@/services/websocket'
import { formatCurrency } from '@/utils/formatters'

const useProductStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Estado inicial
        products: [],
        categories: [],
        lowStockItems: [],
        
        inventory: {
          movements: [],
          valuation: {
            total_value: 0,
            total_items: 0,
            by_category: {}
          },
          turnover: {
            average_turnover: 0,
            by_product: new Map()
          }
        },
        
        analytics: {
          bestsellers: [],
          slowMovers: [],
          profitability: new Map(),
          seasonality: new Map()
        },
        
        filters: {
          category: 'all',
          status: 'all', // all, active, inactive, low_stock, out_of_stock
          sortBy: 'name',
          sortOrder: 'asc',
          searchTerm: ''
        },
        
        ui: {
          loading: false,
          error: null,
          selectedProducts: [],
          viewMode: 'grid', // grid, list, table
          showFilters: false,
          bulkEditMode: false
        },
        
        cache: {
          last_updated: null,
          expires_at: null
        },

        // Actions principales
        fetchProducts: async (options = {}) => {
          const { 
            forceRefresh = false, 
            includePredictions = true,
            includePerformance = true
          } = options

          // Verificar cache
          if (!forceRefresh && get()._isCacheValid()) {
            return get().products
          }

          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await productsAPI.getAll({
              include_predictions: includePredictions,
              include_performance: includePerformance,
              include_stock: true
            })

            if (response.success) {
              const processedProducts = response.data.products.map(product => ({
                ...product,
                formatted_price: formatCurrency(product.unit_price),
                stock_status: get()._getStockStatus(product),
                performance_grade: get()._getPerformanceGrade(product.performance_score),
                trend_indicator: get()._getTrendIndicator(product.sales_trend),
                profit_margin: get()._calculateProfitMargin(product),
                last_updated: new Date(product.updated_at)
              }))

              // Extraer categorías únicas
              const uniqueCategories = [...new Set(processedProducts.map(p => p.category))]
                .filter(Boolean)
                .map(name => ({ name, count: processedProducts.filter(p => p.category === name).length }))

              set(state => ({
                products: processedProducts,
                categories: uniqueCategories,
                lowStockItems: processedProducts.filter(p => p.stock <= p.min_stock),
                cache: {
                  last_updated: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
                },
                ui: { ...state.ui, loading: false }
              }))

              return processedProducts
            }
          } catch (error) {
            console.error('Error fetching products:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        fetchProductById: async (productId) => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await productsAPI.getById(productId)
            
            if (response.success) {
              const product = {
                ...response.data,
                formatted_price: formatCurrency(response.data.unit_price),
                stock_status: get()._getStockStatus(response.data),
                performance_grade: get()._getPerformanceGrade(response.data.performance_score)
              }

              // Actualizar producto en la lista si existe
              set(state => ({
                products: state.products.map(p => 
                  p.id === productId ? product : p
                ),
                ui: { ...state.ui, loading: false }
              }))

              return product
            }
          } catch (error) {
            console.error('Error fetching product:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        createProduct: async (productData) => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await productsAPI.create(productData)
            
            if (response.success) {
              const newProduct = {
                ...response.data,
                formatted_price: formatCurrency(response.data.unit_price),
                stock_status: get()._getStockStatus(response.data)
              }

              set(state => ({
                products: [...state.products, newProduct],
                ui: { ...state.ui, loading: false }
              }))

              // Actualizar categorías si es nueva
              if (newProduct.category && !get().categories.find(c => c.name === newProduct.category)) {
                set(state => ({
                  categories: [...state.categories, { 
                    name: newProduct.category, 
                    count: 1 
                  }]
                }))
              }

              get().invalidateCache()
              return newProduct
            }
          } catch (error) {
            console.error('Error creating product:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        updateProduct: async (productId, updates) => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await productsAPI.update(productId, updates)
            
            if (response.success) {
              const updatedProduct = {
                ...response.data,
                formatted_price: formatCurrency(response.data.unit_price),
                stock_status: get()._getStockStatus(response.data)
              }

              set(state => ({
                products: state.products.map(p => 
                  p.id === productId ? updatedProduct : p
                ),
                ui: { ...state.ui, loading: false }
              }))

              get().invalidateCache()
              return updatedProduct
            }
          } catch (error) {
            console.error('Error updating product:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        deleteProduct: async (productId) => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await productsAPI.delete(productId)
            
            if (response.success) {
              set(state => ({
                products: state.products.filter(p => p.id !== productId),
                ui: { 
                  ...state.ui, 
                  loading: false,
                  selectedProducts: state.ui.selectedProducts.filter(id => id !== productId)
                }
              }))

              get().invalidateCache()
              return true
            }
          } catch (error) {
            console.error('Error deleting product:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        bulkUpdateProducts: async (productIds, updates) => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await productsAPI.bulkUpdate({
              product_ids: productIds,
              updates
            })
            
            if (response.success) {
              // Actualizar productos afectados
              const updatedProducts = response.data.updated_products.map(product => ({
                ...product,
                formatted_price: formatCurrency(product.unit_price),
                stock_status: get()._getStockStatus(product)
              }))

              set(state => ({
                products: state.products.map(p => {
                  const updated = updatedProducts.find(up => up.id === p.id)
                  return updated || p
                }),
                ui: { ...state.ui, loading: false }
              }))

              get().invalidateCache()
              return updatedProducts
            }
          } catch (error) {
            console.error('Error bulk updating products:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        // Actions de inventario
        fetchInventoryData: async (options = {}) => {
          const { includeMovements = true, includeValuation = true } = options

          try {
            const promises = []

            if (includeMovements) {
              promises.push(inventoryAPI.getMovements({ limit: 100 }))
            }

            if (includeValuation) {
              promises.push(inventoryAPI.getValuation())
              promises.push(inventoryAPI.getTurnover())
            }

            const results = await Promise.allSettled(promises)
            
            let movements = []
            let valuation = get().inventory.valuation
            let turnover = get().inventory.turnover

            if (includeMovements && results[0].status === 'fulfilled') {
              movements = results[0].value.data.movements || []
            }

            if (includeValuation) {
              if (results[1].status === 'fulfilled') {
                valuation = results[1].value.data || valuation
              }
              if (results[2].status === 'fulfilled') {
                turnover = results[2].value.data || turnover
              }
            }

            set(state => ({
              inventory: {
                ...state.inventory,
                movements: movements.map(mov => ({
                  ...mov,
                  formatted_date: new Date(mov.created_at).toLocaleDateString(),
                  formatted_quantity: mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity.toString()
                })),
                valuation,
                turnover
              }
            }))

            return { movements, valuation, turnover }
          } catch (error) {
            console.error('Error fetching inventory data:', error)
            throw error
          }
        },

        updateStock: async (productId, newStock, reason = 'Manual adjustment') => {
          try {
            const response = await inventoryAPI.updateStock({
              product_id: productId,
              new_stock: newStock,
              reason
            })

            if (response.success) {
              // Actualizar producto local
              set(state => ({
                products: state.products.map(p => 
                  p.id === productId 
                    ? { 
                        ...p, 
                        stock: newStock, 
                        stock_status: get()._getStockStatus({ ...p, stock: newStock }) 
                      }
                    : p
                )
              }))

              // Actualizar lowStockItems
              get().updateLowStockItems()
              
              return response.data
            }
          } catch (error) {
            console.error('Error updating stock:', error)
            throw error
          }
        },

        // Actions de análisis
        fetchAnalytics: async (options = {}) => {
          const { period = '30d' } = options

          try {
            const [bestsellersRes, profitabilityRes, seasonalityRes] = await Promise.allSettled([
              productsAPI.getBestsellers({ period }),
              productsAPI.getProfitability({ period }),
              productsAPI.getSeasonality({ period })
            ])

            const analytics = {
              bestsellers: bestsellersRes.status === 'fulfilled' ? bestsellersRes.value.data || [] : [],
              slowMovers: [], // Se puede calcular del lado contrario de bestsellers
              profitability: new Map(),
              seasonality: new Map()
            }

            // Procesar profitabilidad
            if (profitabilityRes.status === 'fulfilled' && profitabilityRes.value.data) {
              profitabilityRes.value.data.forEach(item => {
                analytics.profitability.set(item.product_id, {
                  margin: item.profit_margin,
                  revenue: item.total_revenue,
                  profit: item.total_profit
                })
              })
            }

            // Procesar estacionalidad
            if (seasonalityRes.status === 'fulfilled' && seasonalityRes.value.data) {
              seasonalityRes.value.data.forEach(item => {
                analytics.seasonality.set(item.product_id, item.seasonal_patterns)
              })
            }

            set(state => ({
              analytics: { ...state.analytics, ...analytics }
            }))

            return analytics
          } catch (error) {
            console.error('Error fetching analytics:', error)
            throw error
          }
        },

        // Actions de filtros y UI
        setFilter: (filterType, value) => {
          set(state => ({
            filters: { ...state.filters, [filterType]: value }
          }))
        },

        setSearchTerm: (term) => {
          set(state => ({
            filters: { ...state.filters, searchTerm: term }
          }))
        },

        setSorting: (sortBy, sortOrder = null) => {
          set(state => ({
            filters: {
              ...state.filters,
              sortBy,
              sortOrder: sortOrder || (state.filters.sortBy === sortBy && state.filters.sortOrder === 'asc' ? 'desc' : 'asc')
            }
          }))
        },

        clearFilters: () => {
          set(state => ({
            filters: {
              category: 'all',
              status: 'all',
              sortBy: 'name',
              sortOrder: 'asc',
              searchTerm: ''
            }
          }))
        },

        // Actions de selección
        selectProduct: (productId) => {
          set(state => ({
            ui: {
              ...state.ui,
              selectedProducts: [...state.ui.selectedProducts, productId]
            }
          }))
        },

        deselectProduct: (productId) => {
          set(state => ({
            ui: {
              ...state.ui,
              selectedProducts: state.ui.selectedProducts.filter(id => id !== productId)
            }
          }))
        },

        toggleProductSelection: (productId) => {
          const isSelected = get().ui.selectedProducts.includes(productId)
          if (isSelected) {
            get().deselectProduct(productId)
          } else {
            get().selectProduct(productId)
          }
        },

        selectAllProducts: () => {
          const filteredProducts = get().getFilteredProducts()
          set(state => ({
            ui: {
              ...state.ui,
              selectedProducts: filteredProducts.map(p => p.id)
            }
          }))
        },

        clearSelection: () => {
          set(state => ({
            ui: { ...state.ui, selectedProducts: [] }
          }))
        },

        // Actions de UI
        setViewMode: (mode) => {
          set(state => ({
            ui: { ...state.ui, viewMode: mode }
          }))
        },

        toggleFilters: () => {
          set(state => ({
            ui: { ...state.ui, showFilters: !state.ui.showFilters }
          }))
        },

        setBulkEditMode: (enabled) => {
          set(state => ({
            ui: { 
              ...state.ui, 
              bulkEditMode: enabled,
              selectedProducts: enabled ? state.ui.selectedProducts : []
            }
          }))
        },

        clearError: () => {
          set(state => ({
            ui: { ...state.ui, error: null }
          }))
        },

        // Utilidades
        invalidateCache: () => {
          set(state => ({
            cache: {
              last_updated: null,
              expires_at: null
            }
          }))
        },

        updateLowStockItems: () => {
          set(state => ({
            lowStockItems: state.products.filter(p => p.stock <= p.min_stock)
          }))
        },

        // Getters computados
        getFilteredProducts: () => {
          const { products, filters } = get()
          
          return products
            .filter(product => {
              // Filtro por categoría
              if (filters.category !== 'all' && product.category !== filters.category) {
                return false
              }

              // Filtro por estado
              if (filters.status !== 'all') {
                switch (filters.status) {
                  case 'active':
                    return product.is_active
                  case 'inactive':
                    return !product.is_active
                  case 'low_stock':
                    return product.stock <= product.min_stock
                  case 'out_of_stock':
                    return product.stock === 0
                  default:
                    break
                }
              }

              // Filtro por búsqueda
              if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase()
                return (
                  product.name.toLowerCase().includes(term) ||
                  product.sku.toLowerCase().includes(term) ||
                  (product.description && product.description.toLowerCase().includes(term))
                )
              }

              return true
            })
            .sort((a, b) => {
              const { sortBy, sortOrder } = filters
              let aValue = a[sortBy]
              let bValue = b[sortBy]

              // Manejo especial para diferentes tipos de datos
              if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase()
                bValue = bValue.toLowerCase()
              }

              if (aValue === bValue) return 0

              const comparison = aValue > bValue ? 1 : -1
              return sortOrder === 'asc' ? comparison : -comparison
            })
        },

        getProductById: (productId) => {
          return get().products.find(p => p.id === productId)
        },

        getProductsByCategory: (category) => {
          return get().products.filter(p => p.category === category)
        },

        getLowStockCount: () => {
          return get().lowStockItems.length
        },

        getOutOfStockCount: () => {
          return get().products.filter(p => p.stock === 0).length
        },

        getTotalValue: () => {
          return get().products.reduce((sum, p) => sum + (p.stock * p.unit_price), 0)
        },

        getTopSellingProducts: (limit = 5) => {
          return get().analytics.bestsellers.slice(0, limit)
        },

        // Métodos privados de utilidad
        _isCacheValid: () => {
          const { expires_at } = get().cache
          return expires_at && new Date() < new Date(expires_at)
        },

        _getStockStatus: (product) => {
          if (product.stock === 0) return { status: 'out', color: 'red', text: 'Agotado' }
          if (product.stock <= product.min_stock) return { status: 'low', color: 'yellow', text: 'Stock Bajo' }
          return { status: 'normal', color: 'green', text: 'Normal' }
        },

        _getPerformanceGrade: (score) => {
          if (!score) return 'N/A'
          if (score >= 0.9) return 'A'
          if (score >= 0.8) return 'B'
          if (score >= 0.7) return 'C'
          if (score >= 0.6) return 'D'
          return 'F'
        },

        _getTrendIndicator: (trend) => {
          if (!trend) return 'stable'
          if (trend > 10) return 'up'
          if (trend < -10) return 'down'
          return 'stable'
        },

        _calculateProfitMargin: (product) => {
          if (!product.cost_price || !product.unit_price) return 0
          return ((product.unit_price - product.cost_price) / product.unit_price) * 100
        }
      }),
      {
        name: 'product-store',
        partialize: (state) => ({
          products: state.products,
          categories: state.categories,
          lowStockItems: state.lowStockItems,
          cache: state.cache,
          filters: state.filters
        })
      }
    )
  )
)

// Suscribirse a actualizaciones de WebSocket
webSocketService.on('inventory_update', (data) => {
  console.log('📦 Actualización de inventario recibida:', data)
  
  const store = useProductStore.getState()
  
  if (data.product_id && data.new_stock !== undefined) {
    // Actualizar stock específico
    useProductStore.setState(state => ({
      products: state.products.map(p => 
        p.id === data.product_id 
          ? { 
              ...p, 
              stock: data.new_stock,
              stock_status: store._getStockStatus({ ...p, stock: data.new_stock })
            }
          : p
      )
    }))
    
    store.updateLowStockItems()
  }
})

webSocketService.on('stock_alert', (data) => {
  console.log('⚠️ Alerta de stock recibida:', data)
  
  // Actualizar lowStockItems si es necesario
  useProductStore.getState().updateLowStockItems()
})

webSocketService.on('new_product', (data) => {
  console.log('🆕 Nuevo producto añadido:', data)
  
  const store = useProductStore.getState()
  
  // Invalidar cache para forzar recarga
  store.invalidateCache()
})

export default useProductStore