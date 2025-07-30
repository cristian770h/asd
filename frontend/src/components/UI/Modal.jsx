// frontend/src/components/UI/Modal.jsx - Componente Modal
import { Fragment, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'default',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className,
  overlayClassName,
  contentClassName
}) => {
  // Manejar tecla Escape
  useEffect(() => {
    const handleEsc = (event) => {
      if (closeOnEsc && event.keyCode === 27 && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEsc])

  // Definir tamaños
  const sizes = {
    xs: 'max-w-md',
    sm: 'max-w-lg',
    default: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-screen-xl mx-4'
  }

  // Variantes de animación
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            className={clsx(
              'fixed inset-0 bg-black bg-opacity-50 transition-opacity',
              overlayClassName
            )}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              className={clsx(
                'relative w-full bg-white rounded-xl shadow-xl',
                sizes[size],
                className
              )}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  {title && (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h3>
                  )}
                  
                  {showCloseButton && (
                    <motion.button
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={onClose}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={clsx('p-6', contentClassName)}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )

  // Renderizar en portal
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}

// Componentes de modal específicos
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>
        
        <div className="flex space-x-3 justify-end">
          <motion.button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {cancelText}
          </motion.button>
          
          <motion.button
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              variantStyles[variant]
            )}
            onClick={handleConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmText}
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}

export const AlertModal = ({
  isOpen,
  onClose,
  title = 'Información',
  message,
  type = 'info'
}) => {
  const typeStyles = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        <p className={clsx('font-medium', typeStyles[type])}>
          {message}
        </p>
        
        <div className="flex justify-end">
          <motion.button
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Entendido
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}

export default Modal