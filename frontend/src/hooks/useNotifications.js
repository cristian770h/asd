// frontend/src/hooks/useNotifications.js - Hook de Notificaciones
import { useState, useEffect } from 'react'
import { useSocketConnection } from './useSocketConnection'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { lastMessage } = useSocketConnection()

  useEffect(() => {
    // Cargar notificaciones desde localStorage al iniciar
    const savedNotifications = localStorage.getItem('cocopet_notifications')
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications)
        setNotifications(parsed)
        setUnreadCount(parsed.filter(n => !n.read).length)
      } catch (error) {
        console.error('Error cargando notificaciones:', error)
      }
    }
  }, [])

  useEffect(() => {
    // Escuchar nuevos mensajes del WebSocket
    if (lastMessage) {
      const newNotification = createNotificationFromMessage(lastMessage)
      if (newNotification) {
        addNotification(newNotification)
      }
    }
  }, [lastMessage])

  const createNotificationFromMessage = (message) => {
    const now = new Date()
    const timestamp = now.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    switch (message.type) {
      case 'stock_alert':
        return {
          id: `stock_${Date.now()}`,
          type: 'warning',
          title: 'Alerta de Stock',
          message: `${message.product} tiene stock bajo (${message.current_stock}/${message.min_stock})`,
          timestamp,
          read: false,
          priority: message.current_stock <= message.min_stock * 0.5 ? 'high' : 'medium',
          data: message
        }

      case 'prediction_update':
        return {
          id: `prediction_${Date.now()}`,
          type: 'info',
          title: 'Predicción Actualizada',
          message: `Se actualizaron las predicciones de ${message.type}`,
          timestamp,
          read: false,
          priority: 'low',
          data: message
        }

      case 'new_order':
        return {
          id: `order_${Date.now()}`,
          type: 'success',
          title: 'Nuevo Pedido',
          message: `Pedido ${message.order_id} recibido`,
          timestamp,
          read: false,
          priority: 'medium',
          data: message
        }

      case 'system_error':
        return {
          id: `error_${Date.now()}`,
          type: 'error',
          title: 'Error del Sistema',
          message: message.message || 'Error desconocido',
          timestamp,
          read: false,
          priority: 'high',
          data: message
        }

      default:
        return null
    }
  }

  const addNotification = (notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, 50) // Máximo 50 notificaciones
      
      // Guardar en localStorage
      try {
        localStorage.setItem('cocopet_notifications', JSON.stringify(updated))
      } catch (error) {
        console.error('Error guardando notificaciones:', error)
      }
      
      return updated
    })
    
    setUnreadCount(prev => prev + 1)
  }

  const markAsRead = (notificationId) => {
    if (notificationId === 'all') {
      // Marcar todas como leídas
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }))
        
        try {
          localStorage.setItem('cocopet_notifications', JSON.stringify(updated))
        } catch (error) {
          console.error('Error guardando notificaciones:', error)
        }
        
        return updated
      })
      setUnreadCount(0)
    } else {
      // Marcar una específica como leída
      setNotifications(prev => {
        const updated = prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
        
        try {
          localStorage.setItem('cocopet_notifications', JSON.stringify(updated))
        } catch (error) {
          console.error('Error guardando notificaciones:', error)
        }
        
        return updated
      })
      
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId)
      
      try {
        localStorage.setItem('cocopet_notifications', JSON.stringify(updated))
      } catch (error) {
        console.error('Error guardando notificaciones:', error)
      }
      
      return updated
    })
    
    // Actualizar contador si la notificación no estaba leída
    const notification = notifications.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
    
    try {
      localStorage.removeItem('cocopet_notifications')
    } catch (error) {
      console.error('Error limpiando notificaciones:', error)
    }
  }

  const getNotificationsByType = (type) => {
    return notifications.filter(n => n.type === type)
  }

  const getNotificationsByPriority = (priority) => {
    return notifications.filter(n => n.priority === priority)
  }

  const getUnreadNotifications = () => {
    return notifications.filter(n => !n.read)
  }

  // Función para crear notificaciones manuales
  const createNotification = ({ type, title, message, priority = 'medium', data = null }) => {
    const notification = {
      id: `manual_${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date().toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      read: false,
      priority,
      data
    }
    
    addNotification(notification)
    return notification
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    removeNotification,
    clearAllNotifications,
    getNotificationsByType,
    getNotificationsByPriority,
    getUnreadNotifications,
    createNotification
  }
}