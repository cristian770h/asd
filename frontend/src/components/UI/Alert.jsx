// frontend/src/components/UI/Alert.jsx - Componente Alert
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const Alert = ({
  children,
  type = 'info',
  title,
  dismissible = false,
  onDismiss,
  className,
  icon: CustomIcon,
  actions
}) => {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  // Configuración de tipos
  const alertConfig = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      titleColor: 'text-green-900',
      icon: CheckCircle,
      iconColor: 'text-green-500'
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      titleColor: 'text-red-900',
      icon: AlertCircle,
      iconColor: 'text-red-500'
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      titleColor: 'text-yellow-900',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500'
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      titleColor: 'text-blue-900',
      icon: Info,
      iconColor: 'text-blue-500'
    }
  }

  const config = alertConfig[type]
  const IconComponent = CustomIcon || config.icon

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={clsx(
            'rounded-lg border p-4',
            config.bgColor,
            config.borderColor,
            className
          )}
        >
          <div className="flex">
            {/* Icon */}
            <div className="flex-shrink-0">
              <IconComponent className={clsx('h-5 w-5', config.iconColor)} />
            </div>

            {/* Content */}
            <div className="ml-3 flex-1">
              {/* Title */}
              {title && (
                <h3 className={clsx('text-sm font-medium', config.titleColor)}>
                  {title}
                </h3>
              )}

              {/* Message */}
              <div className={clsx(
                'text-sm',
                config.textColor,
                title ? 'mt-1' : ''
              )}>
                {children}
              </div>

              {/* Actions */}
              {actions && (
                <div className="mt-3 flex space-x-2">
                  {actions}
                </div>
              )}
            </div>

            {/* Dismiss button */}
            {dismissible && (
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <motion.button
                    type="button"
                    className={clsx(
                      'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors',
                      config.textColor,
                      'hover:bg-black hover:bg-opacity-10',
                      'focus:ring-offset-2'
                    )}
                    onClick={handleDismiss}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="sr-only">Cerrar</span>
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Componentes específicos para cada tipo
export const SuccessAlert = (props) => <Alert type="success" {...props} />
export const ErrorAlert = (props) => <Alert type="error" {...props} />
export const WarningAlert = (props) => <Alert type="warning" {...props} />
export const InfoAlert = (props) => <Alert type="info" {...props} />

// Alert Toast para notificaciones temporales
export const AlertToast = ({ 
  isVisible, 
  onDismiss, 
  duration = 5000, 
  position = 'top-right',
  ...props 
}) => {
  const [shouldShow, setShouldShow] = useState(isVisible)

  // Auto-dismiss después del tiempo especificado
  useState(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setShouldShow(false)
        if (onDismiss) onDismiss()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onDismiss])

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className={clsx('fixed z-50 max-w-sm w-full', positionClasses[position])}
          initial={{ opacity: 0, y: position.includes('top') ? -20 : 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position.includes('top') ? -20 : 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Alert
            dismissible
            onDismiss={() => {
              setShouldShow(false)
              if (onDismiss) onDismiss()
            }}
            className="shadow-lg"
            {...props}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Alert inline para formularios
export const InlineAlert = ({ show, className, ...props }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        <Alert {...props} />
      </motion.div>
    )}
  </AnimatePresence>
)

// Alert con progreso para procesos largos
export const ProgressAlert = ({ 
  progress = 0, 
  title, 
  description,
  type = 'info',
  showProgress = true,
  ...props 
}) => {
  const progressPercentage = Math.min(100, Math.max(0, progress))

  return (
    <Alert type={type} title={title} {...props}>
      <div className="space-y-2">
        {description && <p>{description}</p>}
        
        {showProgress && (
          <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
              <span>Progreso</span>
              <span>{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-primary-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </Alert>
  )
}

// Alert con lista de elementos
export const ListAlert = ({ 
  items = [], 
  title, 
  type = 'info',
  maxItems = 5,
  showCount = true,
  ...props 
}) => {
  const displayItems = items.slice(0, maxItems)
  const remainingCount = items.length - maxItems

  return (
    <Alert type={type} title={title} {...props}>
      <div className="space-y-2">
        {displayItems.length > 0 && (
          <ul className="list-disc list-inside space-y-1 text-sm">
            {displayItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
        
        {remainingCount > 0 && (
          <p className="text-sm font-medium">
            y {remainingCount} elemento{remainingCount !== 1 ? 's' : ''} más...
          </p>
        )}
        
        {showCount && items.length > 0 && (
          <p className="text-xs opacity-75">
            Total: {items.length} elemento{items.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Alert>
  )
}

export default Alert