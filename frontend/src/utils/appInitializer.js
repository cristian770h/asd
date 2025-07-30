// frontend/src/utils/appInitializer.js - Inicializador de Aplicación
import toast from 'react-hot-toast'

// Función principal de inicialización
export const initializeApp = async () => {
  console.log('🚀 Inicializando CocoPet ML System...')
  
  try {
    // 1. Verificar soporte del navegador
    await checkBrowserSupport()
    
    // 2. Configurar interceptores de errores globales
    setupGlobalErrorHandlers()
    
    // 3. Inicializar configuración local
    initializeLocalConfiguration()
    
    // 4. Verificar conectividad
    await checkConnectivity()
    
    // 5. Configurar service worker (si está disponible)
    await setupServiceWorker()
    
    console.log('✅ Aplicación inicializada correctamente')
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error)
    toast.error('Error iniciando la aplicación')
    return { success: false, error }
  }
}

// Verificar soporte del navegador
const checkBrowserSupport = async () => {
  console.log('🔍 Verificando soporte del navegador...')
  
  const features = {
    localStorage: typeof Storage !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    websockets: typeof WebSocket !== 'undefined',
    geolocation: 'geolocation' in navigator,
    notifications: 'Notification' in window
  }
  
  const unsupportedFeatures = Object.entries(features)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature)
  
  if (unsupportedFeatures.length > 0) {
    console.warn('⚠️ Características no soportadas:', unsupportedFeatures)
    
    // Solo localStorage y fetch son críticos
    if (!features.localStorage || !features.fetch) {
      throw new Error('Navegador no compatible. Actualiza tu navegador.')
    }
  }
  
  console.log('✅ Navegador compatible')
}

// Configurar manejadores de errores globales
const setupGlobalErrorHandlers = () => {
  console.log('🛡️ Configurando manejadores de errores...')
  
  // Errores de JavaScript no capturados
  window.addEventListener('error', (event) => {
    console.error('Error global JS:', event.error)
    
    // Solo mostrar toast en desarrollo
    if (import.meta.env.DEV) {
      toast.error(`Error: ${event.error?.message || 'Error desconocido'}`)
    }
  })
  
  // Promesas rechazadas no capturadas
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada:', event.reason)
    
    if (import.meta.env.DEV) {
      toast.error(`Promise rechazada: ${event.reason?.message || 'Error desconocido'}`)
    }
    
    // Prevenir que aparezca en la consola del navegador
    event.preventDefault()
  })
  
  console.log('✅ Manejadores de errores configurados')
}

// Inicializar configuración local
const initializeLocalConfiguration = () => {
  console.log('⚙️ Inicializando configuración local...')
  
  // Configuración por defecto
  const defaultConfig = {
    theme: 'light',
    language: 'es',
    notifications: true,
    sound: true,
    autoRefresh: true,
    refreshInterval: 30000, // 30 segundos
    dashboardLayout: 'default',
    mapProvider: 'google',
    currency: 'MXN',
    timezone: 'America/Cancun'
  }
  
  // Cargar configuración existente
  let config = {}
  try {
    const savedConfig = localStorage.getItem('cocopet_config')
    config = savedConfig ? JSON.parse(savedConfig) : {}
  } catch (error) {
    console.warn('Error cargando configuración:', error)
  }
  
  // Mergear con configuración por defecto
  const finalConfig = { ...defaultConfig, ...config }
  
  // Guardar configuración actualizada
  try {
    localStorage.setItem('cocopet_config', JSON.stringify(finalConfig))
    window.cocopetConfig = finalConfig
  } catch (error) {
    console.warn('Error guardando configuración:', error)
  }
  
  console.log('✅ Configuración local inicializada:', finalConfig)
}

// Verificar conectividad
const checkConnectivity = async () => {
  console.log('🌐 Verificando conectividad...')
  
  try {
    // Verificar conectividad básica
    if (!navigator.onLine) {
      console.warn('⚠️ Sin conexión a internet')
      toast.warn('Sin conexión a internet')
      return
    }
    
    // Verificar conectividad con el backend
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        console.log('✅ Backend conectado')
      } else {
        console.warn('⚠️ Backend respondió con error:', response.status)
        toast.warn('Problemas de conectividad con el servidor')
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.warn('⚠️ No se pudo conectar al backend:', error.message)
      toast.warn('No se pudo conectar al servidor')
    }
    
  } catch (error) {
    console.error('Error verificando conectividad:', error)
  }
}

// Configurar Service Worker
const setupServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker no soportado')
    return
  }
  
  try {
    console.log('🔧 Configurando Service Worker...')
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    
    console.log('✅ Service Worker registrado:', registration.scope)
    
    // Escuchar actualizaciones
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          toast.success('Nueva versión disponible. Recarga la página.', {
            duration: 8000,
            action: {
              label: 'Recargar',
              onClick: () => window.location.reload()
            }
          })
        }
      })
    })
    
  } catch (error) {
    console.warn('Error configurando Service Worker:', error)
  }
}

// Inicializar notificaciones
export const initializeNotifications = async () => {
  if (!('Notification' in window)) {
    console.log('Notificaciones no soportadas')
    return false
  }
  
  try {
    let permission = Notification.permission
    
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    
    if (permission === 'granted') {
      console.log('✅ Permisos de notificación concedidos')
      
      // Mostrar notificación de bienvenida
      new Notification('CocoPet ML', {
        body: 'Sistema inicializado correctamente',
        icon: '/cocopet-logo.svg',
        badge: '/cocopet-badge.png',
        tag: 'welcome'
      })
      
      return true
    } else {
      console.log('❌ Permisos de notificación denegados')
      return false
    }
    
  } catch (error) {
    console.error('Error inicializando notificaciones:', error)
    return false
  }
}

// Configurar tema
export const initializeTheme = () => {
  const config = window.cocopetConfig || {}
  const theme = config.theme || 'light'
  
  // Aplicar tema al documento
  document.documentElement.setAttribute('data-theme', theme)
  
  // Escuchar cambios del sistema
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handleThemeChange = (e) => {
    if (config.theme === 'auto') {
      const newTheme = e.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }
  
  mediaQuery.addEventListener('change', handleThemeChange)
  
  // Aplicar tema inicial si es automático
  if (theme === 'auto') {
    handleThemeChange(mediaQuery)
  }
  
  console.log('✅ Tema inicializado:', theme)
}

// Configurar actualizaciones automáticas
export const setupAutoRefresh = () => {
  const config = window.cocopetConfig || {}
  
  if (!config.autoRefresh) {
    console.log('Auto-refresh deshabilitado')
    return
  }
  
  const interval = config.refreshInterval || 30000
  
  // Configurar intervalo de actualización
  const refreshInterval = setInterval(() => {
    // Solo actualizar si la ventana está visible
    if (!document.hidden) {
      // Disparar evento personalizado para que los componentes se actualicen
      window.dispatchEvent(new CustomEvent('cocopet:auto-refresh'))
    }
  }, interval)
  
  // Limpiar intervalo cuando la ventana se cierre
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval)
  })
  
  console.log(`✅ Auto-refresh configurado cada ${interval}ms`)
  
  return refreshInterval
}

// Función para obtener información del sistema
export const getSystemInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: window.devicePixelRatio
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    localStorage: {
      supported: typeof Storage !== 'undefined',
      quota: (() => {
        try {
          return navigator.storage?.estimate?.() || 'No disponible'
        } catch {
          return 'No disponible'
        }
      })()
    },
    features: {
      webgl: (() => {
        try {
          const canvas = document.createElement('canvas')
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        } catch {
          return false
        }
      })(),
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      websockets: typeof WebSocket !== 'undefined'
    }
  }
}

// Función para limpiar datos de la aplicación
export const cleanupAppData = () => {
  try {
    // Limpiar localStorage (excepto configuración importante)
    const keysToKeep = ['cocopet_config', 'cocopet-auth-storage']
    const keysToRemove = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !keysToKeep.includes(key)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Limpiar sessionStorage
    sessionStorage.clear()
    
    console.log('✅ Datos de aplicación limpiados')
    return true
    
  } catch (error) {
    console.error('Error limpiando datos:', error)
    return false
  }
}

// Función para exportar configuración
export const exportConfiguration = () => {
  try {
    const config = {
      app: window.cocopetConfig || {},
      auth: JSON.parse(localStorage.getItem('cocopet-auth-storage') || '{}'),
      notifications: JSON.parse(localStorage.getItem('cocopet_notifications') || '[]'),
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cocopet-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Configuración exportada')
    return true
    
  } catch (error) {
    console.error('Error exportando configuración:', error)
    toast.error('Error exportando configuración')
    return false
  }
}

// Función para importar configuración
export const importConfiguration = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)
        
        // Validar estructura básica
        if (!config.timestamp || !config.app) {
          throw new Error('Archivo de configuración inválido')
        }
        
        // Aplicar configuración
        if (config.app) {
          localStorage.setItem('cocopet_config', JSON.stringify(config.app))
          window.cocopetConfig = config.app
        }
        
        if (config.auth) {
          localStorage.setItem('cocopet-auth-storage', JSON.stringify(config.auth))
        }
        
        if (config.notifications) {
          localStorage.setItem('cocopet_notifications', JSON.stringify(config.notifications))
        }
        
        toast.success('Configuración importada. Recarga la página.')
        resolve(true)
        
      } catch (error) {
        console.error('Error importando configuración:', error)
        toast.error('Error importando configuración')
        reject(error)
      }
    }
    
    reader.onerror = () => {
      toast.error('Error leyendo archivo')
      reject(new Error('Error leyendo archivo'))
    }
    
    reader.readAsText(file)
  })
}