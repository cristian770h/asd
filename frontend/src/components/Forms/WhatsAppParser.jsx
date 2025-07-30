// frontend/src/components/Forms/WhatsAppParser.jsx - Parser de WhatsApp
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  MapPin,
  Package,
  User,
  DollarSign,
  Copy,
  RefreshCw,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import Alert from '@/components/UI/Alert'
import { ordersAPI } from '@/services/api'
import { formatCurrency, formatCoordinates } from '@/utils/formatters'

const WhatsAppParser = ({ onOrderCreated, className }) => {
  const [message, setMessage] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [validation, setValidation] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)

  const handleParseMessage = async () => {
    if (!message.trim()) {
      toast.error('Ingresa un mensaje para parsear')
      return
    }

    setIsParsing(true)
    setParsedData(null)
    setValidation(null)

    try {
      const result = await ordersAPI.parseWhatsApp({ message })
      
      if (result.success) {
        setParsedData(result.data.parsed_data)
        setValidation(result.data.validation)
        
        if (result.data.validation.is_valid) {
          toast.success('Mensaje parseado exitosamente')
        } else {
          toast.warning('Mensaje parseado con advertencias')
        }
      } else {
        throw new Error(result.error || 'Error parseando mensaje')
      }
    } catch (error) {
      console.error('Error parseando mensaje:', error)
      toast.error('Error parseando mensaje: ' + error.message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!parsedData || !validation?.is_valid) {
      toast.error('Los datos parseados no son válidos para crear un pedido')
      return
    }

    setIsCreatingOrder(true)

    try {
      const result = await ordersAPI.createFromWhatsApp({ 
        parsed_data: parsedData 
      })
      
      if (result.success) {
        toast.success(`${result.data.length} pedidos creados exitosamente`)
        
        // Limpiar formulario
        setMessage('')
        setParsedData(null)
        setValidation(null)
        
        // Notificar al componente padre
        if (onOrderCreated) {
          onOrderCreated(result.data)
        }
      } else {
        throw new Error(result.error || 'Error creando pedidos')
      }
    } catch (error) {
      console.error('Error creando pedidos:', error)
      toast.error('Error creando pedidos: ' + error.message)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handleCopyExample = () => {
    const example = `Ubicación: https://maps.google.com/?q=21.1619,-86.8515
Cliente: 123
nupec adulto 20kg
cantidad: 2
precio: $3600
ref: casa azul`
    
    setMessage(example)
    navigator.clipboard.writeText(example)
    toast.success('Ejemplo copiado al portapapeles')
  }

  const getParsingScore = () => {
    if (!parsedData) return 0
    return Math.round((parsedData.confidence || 0) * 100)
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={className}>
      <Card>
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary-500" />
          <h3 className="font-semibold text-gray-900">Parser de WhatsApp</h3>
          <div className="flex-1"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyExample}
            icon={<Copy className="h-4 w-4" />}
          >
            Ejemplo
          </Button>
        </div>

        {/* Área de entrada de mensaje */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje de WhatsApp
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pega aquí el mensaje de WhatsApp con el pedido...

Ejemplo:
Ubicación: https://maps.google.com/?q=21.1619,-86.8515
Cliente: 123
nupec adulto 20kg cantidad: 2 precio: $3600
ref: casa azul"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleParseMessage}
              loading={isParsing}
              icon={<Zap className="h-4 w-4" />}
              disabled={!message.trim()}
            >
              Parsear Mensaje
            </Button>

            {parsedData && (
              <Button
                variant="secondary"
                onClick={() => {
                  setMessage('')
                  setParsedData(null)
                  setValidation(null)
                }}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Resultados del parsing */}
        <AnimatePresence>
          {parsedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 space-y-4"
            >
              {/* Score de confianza */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Precisión del parsing:
                </span>
                <span className={`text-lg font-bold ${getScoreColor(getParsingScore())}`}>
                  {getParsingScore()}%
                </span>
              </div>

              {/* Validación */}
              {validation && (
                <div className="space-y-2">
                  {validation.is_valid ? (
                    <Alert 
                      type="success" 
                      title="Datos válidos"
                      icon={<CheckCircle className="h-5 w-5" />}
                    >
                      El mensaje fue parseado correctamente y está listo para crear el pedido.
                    </Alert>
                  ) : (
                    <Alert 
                      type="warning" 
                      title="Datos incompletos"
                      icon={<AlertTriangle className="h-5 w-5" />}
                    >
                      <div className="space-y-2">
                        <p>Se encontraron los siguientes problemas:</p>
                        <ul className="list-disc list-inside text-sm">
                          {validation.errors?.map((error, index) => (
                            <li key={index} className="text-red-600">{error}</li>
                          ))}
                          {validation.warnings?.map((warning, index) => (
                            <li key={index} className="text-yellow-600">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </Alert>
                  )}
                </div>
              )}

              {/* Datos extraídos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ubicación */}
                <Card variant="outline">
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium text-gray-900">Ubicación</h4>
                  </div>
                  
                  {parsedData.coordinates ? (
                    <div className="text-sm space-y-1">
                      <p className="font-mono text-green-600">
                        {formatCoordinates(parsedData.coordinates[0], parsedData.coordinates[1])}
                      </p>
                      <p className="text-gray-600">Coordenadas válidas</p>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">No se encontraron coordenadas</p>
                  )}
                </Card>

                {/* Cliente */}
                <Card variant="outline">
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium text-gray-900">Cliente</h4>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    {parsedData.client_number ? (
                      <p><strong>Número:</strong> {parsedData.client_number}</p>
                    ) : (
                      <p className="text-gray-500">No especificado</p>
                    )}
                    
                    {parsedData.references && (
                      <p><strong>Referencias:</strong> {parsedData.references}</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Productos */}
              <Card variant="outline">
                <div className="flex items-center space-x-2 mb-3">
                  <Package className="h-4 w-4 text-purple-500" />
                  <h4 className="font-medium text-gray-900">Productos</h4>
                </div>
                
                {parsedData.products && parsedData.products.length > 0 ? (
                  <div className="space-y-2">
                    {parsedData.products.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">
                            {product.brand} • Cantidad: {product.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(product.price)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Confianza: {Math.round(product.confidence * 100)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-600">No se encontraron productos válidos</p>
                )}
              </Card>

              {/* Precio total */}
              {parsedData.total_price && (
                <Card variant="outline">
                  <div className="flex items-center space-x-2 mb-3">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium text-gray-900">Precio Total</h4>
                  </div>
                  
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(parsedData.total_price)}
                  </p>
                </Card>
              )}

              {/* Sugerencias de corrección */}
              {validation?.suggested_corrections && validation.suggested_corrections.length > 0 && (
                <Card variant="outline" className="bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-3">Productos Sugeridos</h4>
                  <div className="space-y-2">
                    {validation.suggested_corrections.map((suggestion, index) => (
                      <div key={index} className="text-sm">
                        <p className="text-blue-800">
                          "<strong>{suggestion.original_text}</strong>" podría ser:
                        </p>
                        <p className="text-blue-600 ml-4">
                          → {suggestion.suggested_product} ({suggestion.brand})
                          <span className="text-blue-500 ml-2">
                            {suggestion.similarity_score}% similar
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Botón para crear pedido */}
              {validation?.is_valid && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={handleCreateOrder}
                    loading={isCreatingOrder}
                    icon={<Send className="h-4 w-4" />}
                    size="lg"
                  >
                    Crear Pedido{parsedData.products?.length > 1 ? 's' : ''}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}

export default WhatsAppParser