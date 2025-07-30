// frontend/src/index.js - Archivo principal de la aplicación
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from 'react-error-boundary'

import App from './App'
import ErrorFallback from './components/UI/ErrorFallback'
import LoadingSpinner from './components/UI/LoadingSpinner'
import { initializeApp } from './utils/appInitializer'
import webSocketService from './services/websocket'

import './index.css'

// Configuración del cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: (failureCount, error) => {
        // No reintentar en errores 4xx
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 1,
      retryDelay: 1000
    }
  }
})

// Configuración de toast
const toastOptions = {
  duration: 4000,
  position: 'top-right',
  style: {
    background: '#ffffff',
    color: '#1f2937',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    maxWidth: '400px'
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: '#ffffff'
    }
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: '#ffffff'
    },
    duration: 6000
  },
  loading: {
    iconTheme: {
      primary: '#3b82f6',
      secondary: '#ffffff'
    }
  }
}

// Componente principal con providers
const AppWithProviders = () => {
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [initError, setInitError] = React.useState(null)

  React.useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        console.log('🚀 Inicializando CocoPet ML System...')

        // Inicializar la aplicación
        const result = await initializeApp()
        
        if (!mounted) return

        if (result.success) {
          console.log('✅ Aplicación inicializada correctamente')

          // Conectar WebSocket
          try {
            await webSocketService.connect()
            console.log('✅ WebSocket conectado')
          } catch (wsError) {
            console.warn('⚠️ WebSocket no disponible, continuando sin tiempo real:', wsError)
          }

          setIsInitialized(true)
        } else {
          throw result.error
        }
      } catch (error) {
        console.error('❌ Error inicializando aplicación:', error)
        if (mounted) {
          setInitError(error)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [])

  // Cleanup al desmontar
  React.useEffect(() => {
    return () => {
      webSocketService.disconnect()
    }
  }, [])

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Error de Inicialización</h1>
            <p className="text-gray-600 mb-4">
              No se pudo inicializar la aplicación correctamente.
            </p>
            <p className="text-sm text-red-600 mb-4">
              {initError.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Recargar Página
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Iniciando CocoPet ML System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Preparando la aplicación...
          </p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('🔥 Error no capturado:', error, errorInfo)
        
        // Reportar error al servidor (opcional)
        if (webSocketService.isConnected) {
          webSocketService.emit('client_error', {
            error: error.message,
            stack: error.stack,
            errorInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }
      }}
      onReset={() => {
        // Limpiar estado global si es necesario
        queryClient.clear()
        window.location.reload()
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster toastOptions={toastOptions} />
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

// Función principal de renderizado
const renderApp = () => {
  const container = document.getElementById('root')
  
  if (!container) {
    throw new Error('No se encontró el elemento root')
  }

  const root = createRoot(container)
  
  root.render(
    <React.StrictMode>
      <AppWithProviders />
    </React.StrictMode>
  )
}

// Verificar si el DOM está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp)
} else {
  renderApp()
}

// Manejo de errores globales
window.addEventListener('error', (event) => {
  console.error('🔥 Error global de JavaScript:', event.error)
  
  // Reportar errores críticos
  if (webSocketService.isConnected) {
    webSocketService.emit('client_error', {
      type: 'javascript_error',
      message: event.error?.message || 'Error desconocido',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    })
  }
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Promise rechazada no manejada:', event.reason)
  
  if (webSocketService.isConnected) {
    webSocketService.emit('client_error', {
      type: 'unhandled_promise_rejection',
      reason: event.reason?.message || event.reason,
      timestamp: new Date().toISOString()
    })
  }
})

// Registrar Service Worker (si está disponible)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope)
      })
      .catch((error) => {
        console.log('❌ Error registrando Service Worker:', error)
      })
  })
}

// Manejo de conectividad
window.addEventListener('online', () => {
  console.log('🌐 Conexión restaurada')
  
  // Reconectar WebSocket si es necesario
  if (!webSocketService.isConnected) {
    webSocketService.connect().catch(console.error)
  }
  
  // Revalidar queries
  queryClient.refetchQueries()
})

window.addEventListener('offline', () => {
  console.log('🔌 Sin conexión a internet')
})

// Información de desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log(`
🐾 CocoPet ML System - Modo Desarrollo
📊 React Query DevTools: Disponible
🔗 WebSocket: ${webSocketService.isConnected ? 'Conectado' : 'Desconectado'}
🌐 API URL: ${import.meta.env.VITE_API_URL || 'http://localhost:5000'}
  `)
  
  // Exponer utilidades de desarrollo
  window.__COCOPET_DEBUG__ = {
    queryClient,
    webSocketService,
    clearCache: () => {
      queryClient.clear()
      console.log('🧹 Cache limpiado')
    },
    getStats: () => ({
      queries: queryClient.getQueryCache().getAll().length,
      websocket: webSocketService.getStats()
    })
  }
}

export { queryClient, webSocketService }