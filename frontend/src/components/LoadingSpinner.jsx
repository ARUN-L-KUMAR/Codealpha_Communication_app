import React from 'react'
import { Sparkles, Video, Users, MessageCircle } from 'lucide-react'

const LoadingSpinner = ({ message = "Loading...", size = "default" }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    default: "w-16 h-16",
    large: "w-24 h-24"
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Main Spinner */}
      <div className="relative">
        {/* Outer Ring */}
        <div className={`${sizeClasses[size]} border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin`}></div>
        
        {/* Inner Ring */}
        <div className={`absolute inset-2 border-2 border-accent-500/20 border-b-accent-500 rounded-full animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary-400 animate-pulse" />
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <p className="text-white font-medium text-lg animate-pulse">{message}</p>
        <div className="flex items-center justify-center space-x-1 mt-2">
          <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-success-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}

// Full Screen Loading Component
export const FullScreenLoader = ({ message = "Initializing ConnectPro..." }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-secondary-900 via-primary-900 to-accent-900 flex items-center justify-center z-50 animate-gradient-xy">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-success-500/5 rounded-full blur-3xl animate-float"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center animate-scale-in">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl mb-4 animate-bounce-subtle">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-2 animate-fade-in-up">
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              ConnectPro
            </span>
          </h1>
          <p className="text-gray-300 animate-fade-in-up delay-100">Professional Communication Platform</p>
        </div>

        {/* Loading Spinner */}
        <LoadingSpinner message={message} size="large" />

        {/* Feature Icons */}
        <div className="flex items-center justify-center space-x-8 mt-12">
          <div className="flex flex-col items-center space-y-2 animate-fade-in-up delay-200">
            <div className="p-3 bg-primary-500/20 rounded-xl">
              <Video className="w-6 h-6 text-primary-400" />
            </div>
            <span className="text-xs text-gray-400">Video Calls</span>
          </div>
          <div className="flex flex-col items-center space-y-2 animate-fade-in-up delay-300">
            <div className="p-3 bg-accent-500/20 rounded-xl">
              <Users className="w-6 h-6 text-accent-400" />
            </div>
            <span className="text-xs text-gray-400">Collaboration</span>
          </div>
          <div className="flex flex-col items-center space-y-2 animate-fade-in-up delay-400">
            <div className="p-3 bg-success-500/20 rounded-xl">
              <MessageCircle className="w-6 h-6 text-success-400" />
            </div>
            <span className="text-xs text-gray-400">Real-time Chat</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Button Loading State
export const ButtonLoader = ({ size = "default" }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-5 h-5",
    large: "w-6 h-6"
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizeClasses[size]} border-2 border-white/30 border-t-white rounded-full animate-spin`}></div>
      <span>Loading...</span>
    </div>
  )
}

// Skeleton Loader for Cards
export const SkeletonCard = () => {
  return (
    <div className="glass-card rounded-3xl p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="w-16 h-16 bg-white/10 rounded-2xl"></div>
        <div className="w-6 h-6 bg-white/10 rounded"></div>
      </div>
      <div className="space-y-3">
        <div className="h-6 bg-white/10 rounded w-3/4"></div>
        <div className="h-4 bg-white/10 rounded w-full"></div>
        <div className="h-4 bg-white/10 rounded w-2/3"></div>
      </div>
      <div className="mt-6 h-12 bg-white/10 rounded-xl"></div>
    </div>
  )
}

export default LoadingSpinner
