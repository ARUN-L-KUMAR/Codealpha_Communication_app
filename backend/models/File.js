const mongoose = require('mongoose')
const crypto = require('crypto')

const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomUUID()
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    max: 50 * 1024 * 1024 // 50MB limit
  },
  path: {
    type: String,
    required: true
  },
  url: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  category: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
    required: true
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    pages: Number,
    encoding: String
  },
  security: {
    isEncrypted: {
      type: Boolean,
      default: true
    },
    encryptionKey: {
      type: String,
      select: false
    },
    accessLevel: {
      type: String,
      enum: ['public', 'room', 'private'],
      default: 'room'
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed', 'deleted'],
    default: 'uploading'
  },
  downloads: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String
  }],
  virusScan: {
    scanned: {
      type: Boolean,
      default: false
    },
    clean: Boolean,
    scanDate: Date,
    scanEngine: String
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
fileSchema.index({ fileId: 1 })
fileSchema.index({ uploadedBy: 1 })
fileSchema.index({ room: 1 })
fileSchema.index({ status: 1 })
fileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Virtual for file category based on mime type
fileSchema.virtual('fileCategory').get(function() {
  if (this.mimeType.startsWith('image/')) return 'image'
  if (this.mimeType.startsWith('video/')) return 'video'
  if (this.mimeType.startsWith('audio/')) return 'audio'
  if (this.mimeType.includes('pdf') || this.mimeType.includes('document') || 
      this.mimeType.includes('text') || this.mimeType.includes('spreadsheet')) return 'document'
  if (this.mimeType.includes('zip') || this.mimeType.includes('rar') || 
      this.mimeType.includes('tar')) return 'archive'
  return 'other'
})

// Virtual for human readable file size
fileSchema.virtual('humanSize').get(function() {
  const bytes = this.size
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
})

// Virtual for download count
fileSchema.virtual('downloadCount').get(function() {
  return this.downloads.length
})

// Pre-save middleware to set category
fileSchema.pre('save', function(next) {
  if (this.isModified('mimeType')) {
    this.category = this.fileCategory
  }
  next()
})

// Method to check if user can access file
fileSchema.methods.canUserAccess = function(userId) {
  // File uploader can always access
  if (this.uploadedBy.toString() === userId.toString()) {
    return true
  }
  
  // Check access level
  if (this.security.accessLevel === 'public') {
    return true
  }
  
  if (this.security.accessLevel === 'private') {
    return this.security.allowedUsers.includes(userId)
  }
  
  // For room level, check if user is in the room
  // This would need to be checked at the application level
  return true
}

// Method to record download
fileSchema.methods.recordDownload = function(userId, ip, userAgent) {
  this.downloads.push({
    user: userId,
    ip,
    userAgent
  })
  return this.save()
}

// Method to generate secure download URL
fileSchema.methods.generateDownloadUrl = function(expiresIn = 3600) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = Date.now() + (expiresIn * 1000)
  
  // In a real implementation, you'd store this token temporarily
  // and validate it when the download is requested
  return {
    url: `/api/files/download/${this.fileId}?token=${token}&expires=${expires}`,
    token,
    expires: new Date(expires)
  }
}

// Static method to find files by room
fileSchema.statics.findByRoom = function(roomId, userId = null) {
  const query = { 
    room: roomId, 
    status: 'ready',
    expiresAt: { $gt: new Date() }
  }
  
  if (userId) {
    query.$or = [
      { uploadedBy: userId },
      { 'security.accessLevel': 'public' },
      { 'security.accessLevel': 'room' },
      { 'security.allowedUsers': userId }
    ]
  }
  
  return this.find(query)
    .populate('uploadedBy', 'name email avatar')
    .sort({ createdAt: -1 })
}

// Static method to find user's files
fileSchema.statics.findByUser = function(userId) {
  return this.find({ 
    uploadedBy: userId,
    status: { $ne: 'deleted' }
  }).populate('room', 'name roomId')
    .sort({ createdAt: -1 })
}

// Static method to cleanup expired files
fileSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  })
}

// Static method to get storage stats
fileSchema.statics.getStorageStats = function(userId = null) {
  const match = userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {}
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' }
      }
    },
    {
      $group: {
        _id: null,
        categories: {
          $push: {
            category: '$_id',
            count: '$count',
            totalSize: '$totalSize',
            avgSize: '$avgSize'
          }
        },
        totalFiles: { $sum: '$count' },
        totalStorage: { $sum: '$totalSize' }
      }
    }
  ])
}

module.exports = mongoose.model('File', fileSchema)
