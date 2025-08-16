import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, Video, Users, MessageCircle, Share2, Palette, Shield, Sparkles, Zap } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-secondary-900 to-accent-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Features Showcase */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 text-white">
          <div className="animate-slide-up">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl">
                <Video className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                ConnectPro
              </h1>
            </div>

            <h2 className="text-5xl font-display font-bold mb-6 leading-tight">
              Professional
              <span className="block bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                Communication
              </span>
              Platform
            </h2>

            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Experience seamless video calling, real-time collaboration, and secure file sharing
              in one powerful platform designed for modern teams.
            </p>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center space-x-3 animate-slide-up delay-100">
                <div className="p-2 bg-primary-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Multi-user Video</h3>
                  <p className="text-sm text-gray-400">HD video calls with unlimited participants</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 animate-slide-up delay-200">
                <div className="p-2 bg-accent-500/20 rounded-lg">
                  <Share2 className="w-6 h-6 text-accent-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Screen Sharing</h3>
                  <p className="text-sm text-gray-400">Share your screen in real-time</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 animate-slide-up delay-300">
                <div className="p-2 bg-success-500/20 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-success-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Real-time Chat</h3>
                  <p className="text-sm text-gray-400">Instant messaging during calls</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 animate-slide-up delay-400">
                <div className="p-2 bg-warning-500/20 rounded-lg">
                  <Palette className="w-6 h-6 text-warning-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Whiteboard</h3>
                  <p className="text-sm text-gray-400">Collaborative drawing and notes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md animate-scale-in">
            {/* Glass Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl mb-4 animate-bounce-subtle">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">
                  Welcome Back
                </h2>
                <p className="text-gray-300">
                  Sign in to continue your collaboration journey
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-error-500/20 border border-error-500/30 text-error-200 px-4 py-3 rounded-xl backdrop-blur-sm animate-slide-down">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-primary-600 hover:to-accent-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-glow"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>Sign In</span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </button>

                {/* Register Link */}
                <div className="text-center pt-4">
                  <p className="text-gray-300">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="text-primary-400 hover:text-primary-300 font-semibold transition-colors duration-200 hover:underline"
                    >
                      Create one now
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Security Badge */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>Secured with end-to-end encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
