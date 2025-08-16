import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

// Try port 5000 first, fallback to 5001
const API_URL = 'http://localhost:5000/api'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`)
      setUser(response.data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email)
      const response = await axios.post(`${API_URL}/auth/login`, { email, password })
      console.log('✅ Login response:', response.data)

      const { token, user } = response.data

      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(user)

      console.log('✅ Login successful for:', user.name)
      return { success: true }
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed - please check server connection'
      }
    }
  }

  const register = async (name, email, password) => {
    try {
      console.log('📝 Attempting registration for:', email)
      const response = await axios.post(`${API_URL}/auth/register`, { name, email, password })
      console.log('✅ Registration response:', response.data)

      const { token, user } = response.data

      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(user)

      console.log('✅ Registration successful for:', user.name)
      return { success: true }
    } catch (error) {
      console.error('❌ Registration error:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Registration failed - please check server connection'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
