// frontend/src/utils/formatters.js - Utilidades de Formateo

// Formatear moneda mexicana
export const formatCurrency = (amount, options = {}) => {
  const {
    currency = 'MXN',
    locale = 'es-MX',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options

  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00'
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(Number(amount))
  } catch (error) {
    console.error('Error formateando moneda:', error)
    return `$${Number(amount).toFixed(2)}`
  }
}

// Formatear números
export const formatNumber = (number, options = {}) => {
  const {
    locale = 'es-MX',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options

  if (number === null || number === undefined || isNaN(number)) {
    return '0'
  }

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(Number(number))
  } catch (error) {
    console.error('Error formateando número:', error)
    return String(number)
  }
}

// Formatear porcentajes
export const formatPercentage = (value, options = {}) => {
  const {
    locale = 'es-MX',
    minimumFractionDigits = 1,
    maximumFractionDigits = 1
  } = options

  if (value === null || value === undefined || isNaN(value)) {
    return '0%'
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(Number(value) / 100)
  } catch (error) {
    console.error('Error formateando porcentaje:', error)
    return `${Number(value).toFixed(1)}%`
  }
}

// Formatear fechas
export const formatDate = (date, options = {}) => {
  const {
    locale = 'es-MX',
    dateStyle = 'medium',
    timeStyle = null
  } = options

  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida'
    }

    const formatOptions = { dateStyle }
    if (timeStyle) {
      formatOptions.timeStyle = timeStyle
    }

    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj)
  } catch (error) {
    console.error('Error formateando fecha:', error)
    return String(date)
  }
}

// Formatear fecha y hora
export const formatDateTime = (date, options = {}) => {
  return formatDate(date, { ...options, timeStyle: 'short' })
}

// Formatear fecha relativa (hace X tiempo)
export const formatRelativeTime = (date, options = {}) => {
  const { locale = 'es-MX' } = options

  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida'
    }

    const now = new Date()
    const diffInSeconds = Math.floor((now - dateObj) / 1000)

    // Menos de 1 minuto
    if (diffInSeconds < 60) {
      return 'Hace un momento'
    }

    // Menos de 1 hora
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`
    }

    // Menos de 1 día
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
    }

    // Menos de 1 semana
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `Hace ${days} día${days !== 1 ? 's' : ''}`
    }

    // Menos de 1 mes (aproximadamente)
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800)
      return `Hace ${weeks} semana${weeks !== 1 ? 's' : ''}`
    }

    // Más de 1 mes, usar fecha completa
    return formatDate(dateObj, { dateStyle: 'short' })

  } catch (error) {
    console.error('Error formateando fecha relativa:', error)
    return String(date)
  }
}

// Formatear duración (en segundos a texto legible)
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const parts = []
  
  if (hours > 0) {
    parts.push(`${hours}h`)
  }
  
  if (minutes > 0) {
    parts.push(`${minutes}m`)
  }
  
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`)
  }

  return parts.join(' ')
}

// Formatear tamaño de archivo
export const formatFileSize = (bytes, options = {}) => {
  const { locale = 'es-MX', binary = true } = options

  if (!bytes || bytes === 0) return '0 B'

  const base = binary ? 1024 : 1000
  const units = binary 
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB'] 
    : ['B', 'KB', 'MB', 'GB', 'TB']

  const exponent = Math.floor(Math.log(bytes) / Math.log(base))
  const value = bytes / Math.pow(base, exponent)

  return `${value.toFixed(1)} ${units[exponent]}`
}

// Formatear coordenadas geográficas
export const formatCoordinates = (lat, lng, options = {}) => {
  const { precision = 4, format = 'decimal' } = options

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'Coordenadas no disponibles'
  }

  try {
    if (format === 'decimal') {
      return `${Number(lat).toFixed(precision)}, ${Number(lng).toFixed(precision)}`
    }

    if (format === 'dms') {
      // Grados, minutos, segundos
      const latDMS = convertToDMS(lat, 'lat')
      const lngDMS = convertToDMS(lng, 'lng')
      return `${latDMS}, ${lngDMS}`
    }

    return `${lat}, ${lng}`
  } catch (error) {
    console.error('Error formateando coordenadas:', error)
    return 'Coordenadas inválidas'
  }
}

// Convertir decimal a grados, minutos, segundos
const convertToDMS = (coordinate, type) => {
  const absolute = Math.abs(coordinate)
  const degrees = Math.floor(absolute)
  const minutesFloat = (absolute - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = Math.round((minutesFloat - minutes) * 60)

  const direction = type === 'lat' 
    ? (coordinate >= 0 ? 'N' : 'S')
    : (coordinate >= 0 ? 'E' : 'W')

  return `${degrees}°${minutes}'${seconds}"${direction}`
}

// Formatear distancia
export const formatDistance = (meters, options = {}) => {
  const { locale = 'es-MX', unit = 'metric' } = options

  if (!meters || meters < 0) return '0 m'

  if (unit === 'metric') {
    if (meters < 1000) {
      return `${Math.round(meters)} m`
    }
    return `${(meters / 1000).toFixed(1)} km`
  }

  if (unit === 'imperial') {
    const feet = meters * 3.28084
    if (feet < 5280) {
      return `${Math.round(feet)} ft`
    }
    return `${(feet / 5280).toFixed(1)} mi`
  }

  return `${meters} m`
}

// Formatear velocidad
export const formatSpeed = (metersPerSecond, options = {}) => {
  const { unit = 'kmh' } = options

  if (!metersPerSecond || metersPerSecond < 0) return '0 km/h'

  switch (unit) {
    case 'kmh':
      return `${(metersPerSecond * 3.6).toFixed(1)} km/h`
    case 'mph':
      return `${(metersPerSecond * 2.237).toFixed(1)} mph`
    case 'ms':
      return `${metersPerSecond.toFixed(1)} m/s`
    default:
      return `${metersPerSecond} m/s`
  }
}

// Formatear texto para mostrar (truncar, capitalizar, etc.)
export const formatText = (text, options = {}) => {
  const {
    maxLength = null,
    capitalize = false,
    uppercase = false,
    lowercase = false,
    trim = true
  } = options

  if (!text) return ''

  let formatted = String(text)

  if (trim) {
    formatted = formatted.trim()
  }

  if (maxLength && formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength) + '...'
  }

  if (uppercase) {
    formatted = formatted.toUpperCase()
  } else if (lowercase) {
    formatted = formatted.toLowerCase()
  } else if (capitalize) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase()
  }

  return formatted
}

// Formatear nombres propios (primera letra de cada palabra en mayúscula)
export const formatProperName = (name) => {
  if (!name) return ''
  
  return String(name)
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Formatear teléfono mexicano
export const formatPhoneNumber = (phone, options = {}) => {
  const { format = 'international', country = 'MX' } = options

  if (!phone) return ''

  // Limpiar el número (solo dígitos)
  const cleaned = phone.replace(/\D/g, '')

  if (country === 'MX') {
    if (cleaned.length === 10) {
      // Formato local: (999) 123-4567
      if (format === 'local') {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      }
      // Formato internacional: +52 999 123 4567
      return `+52 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('52')) {
      // Ya tiene código de país
      const number = cleaned.slice(2)
      return `+52 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`
    }
  }

  return phone // Retornar original si no se puede formatear
}

// Formatear SKU o código de producto
export const formatSKU = (sku) => {
  if (!sku) return ''
  return String(sku).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

// Formatear estado de stock
export const formatStockStatus = (current, min, max) => {
  if (current === null || current === undefined) {
    return { text: 'No disponible', color: 'gray', level: 'unknown' }
  }

  const currentNum = Number(current)
  const minNum = Number(min || 0)
  const maxNum = Number(max || 100)

  if (currentNum <= minNum * 0.5) {
    return { text: 'Crítico', color: 'red', level: 'critical' }
  }

  if (currentNum <= minNum) {
    return { text: 'Bajo', color: 'orange', level: 'low' }
  }

  if (currentNum >= maxNum * 0.9) {
    return { text: 'Alto', color: 'blue', level: 'high' }
  }

  return { text: 'Normal', color: 'green', level: 'normal' }
}

// Formatear precisión de ML
export const formatAccuracy = (accuracy) => {
  if (accuracy === null || accuracy === undefined || isNaN(accuracy)) {
    return 'N/A'
  }

  const value = Number(accuracy)
  
  if (value >= 95) {
    return `${value.toFixed(1)}% (Excelente)`
  } else if (value >= 85) {
    return `${value.toFixed(1)}% (Bueno)`
  } else if (value >= 70) {
    return `${value.toFixed(1)}% (Regular)`
  } else {
    return `${value.toFixed(1)}% (Bajo)`
  }
}

// Formatear intervalo de confianza
export const formatConfidenceInterval = (lower, upper, confidence = 95) => {
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return 'N/A'
  }

  return `[${Number(lower).toFixed(1)}, ${Number(upper).toFixed(1)}] (${confidence}%)`
}