// frontend/src/utils/dateUtils.js - Utilidades para manejo de fechas
/**
 * Utilidades para formateo y manipulación de fechas en español mexicano
 */

// Configuración de timezone para México
const TIMEZONE = 'America/Mexico_City'
const LOCALE = 'es-MX'

/**
 * Formatear fecha a string legible
 * @param {Date|string|number} date - Fecha a formatear
 * @param {Object} options - Opciones de formateo
 * @returns {string} Fecha formateada
 */
export const formatDate = (date, options = {}) => {
  if (!date) return ''
  
  const {
    includeTime = false,
    includeSeconds = false,
    format = 'default', // default, short, long, relative
    timezone = TIMEZONE
  } = options

  try {
    const dateObj = new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      console.warn('Fecha inválida:', date)
      return 'Fecha inválida'
    }

    // Formateo relativo (ej: "hace 2 horas")
    if (format === 'relative') {
      return formatRelativeDate(dateObj)
    }

    // Opciones base de formateo
    const formatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: format === 'short' ? 'short' : 'long',
      day: 'numeric'
    }

    // Agregar tiempo si se solicita
    if (includeTime) {
      formatOptions.hour = '2-digit'
      formatOptions.minute = '2-digit'
      formatOptions.hour12 = true
      
      if (includeSeconds) {
        formatOptions.second = '2-digit'
      }
    }

    // Formateo especial para diferentes tipos
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString(LOCALE, {
          ...formatOptions,
          month: 'short'
        })
      
      case 'long':
        return dateObj.toLocaleDateString(LOCALE, {
          ...formatOptions,
          weekday: 'long'
        })
      
      case 'numeric':
        return dateObj.toLocaleDateString(LOCALE, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: timezone
        })
      
      default:
        return dateObj.toLocaleDateString(LOCALE, formatOptions)
    }
  } catch (error) {
    console.error('Error formateando fecha:', error)
    return 'Error en fecha'
  }
}

/**
 * Formatear solo la hora
 * @param {Date|string|number} date - Fecha/hora a formatear
 * @param {Object} options - Opciones de formateo
 * @returns {string} Hora formateada
 */
export const formatTime = (date, options = {}) => {
  if (!date) return ''
  
  const {
    includeSeconds = false,
    hour12 = true,
    timezone = TIMEZONE
  } = options

  try {
    const dateObj = new Date(date)
    
    if (isNaN(dateObj.getTime())) {
      return 'Hora inválida'
    }

    const formatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12
    }

    if (includeSeconds) {
      formatOptions.second = '2-digit'
    }

    return dateObj.toLocaleTimeString(LOCALE, formatOptions)
  } catch (error) {
    console.error('Error formateando hora:', error)
    return 'Error en hora'
  }
}

/**
 * Formatear fecha de manera relativa (ej: "hace 2 horas")
 * @param {Date|string|number} date - Fecha a formatear
 * @returns {string} Fecha relativa
 */
export const formatRelativeDate = (date) => {
  if (!date) return ''

  try {
    const dateObj = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    // Futuro
    if (diffMs < 0) {
      const absDiffSeconds = Math.abs(diffSeconds)
      const absDiffMinutes = Math.abs(diffMinutes)
      const absDiffHours = Math.abs(diffHours)
      const absDiffDays = Math.abs(diffDays)

      if (absDiffSeconds < 60) return 'En unos segundos'
      if (absDiffMinutes < 60) return `En ${absDiffMinutes} minuto${absDiffMinutes !== 1 ? 's' : ''}`
      if (absDiffHours < 24) return `En ${absDiffHours} hora${absDiffHours !== 1 ? 's' : ''}`
      if (absDiffDays < 7) return `En ${absDiffDays} día${absDiffDays !== 1 ? 's' : ''}`
      
      return formatDate(dateObj, { format: 'short' })
    }

    // Pasado
    if (diffSeconds < 60) return 'Hace unos segundos'
    if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
    if (diffWeeks === 1) return 'Hace una semana'
    if (diffWeeks < 4) return `Hace ${diffWeeks} semana${diffWeeks !== 1 ? 's' : ''}`
    if (diffMonths === 1) return 'Hace un mes'
    if (diffMonths < 12) return `Hace ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`
    if (diffYears === 1) return 'Hace un año'
    
    return `Hace ${diffYears} año${diffYears !== 1 ? 's' : ''}`
  } catch (error) {
    console.error('Error formateando fecha relativa:', error)
    return formatDate(date)
  }
}

/**
 * Agregar días a una fecha
 * @param {Date|string|number} date - Fecha base
 * @param {number} days - Días a agregar (puede ser negativo)
 * @returns {Date} Nueva fecha
 */
export const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Agregar horas a una fecha
 * @param {Date|string|number} date - Fecha base
 * @param {number} hours - Horas a agregar
 * @returns {Date} Nueva fecha
 */
export const addHours = (date, hours) => {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

/**
 * Agregar minutos a una fecha
 * @param {Date|string|number} date - Fecha base
 * @param {number} minutes - Minutos a agregar
 * @returns {Date} Nueva fecha
 */
export const addMinutes = (date, minutes) => {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

/**
 * Obtener el inicio del día
 * @param {Date|string|number} date - Fecha
 * @returns {Date} Inicio del día (00:00:00)
 */
export const startOfDay = (date) => {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Obtener el final del día
 * @param {Date|string|number} date - Fecha
 * @returns {Date} Final del día (23:59:59.999)
 */
export const endOfDay = (date) => {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Obtener el inicio de la semana (lunes)
 * @param {Date|string|number} date - Fecha
 * @returns {Date} Inicio de la semana
 */
export const startOfWeek = (date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = result.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para que lunes sea el primer día
  result.setDate(diff)
  return startOfDay(result)
}

/**
 * Obtener el final de la semana (domingo)
 * @param {Date|string|number} date - Fecha
 * @returns {Date} Final de la semana
 */
export const endOfWeek = (date) => {
  const result = startOfWeek(date)
  result.setDate(result.getDate() + 6)
  return endOfDay(result)
}

/**
 * Obtener el inicio del mes
 * @param {Date|string|number} date - Fecha
 * @returns {Date} Primer día del mes
 */
export const startOfMonth = (date) => {
  const result = new Date(date)
  result.setDate(1)
  return startOfDay(result)
}

/**
 * Obtener el final del mes
 * @param {Date|string|number} date - Fecha
 * @returns {Date} Último día del mes
 */
export const endOfMonth = (date) => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + 1, 0)
  return endOfDay(result)
}

/**
 * Verificar si una fecha es hoy
 * @param {Date|string|number} date - Fecha a verificar
 * @returns {boolean} True si es hoy
 */
export const isToday = (date) => {
  const today = new Date()
  const dateObj = new Date(date)
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear()
}

/**
 * Verificar si una fecha es ayer
 * @param {Date|string|number} date - Fecha a verificar
 * @returns {boolean} True si es ayer
 */
export const isYesterday = (date) => {
  const yesterday = addDays(new Date(), -1)
  const dateObj = new Date(date)
  
  return dateObj.getDate() === yesterday.getDate() &&
         dateObj.getMonth() === yesterday.getMonth() &&
         dateObj.getFullYear() === yesterday.getFullYear()
}

/**
 * Verificar si una fecha es mañana
 * @param {Date|string|number} date - Fecha a verificar
 * @returns {boolean} True si es mañana
 */
export const isTomorrow = (date) => {
  const tomorrow = addDays(new Date(), 1)
  const dateObj = new Date(date)
  
  return dateObj.getDate() === tomorrow.getDate() &&
         dateObj.getMonth() === tomorrow.getMonth() &&
         dateObj.getFullYear() === tomorrow.getFullYear()
}

/**
 * Verificar si una fecha es fin de semana
 * @param {Date|string|number} date - Fecha a verificar
 * @returns {boolean} True si es fin de semana
 */
export const isWeekend = (date) => {
  const day = new Date(date).getDay()
  return day === 0 || day === 6 // Domingo o sábado
}

/**
 * Verificar si una fecha está en el rango de horario laboral
 * @param {Date|string|number} date - Fecha a verificar
 * @param {Object} options - Opciones de horario
 * @returns {boolean} True si está en horario laboral
 */
export const isBusinessHours = (date, options = {}) => {
  const {
    startHour = 9,
    endHour = 18,
    includeWeekends = false,
    timezone = TIMEZONE
  } = options

  const dateObj = new Date(date)
  
  // Verificar fin de semana si no se incluyen
  if (!includeWeekends && isWeekend(dateObj)) {
    return false
  }

  // Obtener hora en timezone específico
  const hour = parseInt(dateObj.toLocaleString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit'
  }))

  return hour >= startHour && hour < endHour
}

/**
 * Obtener diferencia entre dos fechas
 * @param {Date|string|number} date1 - Primera fecha
 * @param {Date|string|number} date2 - Segunda fecha
 * @param {string} unit - Unidad ('days', 'hours', 'minutes', 'seconds')
 * @returns {number} Diferencia en la unidad especificada
 */
export const dateDiff = (date1, date2, unit = 'days') => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffMs = Math.abs(d2.getTime() - d1.getTime())

  switch (unit) {
    case 'years':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365))
    case 'months':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))
    case 'weeks':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
    case 'days':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    case 'hours':
      return Math.floor(diffMs / (1000 * 60 * 60))
    case 'minutes':
      return Math.floor(diffMs / (1000 * 60))
    case 'seconds':
      return Math.floor(diffMs / 1000)
    default:
      return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }
}

/**
 * Generar rango de fechas
 * @param {Date|string|number} startDate - Fecha inicial
 * @param {Date|string|number} endDate - Fecha final
 * @param {string} unit - Unidad de incremento ('days', 'weeks', 'months')
 * @returns {Date[]} Array de fechas
 */
export const generateDateRange = (startDate, endDate, unit = 'days') => {
  const dates = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  let current = new Date(start)
  
  while (current <= end) {
    dates.push(new Date(current))
    
    switch (unit) {
      case 'days':
        current = addDays(current, 1)
        break
      case 'weeks':
        current = addDays(current, 7)
        break
      case 'months':
        current.setMonth(current.getMonth() + 1)
        break
      default:
        current = addDays(current, 1)
    }
  }
  
  return dates
}

/**
 * Obtener nombre del día de la semana
 * @param {Date|string|number} date - Fecha
 * @param {string} format - Formato ('long', 'short', 'narrow')
 * @returns {string} Nombre del día
 */
export const getDayName = (date, format = 'long') => {
  const dateObj = new Date(date)
  return dateObj.toLocaleDateString(LOCALE, {
    weekday: format,
    timeZone: TIMEZONE
  })
}

/**
 * Obtener nombre del mes
 * @param {Date|string|number} date - Fecha
 * @param {string} format - Formato ('long', 'short', 'narrow')
 * @returns {string} Nombre del mes
 */
export const getMonthName = (date, format = 'long') => {
  const dateObj = new Date(date)
  return dateObj.toLocaleDateString(LOCALE, {
    month: format,
    timeZone: TIMEZONE
  })
}

/**
 * Obtener número de semana del año
 * @param {Date|string|number} date - Fecha
 * @returns {number} Número de semana (1-53)
 */
export const getWeekNumber = (date) => {
  const dateObj = new Date(date)
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/**
 * Obtener días en un mes específico
 * @param {number} year - Año
 * @param {number} month - Mes (0-11)
 * @returns {number} Número de días en el mes
 */
export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Parsear fecha desde string con diferentes formatos
 * @param {string} dateString - String de fecha
 * @param {string} format - Formato esperado (opcional)
 * @returns {Date|null} Fecha parseada o null si es inválida
 */
export const parseDate = (dateString, format = null) => {
  if (!dateString) return null

  try {
    // Intentar parseo directo primero
    let date = new Date(dateString)
    
    if (!isNaN(date.getTime())) {
      return date
    }

    // Formatos comunes en español/México
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // DD/MM/YY
    ]

    for (const formatRegex of formats) {
      const match = dateString.match(formatRegex)
      if (match) {
        let [, part1, part2, part3] = match
        
        // Determinar orden basado en el formato
        if (formatRegex.source.includes('(\\d{4}).*\\d{1,2}.*\\d{1,2}')) {
          // YYYY-MM-DD
          date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3))
        } else {
          // DD/MM/YYYY o DD-MM-YYYY
          let year = parseInt(part3)
          if (year < 100) {
            year += year < 50 ? 2000 : 1900
          }
          date = new Date(year, parseInt(part2) - 1, parseInt(part1))
        }
        
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error parseando fecha:', error)
    return null
  }
}

/**
 * Formatear duración en formato legible
 * @param {number} milliseconds - Duración en milisegundos
 * @param {Object} options - Opciones de formateo
 * @returns {string} Duración formateada
 */
export const formatDuration = (milliseconds, options = {}) => {
  const {
    includeMs = false,
    maxUnits = 2,
    shortFormat = false
  } = options

  if (milliseconds < 0) return '0 segundos'

  const units = [
    { name: 'año', short: 'a', ms: 1000 * 60 * 60 * 24 * 365 },
    { name: 'mes', short: 'm', ms: 1000 * 60 * 60 * 24 * 30 },
    { name: 'día', short: 'd', ms: 1000 * 60 * 60 * 24 },
    { name: 'hora', short: 'h', ms: 1000 * 60 * 60 },
    { name: 'minuto', short: 'min', ms: 1000 * 60 },
    { name: 'segundo', short: 's', ms: 1000 }
  ]

  if (includeMs) {
    units.push({ name: 'milisegundo', short: 'ms', ms: 1 })
  }

  const parts = []
  let remaining = milliseconds

  for (const unit of units) {
    const count = Math.floor(remaining / unit.ms)
    if (count > 0) {
      const unitName = shortFormat ? unit.short : 
        count === 1 ? unit.name : unit.name + 's'
      parts.push(`${count} ${unitName}`)
      remaining %= unit.ms
      
      if (parts.length >= maxUnits) break
    }
  }

  return parts.length > 0 ? parts.join(', ') : '0 segundos'
}

/**
 * Crear fecha desde componentes
 * @param {Object} components - Componentes de fecha
 * @returns {Date} Fecha creada
 */
export const createDate = (components = {}) => {
  const {
    year = new Date().getFullYear(),
    month = new Date().getMonth(),
    day = new Date().getDate(),
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0
  } = components

  return new Date(year, month, day, hour, minute, second, millisecond)
}

/**
 * Validar si una fecha está en un rango específico
 * @param {Date|string|number} date - Fecha a validar
 * @param {Date|string|number} startDate - Fecha inicial del rango
 * @param {Date|string|number} endDate - Fecha final del rango
 * @returns {boolean} True si está en el rango
 */
export const isDateInRange = (date, startDate, endDate) => {
  const dateObj = new Date(date)
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  return dateObj >= start && dateObj <= end
}

/**
 * Obtener próxima fecha de un día específico
 * @param {number} dayOfWeek - Día de la semana (0=domingo, 6=sábado)
 * @param {Date} fromDate - Fecha desde la cual buscar (opcional)
 * @returns {Date} Próxima fecha del día especificado
 */
export const getNextWeekday = (dayOfWeek, fromDate = new Date()) => {
  const date = new Date(fromDate)
  const currentDay = date.getDay()
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7
  
  if (daysUntilTarget === 0) {
    return addDays(date, 7) // Si es el mismo día, obtener el de la próxima semana
  }
  
  return addDays(date, daysUntilTarget)
}

/**
 * Formatear fecha para input HTML
 * @param {Date|string|number} date - Fecha
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatDateForInput = (date) => {
  if (!date) return ''
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return ''
  
  return dateObj.toISOString().split('T')[0]
}

/**
 * Formatear datetime para input HTML
 * @param {Date|string|number} date - Fecha
 * @returns {string} Fecha en formato YYYY-MM-DDTHH:mm
 */
export const formatDateTimeForInput = (date) => {
  if (!date) return ''
  
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return ''
  
  const year = dateObj.getFullYear()
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const day = dateObj.getDate().toString().padStart(2, '0')
  const hours = dateObj.getHours().toString().padStart(2, '0')
  const minutes = dateObj.getMinutes().toString().padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Obtener rangos de fechas predefinidos
 * @returns {Object} Objeto con rangos de fechas comunes
 */
export const getDateRanges = () => {
  const now = new Date()
  
  return {
    today: {
      start: startOfDay(now),
      end: endOfDay(now),
      label: 'Hoy'
    },
    yesterday: {
      start: startOfDay(addDays(now, -1)),
      end: endOfDay(addDays(now, -1)),
      label: 'Ayer'
    },
    thisWeek: {
      start: startOfWeek(now),
      end: endOfWeek(now),
      label: 'Esta semana'
    },
    lastWeek: {
      start: startOfWeek(addDays(now, -7)),
      end: endOfWeek(addDays(now, -7)),
      label: 'Semana pasada'
    },
    thisMonth: {
      start: startOfMonth(now),
      end: endOfMonth(now),
      label: 'Este mes'
    },
    lastMonth: {
      start: startOfMonth(addDays(startOfMonth(now), -1)),
      end: endOfMonth(addDays(startOfMonth(now), -1)),
      label: 'Mes pasado'
    },
    last7Days: {
      start: startOfDay(addDays(now, -6)),
      end: endOfDay(now),
      label: 'Últimos 7 días'
    },
    last30Days: {
      start: startOfDay(addDays(now, -29)),
      end: endOfDay(now),
      label: 'Últimos 30 días'
    },
    last90Days: {
      start: startOfDay(addDays(now, -89)),
      end: endOfDay(now),
      label: 'Últimos 90 días'
    }
  }
}

// Exportar constantes útiles
export const DAYS_OF_WEEK = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
]

export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

export const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
]

// Configuración exportable
export const DATE_CONFIG = {
  TIMEZONE,
  LOCALE,
  DEFAULT_FORMAT: 'DD/MM/YYYY',
  DEFAULT_TIME_FORMAT: 'HH:mm',
  BUSINESS_HOURS: {
    start: 9,
    end: 18
  }
}

export default {
  formatDate,
  formatTime,
  formatRelativeDate,
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
  isYesterday,
  isTomorrow,
  isWeekend,
  isBusinessHours,
  dateDiff,
  generateDateRange,
  getDayName,
  getMonthName,
  getWeekNumber,
  getDaysInMonth,
  parseDate,
  formatDuration,
  createDate,
  isDateInRange,
  getNextWeekday,
  formatDateForInput,
  formatDateTimeForInput,
  getDateRanges
}