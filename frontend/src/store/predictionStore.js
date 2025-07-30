// frontend/src/stores/predictionStore.js - Store de Predicciones
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'
import { predictionsAPI } from '@/services/api'
import webSocketService from '@/services/websocket'
import { formatDate } from '@/utils/dateUtils'

const usePredictionStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Estado inicial
        predictions: {
          daily: [],
          weekly: [],
          monthly: [],
          today: null
        },
        
        productPredictions: new Map(),
        
        accuracy: {
          overall: 0,
          last_30_days: 0,
          by_product: new Map()
        },
        
        trends: {
          overall: 'stable',
          confidence: 0,
          slope: 0,
          seasonal_patterns: []
        },
        
        models: {
          current_version: null,
          last_trained: null,
          performance_metrics: {},
          training_status: 'idle' // idle, training, completed, failed
        },
        
        cache: {
          last_updated: null,
          expires_at: null
        },
        
        ui: {
          loading: false,
          error: null,
          selectedTimeRange: '7d',
          selectedProducts: [],
          viewMode: 'chart' // chart, table, summary
        },

        // Actions para predicciones diarias
        fetchDailyPredictions: async (options = {}) => {
          const { daysAhead = 7, forceRefresh = false } = options
          
          // Verificar cache si no es refresh forzado
          if (!forceRefresh && get().cache.expires_at && new Date() < new Date(get().cache.expires_at)) {
            return get().predictions.daily
          }

          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await predictionsAPI.getDaily({ days_ahead: daysAhead })
            
            if (response.success) {
              const processedPredictions = response.data.predictions.map(pred => ({
                ...pred,
                date: new Date(pred.date),
                formatted_date: formatDate(pred.date),
                is_weekend: new Date(pred.date).getDay() % 6 === 0,
                confidence_level: get()._getConfidenceLevel(pred.confidence)
              }))

              set(state => ({
                predictions: {
                  ...state.predictions,
                  daily: processedPredictions
                },
                cache: {
                  last_updated: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutos
                },
                ui: { ...state.ui, loading: false }
              }))

              return processedPredictions
            }
          } catch (error) {
            console.error('Error fetching daily predictions:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        // Actions para predicciones semanales
        fetchWeeklyPredictions: async (weeksAhead = 4) => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await predictionsAPI.getWeekly({ weeks_ahead: weeksAhead })
            
            if (response.success) {
              const processedPredictions = response.data.weeks.map(week => ({
                ...week,
                start_date: new Date(week.start_date),
                end_date: new Date(week.end_date),
                week_number: get()._getWeekNumber(new Date(week.start_date)),
                formatted_range: `${formatDate(week.start_date)} - ${formatDate(week.end_date)}`
              }))

              set(state => ({
                predictions: {
                  ...state.predictions,
                  weekly: processedPredictions
                },
                ui: { ...state.ui, loading: false }
              }))

              return processedPredictions
            }
          } catch (error) {
            console.error('Error fetching weekly predictions:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        // Actions para predicciones mensuales
        fetchMonthlyPredictions: async (monthsAhead = 3) => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await predictionsAPI.getMonthly({ months_ahead: monthsAhead })
            
            if (response.success) {
              const processedPredictions = response.data.months.map(month => ({
                ...month,
                date: new Date(month.year, month.month - 1, 1),
                month_name: new Date(month.year, month.month - 1, 1).toLocaleDateString('es-ES', { month: 'long' }),
                year: month.year,
                is_current_month: get()._isCurrentMonth(month.year, month.month)
              }))

              set(state => ({
                predictions: {
                  ...state.predictions,
                  monthly: processedPredictions
                },
                ui: { ...state.ui, loading: false }
              }))

              return processedPredictions
            }
          } catch (error) {
            console.error('Error fetching monthly predictions:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        // Actions para predicciones de productos específicos
        fetchProductPredictions: async (productId, options = {}) => {
          const { daysAhead = 30 } = options

          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await predictionsAPI.getByProduct(productId, { days_ahead: daysAhead })
            
            if (response.success) {
              const processedPredictions = response.data.predictions.map(pred => ({
                ...pred,
                date: new Date(pred.date),
                formatted_date: formatDate(pred.date),
                stock_recommendation: get()._calculateStockRecommendation(pred),
                reorder_alert: pred.predicted_demand > (response.data.product_info?.current_stock || 0)
              }))

              set(state => ({
                productPredictions: new Map(state.productPredictions.set(productId, {
                  predictions: processedPredictions,
                  product_info: response.data.product_info,
                  recommendations: response.data.recommendations || [],
                  last_updated: new Date().toISOString()
                })),
                ui: { ...state.ui, loading: false }
              }))

              return processedPredictions
            }
          } catch (error) {
            console.error('Error fetching product predictions:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        // Actions para predicciones de hoy
        fetchTodayPredictions: async () => {
          set(state => ({ ui: { ...state.ui, loading: true, error: null } }))

          try {
            const response = await predictionsAPI.getToday()
            
            if (response.success) {
              const todayData = {
                ...response.data,
                date: new Date(),
                formatted_date: formatDate(new Date()),
                is_business_day: get()._isBusinessDay(new Date()),
                hour_predictions: response.data.hour_predictions?.map(pred => ({
                  ...pred,
                  datetime: new Date(new Date().setHours(pred.hour, 0, 0, 0)),
                  is_peak_hour: get()._isPeakHour(pred.hour),
                  formatted_time: `${pred.hour.toString().padStart(2, '0')}:00`
                })) || []
              }

              set(state => ({
                predictions: {
                  ...state.predictions,
                  today: todayData
                },
                ui: { ...state.ui, loading: false }
              }))

              return todayData
            }
          } catch (error) {
            console.error('Error fetching today predictions:', error)
            set(state => ({
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        // Actions para precisión del modelo
        fetchAccuracy: async (options = {}) => {
          const { daysBack = 30, productId = null } = options

          try {
            const response = await predictionsAPI.getAccuracy({ 
              days_back: daysBack,
              ...(productId && { product_id: productId })
            })
            
            if (response.success) {
              if (productId) {
                set(state => ({
                  accuracy: {
                    ...state.accuracy,
                    by_product: new Map(state.accuracy.by_product.set(productId, response.data))
                  }
                }))
              } else {
                set(state => ({
                  accuracy: {
                    ...state.accuracy,
                    overall: response.data.accuracy_score,
                    last_30_days: response.data.last_30_days_accuracy,
                    metrics: response.data.metrics || {}
                  }
                }))
              }

              return response.data
            }
          } catch (error) {
            console.error('Error fetching accuracy:', error)
            throw error
          }
        },

        // Actions para tendencias
        fetchTrends: async (options = {}) => {
          const { days = 30 } = options

          try {
            const response = await predictionsAPI.getTrends({ days })
            
            if (response.success) {
              const trendData = {
                overall: get()._determineTrend(response.data.slope),
                confidence: response.data.r_squared || 0,
                slope: response.data.slope || 0,
                seasonal_patterns: response.data.seasonal_patterns || [],
                change_percent: response.data.change_percent || 0
              }

              set(state => ({
                trends: { ...state.trends, ...trendData }
              }))

              return trendData
            }
          } catch (error) {
            console.error('Error fetching trends:', error)
            throw error
          }
        },

        // Actions para reentrenamiento
        retrainModel: async (options = {}) => {
          const { 
            includeRecentData = true, 
            optimizeHyperparameters = false,
            modelType = 'auto'
          } = options

          set(state => ({
            models: { ...state.models, training_status: 'training' },
            ui: { ...state.ui, loading: true, error: null }
          }))

          try {
            const response = await predictionsAPI.retrain({
              include_recent_data: includeRecentData,
              optimize_hyperparameters: optimizeHyperparameters,
              model_type: modelType
            })
            
            if (response.success) {
              set(state => ({
                models: {
                  ...state.models,
                  training_status: 'completed',
                  current_version: response.data.model_version,
                  last_trained: new Date().toISOString(),
                  performance_metrics: response.data.metrics
                },
                cache: {
                  last_updated: null,
                  expires_at: null
                },
                ui: { ...state.ui, loading: false }
              }))

              // Limpiar cache para forzar actualización
              get().invalidateCache()

              return response.data
            }
          } catch (error) {
            console.error('Error retraining model:', error)
            set(state => ({
              models: { ...state.models, training_status: 'failed' },
              ui: { ...state.ui, loading: false, error: error.message }
            }))
            throw error
          }
        },

        // Actions de UI
        setTimeRange: (range) => {
          set(state => ({
            ui: { ...state.ui, selectedTimeRange: range }
          }))
        },

        setSelectedProducts: (products) => {
          set(state => ({
            ui: { ...state.ui, selectedProducts: products }
          }))
        },

        setViewMode: (mode) => {
          set(state => ({
            ui: { ...state.ui, viewMode: mode }
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

        // Getters computados
        getDailyPrediction: (date) => {
          const daily = get().predictions.daily
          return daily.find(pred => 
            pred.formatted_date === formatDate(date)
          )
        },

        getProductPrediction: (productId) => {
          return get().productPredictions.get(productId)
        },

        getTrendSummary: () => {
          const trends = get().trends
          return {
            direction: trends.overall,
            strength: trends.confidence > 0.7 ? 'strong' : trends.confidence > 0.4 ? 'moderate' : 'weak',
            change_percent: trends.change_percent
          }
        },

        getAccuracyGrade: (score = null) => {
          const accuracy = score || get().accuracy.overall
          if (accuracy >= 0.9) return 'A'
          if (accuracy >= 0.8) return 'B'
          if (accuracy >= 0.7) return 'C'
          if (accuracy >= 0.6) return 'D'
          return 'F'
        },

        // Métodos privados de utilidad
        _getConfidenceLevel: (confidence) => {
          if (confidence >= 0.8) return 'high'
          if (confidence >= 0.6) return 'medium'
          return 'low'
        },

        _getWeekNumber: (date) => {
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
          const dayNum = d.getUTCDay() || 7
          d.setUTCDate(d.getUTCDate() + 4 - dayNum)
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
          return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
        },

        _isCurrentMonth: (year, month) => {
          const now = new Date()
          return now.getFullYear() === year && now.getMonth() + 1 === month
        },

        _isBusinessDay: (date) => {
          const day = date.getDay()
          return day > 0 && day < 6
        },

        _isPeakHour: (hour) => {
          return (hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 18)
        },

        _calculateStockRecommendation: (prediction) => {
          const predicted = prediction.predicted_demand || 0
          const confidence = prediction.confidence || 0.8
          const safetyBuffer = 1 + (1 - confidence) * 0.5
          return Math.ceil(predicted * safetyBuffer)
        },

        _determineTrend: (slope) => {
          if (Math.abs(slope) < 0.1) return 'stable'
          return slope > 0 ? 'increasing' : 'decreasing'
        }
      }),
      {
        name: 'prediction-store',
        partialize: (state) => ({
          // Solo persistir datos esenciales, no UI state
          predictions: state.predictions,
          accuracy: state.accuracy,
          trends: state.trends,
          models: state.models,
          cache: state.cache
        })
      }
    )
  )
)

// Suscribirse a actualizaciones de WebSocket
webSocketService.on('prediction_update', (data) => {
  console.log('📈 Actualización de predicción recibida:', data)
  
  const store = usePredictionStore.getState()
  
  // Invalidar cache para forzar actualización
  store.invalidateCache()
  
  // Si es una actualización de hoy, refrescar automáticamente
  if (data.type === 'today') {
    store.fetchTodayPredictions()
  }
})

webSocketService.on('model_retrained', (data) => {
  console.log('🤖 Modelo reentrenado:', data)
  
  const store = usePredictionStore.getState()
  
  usePredictionStore.setState(state => ({
    models: {
      ...state.models,
      current_version: data.model_version,
      last_trained: data.trained_at,
      performance_metrics: data.metrics
    }
  }))
  
  // Invalidar cache
  store.invalidateCache()
})

export default usePredictionStore