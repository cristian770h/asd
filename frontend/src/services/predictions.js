// frontend/src/hooks/usePredictions.js - Hook de Predicciones
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { predictionsAPI } from '@/services/api'

export const usePredictions = (type = 'daily', options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutos
    enablePolling = false,
    onDataUpdate,
    onError
  } = options

  const queryClient = useQueryClient()

  // Query principal para obtener predicciones
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['predictions', type, options],
    () => {
      switch (type) {
        case 'daily':
          return predictionsAPI.getDaily({ days_ahead: options.daysAhead || 7 })
        case 'weekly':
          return predictionsAPI.getWeekly({ weeks_ahead: options.weeksAhead || 4 })
        case 'monthly':
          return predictionsAPI.getMonthly({ months_ahead: options.monthsAhead || 3 })
        case 'today':
          return predictionsAPI.getToday()
        case 'trends':
          return predictionsAPI.getTrends({ days: options.days || 30 })
        default:
          return predictionsAPI.getDaily({ days_ahead: 7 })
      }
    },
    {
      staleTime: 240000, // 4 minutos
      cacheTime: 600000, // 10 minutos
      refetchInterval: enablePolling ? refreshInterval : false,
      refetchOnWindowFocus: autoRefresh,
      onSuccess: (data) => {
        if (onDataUpdate) {
          onDataUpdate(data)
        }
      },
      onError: (error) => {
        console.error('Error obteniendo predicciones:', error)
        if (onError) {
          onError(error)
        }
      }
    }
  )

  const predictions = data?.data || []

  return {
    predictions,
    isLoading,
    isFetching,
    error,
    refetch,
    hasData: predictions.length > 0
  }
}

// Hook para predicciones de productos específicos
export const useProductPredictions = (productId, options = {}) => {
  const {
    daysAhead = 7,
    enabled = true
  } = options

  return useQuery(
    ['product-predictions', productId, daysAhead],
    () => predictionsAPI.getByProduct(productId, { days_ahead: daysAhead }),
    {
      enabled: enabled && !!productId,
      staleTime: 300000, // 5 minutos
      cacheTime: 600000
    }
  )
}

// Hook para precisión de predicciones
export const usePredictionAccuracy = (options = {}) => {
  const { daysBack = 30 } = options

  return useQuery(
    ['prediction-accuracy', daysBack],
    () => predictionsAPI.getAccuracy({ days_back: daysBack }),
    {
      staleTime: 600000, // 10 minutos
      cacheTime: 1200000 // 20 minutos
    }
  )
}

// Hook para gestión completa de predicciones
export const usePredictionsManager = () => {
  const [selectedType, setSelectedType] = useState('daily')
  const [selectedPeriod, setSelectedPeriod] = useState(7)
  const [filters, setFilters] = useState({})
  
  const queryClient = useQueryClient()

  // Obtener predicciones principales
  const predictionsQuery = usePredictions(selectedType, {
    daysAhead: selectedType === 'daily' ? selectedPeriod : undefined,
    weeksAhead: selectedType === 'weekly' ? selectedPeriod : undefined,
    monthsAhead: selectedType === 'monthly' ? selectedPeriod : undefined,
    days: selectedType === 'trends' ? selectedPeriod : undefined
  })

  // Obtener precisión
  const accuracyQuery = usePredictionAccuracy({ daysBack: 30 })

  // Mutación para reentrenar modelos
  const retrainMutation = useMutation(
    (options = {}) => predictionsAPI.retrain(options),
    {
      onSuccess: () => {
        toast.success('Modelos reentrenados exitosamente')
        
        // Invalidar todas las queries de predicciones
        queryClient.invalidateQueries('predictions')
        queryClient.invalidateQueries('prediction-accuracy')
        queryClient.invalidateQueries('product-predictions')
      },
      onError: (error) => {
        console.error('Error reentrenando modelos:', error)
        toast.error('Error reentrenando modelos: ' + error.message)
      }
    }
  )

  // Cambiar tipo de predicción
  const changeType = useCallback((newType) => {
    setSelectedType(newType)
    
    // Ajustar período por defecto según el tipo
    switch (newType) {
      case 'daily':
        setSelectedPeriod(7)
        break
      case 'weekly':
        setSelectedPeriod(4)
        break
      case 'monthly':
        setSelectedPeriod(3)
        break
      case 'trends':
        setSelectedPeriod(30)
        break
    }
  }, [])

  // Cambiar período
  const changePeriod = useCallback((newPeriod) => {
    setSelectedPeriod(newPeriod)
  }, [])

  // Aplicar filtros
  const applyFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Refrescar datos
  const refreshData = useCallback(() => {
    predictionsQuery.refetch()
    accuracyQuery.refetch()
  }, [predictionsQuery, accuracyQuery])

  // Reentrenar modelos
  const retrain = useCallback((force = false) => {
    retrainMutation.mutate({ force })
  }, [retrainMutation])

  // Procesar predicciones con filtros
  const processedPredictions = useCallback(() => {
    let predictions = predictionsQuery.predictions

    // Aplicar filtros si existen
    if (Object.keys(filters).length > 0) {
      predictions = predictions.filter(prediction => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true
          
          switch (key) {
            case 'minConfidence':
              return (prediction.confidence_level || prediction.accuracy_score || 0) >= value
            case 'model':
              return prediction.model_name === value
            case 'dateRange':
              // Implementar filtro de rango de fechas
              return true
            default:
              return true
          }
        })
      })
    }

    return predictions
  }, [predictionsQuery.predictions, filters])

  // Estadísticas de las predicciones
  const statistics = useCallback(() => {
    const predictions = processedPredictions()
    
    if (!predictions.length) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        trend: 'stable'
      }
    }

    const values = predictions.map(p => p.predicted_value || p.predicted_sales || 0)
    const total = values.reduce((sum, val) => sum + val, 0)
    const average = total / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    
    // Calcular tendencia simple
    let trend = 'stable'
    if (values.length >= 2) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2))
      const secondHalf = values.slice(Math.floor(values.length / 2))
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
      
      const change = ((secondAvg - firstAvg) / firstAvg) * 100
      
      if (change > 5) trend = 'up'
      else if (change < -5) trend = 'down'
    }

    return {
      total: Math.round(total),
      average: Math.round(average),
      min: Math.round(min),
      max: Math.round(max),
      trend,
      count: predictions.length
    }
  }, [processedPredictions])

  return {
    // Estado
    selectedType,
    selectedPeriod,
    filters,
    
    // Datos
    predictions: processedPredictions(),
    accuracy: accuracyQuery.data?.data,
    statistics: statistics(),
    
    // Estados de carga
    isLoading: predictionsQuery.isLoading || accuracyQuery.isLoading,
    isFetching: predictionsQuery.isFetching || accuracyQuery.isFetching,
    isRetraining: retrainMutation.isLoading,
    
    // Errores
    error: predictionsQuery.error || accuracyQuery.error,
    
    // Acciones
    changeType,
    changePeriod,
    applyFilters,
    clearFilters,
    refreshData,
    retrain,
    
    // Utilidades
    hasData: processedPredictions().length > 0
  }
}

// Hook para comparar predicciones vs realidad
export const usePredictionComparison = (period = 30) => {
  const [comparison, setComparison] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateComparison = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Obtener predicciones históricas y datos de precisión
      const [trendsData, accuracyData] = await Promise.all([
        predictionsAPI.getTrends({ days: period }),
        predictionsAPI.getAccuracy({ days_back: period })
      ])

      const trends = trendsData.data
      const accuracy = accuracyData.data

      // Procesar datos para comparación
      const comparisonData = {
        historical: trends.historical || [],
        predictions: trends.predictions || [],
        accuracy: accuracy.average_accuracy || 0,
        details: accuracy.detailed_accuracy || [],
        summary: {
          totalPredictions: accuracy.total_predictions_evaluated || 0,
          avgAccuracy: accuracy.average_accuracy || 0,
          bestDay: null,
          worstDay: null
        }
      }

      // Encontrar mejor y peor día
      if (accuracy.detailed_accuracy?.length > 0) {
        const sorted = [...accuracy.detailed_accuracy].sort((a, b) => b.accuracy - a.accuracy)
        comparisonData.summary.bestDay = sorted[0]
        comparisonData.summary.worstDay = sorted[sorted.length - 1]
      }

      setComparison(comparisonData)
    } catch (error) {
      console.error('Error generando comparación:', error)
      toast.error('Error generando comparación de predicciones')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    generateComparison()
  }, [generateComparison])

  return {
    comparison,
    isLoading,
    refresh: generateComparison
  }
}

// Hook para notificaciones de predicciones
export const usePredictionAlerts = () => {
  const [alerts, setAlerts] = useState([])
  
  const checkAlerts = useCallback(async () => {
    try {
      // Obtener predicciones de hoy
      const todayData = await predictionsAPI.getToday()
      const today = todayData.data
      
      const newAlerts = []

      // Alert si las predicciones son muy bajas
      if (today.daily_prediction && today.daily_prediction.predicted_value < 5) {
        newAlerts.push({
          id: 'low-prediction',
          type: 'warning',
          title: 'Predicción baja para hoy',
          message: `Se predicen solo ${today.daily_prediction.predicted_value} ventas para hoy`,
          timestamp: new Date().toISOString()
        })
      }

      // Alert si las predicciones son muy altas
      if (today.daily_prediction && today.daily_prediction.predicted_value > 50) {
        newAlerts.push({
          id: 'high-prediction',
          type: 'info',
          title: 'Alta demanda predicha',
          message: `Se predicen ${today.daily_prediction.predicted_value} ventas para hoy`,
          timestamp: new Date().toISOString()
        })
      }

      // Alert para productos con alta predicción
      if (today.top_product_predictions?.length > 0) {
        const topProduct = today.top_product_predictions[0]
        if (topProduct.prediction.predicted_value > 10) {
          newAlerts.push({
            id: 'product-demand',
            type: 'info',
            title: 'Alta demanda de producto',
            message: `${topProduct.product.name} tiene alta demanda predicha (${topProduct.prediction.predicted_value} unidades)`,
            timestamp: new Date().toISOString()
          })
        }
      }

      setAlerts(newAlerts)
    } catch (error) {
      console.error('Error verificando alertas:', error)
    }
  }, [])

  useEffect(() => {
    checkAlerts()
    
    // Verificar alertas cada 30 minutos
    const interval = setInterval(checkAlerts, 30 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [checkAlerts])

  const dismissAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  return {
    alerts,
    dismissAlert,
    refreshAlerts: checkAlerts
  }
}

export default usePredictions