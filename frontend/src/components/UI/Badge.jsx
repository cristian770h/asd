// frontend/src/components/UI/Badge.jsx - Componente de Badge
import React from 'react'
import { X } from 'lucide-react'

const Badge = ({
  children,
  variant = 'default', // 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray'
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg'
  shape = 'rounded', // 'rounded' | 'pill' | 'square'
  removable = false,
  onRemove,
  disabled = false,
  icon: Icon,
  iconPosition = 'left', // 'left' | 'right'
  dot = false,
  outline = false,
  className = '',
  ...props
}) => {
  // Classes base
  const baseClasses = {
    badge: 'inline-flex items-center font-medium transition-colors duration-150',
    icon: 'flex-shrink-0',
    dot: 'w-2 h-2 rounded-full mr-1.5',
    removeButton: 'ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5 transition-colors duration-150'
  }

  // Classes por variante
  const variantClasses = {
    default: outline ? 
      'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50' : 
      'bg-gray-100 text-gray-800 hover:bg-gray-200',
    
    primary: outline ? 
      'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50' : 
      'bg-blue-100 text-blue-800 hover:bg-blue-200',
    
    secondary: outline ? 
      'bg-white text-purple-700 border border-purple-300 hover:bg-purple-50' : 
      'bg-purple-100 text-purple-800 hover:bg-purple-200',
    
    success: outline ? 
      'bg-white text-green-700 border border-green-300 hover:bg-green-50' : 
      'bg-green-100 text-green-800 hover:bg-green-200',
    
    warning: outline ? 
      'bg-white text-yellow-700 border border-yellow-300 hover:bg-yellow-50' : 
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    
    error: outline ? 
      'bg-white text-red-700 border border-red-300 hover:bg-red-50' : 
      'bg-red-100 text-red-800 hover:bg-red-200',
    
    info: outline ? 
      'bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-50' : 
      'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
    
    gray: outline ? 
      'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' : 
      'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }

  // Classes para dots
  const dotClasses = {
    default: 'bg-gray-400',
    primary: 'bg-blue-500',
    secondary: 'bg-purple-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-cyan-500',
    gray: 'bg-gray-400'
  }

  // Classes por tamaño
  const sizeClasses = {
    xs: {
      badge: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
      iconSpacing: dot ? '' : iconPosition === 'left' ? 'mr-1' : 'ml-1',
      removeIcon: 'w-3 h-3'
    },
    sm: {
      badge: 'px-2.5 py-0.5 text-xs',
      icon: 'w-3 h-3',
      iconSpacing: dot ? '' : iconPosition === 'left' ? 'mr-1' : 'ml-1',
      removeIcon: 'w-3 h-3'
    },
    md: {
      badge: 'px-2.5 py-1 text-sm',
      icon: 'w-4 h-4',
      iconSpacing: dot ? '' : iconPosition === 'left' ? 'mr-1.5' : 'ml-1.5',
      removeIcon: 'w-4 h-4'
    },
    lg: {
      badge: 'px-3 py-1.5 text-base',
      icon: 'w-5 h-5',
      iconSpacing: dot ? '' : iconPosition === 'left' ? 'mr-2' : 'ml-2',
      removeIcon: 'w-4 h-4'
    }
  }

  // Classes por forma
  const shapeClasses = {
    rounded: 'rounded-md',
    pill: 'rounded-full',
    square: 'rounded-none'
  }

  // Construir classes finales
  const badgeClasses = [
    baseClasses.badge,
    variantClasses[variant],
    sizeClasses[size].badge,
    shapeClasses[shape],
    disabled ? 'opacity-50 cursor-not-allowed' : removable ? 'cursor-pointer' : '',
    className
  ].filter(Boolean).join(' ')

  // Manejar click de remove
  const handleRemove = (e) => {
    if (disabled) return
    e.stopPropagation()
    onRemove?.(e)
  }

  // Renderizar contenido
  const renderContent = () => {
    return (
      <>
        {/* Dot indicator */}
        {dot && (
          <span className={`${baseClasses.dot} ${dotClasses[variant]}`} />
        )}

        {/* Icono izquierdo */}
        {Icon && iconPosition === 'left' && (
          <Icon className={`
            ${baseClasses.icon} 
            ${sizeClasses[size].icon} 
            ${sizeClasses[size].iconSpacing}
          `} />
        )}

        {/* Contenido */}
        <span>{children}</span>

        {/* Icono derecho */}
        {Icon && iconPosition === 'right' && (
          <Icon className={`
            ${baseClasses.icon} 
            ${sizeClasses[size].icon} 
            ${sizeClasses[size].iconSpacing}
          `} />
        )}

        {/* Botón de remove */}
        {removable && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className={baseClasses.removeButton}
            aria-label="Remover"
          >
            <X className={sizeClasses[size].removeIcon} />
          </button>
        )}
      </>
    )
  }

  // Si es removable, renderizar como button, sino como span
  if (removable && !disabled) {
    return (
      <button
        type="button"
        className={badgeClasses}
        onClick={onRemove}
        {...props}
      >
        {renderContent()}
      </button>
    )
  }

  return (
    <span className={badgeClasses} {...props}>
      {renderContent()}
    </span>
  )
}

// Componentes específicos para mayor conveniencia
export const StatusBadge = ({ status, ...props }) => {
  const statusConfig = {
    active: { variant: 'success', children: 'Activo' },
    inactive: { variant: 'gray', children: 'Inactivo' },
    pending: { variant: 'warning', children: 'Pendiente' },
    completed: { variant: 'success', children: 'Completado' },
    cancelled: { variant: 'error', children: 'Cancelado' },
    processing: { variant: 'info', children: 'Procesando' },
    draft: { variant: 'gray', children: 'Borrador' },
    published: { variant: 'primary', children: 'Publicado' },
    archived: { variant: 'gray', children: 'Archivado' }
  }

  const config = statusConfig[status] || { variant: 'default', children: status }
  
  return <Badge {...config} {...props} />
}

export const PriorityBadge = ({ priority, ...props }) => {
  const priorityConfig = {
    low: { variant: 'info', children: 'Baja' },
    medium: { variant: 'warning', children: 'Media' },
    high: { variant: 'error', children: 'Alta' },
    urgent: { variant: 'error', children: 'Urgente', dot: true },
    critical: { variant: 'error', children: 'Crítica', dot: true }
  }

  const config = priorityConfig[priority] || { variant: 'default', children: priority }
  
  return <Badge {...config} {...props} />
}

export const StockBadge = ({ status, count, minStock, ...props }) => {
  let variant = 'success'
  let children = 'Normal'

  if (count === 0) {
    variant = 'error'
    children = 'Agotado'
  } else if (count <= minStock) {
    variant = 'warning'
    children = 'Stock Bajo'
  }

  return <Badge variant={variant} {...props}>{children}</Badge>
}

export const TrendBadge = ({ trend, value, ...props }) => {
  const trendConfig = {
    up: { variant: 'success', icon: '↗', children: value ? `+${value}%` : 'Creciendo' },
    down: { variant: 'error', icon: '↘', children: value ? `${value}%` : 'Decreciendo' },
    stable: { variant: 'gray', icon: '→', children: 'Estable' }
  }

  const config = trendConfig[trend] || { variant: 'default', children: trend }
  
  return (
    <Badge variant={config.variant} {...props}>
      <span className="mr-1">{config.icon}</span>
      {config.children}
    </Badge>
  )
}

export const CountBadge = ({ count, max, variant = 'primary', ...props }) => {
  const displayCount = max && count > max ? `${max}+` : count

  return (
    <Badge 
      variant={variant} 
      size="xs" 
      shape="pill" 
      {...props}
    >
      {displayCount}
    </Badge>
  )
}

export const CategoryBadge = ({ category, color, ...props }) => {
  // Mapear categorías a colores si no se especifica
  const categoryColors = {
    'alimento': 'success',
    'juguete': 'warning', 
    'accesorio': 'info',
    'higiene': 'secondary',
    'medicina': 'error',
    'collar': 'primary'
  }

  const variant = color || categoryColors[category?.toLowerCase()] || 'default'

  return (
    <Badge variant={variant} size="sm" {...props}>
      {category}
    </Badge>
  )
}

export const NewBadge = ({ isNew = true, ...props }) => {
  if (!isNew) return null
  
  return (
    <Badge 
      variant="primary" 
      size="xs" 
      shape="pill" 
      dot 
      {...props}
    >
      Nuevo
    </Badge>
  )
}

export const DiscountBadge = ({ discount, ...props }) => {
  if (!discount || discount <= 0) return null
  
  return (
    <Badge 
      variant="error" 
      size="sm" 
      shape="pill" 
      {...props}
    >
      -{discount}%
    </Badge>
  )
}

// Componente de Badge con tooltip
export const BadgeWithTooltip = ({ tooltip, children, ...props }) => {
  return (
    <div className="relative group">
      <Badge {...props}>{children}</Badge>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      )}
    </div>
  )
}

// Grupo de badges
export const BadgeGroup = ({ 
  badges = [], 
  max = null, 
  spacing = 'gap-1',
  className = '',
  ...props 
}) => {
  const displayBadges = max ? badges.slice(0, max) : badges
  const remainingCount = max && badges.length > max ? badges.length - max : 0

  return (
    <div className={`flex flex-wrap items-center ${spacing} ${className}`} {...props}>
      {displayBadges.map((badge, index) => (
        <Badge key={index} {...badge} />
      ))}
      {remainingCount > 0 && (
        <Badge variant="gray" size="xs">
          +{remainingCount}
        </Badge>
      )}
    </div>
  )
}

export default Badge