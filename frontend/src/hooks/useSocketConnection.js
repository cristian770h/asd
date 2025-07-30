// frontend/src/hooks/useSocketConnection.js - Hook de WebSocket
import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const useSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    // Inicializar conexión WebSocket
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    const socket = socketRef.current

    // Event listeners
    socket.on('connect', () => {
      console.log('✅ Conectado al servidor WebSocket')
      setIsConnected(true)
      toast.success('Conectado al servidor')
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor:', reason)
      setIsConnected(false)
      
      if (reason === 'io server disconnect') {
        // Reconectar si el servidor desconectó
        socket.connect()
      }
    })

    socket.on('connect_error', (error) => {
      console.error('Error de conexión WebSocket:', error)
      setIsConnected(false)
      toast.error('Error de conexión al servidor')
    })

    // Eventos personalizados del sistema
    socket.on('status', (data) => {
      console.log('Estado del servidor:', data)
      setLastMessage(data)
    })

    socket.on('stock_alert', (data) => {
      console.log('Alerta de stock:', data)
      toast.error(
        `Stock bajo: ${data.product} (${data.current_stock}/${data.min_stock})`,
        {
          duration: 6000,
          icon: '⚠️'
        }
      )
      setLastMessage({ type: 'stock_alert', ...data })
    })

    socket.on('prediction_update', (data) => {
      console.log('Actualización de predicción:', data)
      toast.success(`Predicción actualizada: ${data.type}`, {
        duration: 4000,
        icon: '🤖'
      })
      setLastMessage({ type: 'prediction_update', ...data })
    })

    socket.on('new_order', (data) => {
      console.log('Nuevo pedido:', data)
      toast.success(`Nuevo pedido: ${data.order_id}`, {
        duration: 4000,
        icon: '🛒'
      })
      setLastMessage({ type: 'new_order', ...data })
    })

    socket.on('system_error', (data) => {
      console.error('Error del sistema:', data)
      toast.error(`Error del sistema: ${data.message}`, {
        duration: 8000,
        icon: '🚨'
      })
      setLastMessage({ type: 'system_error', ...data })
    })

    // Cleanup al desmontar
    return () => {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connect_error')
        socket.off('status')
        socket.off('stock_alert')
        socket.off('prediction_update')
        socket.off('new_order')
        socket.off('system_error')
        socket.disconnect()
      }
    }
  }, [])

  // Función para enviar mensajes
  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('Socket no conectado, no se puede enviar:', event)
    }
  }

  // Función para suscribirse a eventos
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }

  // Función para desuscribirse de eventos
  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }

  return {
    isConnected,
    lastMessage,
    emit,
    on,
    off,
    socket: socketRef.current
  }
}