// frontend/src/hooks/useApi.js - Hook de API
import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, apiUtils, errorHandler, retryHelper } from '@/services/api'

// Hook principal de API con manejo de estado
export const useApi = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [requestCount, setRequestCount] = useState(0)
  const requestCountRef = useRef(0)

  // Escuchar cambios de conectividad
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Interceptor para contar requests
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      requestCountRef.current += 1
      setRequestCount(requestCountRef.current)
      return config
    })

    const responseInterceptor = api.interceptors.response.use(
      (response) => {
        requestCountRef.current = Math.max(0, requestCountRef.current - 1)
        setRequestCount(requestCountRef.current)
        return response
      },
      (error) => {
        requestCountRef.current = Math.max(0, requestCountRef.current - 1)
        setRequestCount(requestCountRef.current)
        return Promise.reject(error)
      }
    )

    return () => {
      api.interceptors.request.eject(requestInterceptor)
      api.interceptors.response.eject(responseInterceptor)
    }
  }, [])

  return {
    isOnline,
    isLoading: requestCount > 0,
    requestCount
  }
}

// Hook para requests con retry automático
export const useApiRequest = (requestFn, options = {}) => {
  const {
    enableRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = 'Operación exitosa',
    onSuccess,
    onError
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)

    try {
      const executeRequest = () => requestFn(...args)
      
      const result = enableRetry 
        ? await retryHelper.withRetry(executeRequest, maxRetries, retryDelay)
        : await executeRequest()

      setData(result)
      
      if (showSuccessToast) {
        toast.success(successMessage)
      }
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (err) {
      const errorInfo = errorHandler.handle(err)
      setError(errorInfo)
      
      if (showErrorToast) {
        toast.error(errorInfo.message)
      }
      
      if (onError) {
        onError(errorInfo)
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [requestFn, enableRetry, maxRetries, retryDelay, showErrorToast, showSuccessToast, successMessage, onSuccess, onError])

  return {
    loading,
    error,
    data,
    execute
  }
}

// Hook para paginación
export const usePagination = (queryFn, queryKey, options = {}) => {
  const {
    initialPage = 1,
    perPage = 20,
    enabled = true,
    ...queryOptions
  } = options

  const [page, setPage] = useState(initialPage)
  const [filters, setFilters] = useState({})

  const queryResult = useQuery(
    [queryKey, page, perPage, filters],
    () => queryFn({ page, per_page: perPage, ...filters }),
    {
      enabled,
      keepPreviousData: true,
      staleTime: 300000, // 5 minutos
      ...queryOptions
    }
  )

  const { data, isLoading, error, isFetching } = queryResult
  const pagination = data?.pagination || {}

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= (pagination.pages || 1)) {
      setPage(newPage)
    }
  }, [pagination.pages])

  const nextPage = useCallback(() => {
    if (pagination.has_next) {
      setPage(prev => prev + 1)
    }
  }, [pagination.has_next])

  const prevPage = useCallback(() => {
    if (pagination.has_prev) {
      setPage(prev => prev - 1)
    }
  }, [pagination.has_prev])

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset a primera página al cambiar filtros
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({})
    setPage(1)
  }, [])

  return {
    // Datos
    data: data?.data || [],
    pagination,
    
    // Estados
    isLoading,
    isFetching,
    error,
    
    // Paginación
    page,
    perPage,
    goToPage,
    nextPage,
    prevPage,
    
    // Filtros
    filters,
    updateFilters,
    resetFilters,
    
    // Utilidades
    hasData: (data?.data?.length || 0) > 0,
    isEmpty: !isLoading && (data?.data?.length || 0) === 0,
    totalItems: pagination.total || 0,
    totalPages: pagination.pages || 1
  }
}

// Hook para mutaciones con optimistic updates
export const useOptimisticMutation = (mutationFn, options = {}) => {
  const {
    queryKey,
    updateQueryData,
    rollbackQueryData,
    showSuccessToast = true,
    successMessage = 'Cambios guardados',
    ...mutationOptions
  } = options

  const queryClient = useQueryClient()

  return useMutation(mutationFn, {
    onMutate: async (variables) => {
      if (queryKey && updateQueryData) {
        // Cancelar queries en progreso
        await queryClient.cancelQueries(queryKey)
        
        // Guardar datos actuales
        const previousData = queryClient.getQueryData(queryKey)
        
        // Actualizar optimísticamente
        queryClient.setQueryData(queryKey, (oldData) => 
          updateQueryData(oldData, variables)
        )
        
        return { previousData }
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback en caso de error
      if (context?.previousData && queryKey) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      
      if (rollbackQueryData) {
        rollbackQueryData(error, variables, context)
      }
      
      toast.error('Error al guardar cambios')
    },
    
    onSuccess: (data, variables, context) => {
      if (showSuccessToast) {
        toast.success(successMessage)
      }
    },
    
    onSettled: () => {
      // Invalidar queries para asegurar consistencia
      if (queryKey) {
        queryClient.invalidateQueries(queryKey)
      }
    },
    
    ...mutationOptions
  })
}

// Hook para búsqueda con debounce
export const useSearch = (searchFn, options = {}) => {
  const {
    debounceMs = 300,
    minLength = 2,
    enabled = true,
    ...queryOptions
  } = options

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')

  // Debounce del término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  const shouldSearch = enabled && debouncedTerm.length >= minLength

  const queryResult = useQuery(
    ['search', debouncedTerm],
    () => searchFn(debouncedTerm),
    {
      enabled: shouldSearch,
      staleTime: 300000, // 5 minutos
      ...queryOptions
    }
  )

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    results: queryResult.data?.data || [],
    isSearching: queryResult.isFetching,
    error: queryResult.error,
    hasResults: (queryResult.data?.data?.length || 0) > 0,
    isEmpty: shouldSearch && !queryResult.isFetching && (queryResult.data?.data?.length || 0) === 0
  }
}

// Hook para cache invalidation inteligente
export const useCacheManager = () => {
  const queryClient = useQueryClient()

  const invalidateQueries = useCallback((patterns = []) => {
    patterns.forEach(pattern => {
      queryClient.invalidateQueries(pattern)
    })
  }, [queryClient])

  const prefetchQuery = useCallback((queryKey, queryFn, options = {}) => {
    return queryClient.prefetchQuery(queryKey, queryFn, {
      staleTime: 300000, // 5 minutos por defecto
      ...options
    })
  }, [queryClient])

  const setQueryData = useCallback((queryKey, data) => {
    queryClient.setQueryData(queryKey, data)
  }, [queryClient])

  const getQueryData = useCallback((queryKey) => {
    return queryClient.getQueryData(queryKey)
  }, [queryClient])

  const removeQueries = useCallback((patterns = []) => {
    patterns.forEach(pattern => {
      queryClient.removeQueries(pattern)
    })
  }, [queryClient])

  const getCacheSize = useCallback(() => {
    const cache = queryClient.getQueryCache()
    return cache.getAll().length
  }, [queryClient])

  const clearCache = useCallback(() => {
    queryClient.clear()
    toast.success('Cache limpiado')
  }, [queryClient])

  return {
    invalidateQueries,
    prefetchQuery,
    setQueryData,
    getQueryData,
    removeQueries,
    getCacheSize,
    clearCache
  }
}

// Hook para requests en lote
export const useBatchRequests = () => {
  const [requests, setRequests] = useState([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [results, setResults] = useState([])

  const addRequest = useCallback((requestFn, id) => {
    setRequests(prev => [...prev, { id, requestFn }])
  }, [])

  const removeRequest = useCallback((id) => {
    setRequests(prev => prev.filter(req => req.id !== id))
  }, [])

  const executeAll = useCallback(async () => {
    if (requests.length === 0) return []

    setIsExecuting(true)
    const batchResults = []

    try {
      // Ejecutar requests en paralelo con límite
      const batchSize = 5 // Máximo 5 requests simultáneos
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async ({ id, requestFn }) => {
          try {
            const result = await requestFn()
            return { id, success: true, data: result }
          } catch (error) {
            return { id, success: false, error: error.message }
          }
        })

        const batchResult = await Promise.all(batchPromises)
        batchResults.push(...batchResult)
      }

      setResults(batchResults)
      setRequests([]) // Limpiar requests después de ejecutar
      
      return batchResults
    } catch (error) {
      toast.error('Error ejecutando requests en lote')
      throw error
    } finally {
      setIsExecuting(false)
    }
  }, [requests])

  return {
    requests,
    addRequest,
    removeRequest,
    executeAll,
    isExecuting,
    results,
    requestCount: requests.length
  }
}