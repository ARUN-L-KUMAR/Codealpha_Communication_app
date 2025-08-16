import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, Video, Users, MessageCircle, Share2, Palette, Shield, Sparkles, Zap, CheckCircle } from 'lucide-react'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const { register, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Password strength checker
  useEffect(() => {
    const calculateStrength = (pwd) => {
      let strength = 0
      if (pwd.length >= 8) strength += 1
      if (/[a-z]/.test(pwd)) strength += 1
      if (/[A-Z]/.test(pwd)) strength += 1
      if (/[0-9]/.test(pwd)) strength += 1
      if (/[^A-Za-z0-9]/.test(pwd)) strength += 1
      return strength
    }
    setPasswordStrength(calculateStrength(password))
  }, [password])

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'bg-error-500'
      case 2: return 'bg-warning-500'
      case 3: return 'bg-warning-400'
      case 4: return 'bg-success-400'
      case 5: return 'bg-success-500'
      default: return 'bg-gray-300'
    }
  }

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'Weak'
      case 2: return 'Fair'
      case 3: return 'Good'
      case 4: return 'Strong'
      case 5: return 'Very Strong'
      default: return ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await register(name, email, password)
    
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-900 via-primary-900 to-secondary-900 relative overflow-hidden animate-gradient-xy">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-2/3 right-1/3 w-64 h-64 bg-success-500/10 rounded-full blur-3xl animate-float"></div>

        {/* Floating Particles */}
        <div className="particles">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${Math.random() * 4 + 5}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-scale-in">
          {/* Glass Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-accent-500 to-primary-500 rounded-2xl mb-4 animate-bounce-subtle">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-2">
                Join ConnectPro
              </h2>
              <p className="text-gray-300">
                Create your account and start collaborating
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

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

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
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
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
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2 animate-slide-down">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Password Strength</span>
                      <span className={`font-medium ${passwordStrength >= 4 ? 'text-success-400' : passwordStrength >= 3 ? 'text-warning-400' : 'text-error-400'}`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading || passwordStrength < 3}
                className="w-full bg-gradient-to-r from-accent-500 to-primary-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-accent-600 hover:to-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-glow"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Create Account</span>
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
              </button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-gray-300">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-accent-400 hover:text-accent-300 font-semibold transition-colors duration-200 hover:underline"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Security Badge */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Your data is protected with enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
