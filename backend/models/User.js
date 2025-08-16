const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sound: { type: Boolean, default: true }
    },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true }
    }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: Date
  },
  sessions: [{
    token: String,
    device: String,
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
userSchema.index({ email: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ lastSeen: 1 })

// Virtual for user's full profile
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    role: this.role,
    isActive: this.isActive,
    lastSeen: this.lastSeen,
    preferences: this.preferences
  }
})

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now())
})

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false
  return await bcrypt.compare(candidatePassword, this.password)
}

// Method to generate JWT token
userSchema.methods.generateAuthToken = function(deviceInfo = {}) {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    sessionId: new mongoose.Types.ObjectId()
  }
  
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'rtc-app',
    audience: 'rtc-users'
  })
  
  // Store session info
  this.sessions.push({
    token: payload.sessionId,
    device: deviceInfo.device || 'Unknown',
    ip: deviceInfo.ip || 'Unknown',
    userAgent: deviceInfo.userAgent || 'Unknown'
  })
  
  return token
}

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    })
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } }
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 }
  }
  
  return this.updateOne(updates)
}

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 'security.loginAttempts': 1, 'security.lockUntil': 1 }
  })
}

// Method to update last seen
userSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date()
  return this.save({ validateBeforeSave: false })
}

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).select('name email avatar lastSeen')
}

module.exports = mongoose.model('User', userSchema)
