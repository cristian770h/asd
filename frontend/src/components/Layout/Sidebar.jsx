// frontend/src/components/Layout/Sidebar.jsx - Componente Sidebar
import { motion } from 'framer-motion'
import { useLocation, Link } from 'react-router-dom'
import { 
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Archive,
  BarChart3,
  X,
  Zap,
  MapPin,
  Brain
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation()

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      description: 'Vista general del sistema'
    },
    {
      title: 'Productos',
      icon: Package,
      path: '/products',
      description: 'Gestión de inventario'
    },
    {
      title: 'Pedidos',
      icon: ShoppingCart,
      path: '/orders',
      description: 'Gestión de órdenes'
    },
    {
      title: 'Predicciones',
      icon: Brain,
      path: '/predictions',
      description: 'ML y predicciones'
    },
    {
      title: 'Inventario',
      icon: Archive,
      path: '/inventory',
      description: 'Control de stock'
    },
    {
      title: 'Análisis',
      icon: BarChart3,
      path: '/analytics',
      description: 'Reportes y métricas'
    }
  ]

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    }
  }

  const menuItemVariants = {
    open: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    },
    closed: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <>
      <motion.aside
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className="fixed left-0 top-0 z-30 h-full w-64 bg-white border-r border-gray-200 lg:relative lg:translate-x-0 lg:z-auto"
      >
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">CocoPet</h2>
                <p className="text-xs text-gray-500">ML System</p>
              </div>
            </motion.div>
            
            {/* Botón cerrar móvil */}
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Navegación principal */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <motion.div
                  key={item.path}
                  variants={menuItemVariants}
                  initial="closed"
                  animate="open"
                  transition