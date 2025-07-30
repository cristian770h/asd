// frontend/src/utils/validators.js - Utilidades de Validación
/**
 * Utilidades para validación de datos en el frontend
 */

/**
 * Validar email
 * @param {string} email - Email a validar
 * @returns {Object} Resultado de validación
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email es requerido' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Formato de email inválido' }
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email demasiado largo' }
  }

  return { isValid: true, error: null }
}

/**
 * Validar teléfono mexicano
 * @param {string} phone - Teléfono a validar
 * @returns {Object} Resultado de validación
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Teléfono es requerido' }
  }

  // Limpiar número (solo dígitos)
  const cleanPhone = phone.replace(/\D/g, '')

  // Patrones para números mexicanos
  const patterns = [
    /^52\d{10}$/, // Formato internacional con código país
    /^\d{10}$/, // Formato nacional (10 dígitos)
    /^044\d{10}$/, // Formato con 044
    /^045\d{10}$/, // Formato con 045
  ]

  const isValid = patterns.some(pattern => pattern.test(cleanPhone))

  if (!isValid) {
    return { 
      isValid: false, 
      error: 'Formato de teléfono inválido. Use 10 dígitos (ej: 9981234567)' 
    }
  }

  return { isValid: true, error: null, formatted: formatPhone(cleanPhone) }
}

/**
 * Formatear teléfono mexicano
 * @param {string} phone - Teléfono a formatear
 * @returns {string} Teléfono formateado
 */
export const formatPhone = (phone) => {
  const clean = phone.replace(/\D/g, '')
  
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
  }
  
  if (clean.length === 12 && clean.startsWith('52')) {
    const national = clean.slice(2)
    return `+52 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
  }
  
  return clean
}

/**
 * Validar coordenadas geográficas
 * @param {number|string} lat - Latitud
 * @param {number|string} lng - Longitud
 * @returns {Object} Resultado de validación
 */
export const validateCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)

  if (isNaN(latitude) || isNaN(longitude)) {
    return { isValid: false, error: 'Coordenadas deben ser números válidos' }
  }

  if (latitude < -90 || latitude > 90) {
    return { isValid: false, error: 'Latitud debe estar entre -90 y 90' }
  }

  if (longitude < -180 || longitude > 180) {
    return { isValid: false, error: 'Longitud debe estar entre -180 y 180' }
  }

  // Validar que esté dentro de México (aproximado)
  const mexicoBounds = {
    north: 32.72,
    south: 14.53,
    east: -86.81,
    west: -118.45
  }

  if (latitude < mexicoBounds.south || latitude > mexicoBounds.north ||
      longitude < mexicoBounds.west || longitude > mexicoBounds.east) {
    return { 
      isValid: true, 
      error: null,
      warning: 'Las coordenadas parecen estar fuera de México'
    }
  }

  return { isValid: true, error: null }
}

/**
 * Validar SKU de producto
 * @param {string} sku - SKU a validar
 * @returns {Object} Resultado de validación
 */
export const validateSKU = (sku) => {
  if (!sku || typeof sku !== 'string') {
    return { isValid: false, error: 'SKU es requerido' }
  }

  const cleanSku = sku.trim().toUpperCase()

  if (cleanSku.length < 3) {
    return { isValid: false, error: 'SKU debe tener al menos 3 caracteres' }
  }

  if (cleanSku.length > 20) {
    return { isValid: false, error: 'SKU no puede tener más de 20 caracteres' }
  }

  // Solo letras, números, guiones y guiones bajos
  const skuRegex = /^[A-Z0-9_-]+$/
  
  if (!skuRegex.test(cleanSku)) {
    return { 
      isValid: false, 
      error: 'SKU solo puede contener letras, números, guiones y guiones bajos' 
    }
  }

  return { isValid: true, error: null, formatted: cleanSku }
}

/**
 * Validar precio
 * @param {number|string} price - Precio a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validatePrice = (price, options = {}) => {
  const { min = 0, max = 999999, allowZero = false } = options

  if (price === '' || price === null || price === undefined) {
    return { isValid: false, error: 'Precio es requerido' }
  }

  const numPrice = parseFloat(price)

  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Precio debe ser un número válido' }
  }

  if (!allowZero && numPrice <= 0) {
    return { isValid: false, error: 'Precio debe ser mayor a 0' }
  }

  if (numPrice < min) {
    return { isValid: false, error: `Precio debe ser mayor a ${min}` }
  }

  if (numPrice > max) {
    return { isValid: false, error: `Precio debe ser menor a ${max}` }
  }

  // Validar decimales (máximo 2)
  const decimals = (numPrice.toString().split('.')[1] || '').length
  if (decimals > 2) {
    return { isValid: false, error: 'Precio no puede tener más de 2 decimales' }
  }

  return { isValid: true, error: null, value: Number(numPrice.toFixed(2)) }
}

/**
 * Validar cantidad/stock
 * @param {number|string} quantity - Cantidad a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateQuantity = (quantity, options = {}) => {
  const { min = 0, max = 999999, allowDecimal = false } = options

  if (quantity === '' || quantity === null || quantity === undefined) {
    return { isValid: false, error: 'Cantidad es requerida' }
  }

  const numQuantity = parseFloat(quantity)

  if (isNaN(numQuantity)) {
    return { isValid: false, error: 'Cantidad debe ser un número válido' }
  }

  if (!allowDecimal && !Number.isInteger(numQuantity)) {
    return { isValid: false, error: 'Cantidad debe ser un número entero' }
  }

  if (numQuantity < min) {
    return { isValid: false, error: `Cantidad debe ser mayor o igual a ${min}` }
  }

  if (numQuantity > max) {
    return { isValid: false, error: `Cantidad debe ser menor o igual a ${max}` }
  }

  return { isValid: true, error: null, value: allowDecimal ? numQuantity : parseInt(numQuantity) }
}

/**
 * Validar nombre de producto
 * @param {string} name - Nombre a validar
 * @returns {Object} Resultado de validación
 */
export const validateProductName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Nombre del producto es requerido' }
  }

  const cleanName = name.trim()

  if (cleanName.length < 2) {
    return { isValid: false, error: 'Nombre debe tener al menos 2 caracteres' }
  }

  if (cleanName.length > 100) {
    return { isValid: false, error: 'Nombre no puede tener más de 100 caracteres' }
  }

  // Validar caracteres permitidos
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.\,\(\)]+$/
  
  if (!nameRegex.test(cleanName)) {
    return { 
      isValid: false, 
      error: 'Nombre contiene caracteres no permitidos' 
    }
  }

  return { isValid: true, error: null, formatted: cleanName }
}

/**
 * Validar fecha
 * @param {string|Date} date - Fecha a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateDate = (date, options = {}) => {
  const { 
    minDate = null, 
    maxDate = null, 
    allowPast = true, 
    allowFuture = true 
  } = options

  if (!date) {
    return { isValid: false, error: 'Fecha es requerida' }
  }

  const dateObj = new Date(date)

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Fecha inválida' }
  }

  const now = new Date()
  
  if (!allowPast && dateObj < now) {
    return { isValid: false, error: 'No se permiten fechas pasadas' }
  }

  if (!allowFuture && dateObj > now) {
    return { isValid: false, error: 'No se permiten fechas futuras' }
  }

  if (minDate && dateObj < new Date(minDate)) {
    return { isValid: false, error: `Fecha debe ser posterior a ${new Date(minDate).toLocaleDateString()}` }
  }

  if (maxDate && dateObj > new Date(maxDate)) {
    return { isValid: false, error: `Fecha debe ser anterior a ${new Date(maxDate).toLocaleDateString()}` }
  }

  return { isValid: true, error: null, value: dateObj }
}

/**
 * Validar URL
 * @param {string} url - URL a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateURL = (url, options = {}) => {
  const { required = false, allowedProtocols = ['http', 'https'] } = options

  if (!url || typeof url !== 'string') {
    if (required) {
      return { isValid: false, error: 'URL es requerida' }
    }
    return { isValid: true, error: null }
  }

  const cleanUrl = url.trim()

  try {
    const urlObj = new URL(cleanUrl)
    
    if (!allowedProtocols.includes(urlObj.protocol.slice(0, -1))) {
      return { 
        isValid: false, 
        error: `Protocolo no permitido. Use: ${allowedProtocols.join(', ')}` 
      }
    }

    return { isValid: true, error: null, formatted: cleanUrl }
  } catch (error) {
    return { isValid: false, error: 'URL inválida' }
  }
}

/**
 * Validar contraseña
 * @param {string} password - Contraseña a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options

  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Contraseña es requerida' }
  }

  if (password.length < minLength) {
    return { isValid: false, error: `Contraseña debe tener al menos ${minLength} caracteres` }
  }

  const checks = []

  if (requireUppercase && !/[A-Z]/.test(password)) {
    checks.push('al menos una letra mayúscula')
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    checks.push('al menos una letra minúscula')
  }

  if (requireNumbers && !/\d/.test(password)) {
    checks.push('al menos un número')
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    checks.push('al menos un carácter especial')
  }

  if (checks.length > 0) {
    return { 
      isValid: false, 
      error: `Contraseña debe contener ${checks.join(', ')}` 
    }
  }

  // Calcular fortaleza
  let strength = 0
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
  if (password.length >= 12) strength++

  const strengthLevels = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte']
  
  return { 
    isValid: true, 
    error: null,
    strength: strengthLevels[Math.min(strength, 4)] || 'Muy débil'
  }
}

/**
 * Validar formulario completo
 * @param {Object} data - Datos del formulario
 * @param {Object} rules - Reglas de validación
 * @returns {Object} Resultado de validación
 */
export const validateForm = (data, rules) => {
  const errors = {}
  const validatedData = {}
  let isValid = true

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field]
    const fieldResult = validateField(value, fieldRules)
    
    if (!fieldResult.isValid) {
      errors[field] = fieldResult.error
      isValid = false
    } else {
      validatedData[field] = fieldResult.value !== undefined ? fieldResult.value : value
    }
  }

  return {
    isValid,
    errors,
    validatedData
  }
}

/**
 * Validar campo individual con reglas
 * @param {*} value - Valor a validar
 * @param {Object} rules - Reglas de validación
 * @returns {Object} Resultado de validación
 */
export const validateField = (value, rules) => {
  const {
    required = false,
    type = 'string',
    min = null,
    max = null,
    pattern = null,
    custom = null,
    ...otherRules
  } = rules

  // Validar requerido
  if (required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: 'Este campo es requerido' }
  }

  // Si no es requerido y está vacío, es válido
  if (!required && (value === null || value === undefined || value === '')) {
    return { isValid: true, error: null }
  }

  // Validar por tipo
  let result
  switch (type) {
    case 'email':
      result = validateEmail(value)
      break
    case 'phone':
      result = validatePhone(value)
      break
    case 'price':
      result = validatePrice(value, { min, max, ...otherRules })
      break
    case 'quantity':
      result = validateQuantity(value, { min, max, ...otherRules })
      break
    case 'url':
      result = validateURL(value, { required, ...otherRules })
      break
    case 'date':
      result = validateDate(value, otherRules)
      break
    case 'password':
      result = validatePassword(value, otherRules)
      break
    case 'coordinates':
      if (Array.isArray(value) && value.length === 2) {
        result = validateCoordinates(value[0], value[1])
      } else {
        result = { isValid: false, error: 'Coordenadas deben ser un array de [lat, lng]' }
      }
      break
    case 'sku':
      result = validateSKU(value)
      break
    case 'product_name':
      result = validateProductName(value)
      break
    case 'string':
    default:
      result = validateString(value, { min, max, pattern })
      break
  }

  if (!result.isValid) {
    return result
  }

  // Validar con función personalizada si existe
  if (custom && typeof custom === 'function') {
    const customResult = custom(result.value || value)
    if (customResult !== true) {
      return { 
        isValid: false, 
        error: typeof customResult === 'string' ? customResult : 'Validación personalizada falló' 
      }
    }
  }

  return result
}

/**
 * Validar string genérico
 * @param {string} value - String a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateString = (value, options = {}) => {
  const { min = null, max = null, pattern = null } = options

  if (typeof value !== 'string') {
    return { isValid: false, error: 'Debe ser texto' }
  }

  const trimmed = value.trim()

  if (min !== null && trimmed.length < min) {
    return { isValid: false, error: `Debe tener al menos ${min} caracteres` }
  }

  if (max !== null && trimmed.length > max) {
    return { isValid: false, error: `No puede tener más de ${max} caracteres` }
  }

  if (pattern && !pattern.test(trimmed)) {
    return { isValid: false, error: 'Formato inválido' }
  }

  return { isValid: true, error: null, value: trimmed }
}

/**
 * Validar número
 * @param {number|string} value - Número a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateNumber = (value, options = {}) => {
  const { 
    min = null, 
    max = null, 
    integer = false, 
    allowNegative = true 
  } = options

  const num = parseFloat(value)

  if (isNaN(num)) {
    return { isValid: false, error: 'Debe ser un número válido' }
  }

  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: 'Debe ser un número entero' }
  }

  if (!allowNegative && num < 0) {
    return { isValid: false, error: 'No se permiten números negativos' }
  }

  if (min !== null && num < min) {
    return { isValid: false, error: `Debe ser mayor o igual a ${min}` }
  }

  if (max !== null && num > max) {
    return { isValid: false, error: `Debe ser menor o igual a ${max}` }
  }

  return { isValid: true, error: null, value: num }
}

/**
 * Sanitizar entrada de texto
 * @param {string} input - Texto a sanitizar
 * @param {Object} options - Opciones de sanitización
 * @returns {string} Texto sanitizado
 */
export const sanitizeInput = (input, options = {}) => {
  if (typeof input !== 'string') return ''

  const {
    trim = true,
    toLowerCase = false,
    toUpperCase = false,
    removeHtml = true,
    removeScripts = true,
    maxLength = null
  } = options

  let sanitized = input

  // Remover HTML tags peligrosos
  if (removeHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }

  // Remover scripts
  if (removeScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  // Trim
  if (trim) {
    sanitized = sanitized.trim()
  }

  // Caso
  if (toLowerCase) {
    sanitized = sanitized.toLowerCase()
  } else if (toUpperCase) {
    sanitized = sanitized.toUpperCase()
  }

  // Limitar longitud
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Validar mensaje de WhatsApp parseado
 * @param {Object} message - Mensaje parseado
 * @returns {Object} Resultado de validación
 */
export const validateWhatsAppMessage = (message) => {
  const errors = []
  const warnings = []

  if (!message || typeof message !== 'object') {
    return { 
      isValid: false, 
      errors: ['Mensaje inválido'], 
      warnings: [] 
    }
  }

  // Validar coordenadas
  if (!message.coordinates) {
    errors.push('No se encontraron coordenadas de entrega')
  } else {
    const coordResult = validateCoordinates(message.coordinates[0], message.coordinates[1])
    if (!coordResult.isValid) {
      errors.push(`Coordenadas inválidas: ${coordResult.error}`)
    }
    if (coordResult.warning) {
      warnings.push(coordResult.warning)
    }
  }

  // Validar productos
  if (!message.products || !Array.isArray(message.products) || message.products.length === 0) {
    errors.push('No se encontraron productos en el mensaje')
  } else {
    message.products.forEach((product, index) => {
      if (!product.name || product.name.trim().length < 2) {
        errors.push(`Producto ${index + 1}: Nombre inválido`)
      }
      
      if (!product.quantity || product.quantity <= 0) {
        errors.push(`Producto ${index + 1}: Cantidad inválida`)
      }
    })
  }

  // Validar información del cliente
  if (!message.customer_info || typeof message.customer_info !== 'object') {
    warnings.push('Información limitada del cliente')
  } else {
    if (message.customer_info.phone) {
      const phoneResult = validatePhone(message.customer_info.phone)
      if (!phoneResult.isValid) {
        warnings.push(`Teléfono del cliente: ${phoneResult.error}`)
      }
    }
  }

  // Validar información de entrega
  if (!message.delivery_info || !message.delivery_info.reference) {
    warnings.push('No se encontró referencia de entrega')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success'
  }
}

/**
 * Validar configuración de predicción
 * @param {Object} config - Configuración de predicción
 * @returns {Object} Resultado de validación
 */
export const validatePredictionConfig = (config) => {
  const errors = []

  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['Configuración inválida'] }
  }

  // Validar días de predicción
  if (config.days_ahead !== undefined) {
    const daysResult = validateNumber(config.days_ahead, { 
      min: 1, 
      max: 365, 
      integer: true, 
      allowNegative: false 
    })
    if (!daysResult.isValid) {
      errors.push(`Días de predicción: ${daysResult.error}`)
    }
  }

  // Validar tipo de modelo
  if (config.model_type && !['auto', 'lstm', 'arima', 'prophet'].includes(config.model_type)) {
    errors.push('Tipo de modelo inválido. Use: auto, lstm, arima, prophet')
  }

  // Validar parámetros específicos
  if (config.seasonality !== undefined && typeof config.seasonality !== 'boolean') {
    errors.push('Parámetro seasonality debe ser boolean')
  }

  if (config.confidence_level !== undefined) {
    const confResult = validateNumber(config.confidence_level, { 
      min: 0.5, 
      max: 0.99, 
      allowNegative: false 
    })
    if (!confResult.isValid) {
      errors.push(`Nivel de confianza: ${confResult.error}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Reglas de validación comunes para formularios
 */
export const commonValidationRules = {
  // Producto
  productName: {
    required: true,
    type: 'product_name'
  },
  
  productSKU: {
    required: true,
    type: 'sku'
  },
  
  productPrice: {
    required: true,
    type: 'price',
    min: 0.01
  },
  
  productStock: {
    required: true,
    type: 'quantity',
    min: 0,
    allowDecimal: false
  },
  
  productMinStock: {
    required: true,
    type: 'quantity',
    min: 0,
    allowDecimal: false
  },
  
  productCategory: {
    required: true,
    type: 'string',
    min: 2,
    max: 50
  },
  
  // Cliente
  customerName: {
    required: true,
    type: 'string',
    min: 2,
    max: 100,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
  },
  
  customerPhone: {
    required: true,
    type: 'phone'
  },
  
  customerEmail: {
    required: false,
    type: 'email'
  },
  
  // Pedido
  orderTotal: {
    required: true,
    type: 'price',
    min: 0.01
  },
  
  deliveryDate: {
    required: true,
    type: 'date',
    allowPast: false
  },
  
  deliveryAddress: {
    required: true,
    type: 'string',
    min: 10,
    max: 200
  },
  
  coordinates: {
    required: true,
    type: 'coordinates'
  },
  
  // Usuario
  userEmail: {
    required: true,
    type: 'email'
  },
  
  userPassword: {
    required: true,
    type: 'password',
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true
  }
}

/**
 * Crear validator personalizado
 * @param {Function} validatorFn - Función de validación
 * @param {string} errorMessage - Mensaje de error por defecto
 * @returns {Function} Validator
 */
export const createValidator = (validatorFn, errorMessage = 'Valor inválido') => {
  return (value, options = {}) => {
    try {
      const result = validatorFn(value, options)
      
      if (typeof result === 'boolean') {
        return {
          isValid: result,
          error: result ? null : (options.errorMessage || errorMessage)
        }
      }
      
      if (typeof result === 'object' && result.hasOwnProperty('isValid')) {
        return result
      }
      
      return {
        isValid: true,
        error: null,
        value: result
      }
    } catch (error) {
      return {
        isValid: false,
        error: error.message || errorMessage
      }
    }
  }
}

/**
 * Validadores específicos del dominio
 */
export const domainValidators = {
  // Validar zona de clustering
  clusterZone: createValidator((zone) => {
    if (!zone || typeof zone !== 'object') return false
    if (!zone.name || zone.name.trim().length < 2) return false
    if (!Array.isArray(zone.coordinates) || zone.coordinates.length === 0) return false
    
    // Validar que todas las coordenadas sean válidas
    for (const coord of zone.coordinates) {
      if (!Array.isArray(coord) || coord.length !== 2) return false
      const coordResult = validateCoordinates(coord[0], coord[1])
      if (!coordResult.isValid) return false
    }
    
    return true
  }, 'Zona de clustering inválida'),
  
  // Validar configuración de inventario
  inventoryConfig: createValidator((config) => {
    if (!config || typeof config !== 'object') return false
    
    const requiredFields = ['reorder_point', 'max_stock', 'lead_time_days']
    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] < 0) return false
    }
    
    return config.reorder_point < config.max_stock
  }, 'Configuración de inventario inválida'),
  
  // Validar horario de entrega
  deliverySchedule: createValidator((schedule) => {
    if (!schedule || typeof schedule !== 'object') return false
    if (!schedule.start_time || !schedule.end_time) return false
    
    const startTime = new Date(`2000-01-01 ${schedule.start_time}`)
    const endTime = new Date(`2000-01-01 ${schedule.end_time}`)
    
    return startTime < endTime
  }, 'Horario de entrega inválido')
}

export default {
  validateEmail,
  validatePhone,
  validateCoordinates,
  validateSKU,
  validatePrice,
  validateQuantity,
  validateProductName,
  validateDate,
  validateURL,
  validatePassword,
  validateForm,
  validateField,
  validateString,
  validateNumber,
  sanitizeInput,
  validateWhatsAppMessage,
  validatePredictionConfig,
  commonValidationRules,
  createValidator,
  domainValidators,
  formatPhone
}