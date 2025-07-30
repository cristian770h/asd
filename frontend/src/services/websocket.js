// frontend/src/services/websocket.js - Servicio WebSocket
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.listeners = new Map()
    this.heartbeatInterval = null
    this.lastPong = Date.now()
    
    // Configuración
    this.config = {
      url: import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000',
      options: {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        autoConnect: false
      }
    }
  }

  // Inicializar conexión
  connect(userId = null) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket ya está conectado')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        // Crear socket con configuración
        const options = {
          ...this.config.options,
          query: {
            ...(userId && { userId }),
            timestamp: Date.now()
          }
        }

        this.socket = io(this.config.url, options)
        
        // Event listeners principales
        this._setupEventListeners(resolve, reject)
        
        // Conectar
        this.socket.connect()
        
        console.log('🔄 Iniciando conexión WebSocket...')
        
      } catch (error) {
        console.error('❌ Error iniciando WebSocket:', error)
        reject(error)
      }
    })
  }

  // Configurar event listeners
  _setupEventListeners(resolve, reject) {
    const socket = this.socket

    // Conexión exitosa
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0
      this._startHeartbeat()
      
      toast.success('Conectado al servidor', {
        duration: 2000,
        icon: '🔗'
      })
      
      resolve()
    })

    // Error de conexión
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error)
      this.isConnected = false
      
      if (this.reconnectAttempts === 0) {
        toast.error('Error conectando al servidor')
        reject(error)
      }
      
      this._handleReconnection()
    })

    // Desconexión
    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason)
      this.isConnected = false
      this._stopHeartbeat()
      
      if (reason === 'io server disconnect') {
        // El servidor desconectó, intentar reconectar
        this._handleReconnection()
      }
      
      toast.error('Conexión perdida', {
        duration: 3000,
        icon: '⚠️'
      })
    })

    // Eventos del sistema
    this._setupSystemEvents()
    
    // Eventos de negocio
    this._setupBusinessEvents()

    // Heartbeat
    socket.on('pong', () => {
      this.lastPong = Date.now()
    })
  }

  // Configurar eventos del sistema
  _setupSystemEvents() {
    const socket = this.socket

    socket.on('status', (data) => {
      console.log('📊 Estado del sistema:', data)
      this._emitToListeners('system_status', data)
    })

    socket.on('error', (error) => {
      console.error('⚠️ Error del servidor:', error)
      this._emitToListeners('system_error', error)
      
      toast.error(`Error del servidor: ${error.message}`, {
        duration: 5000
      })
    })

    socket.on('maintenance', (data) => {
      console.log('🔧 Modo mantenimiento:', data)
      this._emitToListeners('maintenance', data)
      
      toast.warning('Sistema en mantenimiento', {
        duration: 0, // No auto-dismiss
        icon: '🔧'
      })
    })
  }

  // Configurar eventos de negocio
  _setupBusinessEvents() {
    const socket = this.socket

    // Alertas de stock
    socket.on('stock_alert', (data) => {
      console.log('📦 Alerta de stock:', data)
      this._emitToListeners('stock_alert', data)
      
      toast.error(
        `Stock bajo: ${data.product_name} (${data.current_stock}/${data.min_stock})`,
        {
          duration: 6000,
          icon: '⚠️',
          action: {
            label: 'Ver',
            onClick: () => this._emitToListeners('navigate_to_inventory', data)
          }
        }
      )
    })

    // Actualizaciones de predicciones
    socket.on('prediction_update', (data) => {
      console.log('🤖 Actualización de predicción:', data)
      this._emitToListeners('prediction_update', data)
      
      toast.success(`Predicción actualizada: ${data.type}`, {
        duration: 4000,
        icon: '📈'
      })
    })

    // Nuevos pedidos
    socket.on('new_order', (data) => {
      console.log('🛒 Nuevo pedido:', data)
      this._emitToListeners('new_order', data)
      
      toast.success(`Nuevo pedido: #${data.order_id}`, {
        duration: 4000,
        icon: '🛒',
        action: {
          label: 'Ver',
          onClick: () => this._emitToListeners('navigate_to_order', data)
        }
      })
    })

    // Actualización de inventario
    socket.on('inventory_update', (data) => {
      console.log('📦 Actualización de inventario:', data)
      this._emitToListeners('inventory_update', data)
    })

    // Entregas
    socket.on('delivery_update', (data) => {
      console.log('🚚 Actualización de entrega:', data)
      this._emitToListeners('delivery_update', data)
      
      if (data.status === 'delivered') {
        toast.success(`Pedido entregado: #${data.order_id}`, {
          duration: 4000,
          icon: '✅'
        })
      } else if (data.status === 'delayed') {
        toast.warning(`Entrega retrasada: #${data.order_id}`, {
          duration: 5000,
          icon: '⏰'
        })
      }
    })

    // Análisis de clustering
    socket.on('clustering_update', (data) => {
      console.log('🗺️ Actualización de clustering:', data)
      this._emitToListeners('clustering_update', data)
      
      if (data.new_zones_detected) {
        toast.info(`Nuevas zonas detectadas: ${data.new_zones_count}`, {
          duration: 4000,
          icon: '🗺️'
        })
      }
    })

    // Mensajes de WhatsApp parseados
    socket.on('whatsapp_parsed', (data) => {
      console.log('💬 Mensaje WhatsApp parseado:', data)
      this._emitToListeners('whatsapp_parsed', data)
      
      if (data.success) {
        toast.success('Mensaje procesado correctamente', {
          duration: 3000,
          icon: '💬'
        })
      } else {
        toast.error('Error procesando mensaje', {
          duration: 4000,
          icon: '❌'
        })
      }
    })
  }

  // Gestión de reconexión
  _handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo de intentos de reconexión alcanzado')
      toast.error('No se puede reconectar al servidor', {
        duration: 0,
        icon: '❌'
      })
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.socket && !this.isConnected) {
        this.socket.connect()
      }
    }, delay)
  }

  // Heartbeat para detectar conexiones muertas
  _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping')
        
        // Verificar si recibimos pong reciente
        if (Date.now() - this.lastPong > 30000) { // 30 segundos
          console.warn('⚠️ No se recibió pong, posible conexión muerta')
          this.socket.disconnect().connect()
        }
      }
    }, 15000) // Cada 15 segundos
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Métodos públicos para eventos
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
    
    return () => this.off(event, callback) // Retornar función de limpieza
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      console.warn('⚠️ No se puede emitir evento, WebSocket no conectado:', event)
    }
  }

  _emitToListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error en listener de ${event}:`, error)
        }
      })
    }
  }

  // Métodos específicos del negocio
  subscribeToProductUpdates(productId) {
    this.emit('subscribe_product', { product_id: productId })
  }

  unsubscribeFromProductUpdates(productId) {
    this.emit('unsubscribe_product', { product_id: productId })
  }

  subscribeToZoneUpdates(zoneId) {
    this.emit('subscribe_zone', { zone_id: zoneId })
  }

  unsubscribeFromZoneUpdates(zoneId) {
    this.emit('unsubscribe_zone', { zone_id: zoneId })
  }

  requestSystemStatus() {
    this.emit('get_status')
  }

  reportUserActivity(activity) {
    this.emit('user_activity', {
      activity,
      timestamp: Date.now(),
      user_agent: navigator.userAgent
    })
  }

  // Desconexión
  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando WebSocket...')
      this._stopHeartbeat()
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.listeners.clear()
    }
  }

  // Estado de la conexión
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
      lastPong: this.lastPong
    }
  }

  // Estadísticas
  getStats() {
    return {
      ...this.getConnectionStatus(),
      listenersCount: Array.from(this.listeners.values())
        .reduce((sum, set) => sum + set.size, 0),
      eventTypes: Array.from(this.listeners.keys())
    }
  }
}

// Instancia singleton
const webSocketService = new WebSocketService()

// Auto-conectar cuando la ventana esté visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !webSocketService.isConnected) {
    webSocketService.connect().catch(console.error)
  }
})

// Limpiar al cerrar ventana
window.addEventListener('beforeunload', () => {
  webSocketService.disconnect()
})

export default webSocketService