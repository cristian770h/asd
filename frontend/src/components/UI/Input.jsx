// frontend/src/components/UI/Input.jsx - Componente de Input
import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle, Search, X } from 'lucide-react'

const Input = forwardRef(({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  onClear,
  placeholder,
  disabled = false,
  required = false,
  error,
  success,
  helperText,
  icon: Icon,
  iconPosition = 'left', // 'left' | 'right'
  clearable = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'default', // 'default' | 'filled' | 'outlined'
  fullWidth = true,
  autoComplete,
  autoFocus = false,
  maxLength,
  minLength,
  pattern,
  step,
  min,
  max,
  rows = 3,
  className = '',
  containerClassName = '',
  labelClassName = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Determinar el tipo de input real
  const inputType = type === 'password' && showPassword ? 'text' : type

  // Classes base
  const baseClasses = {
    container: 'relative',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    input: `
      block border transition-colors duration-200 focus:outline-none
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 
        success ? 'border-green-500 focus:border-green-500 focus:ring-green-500' :
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
    `,
    inputWrapper: 'relative',
    icon: 'absolute top-1/2 transform -translate-y-1/2 text-gray-400',
    clearButton: 'absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer',
    passwordToggle: 'absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer',
    helperText: 'mt-1 text-sm',
    counter: 'mt-1 text-xs text-gray-500 text-right'
  }

  // Classes por tamaño
  const sizeClasses = {
    sm: {
      input: 'px-3 py-1.5 text-sm rounded-md',
      icon: 'w-4 h-4',
      iconLeft: 'left-3',
      iconRight: 'right-3',
      paddingLeft: 'pl-9',
      paddingRight: 'pr-9'
    },
    md: {
      input: 'px-3 py-2 text-sm rounded-md',
      icon: 'w-5 h-5',
      iconLeft: 'left-3',
      iconRight: 'right-3',
      paddingLeft: 'pl-10',
      paddingRight: 'pr-10'
    },
    lg: {
      input: 'px-4 py-3 text-base rounded-lg',
      icon: 'w-5 h-5',
      iconLeft: 'left-4',
      iconRight: 'right-4',
      paddingLeft: 'pl-11',
      paddingRight: 'pr-11'
    }
  }

  // Classes por variante
  const variantClasses = {
    default: 'bg-white',
    filled: 'bg-gray-50 border-transparent focus:bg-white',
    outlined: 'bg-transparent'
  }

  // Construir classes del input
  const inputClasses = [
    baseClasses.input,
    sizeClasses[size].input,
    variantClasses[variant],
    fullWidth ? 'w-full' : '',
    Icon && iconPosition === 'left' ? sizeClasses[size].paddingLeft : '',
    (Icon && iconPosition === 'right') || type === 'password' || clearable ? sizeClasses[size].paddingRight : '',
    isFocused ? 'ring-2 ring-opacity-50' : '',
    className
  ].filter(Boolean).join(' ')

  // Manejar cambios
  const handleChange = (e) => {
    if (onChange) {
      onChange(e)
    }
  }

  // Manejar focus
  const handleFocus = (e) => {
    setIsFocused(true)
    if (onFocus) {
      onFocus(e)
    }
  }

  // Manejar blur
  const handleBlur = (e) => {
    setIsFocused(false)
    if (onBlur) {
      onBlur(e)
    }
  }

  // Manejar clear
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else if (onChange) {
      onChange({ target: { value: '' } })
    }
  }

  // Contador de caracteres
  const showCounter = maxLength && (type === 'text' || type === 'textarea')
  const currentLength = value ? value.toString().length : 0

  return (
    <div className={`${baseClasses.container} ${containerClassName}`}>
      {/* Label */}
      {label && (
        <label 
          className={`${baseClasses.label} ${labelClassName}`}
          htmlFor={props.id || props.name}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className={baseClasses.inputWrapper}>
        {/* Icon izquierdo */}
        {Icon && iconPosition === 'left' && (
          <Icon className={`
            ${baseClasses.icon} 
            ${sizeClasses[size].icon} 
            ${sizeClasses[size].iconLeft}
          `} />
        )}

        {/* Input o Textarea */}
        {type === 'textarea' ? (
          <textarea
            ref={ref}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            maxLength={maxLength}
            minLength={minLength}
            rows={rows}
            className={inputClasses}
            {...props}
          />
        ) : (
          <input
            ref={ref}
            type={inputType}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            maxLength={maxLength}
            minLength={minLength}
            pattern={pattern}
            step={step}
            min={min}
            max={max}
            className={inputClasses}
            {...props}
          />
        )}

        {/* Icon derecho */}
        {Icon && iconPosition === 'right' && !type === 'password' && !clearable && (
          <Icon className={`
            ${baseClasses.icon} 
            ${sizeClasses[size].icon} 
            ${sizeClasses[size].iconRight}
          `} />
        )}

        {/* Botón clear */}
        {clearable && value && (
          <button
            type="button"
            onClick={handleClear}
            className={`
              ${baseClasses.clearButton} 
              ${sizeClasses[size].iconRight}
            `}
            tabIndex={-1}
          >
            <X className={sizeClasses[size].icon} />
          </button>
        )}

        {/* Toggle password */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`
              ${baseClasses.passwordToggle} 
              ${sizeClasses[size].iconRight}
            `}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className={sizeClasses[size].icon} />
            ) : (
              <Eye className={sizeClasses[size].icon} />
            )}
          </button>
        )}

        {/* Indicador de estado */}
        {(error || success) && (
          <div className={`
            absolute top-1/2 transform -translate-y-1/2 
            ${clearable || type === 'password' ? 'right-8' : 'right-3'}
          `}>
            {error && <AlertCircle className="w-5 h-5 text-red-500" />}
            {success && <CheckCircle className="w-5 h-5 text-green-500" />}
          </div>
        )}
      </div>

      {/* Helper text, error o success message */}
      {(helperText || error || success) && (
        <div className={`
          ${baseClasses.helperText}
          ${error ? 'text-red-600' : success ? 'text-green-600' : 'text-gray-500'}
        `}>
          {error || success || helperText}
        </div>
      )}

      {/* Contador de caracteres */}
      {showCounter && (
        <div className={baseClasses.counter}>
          {currentLength}{maxLength && `/${maxLength}`}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input