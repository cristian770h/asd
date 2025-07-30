// frontend/src/components/UI/Select.jsx - Componente de Select
import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { ChevronDown, ChevronUp, X, Check, Search, AlertCircle, CheckCircle } from 'lucide-react'

const Select = forwardRef(({
  label,
  value,
  onChange,
  onBlur,
  onFocus,
  options = [],
  placeholder = 'Seleccionar...',
  disabled = false,
  required = false,
  error,
  success,
  helperText,
  multiple = false,
  searchable = false,
  clearable = false,
  loading = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'default', // 'default' | 'filled' | 'outlined'
  fullWidth = true,
  maxHeight = '200px',
  emptyMessage = 'No hay opciones disponibles',
  loadingMessage = 'Cargando...',
  searchPlaceholder = 'Buscar...',
  className = '',
  containerClassName = '',
  labelClassName = '',
  optionClassName = '',
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const selectRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)

  // Filtrar opciones basado en búsqueda
  const filteredOptions = options.filter(option => {
    if (!searchable || !searchTerm) return true
    const label = typeof option === 'string' ? option : option.label || option.value
    return label.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Normalizar valor seleccionado
  const normalizeValue = (val) => {
    if (multiple) {
      return Array.isArray(val) ? val : (val ? [val] : [])
    }
    return val
  }

  const selectedValue = normalizeValue(value)

  // Obtener label de una opción
  const getOptionLabel = (option) => {
    if (typeof option === 'string') return option
    return option.label || option.value || option
  }

  // Obtener value de una opción
  const getOptionValue = (option) => {
    if (typeof option === 'string') return option
    return option.value !== undefined ? option.value : option.label || option
  }

  // Verificar si una opción está seleccionada
  const isSelected = (option) => {
    const optionValue = getOptionValue(option)
    if (multiple) {
      return selectedValue.includes(optionValue)
    }
    return selectedValue === optionValue
  }

  // Obtener texto mostrado en el select
  const getDisplayText = () => {
    if (multiple) {
      if (selectedValue.length === 0) return placeholder
      if (selectedValue.length === 1) {
        const option = options.find(opt => getOptionValue(opt) === selectedValue[0])
        return option ? getOptionLabel(option) : selectedValue[0]
      }
      return `${selectedValue.length} seleccionados`
    }
    
    if (!selectedValue) return placeholder
    const option = options.find(opt => getOptionValue(opt) === selectedValue)
    return option ? getOptionLabel(option) : selectedValue
  }

  // Classes base
  const baseClasses = {
    container: 'relative',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    select: `
      relative w-full cursor-pointer border transition-colors duration-200 focus:outline-none
      ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 
        success ? 'border-green-500 focus:border-green-500 focus:ring-green-500' :
        'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
    `,
    dropdown: `
      absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg
      max-h-60 overflow-auto focus:outline-none
    `,
    option: `
      relative cursor-pointer select-none py-2 px-3 hover:bg-gray-100
      flex items-center justify-between
    `,
    searchInput: 'w-full px-3 py-2 border-b border-gray-200 focus:outline-none text-sm',
    helperText: 'mt-1 text-sm'
  }

  // Classes por tamaño
  const sizeClasses = {
    sm: {
      select: 'px-3 py-1.5 text-sm rounded-md',
      arrow: 'w-4 h-4',
      icon: 'w-4 h-4'
    },
    md: {
      select: 'px-3 py-2 text-sm rounded-md',
      arrow: 'w-5 h-5',
      icon: 'w-5 h-5'
    },
    lg: {
      select: 'px-4 py-3 text-base rounded-lg',
      arrow: 'w-5 h-5',
      icon: 'w-5 h-5'
    }
  }

  // Classes por variante
  const variantClasses = {
    default: '',
    filled: 'bg-gray-50 border-transparent focus:bg-white',
    outlined: 'bg-transparent'
  }

  // Construir classes del select
  const selectClasses = [
    baseClasses.select,
    sizeClasses[size].select,
    variantClasses[variant],
    fullWidth ? 'w-full' : '',
    isOpen ? 'ring-2 ring-blue-500 ring-opacity-50' : '',
    className
  ].filter(Boolean).join(' ')

  // Manejar click en opción
  const handleOptionClick = (option) => {
    const optionValue = getOptionValue(option)
    
    if (multiple) {
      const newValue = isSelected(option)
        ? selectedValue.filter(v => v !== optionValue)
        : [...selectedValue, optionValue]
      
      onChange?.(newValue)
    } else {
      onChange?.(optionValue)
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  // Manejar teclas
  const handleKeyDown = (e) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true)
        } else if (focusedIndex >= 0) {
          handleOptionClick(filteredOptions[focusedIndex])
        }
        e.preventDefault()
        break
      
      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        selectRef.current?.focus()
        break
      
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
        }
        break
      
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
        }
        break
      
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  // Manejar click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus en search cuando se abre
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus()
    }
  }, [isOpen, searchable])

  // Scroll a opción enfocada
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[
        searchable ? focusedIndex + 1 : focusedIndex
      ]
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [focusedIndex, searchable])

  // Limpiar selección
  const handleClear = (e) => {
    e.stopPropagation()
    if (multiple) {
      onChange?.([])
    } else {
      onChange?.(null)
    }
  }

  return (
    <div className={`${baseClasses.container} ${containerClassName}`} ref={selectRef}>
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

      {/* Select button */}
      <div
        className={selectClasses}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        {...props}
      >
        <span className={`block truncate ${!value ? 'text-gray-500' : ''}`}>
          {getDisplayText()}
        </span>
        
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {/* Loading spinner */}
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-1" />
          )}
          
          {/* Clear button */}
          {clearable && value && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="mr-1 text-gray-400 hover:text-gray-600 pointer-events-auto"
              tabIndex={-1}
            >
              <X className={sizeClasses[size].icon} />
            </button>
          )}
          
          {/* Arrow */}
          {isOpen ? (
            <ChevronUp className={`${sizeClasses[size].arrow} text-gray-400`} />
          ) : (
            <ChevronDown className={`${sizeClasses[size].arrow} text-gray-400`} />
          )}
        </span>

        {/* Indicador de estado */}
        {(error || success) && (
          <div className="absolute top-1/2 transform -translate-y-1/2 right-8">
            {error && <AlertCircle className="w-5 h-5 text-red-500" />}
            {success && <CheckCircle className="w-5 h-5 text-green-500" />}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className={baseClasses.dropdown}
          style={{ maxHeight }}
          ref={listRef}
        >
          {/* Search input */}
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                className={`${baseClasses.searchInput} pl-10`}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setFocusedIndex(-1)
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {/* Options */}
          {loading ? (
            <div className="px-3 py-2 text-gray-500 text-center">
              {loadingMessage}
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 text-center">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option, index) => {
              const selected = isSelected(option)
              const focused = index === focusedIndex
              
              return (
                <div
                  key={getOptionValue(option)}
                  className={`
                    ${baseClasses.option}
                    ${selected ? 'bg-blue-50 text-blue-900' : ''}
                    ${focused ? 'bg-gray-100' : ''}
                    ${optionClassName}
                  `}
                  onClick={() => handleOptionClick(option)}
                  role="option"
                  aria-selected={selected}
                >
                  <span className={`block truncate ${selected ? 'font-medium' : ''}`}>
                    {getOptionLabel(option)}
                  </span>
                  
                  {selected && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Helper text, error o success message */}
      {(helperText || error || success) && (
        <div className={`
          ${baseClasses.helperText}
          ${error ? 'text-red-600' : success ? 'text-green-600' : 'text-gray-500'}
        `}>
          {error || success || helperText}
        </div>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select