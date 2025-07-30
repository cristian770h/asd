// frontend/src/components/Layout/Header.jsx - Componente Header
import { motion } from 'framer-motion'
import { 
  Menu, 
  Bell, 
  Settings, 
  User, 
  Search,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSocketConnection } from '@/hooks/useSocketConnection'
import { useNotifications } from '@/hooks/useNotifications'

const Header = ({ onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const { isConnected } = useSocketConnection()
  const { notifications, unreadCount, markAsRead } = useNotifications()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Implementar búsqueda global
      console.log('Buscar:', searchQuery)
    }
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Lado izquierdo */}
        <div className="flex items-center space-x-4">
          {/* Botón menú móvil */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>

          {/* Logo y título */}
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-800">CocoPet</h1>
                <p className="text-xs text-gray-500 -mt-1">ML Dashboard</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Centro - Búsqueda */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos, pedidos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </form>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-3">
          {/* Indicador de conexión */}
          <motion.div
            animate={{ 
              scale: isConnected ? 1 : [1, 1.1, 1],
              color: isConnected ? '#22c55e' : '#ef4444'
            }}
            transition={{ 
              duration: isConnected ? 0 : 1,
              repeat: isConnected ? 0 : Infinity
            }}
            className="hidden sm:flex items-center space-x-1"
          >
            {isConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="text-xs font-medium">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </motion.div>

          {/* Notificaciones */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.button>

            {/* Dropdown de notificaciones */}
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              >
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAsRead('all')}
                        className="text-xs text-primary-500 hover:text-primary-600"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          notification.read ? 'opacity-70' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.read ? 'bg-gray-300' : 'bg-primary-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.timestamp}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay notificaciones</p>
                    </div>
                  )}
                </div>
                
                {notifications.length > 5 && (
                  <div className="p-3 border-t border-gray-200 text-center">
                    <button className="text-sm text-primary-500 hover:text-primary-600">
                      Ver todas las notificaciones
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Configuraciones */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </motion.button>

          {/* Perfil de usuario */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              Admin
            </span>
          </motion.button>
        </div>
      </div>

      {/* Barra de búsqueda móvil */}
      <div className="md:hidden mt-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </form>
      </div>
    </motion.header>
  )
}

export default Header