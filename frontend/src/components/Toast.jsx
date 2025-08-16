import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react'

const Toast = ({ 
  type = 'info', 
  title, 
  message, 
  duration = 5000, 
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-400" />
      case 'error':
        return <XCircle className="w-5 h-5 text-error-400" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-warning-400" />
      default:
        return <Info className="w-5 h-5 text-primary-400" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'border-success-500/30 bg-success-500/10'
      case 'error':
        return 'border-error-500/30 bg-error-500/10'
      case 'warning':
        return 'border-warning-500/30 bg-warning-500/10'
      default:
        return 'border-primary-500/30 bg-primary-500/10'
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className={`
        fixed z-50 max-w-sm w-full
        ${getPositionClasses()}
        ${isLeaving ? 'animate-slide-out-right' : 'animate-slide-in-right'}
      `}
    >
      <div className={`
        glass-card rounded-2xl p-4 border shadow-2xl
        ${getColors()}
        hover:shadow-glow transition-all duration-300
      `}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 animate-bounce-in">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-semibold text-white mb-1 animate-fade-in-up">
                {title}
              </h4>
            )}
            <p className="text-sm text-gray-300 animate-fade-in-up delay-100">
              {message}
            </p>
          </div>
          
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-200 hover:scale-110 transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 w-full bg-white/10 rounded-full h-1 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ease-linear ${
              type === 'success' ? 'bg-success-400' :
              type === 'error' ? 'bg-error-400' :
              type === 'warning' ? 'bg-warning-400' :
              'bg-primary-400'
            }`}
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Toast Container Component
export const ToastContainer = ({ toasts = [], removeToast }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 80}px)`
          }}
        >
          <Toast
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([])

  const addToast = (toast) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (message, title = 'Success') => {
    addToast({ type: 'success', title, message })
  }

  const error = (message, title = 'Error') => {
    addToast({ type: 'error', title, message })
  }

  const warning = (message, title = 'Warning') => {
    addToast({ type: 'warning', title, message })
  }

  const info = (message, title = 'Info') => {
    addToast({ type: 'info', title, message })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

export default Toast
