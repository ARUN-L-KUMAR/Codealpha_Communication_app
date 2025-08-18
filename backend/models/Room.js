const mongoose = require('mongoose')

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: String,
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: Date,
  role: {
    type: String,
    enum: ['host', 'moderator', 'participant'],
    default: 'participant'
  },
  permissions: {
    canShare: { type: Boolean, default: true },
    canDraw: { type: Boolean, default: true },
    canChat: { type: Boolean, default: true },
    canInvite: { type: Boolean, default: false }
  },
  mediaState: {
    video: { type: Boolean, default: true },
    audio: { type: Boolean, default: true },
    screenShare: { type: Boolean, default: false }
  }
})

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['text', 'file', 'system'],
    default: 'text'
  },
  metadata: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    fileUrl: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  edited: {
    at: Date,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
})

const whiteboardDataSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['draw', 'erase', 'clear'],
    required: true
  },
  data: {
    x: Number,
    y: Number,
    color: String,
    lineWidth: Number,
    tool: String
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
})

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['public', 'private', 'scheduled'],
    default: 'private'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended', 'paused'],
    default: 'waiting'
  },
  settings: {
    maxParticipants: {
      type: Number,
      default: 10,
      min: 2,
      max: 50
    },
    requirePassword: { type: Boolean, default: false },
    password: { type: String, select: false },
    allowRecording: { type: Boolean, default: false },
    allowScreenShare: { type: Boolean, default: true },
    allowFileShare: { type: Boolean, default: true },
    allowWhiteboard: { type: Boolean, default: true },
    allowChat: { type: Boolean, default: true },
    moderationRequired: { type: Boolean, default: false },
    waitingRoom: { type: Boolean, default: false }
  },
  schedule: {
    startTime: Date,
    endTime: Date,
    timezone: String,
    recurring: {
      enabled: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      interval: Number,
      endDate: Date
    }
  },
  participants: [participantSchema],
  messages: [messageSchema],
  whiteboardData: [whiteboardDataSchema],
  files: [{
    id: String,
    name: String,
    size: Number,
    type: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  analytics: {
    totalParticipants: { type: Number, default: 0 },
    peakParticipants: { type: Number, default: 0 },
    duration: Number,
    messagesCount: { type: Number, default: 0 },
    filesShared: { type: Number, default: 0 }
  },
  security: {
    encryptionKey: { type: String, select: false },
    allowedDomains: [String],
    blockedUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String,
      blockedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
roomSchema.index({ roomId: 1 })
roomSchema.index({ host: 1 })
roomSchema.index({ status: 1 })
roomSchema.index({ 'participants.user': 1 })
roomSchema.index({ createdAt: 1 })

// Virtual for active participants
roomSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => !p.leftAt)
})

// Virtual for participant count
roomSchema.virtual('participantCount').get(function() {
  return this.activeParticipants.length
})

// Virtual for room duration
roomSchema.virtual('duration').get(function() {
  if (this.status === 'ended' && this.updatedAt) {
    return this.updatedAt - this.createdAt
  }
  if (this.status === 'active') {
    return Date.now() - this.createdAt
  }
  return 0
})

// Method to add participant
roomSchema.methods.addParticipant = function(userId, socketId, role = 'participant') {
  // Remove any existing participant with same user
  this.participants = this.participants.filter(p => 
    p.user.toString() !== userId.toString() || p.leftAt
  )
  
  // Add new participant
  this.participants.push({
    user: userId,
    socketId,
    role: role === 'host' ? 'host' : 
          this.participants.length === 0 ? 'host' : role
  })
  
  // Update analytics
  this.analytics.totalParticipants = Math.max(
    this.analytics.totalParticipants, 
    this.participantCount
  )
  this.analytics.peakParticipants = Math.max(
    this.analytics.peakParticipants, 
    this.participantCount
  )
  
  return this.save()
}

// Method to remove participant
roomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString() && !p.leftAt
  )
  
  if (participant) {
    participant.leftAt = new Date()
  }
  
  return this.save()
}

// Method to add message
roomSchema.methods.addMessage = function(senderId, content, type = 'text', metadata = {}) {
  this.messages.push({
    sender: senderId,
    content,
    type,
    metadata
  })
  
  this.analytics.messagesCount += 1
  return this.save()
}

// Method to add whiteboard data
roomSchema.methods.addWhiteboardData = function(authorId, type, data) {
  this.whiteboardData.push({
    type,
    data,
    author: authorId
  })
  
  return this.save()
}

// Method to check if user can join
roomSchema.methods.canUserJoin = function(userId) {
  // Check if room is full
  if (this.participantCount >= this.settings.maxParticipants) {
    return { allowed: false, reason: 'Room is full' }
  }
  
  // Check if user is blocked
  const isBlocked = this.security.blockedUsers.some(
    blocked => blocked.user.toString() === userId.toString()
  )
  if (isBlocked) {
    return { allowed: false, reason: 'User is blocked from this room' }
  }
  
  // Check if room has ended
  if (this.status === 'ended') {
    return { allowed: false, reason: 'Room has ended' }
  }
  
  return { allowed: true }
}

// Static method to find active rooms
roomSchema.statics.findActiveRooms = function() {
  return this.find({ 
    status: { $in: ['waiting', 'active'] } 
  }).populate('host', 'name email avatar')
}

// Static method to find user's rooms
roomSchema.statics.findUserRooms = function(userId) {
  return this.find({
    $or: [
      { host: userId },
      { 'participants.user': userId }
    ]
  }).populate('host', 'name email avatar')
}

module.exports = mongoose.model('Room', roomSchema)
