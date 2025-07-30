// frontend/src/hooks/usePredictions.js - Hook de Predicciones
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { predictionsAPI } from '@/services/api'
import { useSocketConnection } from './useSocketConnection'

export const usePredictions = (type = 'daily', options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutos
    enablePolling = false,
    onDataUpdate,
    onError,
    productId = null,
    days = 7
  } = options

  const queryClient = useQueryClient()
  const { isConnected } = useSocketConnection()

  // Query principal para obtener predicciones
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['predictions', type, productId, days],
    () => {
      switch (type) {
        case 'daily':
          return predictionsAPI.getDaily({ days_ahead: days })
        case 'weekly':
          return predictionsAPI.getWeekly({ weeks_ahead: Math.ceil(days / 7) })
        case 'monthly':
          return predictionsAPI.getMonthly({ months_ahead: Math.ceil(days / 30) })
        case 'today':
          return predictionsAPI.getToday()
        case 'trends':
          return predictionsAPI.getTrends({ days })
        case 'product':
          return productId ? predictionsAPI.getByProduct(productId, { days_ahead: days }) : null
        case 'accuracy':
          return predictionsAPI.getAccuracy({ days })
        default:
          return predictionsAPI.getDaily({ days_ahead: 7 })
      }
    },
    {
      staleTime: 240000, // 4 minutos
      cacheTime: 600000, // 10 minutos
      refetchInterval: enablePolling ? refreshInterval : false,
      refetchOnWindowFocus: autoRefresh,
      enabled: type !== 'product' || Boolean(productId),
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

  // Mutation para reentrenar modelo
  const retrainMutation = useMutation(
    (config) => predictionsAPI.retrain(config),
    {
      onSuccess: (data) => {
        toast.success('Modelo reentrenado exitosamente')
        queryClient.invalidateQueries(['predictions'])
      },
      onError: (error) => {
        toast.error('Error reentrenando modelo')
        console.error('Error reentrenando:', error)
      }
    }
  )

  // Función para obtener predicción específica
  const getPredictionByDate = useCallback((date) => {
    if (!predictions.length) return null
    
    return predictions.find(pred => {
      const predDate = new Date(pred.date).toDateString()
      const targetDate = new Date(date).toDateString()
      return predDate === targetDate
    })
  }, [predictions])

  // Función para obtener tendencia
  const getTrend = useCallback(() => {
    if (predictions.length < 2) return 'stable'
    
    const recent = predictions.slice(-3)
    const avgRecent = recent.reduce((sum, p) => sum + p.predicted_demand, 0) / recent.length
    const older = predictions.slice(0, -3)
    const avgOlder = older.reduce((sum, p) => sum + p.predicted_demand, 0) / older.length
    
    const change = ((avgRecent - avgOlder) / avgOlder) * 100
    
    if (Math.abs(change) < 5) return 'stable'
    return change > 0 ? 'increasing' : 'decreasing'
  }, [predictions])

  // Función para obtener estadísticas de precisión
  const getAccuracyStats = useCallback(() => {
    const accuratePredictions = predictions.filter(p => p.accuracy && p.accuracy > 0.8)
    return {
      total: predictions.length,
      accurate: accuratePredictions.length,
      accuracy_rate: predictions.length > 0 ? (accuratePredictions.length / predictions.length) * 100 : 0
    }
  }, [predictions])

  // Función para reentrenar modelo
  const retrain = useCallback((config = {}) => {
    return retrainMutation.mutate({
      include_recent_data: true,
      optimize_hyperparameters: true,
      ...config
    })
  }, [retrainMutation])

  // Efecto para escuchar actualizaciones por WebSocket
  useEffect(() => {
    if (isConnected && autoRefresh) {
      // Invalidar queries cuando hay actualizaciones
      const handlePredictionUpdate = () => {
        queryClient.invalidateQueries(['predictions'])
      }

      // Simular listener de WebSocket (implementar según tu configuración)
      window.addEventListener('prediction_update', handlePredictionUpdate)
      
      return () => {
        window.removeEventListener('prediction_update', handlePredictionUpdate)
      }
    }
  }, [isConnected, autoRefresh, queryClient])

  return {
    predictions,
    isLoading,
    isFetching,
    error,
    refetch,
    retrain,
    isRetraining: retrainMutation.isLoading,
    hasData: predictions.length > 0,
    
    // Funciones de utilidad
    getPredictionByDate,
    getTrend,
    getAccuracyStats,
    
    // Estadísticas rápidas
    stats: {
      total_predictions: predictions.length,
      trend: getTrend(),
      accuracy: getAccuracyStats(),
      last_updated: data?.metadata?.last_updated,
      model_version: data?.metadata?.model_version
    }
  }
}

// Hook específico para predicciones de productos
export const useProductPredictions = (productId, options = {}) => {
  return usePredictions('product', { 
    ...options, 
    productId 
  })
}

// Hook para predicciones de hoy
export const useTodayPredictions = (options = {}) => {
  return usePredictions('today', options)
}

// Hook para tendencias
export const usePredictionTrends = (days = 30, options = {}) => {
  return usePredictions('trends', { 
    ...options, 
    days 
  })
}

// Hook para precisión del modelo
export const usePredictionAccuracy = (days = 30, options = {}) => {
  return usePredictions('accuracy', { 
    ...options, 
    days 
  })
}