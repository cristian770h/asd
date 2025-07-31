// frontend/src/utils/exportUtils.js - Utilidades para exportar datos
import { formatDate, formatCurrency } from './formatters'

/**
 * Exportar datos a CSV
 * @param {Array} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 */
export const exportToCSV = (data, filename, options = {}) => {
  const {
    delimiter = ',',
    includeHeaders = true,
    dateFormat = 'DD/MM/YYYY',
    encoding = 'utf-8'
  } = options

  try {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar')
    }

    // Obtener headers
    const headers = Object.keys(data[0])
    
    // Construir contenido CSV
    let csvContent = ''
    
    // Agregar headers si es necesario
    if (includeHeaders) {
      csvContent += headers.join(delimiter) + '\n'
    }
    
    // Agregar filas de datos
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header]
        
        // Manejar valores nulos/undefined
        if (value === null || value === undefined) {
          return ''
        }
        
        // Formatear fechas
        if (value instanceof Date) {
          value = formatDate(value, { format: dateFormat })
        }
        
        // Convertir a string y escapar comillas
        value = String(value).replace(/"/g, '""')
        
        // Envolver en comillas si contiene delimiter, nueva línea o comillas
        if (value.includes(delimiter) || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`
        }
        
        return value
      })
      
      csvContent += values.join(delimiter) + '\n'
    })
    
    // Crear y descargar archivo
    downloadFile(csvContent, `${filename}.csv`, 'text/csv', encoding)
    
    return { success: true, message: 'Archivo CSV exportado correctamente' }
  } catch (error) {
    console.error('Error exportando CSV:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exportar reporte de productos
 * @param {Array} products - Lista de productos
 * @param {Object} options - Opciones del reporte
 */
export const exportProductsReport = (products, options = {}) => {
  const {
    format = 'csv',
    includeAnalytics = true,
    includePredictions = false
  } = options

  try {
    // Preparar datos del reporte
    const reportData = products.map(product => ({
      'SKU': product.sku,
      'Nombre': product.name,
      'Categoría': product.category,
      'Precio Unitario': formatCurrency(product.unit_price),
      'Stock Actual': product.stock,
      'Stock Mínimo': product.min_stock,
      'Estado': product.stock <= product.min_stock ? 'Stock Bajo' : 'Normal',
      'Valor Inventario': formatCurrency(product.stock * product.unit_price),
      'Activo': product.is_active ? 'Sí' : 'No',
      'Fecha Creación': formatDate(product.created_at),
      'Última Actualización': formatDate(product.updated_at),
      ...(includeAnalytics && {
        'Ventas 30d': product.sales_last_30 || 0,
        'Tendencia': product.sales_trend > 0 ? 'Creciente' : product.sales_trend < 0 ? 'Decreciente' : 'Estable',
        'Rotación': product.turnover_rate || 0
      }),
      ...(includePredictions && {
        'Demanda Predicha': product.predicted_demand || 0,
        'Stock Recomendado': product.recommended_stock || 0
      })
    }))

    const filename = `reporte_productos_${formatDate(new Date(), { format: 'YYYYMMDD' })}`

    switch (format.toLowerCase()) {
      case 'excel':
        return exportToExcel(reportData, filename, {
          sheetName: 'Productos'
        })
      case 'json':
        return exportToJSON(reportData, filename, {
          metadata: {
            report_type: 'products',
            total_products: products.length,
            include_analytics: includeAnalytics,
            include_predictions: includePredictions,
            generated_by: 'CocoPet ML System'
          }
        })
      default:
        return exportToCSV(reportData, filename)
    }
  } catch (error) {
    console.error('Error exportando reporte de productos:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exportar reporte de pedidos
 * @param {Array} orders - Lista de pedidos
 * @param {Object} options - Opciones del reporte
 */
export const exportOrdersReport = (orders, options = {}) => {
  const {
    format = 'csv',
    includeCustomerInfo = true,
    includeDeliveryInfo = true,
    dateRange = null
  } = options

  try {
    // Filtrar por rango de fechas si se especifica
    let filteredOrders = orders
    if (dateRange && dateRange.start && dateRange.end) {
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= new Date(dateRange.start) && orderDate <= new Date(dateRange.end)
      })
    }

    // Preparar datos del reporte
    const reportData = filteredOrders.map(order => ({
      'ID Pedido': order.id,
      'Fecha': formatDate(order.created_at),
      'Estado': order.status,
      'Total': formatCurrency(order.total),
      'Cantidad Items': order.items?.length || 0,
      ...(includeCustomerInfo && {
        'Cliente': order.customer_name,
        'Teléfono': order.customer_phone,
        'Email': order.customer_email
      }),
      ...(includeDeliveryInfo && {
        'Dirección Entrega': order.delivery_address,
        'Fecha Entrega': order.delivery_date ? formatDate(order.delivery_date) : '',
        'Estado Entrega': order.delivery_status,
        'Coordenadas': order.coordinates ? `${order.coordinates[0]}, ${order.coordinates[1]}` : ''
      }),
      'Método Pago': order.payment_method,
      'Notas': order.notes || '',
      'Creado': formatDate(order.created_at),
      'Actualizado': formatDate(order.updated_at)
    }))

    const filename = `reporte_pedidos_${formatDate(new Date(), { format: 'YYYYMMDD' })}`

    switch (format.toLowerCase()) {
      case 'excel':
        return exportToExcel(reportData, filename, {
          sheetName: 'Pedidos'
        })
      case 'json':
        return exportToJSON(reportData, filename, {
          metadata: {
            report_type: 'orders',
            total_orders: filteredOrders.length,
            date_range: dateRange,
            include_customer_info: includeCustomerInfo,
            include_delivery_info: includeDeliveryInfo,
            generated_by: 'CocoPet ML System'
          }
        })
      default:
        return exportToCSV(reportData, filename)
    }
  } catch (error) {
    console.error('Error exportando reporte de pedidos:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exportar reporte de predicciones
 * @param {Array} predictions - Lista de predicciones
 * @param {Object} options - Opciones del reporte
 */
export const exportPredictionsReport = (predictions, options = {}) => {
  const {
    format = 'csv',
    type = 'daily',
    includeConfidence = true,
    includeMetrics = true
  } = options

  try {
    // Preparar datos del reporte
    const reportData = predictions.map(prediction => ({
      'Fecha': formatDate(prediction.date),
      'Demanda Predicha': prediction.predicted_demand,
      'Tipo': type,
      ...(includeConfidence && {
        'Confianza': `${(prediction.confidence * 100).toFixed(1)}%`,
        'Límite Inferior': prediction.confidence_lower || 0,
        'Límite Superior': prediction.confidence_upper || 0
      }),
      ...(includeMetrics && {
        'Demanda Real': prediction.actual_demand || '',
        'Error': prediction.error || '',
        'Error Absoluto': prediction.absolute_error || '',
        'Precisión': prediction.accuracy ? `${(prediction.accuracy * 100).toFixed(1)}%` : ''
      }),
      'Día Semana': new Date(prediction.date).toLocaleDateString('es-ES', { weekday: 'long' }),
      'Es Fin Semana': prediction.is_weekend ? 'Sí' : 'No',
      'Modelo Usado': prediction.model_version || 'N/A'
    }))

    const filename = `predicciones_${type}_${formatDate(new Date(), { format: 'YYYYMMDD' })}`

    switch (format.toLowerCase()) {
      case 'excel':
        return exportToExcel(reportData, filename, {
          sheetName: 'Predicciones'
        })
      case 'json':
        return exportToJSON(reportData, filename, {
          metadata: {
            report_type: 'predictions',
            prediction_type: type,
            total_predictions: predictions.length,
            include_confidence: includeConfidence,
            include_metrics: includeMetrics,
            generated_by: 'CocoPet ML System'
          }
        })
      default:
        return exportToCSV(reportData, filename)
    }
  } catch (error) {
    console.error('Error exportando reporte de predicciones:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exportar reporte de inventario
 * @param {Array} inventory - Datos de inventario
 * @param {Object} options - Opciones del reporte
 */
export const exportInventoryReport = (inventory, options = {}) => {
  const {
    format = 'csv',
    includeMovements = false,
    includeValuation = true,
    lowStockOnly = false
  } = options

  try {
    let data = inventory
    
    // Filtrar solo stock bajo si se solicita
    if (lowStockOnly) {
      data = inventory.filter(item => item.stock <= item.min_stock)
    }

    // Preparar datos del reporte
    const reportData = data.map(item => ({
      'SKU': item.sku,
      'Producto': item.name,
      'Categoría': item.category,
      'Stock Actual': item.stock,
      'Stock Mínimo': item.min_stock,
      'Estado Stock': item.stock <= item.min_stock ? 'BAJO' : 'NORMAL',
      'Diferencia': item.stock - item.min_stock,
      'Precio Unitario': formatCurrency(item.unit_price),
      ...(includeValuation && {
        'Valor Total': formatCurrency(item.stock * item.unit_price),
        'Costo Unitario': formatCurrency(item.cost_price || 0),
        'Valor Costo': formatCurrency(item.stock * (item.cost_price || 0))
      }),
      'Ubicación': item.location || '',
      'Proveedor': item.supplier || '',
      'Última Actualización': formatDate(item.updated_at),
      ...(includeMovements && {
        'Último Movimiento': item.last_movement ? formatDate(item.last_movement.date) : '',
        'Tipo Movimiento': item.last_movement?.type || '',
        'Cantidad Movimiento': item.last_movement?.quantity || ''
      })
    }))

    const filename = `inventario_${lowStockOnly ? 'stock_bajo_' : ''}${formatDate(new Date(), { format: 'YYYYMMDD' })}`

    switch (format.toLowerCase()) {
      case 'excel':
        return exportToExcel(reportData, filename, {
          sheetName: 'Inventario'
        })
      case 'json':
        return exportToJSON(reportData, filename, {
          metadata: {
            report_type: 'inventory',
            total_items: data.length,
            low_stock_only: lowStockOnly,
            include_movements: includeMovements,
            include_valuation: includeValuation,
            generated_by: 'CocoPet ML System'
          }
        })
      default:
        return exportToCSV(reportData, filename)
    }
  } catch (error) {
    console.error('Error exportando reporte de inventario:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Función de utilidad para descargar archivos
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} encoding - Codificación del archivo
 */
const downloadFile = (content, filename, mimeType = 'text/plain', encoding = 'utf-8') => {
  try {
    // Crear blob con el contenido
    const blob = new Blob([content], { 
      type: `${mimeType};charset=${encoding}` 
    })
    
    // Crear URL temporal
    const url = window.URL.createObjectURL(blob)
    
    // Crear elemento link temporal
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    // Agregar al DOM, hacer click y remover
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Limpiar URL temporal
    window.URL.revokeObjectURL(url)
    
    console.log(`Archivo ${filename} descargado exitosamente`)
  } catch (error) {
    console.error('Error descargando archivo:', error)
    throw new Error(`Error descargando archivo: ${error.message}`)
  }
}

/**
 * Obtener estadísticas de exportación
 * @param {Array} data - Datos a analizar
 * @returns {Object} Estadísticas
 */
export const getExportStats = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      totalRecords: 0,
      estimatedSize: '0 KB',
      columns: 0,
      dataTypes: {}
    }
  }

  const totalRecords = data.length
  const columns = Object.keys(data[0]).length
  
  // Estimar tamaño aproximado
  const sampleJson = JSON.stringify(data.slice(0, Math.min(10, data.length)))
  const avgRecordSize = sampleJson.length / Math.min(10, data.length)
  const estimatedBytes = avgRecordSize * totalRecords
  const estimatedSize = formatBytes(estimatedBytes)
  
  // Analizar tipos de datos
  const dataTypes = {}
  Object.keys(data[0]).forEach(key => {
    const sampleValue = data[0][key]
    if (sampleValue === null || sampleValue === undefined) {
      dataTypes[key] = 'null'
    } else if (typeof sampleValue === 'number') {
      dataTypes[key] = 'number'
    } else if (sampleValue instanceof Date) {
      dataTypes[key] = 'date'
    } else if (typeof sampleValue === 'boolean') {
      dataTypes[key] = 'boolean'
    } else {
      dataTypes[key] = 'string'
    }
  })

  return {
    totalRecords,
    estimatedSize,
    columns,
    dataTypes
  }
}

/**
 * Formatear bytes a tamaño legible
 * @param {number} bytes - Número de bytes
 * @returns {string} Tamaño formateado
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validar datos antes de exportar
 * @param {Array} data - Datos a validar
 * @returns {Object} Resultado de validación
 */
export const validateExportData = (data) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  }

  try {
    // Verificar que sea array
    if (!Array.isArray(data)) {
      validation.isValid = false
      validation.errors.push('Los datos deben ser un array')
      return validation
    }

    // Verificar que no esté vacío
    if (data.length === 0) {
      validation.warnings.push('No hay datos para exportar')
      return validation
    }

    // Verificar consistencia de estructura
    const firstKeys = Object.keys(data[0])
    let inconsistentStructure = false
    
    for (let i = 1; i < Math.min(data.length, 100); i++) {
      const currentKeys = Object.keys(data[i])
      if (JSON.stringify(firstKeys.sort()) !== JSON.stringify(currentKeys.sort())) {
        inconsistentStructure = true
        break
      }
    }

    if (inconsistentStructure) {
      validation.warnings.push('Estructura inconsistente detectada en los datos')
    }

    // Verificar tamaño
    const stats = getExportStats(data)
    if (stats.totalRecords > 100000) {
      validation.warnings.push(`Gran cantidad de registros (${stats.totalRecords}). La exportación puede ser lenta.`)
    }

    return validation
  } catch (error) {
    validation.isValid = false
    validation.errors.push(`Error validando datos: ${error.message}`)
    return validation
  }
}

export default {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportProductsReport,
  exportOrdersReport,
  exportPredictionsReport,
  exportInventoryReport,
  getExportStats,
  validateExportData,
  downloadFile: downloadFile
}
  }
}

/**
 * Exportar datos a Excel (usando CSV como fallback)
 * @param {Array} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 */
export const exportToExcel = (data, filename, options = {}) => {
  const {
    sheetName = 'Datos',
    includeHeaders = true,
    autoWidth = true
  } = options

  try {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar')
    }

   
    console.warn('Exportación a Excel usando formato CSV. Para Excel nativo, instalar librería xlsx.')
    
    const result = exportToCSV(data, filename, {
      ...options,
      delimiter: '\t' // Usar tabs para mejor compatibilidad con Excel
    })
    
    if (result.success) {
      return { success: true, message: 'Archivo Excel exportado correctamente' }
    }
    
    return result
  } catch (error) {
    console.error('Error exportando Excel:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Exportar datos a JSON
 * @param {Array} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 */
export const exportToJSON = (data, filename, options = {}) => {
  const {
    indent = 2,
    metadata = null
  } = options

  try {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para exportar')
    }

    // Preparar datos para exportación
    const exportData = {
      ...(metadata && { metadata }),
      data: data,
      exported_at: new Date().toISOString(),
      total_records: data.length
    }

    // Convertir a JSON
    const jsonContent = JSON.stringify(exportData, null, indent)
    
    // Descargar archivo
    downloadFile(jsonContent, `${filename}.json`, 'application/json')
    
    return { success: true, message: 'Archivo JSON exportado correctamente' }
  } catch (error) {
    console.error('Error exportando JSON:', error)
    return { success: false, error: error.message }