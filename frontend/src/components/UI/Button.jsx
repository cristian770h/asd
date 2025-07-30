// frontend/src/components/UI/Button.jsx - Componente Button
import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

const Button = forwardRef(({
  children,
  className,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  as: Component = 'button',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-sm hover:shadow-md',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm hover:shadow-md',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 shadow-sm hover:shadow-md',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500',
    link: 'text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline focus:ring-primary-500'
  }
  
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  }

  const isDisabled = disabled || loading
  
  const buttonClasses = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className
  )

  const renderIcon = (position) => {
    if (!icon || iconPosition !== position) return null
    
    return (
      <span className={clsx(
        'flex-shrink-0',
        position === 'left' && children && 'mr-2',
        position === 'right' && children && 'ml-2'
      )}>
        {icon}
      </span>
    )
  }

  const buttonContent = (
    <>
      {loading && (
        <Loader2 className={clsx(
          'animate-spin flex-shrink-0',
          children && 'mr-2',
          size === 'xs' && 'h-3 w-3',
          size === 'sm' && 'h-4 w-4',
          (size === 'default' || size === 'lg') && 'h-4 w-4',
          size === 'xl' && 'h-5 w-5'
        )} />
      )}
      
      {!loading && renderIcon('left')}
      
      {children && (
        <span className={loading ? 'opacity-70' : ''}>
          {children}
        </span>
      )}
      
      {!loading && renderIcon('right')}
    </>
  )

  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Component
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </Component>
    </motion.div>
  )
})

Button.displayName = 'Button'

// Variantes específicas para casos comunes
export const PrimaryButton = (props) => <Button variant="primary" {...props} />
export const SecondaryButton = (props) => <Button variant="secondary" {...props} />
export const DangerButton = (props) => <Button variant="danger" {...props} />
export const SuccessButton = (props) => <Button variant="success" {...props} />
export const GhostButton = (props) => <Button variant="ghost" {...props} />
export const OutlineButton = (props) => <Button variant="outline" {...props} />
export const LinkButton = (props) => <Button variant="link" {...props} />

export default Button