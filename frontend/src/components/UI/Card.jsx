// frontend/src/components/UI/Card.jsx - Componente Card
import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import clsx from 'clsx'

const Card = forwardRef(({ 
  children, 
  className, 
  variant = 'default',
  size = 'default',
  hover = false,
  clickable = false,
  loading = false,
  as: Component = 'div',
  ...props 
}, ref) => {
  const baseClasses = 'bg-white rounded-lg border border-gray-200 transition-all duration-200'
  
  const variants = {
    default: 'shadow-soft',
    elevated: 'shadow-medium',
    outline: 'border-2 border-gray-300 shadow-none',
    ghost: 'bg-transparent border-none shadow-none',
    gradient: 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100'
  }
  
  const sizes = {
    sm: 'p-3',
    default: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }
  
  const hoverEffects = hover ? 'hover:shadow-medium hover:-translate-y-1' : ''
  const clickableEffects = clickable ? 'cursor-pointer hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0' : ''
  
  const cardClasses = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    hoverEffects,
    clickableEffects,
    className
  )

  if (loading) {
    return (
      <Component
        ref={ref}
        className={cardClasses}
        {...props}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </Component>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={hover || clickable ? { y: -2 } : undefined}
      whileTap={clickable ? { y: 0 } : undefined}
      as={Component}
      {...props}
    >
      {children}
    </motion.div>
  )
})

Card.displayName = 'Card'

// Subcomponentes
export const CardHeader = ({ children, className, ...props }) => (
  <div className={clsx('mb-4', className)} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, className, as: Component = 'h3', ...props }) => (
  <Component 
    className={clsx('text-lg font-semibold text-gray-900', className)} 
    {...props}
  >
    {children}
  </Component>
)

export const CardSubtitle = ({ children, className, ...props }) => (
  <p className={clsx('text-sm text-gray-600 mt-1', className)} {...props}>
    {children}
  </p>
)

export const CardContent = ({ children, className, ...props }) => (
  <div className={clsx('text-gray-700', className)} {...props}>
    {children}
  </div>
)

export const CardFooter = ({ children, className, ...props }) => (
  <div className={clsx('mt-4 pt-4 border-t border-gray-200', className)} {...props}>
    {children}
  </div>
)

export default Card