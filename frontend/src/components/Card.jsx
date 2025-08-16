import React from 'react'
import { ChevronRight } from 'lucide-react'

const Card = ({
  children,
  variant = 'glass',
  hover = true,
  glow = false,
  border = true,
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = `
    rounded-3xl p-6 transition-all duration-500
    ${hover ? 'hover:scale-105 cursor-pointer' : ''}
    ${glow ? 'hover:shadow-glow' : ''}
    ${onClick ? 'group' : ''}
  `

  const variants = {
    glass: `
      glass-card ${border ? 'border border-white/20' : ''}
      ${hover ? 'hover:bg-white/15' : ''}
    `,
    solid: `
      bg-white/10 ${border ? 'border border-white/10' : ''}
      ${hover ? 'hover:bg-white/20' : ''}
    `,
    gradient: `
      bg-gradient-to-br from-primary-500/20 to-accent-500/20
      ${border ? 'border border-white/20' : ''}
      ${hover ? 'hover:from-primary-500/30 hover:to-accent-500/30' : ''}
    `,
    outlined: `
      bg-transparent border-2 border-primary-500/50
      ${hover ? 'hover:border-primary-500 hover:bg-primary-500/10' : ''}
    `
  }

  return (
    <div
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

// Feature Card Component
export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  color = 'primary',
  className = '',
  ...props
}) => {
  const colors = {
    primary: 'bg-primary-500/20 text-primary-400',
    accent: 'bg-accent-500/20 text-accent-400',
    success: 'bg-success-500/20 text-success-400',
    warning: 'bg-warning-500/20 text-warning-400',
    error: 'bg-error-500/20 text-error-400'
  }

  return (
    <Card
      variant="glass"
      hover={true}
      glow={true}
      className={`group ${className}`}
      {...props}
    >
      <div className={`p-3 ${colors[color]} rounded-xl mb-4 w-fit group-hover:scale-110 transition-transform duration-300`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-300 transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
        {description}
      </p>
    </Card>
  )
}

// Action Card Component
export const ActionCard = ({
  icon: Icon,
  title,
  description,
  action,
  actionText = 'Get Started',
  color = 'primary',
  className = '',
  onAction,
  ...props
}) => {
  const colors = {
    primary: 'from-primary-500 to-accent-500',
    success: 'from-success-500 to-primary-500',
    warning: 'from-warning-500 to-accent-500',
    error: 'from-error-500 to-accent-500'
  }

  return (
    <Card
      variant="glass"
      hover={true}
      glow={true}
      className={`group ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 bg-gradient-to-r ${colors[color]} rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          {Icon && <Icon className="w-8 h-8 text-white" />}
        </div>
        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
      </div>

      <h3 className="text-2xl font-display font-bold text-white mb-3 animate-slide-up">
        {title}
      </h3>
      <p className="text-gray-300 mb-6 animate-slide-up delay-100">
        {description}
      </p>

      {action || (
        <button
          onClick={onAction}
          className={`w-full bg-gradient-to-r ${colors[color]} text-white font-semibold py-4 px-6 rounded-xl hover:shadow-glow transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 animate-gradient-x group`}
        >
          <span>{actionText}</span>
          {Icon && <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />}
        </button>
      )}
    </Card>
  )
}

// Stats Card Component
export const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
  className = '',
  ...props
}) => {
  const colors = {
    primary: 'from-primary-500/20 to-accent-500/20 text-primary-400',
    success: 'from-success-500/20 to-primary-500/20 text-success-400',
    warning: 'from-warning-500/20 to-accent-500/20 text-warning-400',
    error: 'from-error-500/20 to-accent-500/20 text-error-400'
  }

  return (
    <Card
      variant="gradient"
      hover={true}
      className={`bg-gradient-to-r ${colors[color].split(' ').slice(0, 2).join(' ')} ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-300 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white animate-bounce-in">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-success-400' : 'text-error-400'}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        {Icon && (
          <Icon className={`w-8 h-8 ${colors[color].split(' ').slice(-1)} animate-heartbeat`} />
        )}
      </div>
    </Card>
  )
}

// Profile Card Component
export const ProfileCard = ({
  avatar,
  name,
  role,
  status = 'online',
  className = '',
  ...props
}) => {
  const statusColors = {
    online: 'bg-success-500',
    away: 'bg-warning-500',
    busy: 'bg-error-500',
    offline: 'bg-gray-500'
  }

  return (
    <Card
      variant="glass"
      hover={true}
      className={`text-center ${className}`}
      {...props}
    >
      <div className="relative inline-block mb-4">
        <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold text-xl animate-bounce-in">
          {avatar || name?.charAt(0)?.toUpperCase()}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${statusColors[status]} rounded-full border-2 border-white animate-pulse`}></div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
      <p className="text-gray-400 text-sm capitalize">{role}</p>
    </Card>
  )
}

export default Card
