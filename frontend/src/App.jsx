// frontend/src/App.jsx - Componente Principal
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Layouts
import Layout from '@/components/Layout/Layout'

// Páginas
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import Orders from '@/pages/Orders'
import Predictions from '@/pages/Predictions'
import Inventory from '@/pages/Inventory'
import Analytics from '@/pages/Analytics'

// Hooks
import { useSocketConnection } from '@/hooks/useSocketConnection'
import { useAuthStore } from '@/store/authStore'

// Utilidades
import { initializeApp } from '@/utils/appInitializer'

function App() {
  const location = useLocation()
  const { isConnected } = useSocketConnection()
  const { user, initializeAuth } = useAuthStore()

  useEffect(() => {
    // Inicializar aplicación
    initializeApp()
    initializeAuth()
  }, [initializeAuth])

  // Configuración de animaciones de página
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.98,
    },
    in: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    out: {
      opacity: 0,
      y: -20,
      scale: 1.02,
    },
  }

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Indicador de conexión */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ 
          opacity: isConnected ? 0 : 1, 
          y: isConnected ? -50 : 0 
        }}
        className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 text-sm"
      >
        Desconectado del servidor. Reintentando...
      </motion.div>

      <Layout>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="w-full"
          >
            <Routes location={location}>
              {/* Ruta por defecto */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Rutas principales */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/analytics" element={<Analytics />} />
              
              {/* Ruta 404 */}
              <Route 
                path="*" 
                element={
                  <div className="flex items-center justify-center min-h-96">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                      <p className="text-gray-600 mb-6">Página no encontrada</p>
                      <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        Volver
                      </button>
                    </motion.div>
                  </div>
                } 
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Layout>
    </div>
  )
}

export default App