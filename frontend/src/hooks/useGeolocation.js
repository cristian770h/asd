// frontend/src/hooks/useGeolocation.js - Hook de Geolocalización
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [watchId, setWatchId] = useState(null)

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutos
    ...options
  }

  // Verificar si la geolocalización está disponible
  const isSupported = 'geolocation' in navigator

  // Obtener ubicación actual una vez
  const getCurrentLocation = useCallback((customOptions = {}) => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        const error = new Error('Geolocalización no soportada por este navegador')
        setError(error)
        reject(error)
        return
      }

      setIsLoading(true)
      setError(null)

      const options = { ...defaultOptions, ...customOptions }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          }

          setLocation(locationData)
          setIsLoading(false)
          resolve(locationData)
        },
        (error) => {
          let errorMessage = 'Error obteniendo ubicación'
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permiso de ubicación denegado por el usuario'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Información de ubicación no disponible'
              break
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado para obtener ubicación'
              break
            default:
              errorMessage = `Error desconocido: ${error.message}`
          }

          const customError = new Error(errorMessage)
          customError.code = error.code
          
          setError(customError)
          setIsLoading(false)
          reject(customError)
        },
        options
      )
    })
  }, [isSupported, defaultOptions])

  // Observar cambios en la ubicación
  const watchLocation = useCallback((customOptions = {}) => {
    if (!isSupported) {
      const error = new Error('Geolocalización no soportada')
      setError(error)
      return null
    }

    setIsLoading(true)
    setError(null)

    const options = { ...defaultOptions, ...customOptions }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        }

        setLocation(locationData)
        setIsLoading(false)
      },
      (error) => {
        let errorMessage = 'Error observando ubicación'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado'
            break
        }

        const customError = new Error(errorMessage)
        customError.code = error.code
        
        setError(customError)
        setIsLoading(false)
      },
      options
    )

    setWatchId(id)
    return id
  }, [isSupported, defaultOptions])

  // Detener observación de ubicación
  const clearWatch = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
  }, [watchId])

  // Limpiar watch al desmontar
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  // Calcular distancia entre dos puntos (fórmula de Haversine)
  const getDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c // Distancia en kilómetros
  }, [])

  // Verificar si una ubicación está dentro del área de servicio
  const isWithinServiceArea = useCallback((latitude, longitude) => {
    // Límites de Cancún y área metropolitana
    const bounds = {
      north: 21.5,
      south: 20.5,
      east: -86.5,
      west: -87.5
    }

    return (
      latitude >= bounds.south &&
      latitude <= bounds.north &&
      longitude >= bounds.west &&
      longitude <= bounds.east
    )
  }, [])

  // Obtener ubicación con validación de área de servicio
  const getCurrentLocationWithValidation = useCallback(async (customOptions = {}) => {
    try {
      const locationData = await getCurrentLocation(customOptions)
      
      if (!isWithinServiceArea(locationData.latitude, locationData.longitude)) {
        throw new Error('La ubicación está fuera del área de servicio (Cancún)')
      }

      return locationData
    } catch (error) {
      throw error
    }
  }, [getCurrentLocation, isWithinServiceArea])

  // Pedir permisos explícitamente
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Geolocalización no soportada')
    }

    try {
      // Verificar el estado actual de los permisos
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({name: 'geolocation'})
        
        if (permission.state === 'denied') {
          throw new Error('Permiso de ubicación denegado. Habilítalo en la configuración del navegador.')
        }
      }

      // Intentar obtener ubicación para activar el prompt de permisos
      await getCurrentLocation({ timeout: 5000 })
      
      return true
    } catch (error) {
      throw error
    }
  }, [isSupported, getCurrentLocation])

  // Obtener dirección aproximada desde coordenadas (reverse geocoding básico)
  const getAddressFromCoordinates = useCallback(async (latitude, longitude) => {
    try {
      // Usar servicio de geocoding gratuito
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
      )
      
      if (!response.ok) {
        throw new Error('Error obteniendo dirección')
      }

      const data = await response.json()
      
      if (data.display_name) {
        // Formatear dirección para México
        const address = data.display_name
        const parts = address.split(',')
        
        // Tomar las primeras 3-4 partes más relevantes
        if (parts.length >= 3) {
          return parts.slice(0, 4).join(', ').trim()
        }
        
        return address
      }

      return null
    } catch (error) {
      console.warn('Error obteniendo dirección:', error)
      return null
    }
  }, [])

  // Formatear coordenadas para mostrar
  const formatCoordinates = useCallback((lat, lng, precision = 4) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return 'No disponible'
    }
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`
  }, [])

  // Crear URL de Google Maps
  const getGoogleMapsUrl = useCallback((latitude, longitude, zoom = 15) => {
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}`
  }, [])

  // Estado de precisión de la ubicación
  const getAccuracyStatus = useCallback((accuracy) => {
    if (!accuracy) return { status: 'unknown', color: 'gray', text: 'Desconocida' }
    
    if (accuracy <= 10) {
      return { status: 'excellent', color: 'green', text: 'Excelente' }
    } else if (accuracy <= 50) {
      return { status: 'good', color: 'blue', text: 'Buena' }
    } else if (accuracy <= 100) {
      return { status: 'fair', color: 'yellow', text: 'Regular' }
    } else {
      return { status: 'poor', color: 'red', text: 'Baja' }
    }
  }, [])

  return {
    // Estado
    location,
    error,
    isLoading,
    isSupported,
    watchId,

    // Métodos principales
    getCurrentLocation,
    getCurrentLocationWithValidation,
    watchLocation,
    clearWatch,
    requestPermission,

    // Utilidades
    getDistance,
    isWithinServiceArea,
    getAddressFromCoordinates,
    formatCoordinates,
    getGoogleMapsUrl,
    getAccuracyStatus
  }
}

// Hook especializado para tracking de ubicación
export const useLocationTracking = (options = {}) => {
  const {
    autoStart = false,
    onLocationChange,
    onError,
    trackingInterval = 30000 // 30 segundos
  } = options

  const [isTracking, setIsTracking] = useState(false)
  const [locations, setLocations] = useState([])
  
  const geolocation = useGeolocation()

  useEffect(() => {
    if (autoStart) {
      startTracking()
    }

    return () => {
      stopTracking()
    }
  }, [autoStart])

  const startTracking = useCallback(async () => {
    try {
      setIsTracking(true)
      
      // Obtener ubicación inicial
      const initialLocation = await geolocation.getCurrentLocation()
      setLocations([initialLocation])
      
      if (onLocationChange) {
        onLocationChange(initialLocation)
      }

      // Iniciar tracking continuo
      const watchId = geolocation.watchLocation()
      
      return watchId
    } catch (error) {
      setIsTracking(false)
      if (onError) {
        onError(error)
      }
      throw error
    }
  }, [geolocation, onLocationChange, onError])

  const stopTracking = useCallback(() => {
    geolocation.clearWatch()
    setIsTracking(false)
  }, [geolocation])

  // Escuchar cambios de ubicación
  useEffect(() => {
    if (geolocation.location && isTracking) {
      setLocations(prev => {
        const newLocations = [...prev, geolocation.location]
        
        // Mantener solo las últimas 100 ubicaciones
        if (newLocations.length > 100) {
          return newLocations.slice(-100)
        }
        
        return newLocations
      })

      if (onLocationChange) {
        onLocationChange(geolocation.location)
      }
    }
  }, [geolocation.location, isTracking, onLocationChange])

  return {
    ...geolocation,
    isTracking,
    locations,
    startTracking,
    stopTracking
  }
}

export default useGeolocation