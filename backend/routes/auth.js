const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const User = require('../models/User')
const { authenticate, loginRateLimit } = require('../middleware/auth')
const { userValidation } = require('../middleware/validation')
const router = express.Router()

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', userValidation.register, async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      })
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    })

    // Generate token
    const deviceInfo = {
      device: req.headers['user-agent'] || 'Unknown',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
    
    const token = user.generateAuthToken(deviceInfo)
    await user.save()

    // Set secure cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }

    res.cookie('token', token, cookieOptions)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: user.profile
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginRateLimit, userValidation.login, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and include password
    const user = await User.findByEmail(email)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts'
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts()
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Reset login attempts on successful login
    if (user.security.loginAttempts > 0) {
      await user.resetLoginAttempts()
    }

    // Generate token
    const deviceInfo = {
      device: req.headers['user-agent'] || 'Unknown',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
    
    const token = user.generateAuthToken(deviceInfo)
    await user.save()

    // Update last seen
    await user.updateLastSeen()

    // Set secure cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    }

    res.cookie('token', token, cookieOptions)

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: user.profile
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Login failed'
    })
  }
})

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.profile
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    })
  }
})

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticate, userValidation.updateProfile, async (req, res) => {
  try {
    const { name, email } = req.body
    const updateData = {}

    if (name) updateData.name = name
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      })
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email is already taken'
        })
      }
      
      updateData.email = email
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    )

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.profile
      }
    })

  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    })
  }
})

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', authenticate, userValidation.changePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Get user with password
    const user = await User.findById(req.user._id).select('+password')
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    // Invalidate all sessions except current one
    user.sessions = user.sessions.filter(session => 
      session.token.toString() === req.sessionId
    )
    await user.save()

    res.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    })
  }
})

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Remove current session
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { sessions: { token: req.sessionId } }
    })

    // Clear cookie
    res.clearCookie('token')

    res.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    })
  }
})

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    // Clear all sessions
    await User.findByIdAndUpdate(req.user._id, {
      $set: { sessions: [] }
    })

    // Clear cookie
    res.clearCookie('token')

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    })

  } catch (error) {
    console.error('Logout all error:', error)
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    })
  }
})

// @desc    Get user sessions
// @route   GET /api/auth/sessions
// @access  Private
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('sessions')
    
    const sessions = user.sessions.map(session => ({
      id: session.token,
      device: session.device,
      ip: session.ip,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isCurrent: session.token.toString() === req.sessionId
    }))

    res.json({
      success: true,
      data: { sessions }
    })

  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    })
  }
})

// @desc    Revoke session
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { sessions: { token: sessionId } }
    })

    res.json({
      success: true,
      message: 'Session revoked successfully'
    })

  } catch (error) {
    console.error('Revoke session error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    })
  }
})

module.exports = router
