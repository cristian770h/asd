// frontend/src/services/api.js - Cliente API Principal
import axios from 'axios'
import toast from 'react-hot-toast'

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de requests
api.interceptors.request.use(
  (config) => {
    // Agregar timestamp para evitar cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    // Log de requests en desarrollo
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method.toUpperCase()} ${config.url}`, config.data || config.params)
    }
    
    return config
  },
  (error) => {
    console.error('Error en request:', error)
    return Promise.reject(error)
  }
)

// Interceptor de responses
api.interceptors.response.use(
  (response) => {
    // Log de responses exitosas en desarrollo
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    return response
  },
  (error) => {
    // Log de errores
    console.error('Error en response:', error)
    
    // Manejo de errores específicos
    if (error.response) {
      // El servidor respondió con un error
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          toast.error(data.error || 'Datos inválidos')
          break
        case 401:
          toast.error('No autorizado')
          break
        case 403:
          toast.error('Acceso denegado')
          break
        case 404:
          toast.error('Recurso no encontrado')
          break
        case 422:
          toast.error(data.error || 'Error de validación')
          break
        case 429:
          toast.error('Demasiadas solicitudes, intenta más tarde')
          break
        case 500:
          toast.error('Error interno del servidor')
          break
        case 503:
          toast.error('Servicio no disponible')
          break
        default:
          toast.error(data.error || 'Error desconocido')
      }
    } else if (error.request) {
      // No se recibió respuesta
      toast.error('No se pudo conectar al servidor')
      console.error('No response received:', error.request)
    } else {
      // Error en la configuración del request
      toast.error('Error de configuración')
      console.error('Request setup error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// Funciones de utilidad para requests comunes
export const apiUtils = {
  // GET request
  get: async (url, params = {}) => {
    try {
      const response = await api.get(url, { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // POST request
  post: async (url, data = {}) => {
    try {
      const response = await api.post(url, data)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // PUT request
  put: async (url, data = {}) => {
    try {
      const response = await api.put(url, data)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // DELETE request
  delete: async (url) => {
    try {
      const response = await api.delete(url)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // PATCH request
  patch: async (url, data = {}) => {
    try {
      const response = await api.patch(url, data)
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Upload de archivos
  upload: async (url, formData, onUploadProgress = null) => {
    try {
      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  // Download de archivos
  download: async (url, filename) => {
    try {
      const response = await api.get(url, {
        responseType: 'blob',
      })
      
      // Crear link de descarga
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      
      return response.data
    } catch (error) {
      throw error
    }
  }
}

// Funciones específicas para cada módulo del sistema
export const dashboardAPI = {
  getStats: () => apiUtils.get('/api/dashboard/stats'),
  getRecentActivity: () => apiUtils.get('/api/dashboard/recent-activity'),
}

export const productsAPI = {
  getAll: (params) => apiUtils.get('/api/products', params),
  getById: (id) => apiUtils.get(`/api/products/${id}`),
  create: (data) => apiUtils.post('/api/products', data),
  update: (id, data) => apiUtils.put(`/api/products/${id}`, data),
  delete: (id) => apiUtils.delete(`/api/products/${id}`),
  updateStock: (id, data) => apiUtils.post(`/api/products/${id}/stock`, data),
  getMovements: (id, params) => apiUtils.get(`/api/products/${id}/movements`, params),
  getCategories: () => apiUtils.get('/api/products/categories'),
  getBrands: () => apiUtils.get('/api/products/brands'),
  getStats: () => apiUtils.get('/api/products/stats'),
}

export const ordersAPI = {
  getAll: (params) => apiUtils.get('/api/orders', params),
  getById: (id) => apiUtils.get(`/api/orders/${id}`),
  create: (data) => apiUtils.post('/api/orders', data),
  updateStatus: (id, data) => apiUtils.put(`/api/orders/${id}/status`, data),
  parseWhatsApp: (data) => apiUtils.post('/api/orders/parse-whatsapp', data),
  createFromWhatsApp: (data) => apiUtils.post('/api/orders/create-from-whatsapp', data),
  getRecent: (params) => apiUtils.get('/api/orders/recent', params),
  getStats: () => apiUtils.get('/api/orders/stats'),
  getDailySummary: (params) => apiUtils.get('/api/orders/daily-summary', params),
  getProductPerformance: (params) => apiUtils.get('/api/orders/product-performance', params),
}

export const predictionsAPI = {
  getDaily: (params) => apiUtils.get('/api/predictions/daily', params),
  getWeekly: (params) => apiUtils.get('/api/predictions/weekly', params),
  getMonthly: (params) => apiUtils.get('/api/predictions/monthly', params),
  getByProduct: (productId, params) => apiUtils.get(`/api/predictions/product/${productId}`, params),
  getAccuracy: (params) => apiUtils.get('/api/predictions/accuracy', params),
  retrain: (data) => apiUtils.post('/api/predictions/retrain', data),
  getToday: () => apiUtils.get('/api/predictions/today'),
  getTrends: (params) => apiUtils.get('/api/predictions/trends', params),
}

export const clusteringAPI = {
  getZones: () => apiUtils.get('/api/clustering/zones'),
  getZoneDetails: (zoneId) => apiUtils.get(`/api/clustering/zones/${zoneId}`),
  getHeatmapData: () => apiUtils.get('/api/clustering/heatmap'),
  predictZone: (data) => apiUtils.post('/api/clustering/predict-zone', data),
  getZonePredictions: (params) => apiUtils.get('/api/clustering/zone-predictions', params),
  retrain: (data) => apiUtils.post('/api/clustering/retrain', data),
  getZoneComparison: (params) => apiUtils.get('/api/clustering/zone-comparison', params),
  getDeliveryOptimization: (params) => apiUtils.get('/api/clustering/delivery-optimization', params),
  getStats: () => apiUtils.get('/api/clustering/stats'),
}

export const inventoryAPI = {
  getLowStock: (params) => apiUtils.get('/api/inventory/low-stock', params),
  getMovements: (params) => apiUtils.get('/api/inventory/movements', params),
  getValuation: () => apiUtils.get('/api/inventory/valuation'),
  getTurnover: (params) => apiUtils.get('/api/inventory/turnover', params),
  getReorderSuggestions: () => apiUtils.get('/api/inventory/reorder-suggestions'),
  bulkUpdateStock: (data) => apiUtils.post('/api/inventory/bulk-update', data),
  getAlerts: () => apiUtils.get('/api/inventory/alerts'),
  getStats: () => apiUtils.get('/api/inventory/stats'),
}

// Helper para manejar paginación
export const paginationHelper = {
  buildParams: (page = 1, perPage = 20, filters = {}) => ({
    page,
    per_page: perPage,
    ...filters
  }),
  
  parseResponse: (response) => ({
    data: response.data || [],
    pagination: response.pagination || {},
    total: response.pagination?.total || 0,
    hasMore: response.pagination?.has_next || false
  })
}

// Helper para manejo de errores personalizado
export const errorHandler = {
  handle: (error, customMessage = null) => {
    console.error('API Error:', error)
    
    if (customMessage) {
      toast.error(customMessage)
    }
    
    return {
      error: true,
      message: error.response?.data?.error || error.message || 'Error desconocido',
      status: error.response?.status || 500
    }
  },
  
  isNetworkError: (error) => !error.response,
  isServerError: (error) => error.response?.status >= 500,
  isClientError: (error) => error.response?.status >= 400 && error.response?.status < 500,
}

// Helper para retry de requests
export const retryHelper = {
  async withRetry(fn, maxAttempts = 3, delay = 1000) {
    let attempt = 1
    
    while (attempt <= maxAttempts) {
      try {
        return await fn()
      } catch (error) {
        if (attempt === maxAttempts || !errorHandler.isNetworkError(error)) {
          throw error
        }
        
        console.warn(`Intento ${attempt} falló, reintentando en ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        attempt++
        delay *= 2 // Backoff exponencial
      }
    }
  }
}

// Exportar instancia principal
export { api }
export default api