const Joi = require('joi')
const { body, param, query, validationResult } = require('express-validator')

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }))
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages
    })
  }
  
  next()
}

// User validation schemas
const userValidation = {
  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    handleValidationErrors
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    handleValidationErrors
  ],
  
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    handleValidationErrors
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password')
        }
        return true
      }),
    
    handleValidationErrors
  ]
}

// Room validation schemas
const roomValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Room name must be between 1 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('type')
      .optional()
      .isIn(['public', 'private', 'scheduled'])
      .withMessage('Room type must be public, private, or scheduled'),
    
    body('settings.maxParticipants')
      .optional()
      .isInt({ min: 2, max: 50 })
      .withMessage('Max participants must be between 2 and 50'),
    
    body('settings.password')
      .optional()
      .isLength({ min: 4, max: 20 })
      .withMessage('Room password must be between 4 and 20 characters'),
    
    body('schedule.startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be a valid date'),
    
    body('schedule.endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be a valid date')
      .custom((value, { req }) => {
        if (req.body.schedule?.startTime && new Date(value) <= new Date(req.body.schedule.startTime)) {
          throw new Error('End time must be after start time')
        }
        return true
      }),
    
    handleValidationErrors
  ],
  
  join: [
    param('roomId')
      .isLength({ min: 1 })
      .withMessage('Room ID is required'),
    
    body('password')
      .optional()
      .isLength({ min: 1 })
      .withMessage('Password cannot be empty if provided'),
    
    handleValidationErrors
  ],
  
  updateSettings: [
    param('roomId')
      .isLength({ min: 1 })
      .withMessage('Room ID is required'),
    
    body('settings.maxParticipants')
      .optional()
      .isInt({ min: 2, max: 50 })
      .withMessage('Max participants must be between 2 and 50'),
    
    body('settings.allowRecording')
      .optional()
      .isBoolean()
      .withMessage('Allow recording must be a boolean'),
    
    body('settings.allowScreenShare')
      .optional()
      .isBoolean()
      .withMessage('Allow screen share must be a boolean'),
    
    handleValidationErrors
  ]
}

// Message validation
const messageValidation = {
  send: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content must be between 1 and 1000 characters'),
    
    body('type')
      .optional()
      .isIn(['text', 'file', 'system'])
      .withMessage('Message type must be text, file, or system'),
    
    handleValidationErrors
  ]
}

// File validation
const fileValidation = {
  upload: [
    body('roomId')
      .isLength({ min: 1 })
      .withMessage('Room ID is required'),
    
    handleValidationErrors
  ]
}

// Query parameter validation
const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
  ],
  
  roomList: [
    query('status')
      .optional()
      .isIn(['waiting', 'active', 'ended', 'paused'])
      .withMessage('Status must be waiting, active, ended, or paused'),
    
    query('type')
      .optional()
      .isIn(['public', 'private', 'scheduled'])
      .withMessage('Type must be public, private, or scheduled'),
    
    handleValidationErrors
  ]
}

// Joi schemas for complex validation
const joiSchemas = {
  roomSettings: Joi.object({
    maxParticipants: Joi.number().integer().min(2).max(50),
    requirePassword: Joi.boolean(),
    password: Joi.when('requirePassword', {
      is: true,
      then: Joi.string().min(4).max(20).required(),
      otherwise: Joi.string().allow('', null)
    }),
    allowRecording: Joi.boolean(),
    allowScreenShare: Joi.boolean(),
    allowFileShare: Joi.boolean(),
    allowWhiteboard: Joi.boolean(),
    allowChat: Joi.boolean(),
    moderationRequired: Joi.boolean(),
    waitingRoom: Joi.boolean()
  }),
  
  userPreferences: Joi.object({
    theme: Joi.string().valid('light', 'dark'),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      sound: Joi.boolean()
    }),
    privacy: Joi.object({
      showOnlineStatus: Joi.boolean(),
      allowDirectMessages: Joi.boolean()
    })
  }),
  
  whiteboardData: Joi.object({
    type: Joi.string().valid('draw', 'erase', 'clear').required(),
    data: Joi.when('type', {
      is: Joi.string().valid('draw', 'erase'),
      then: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
        lineWidth: Joi.number().min(1).max(20),
        tool: Joi.string().valid('pen', 'eraser')
      }).required(),
      otherwise: Joi.object().allow(null)
    })
  })
}

// Joi validation middleware
const validateJoi = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    })
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorMessages
      })
    }
    
    req.body = value
    next()
  }
}

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
  }
  
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key])
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key])
      }
    }
  }
  
  if (req.body) sanitizeObject(req.body)
  if (req.query) sanitizeObject(req.query)
  if (req.params) sanitizeObject(req.params)
  
  next()
}

module.exports = {
  userValidation,
  roomValidation,
  messageValidation,
  fileValidation,
  queryValidation,
  joiSchemas,
  validateJoi,
  sanitizeInput,
  handleValidationErrors
}
