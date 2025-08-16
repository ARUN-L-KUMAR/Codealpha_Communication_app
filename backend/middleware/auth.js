const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { promisify } = require('util')

// Verify JWT token
const verifyToken = promisify(jwt.verify)

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    let token

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }
    // Get token from cookie (for web sessions)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      })
    }

    try {
      // Verify token
      const decoded = await verifyToken(token, process.env.JWT_SECRET)
      
      // Get user from database
      const user = await User.findById(decoded.id).select('+sessions')
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Token is invalid. User not found.'
        })
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated.'
        })
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          error: 'Account is temporarily locked due to too many failed login attempts.'
        })
      }

      // Verify session exists
      const sessionExists = user.sessions.some(session => 
        session.token.toString() === decoded.sessionId
      )

      if (!sessionExists) {
        return res.status(401).json({
          success: false,
          error: 'Session is invalid or expired.'
        })
      }

      // Update last activity
      await User.findByIdAndUpdate(user._id, {
        lastSeen: new Date(),
        $set: {
          'sessions.$.lastActivity': new Date()
        }
      }, {
        arrayFilters: [{ 'session.token': decoded.sessionId }]
      })

      // Add user to request
      req.user = user
      req.sessionId = decoded.sessionId
      next()

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired.'
        })
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Token is invalid.'
        })
      } else {
        throw jwtError
      }
    }

  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    })
  }
}

// Authorization middleware - check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. Please authenticate.'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`
      })
    }

    next()
  }
}

// Room authorization middleware
const authorizeRoom = (permission = 'view') => {
  return async (req, res, next) => {
    try {
      const Room = require('../models/Room')
      const { roomId } = req.params

      if (!roomId) {
        return res.status(400).json({
          success: false,
          error: 'Room ID is required.'
        })
      }

      const room = await Room.findOne({ roomId }).populate('host')

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found.'
        })
      }

      // Check if user can access room
      const canJoin = room.canUserJoin(req.user._id)
      if (!canJoin.allowed && permission !== 'view') {
        return res.status(403).json({
          success: false,
          error: canJoin.reason
        })
      }

      // Check specific permissions
      const participant = room.participants.find(p => 
        p.user.toString() === req.user._id.toString() && !p.leftAt
      )

      const isHost = room.host._id.toString() === req.user._id.toString()
      const isModerator = participant && participant.role === 'moderator'

      // Permission checks
      switch (permission) {
        case 'host':
          if (!isHost) {
            return res.status(403).json({
              success: false,
              error: 'Only room host can perform this action.'
            })
          }
          break
        case 'moderate':
          if (!isHost && !isModerator) {
            return res.status(403).json({
              success: false,
              error: 'Only host or moderators can perform this action.'
            })
          }
          break
        case 'participate':
          if (!isHost && !participant) {
            return res.status(403).json({
              success: false,
              error: 'You must be a participant to perform this action.'
            })
          }
          break
      }

      req.room = room
      req.isHost = isHost
      req.isModerator = isModerator
      req.participant = participant
      next()

    } catch (error) {
      console.error('Room authorization error:', error)
      return res.status(500).json({
        success: false,
        error: 'Room authorization failed.'
      })
    }
  }
}

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid user'))
    }

    socket.user = user
    socket.sessionId = decoded.sessionId
    next()

  } catch (error) {
    console.error('Socket authentication error:', error)
    next(new Error('Authentication error: Invalid token'))
  }
}

// Rate limiting for sensitive operations
const createRateLimit = (windowMs, max, message) => {
  const rateLimit = require('express-rate-limit')
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use user ID for authenticated requests, IP for others
    keyGenerator: (req) => {
      return req.user ? req.user._id.toString() : req.ip
    }
  })
}

// Specific rate limiters
const loginRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many login attempts, please try again later.'
)

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many API requests, please try again later.'
)

const fileUploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  'Too many file uploads, please try again later.'
)

module.exports = {
  authenticate,
  authorize,
  authorizeRoom,
  authenticateSocket,
  loginRateLimit,
  apiRateLimit,
  fileUploadRateLimit
}
