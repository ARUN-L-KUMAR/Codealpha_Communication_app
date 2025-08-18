import React from 'react'
import { ButtonLoader } from './LoadingSpinner'

const Button = ({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-semibold rounded-xl
    transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    hover:scale-105 active:scale-95
  `

  const variants = {
    primary: `
      bg-gradient-to-r from-primary-500 to-accent-500 text-white
      hover:from-primary-600 hover:to-accent-600 hover:shadow-glow
      focus:ring-primary-500 shadow-lg
    `,
    secondary: `
      bg-gradient-to-r from-secondary-500 to-primary-500 text-white
      hover:from-secondary-600 hover:to-primary-600 hover:shadow-glow
      focus:ring-secondary-500 shadow-lg
    `,
    success: `
      bg-gradient-to-r from-success-500 to-primary-500 text-white
      hover:from-success-600 hover:to-primary-600 hover:shadow-glow
      focus:ring-success-500 shadow-lg
    `,
    warning: `
      bg-gradient-to-r from-warning-500 to-accent-500 text-white
      hover:from-warning-600 hover:to-accent-600 hover:shadow-glow
      focus:ring-warning-500 shadow-lg
    `,
    error: `
      bg-gradient-to-r from-error-500 to-accent-500 text-white
      hover:from-error-600 hover:to-accent-600 hover:shadow-glow
      focus:ring-error-500 shadow-lg
    `,
    glass: `
      glass-card text-white border-white/20
      hover:bg-white/20 hover:shadow-glow
      focus:ring-primary-500
    `,
    outline: `
      border-2 border-primary-500 text-primary-400 bg-transparent
      hover:bg-primary-500 hover:text-white hover:shadow-glow
      focus:ring-primary-500
    `,
    ghost: `
      text-gray-300 bg-transparent
      hover:bg-white/10 hover:text-white
      focus:ring-primary-500
    `
  }

  const sizes = {
    small: 'px-3 py-2 text-sm space-x-1',
    default: 'px-6 py-3 text-base space-x-2',
    large: 'px-8 py-4 text-lg space-x-3',
    xl: 'px-10 py-5 text-xl space-x-4'
  }

  const iconSizes = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6',
    xl: 'w-7 h-7'
  }

  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
        ${loading ? 'animate-pulse' : ''}
      `}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <ButtonLoader size={size === 'small' ? 'small' : size === 'large' || size === 'xl' ? 'large' : 'default'} />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className={`${iconSizes[size]} ${children ? 'mr-1' : ''} animate-bounce-subtle`} />
          )}
          {children && <span>{children}</span>}
          {Icon && iconPosition === 'right' && (
            <Icon className={`${iconSizes[size]} ${children ? 'ml-1' : ''} animate-bounce-subtle`} />
          )}
        </>
      )}
    </button>
  )
}

// Floating Action Button
export const FloatingButton = ({
  children,
  icon: Icon,
  className = '',
  position = 'bottom-right',
  ...props
}) => {
  const positions = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  }

  return (
    <div className={`${positions[position]} z-40`}>
      <Button
        variant="primary"
        size="large"
        className={`
          rounded-full w-16 h-16 shadow-2xl hover:shadow-glow
          animate-bounce-in hover:animate-wiggle
          ${className}
        `}
        icon={Icon}
        {...props}
      >
        {children}
      </Button>
    </div>
  )
}

// Icon Button
export const IconButton = ({
  icon: Icon,
  variant = 'ghost',
  size = 'default',
  className = '',
  ...props
}) => {
  const iconSizes = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6'
  }

  const buttonSizes = {
    small: 'p-2',
    default: 'p-3',
    large: 'p-4'
  }

  return (
    <Button
      variant={variant}
      className={`
        ${buttonSizes[size]} rounded-full
        hover:rotate-12 hover:scale-110
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className={iconSizes[size]} />}
    </Button>
  )
}

// Button Group
export const ButtonGroup = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex rounded-xl overflow-hidden shadow-lg ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            className: `${child.props.className || ''} rounded-none ${
              index === 0 ? 'rounded-l-xl' : ''
            } ${
              index === React.Children.count(children) - 1 ? 'rounded-r-xl' : ''
            }`
          })
        }
        return child
      })}
    </div>
  )
}

export default Button
