const express = require('express')
const crypto = require('crypto')
const Room = require('../models/Room')
const { authenticate, authorizeRoom } = require('../middleware/auth')
const { roomValidation, queryValidation } = require('../middleware/validation')
const router = express.Router()

// @desc    Create room
// @route   POST /api/rooms
// @access  Private
router.post('/', authenticate, roomValidation.create, async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'private',
      settings = {},
      schedule = {}
    } = req.body

    // Generate unique room ID
    const roomId = crypto.randomBytes(8).toString('hex')

    // Hash password if provided
    let hashedPassword = null
    if (settings.requirePassword && settings.password) {
      const bcrypt = require('bcryptjs')
      hashedPassword = await bcrypt.hash(settings.password, 10)
    }

    // Create room
    const room = await Room.create({
      roomId,
      name,
      description,
      host: req.user._id,
      type,
      settings: {
        ...settings,
        password: hashedPassword
      },
      schedule,
      security: {
        encryptionKey: crypto.randomBytes(32).toString('hex')
      }
    })

    // Add host as first participant
    await room.addParticipant(req.user._id, null, 'host')

    // Populate host info
    await room.populate('host', 'name email avatar')

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room }
    })

  } catch (error) {
    console.error('Create room error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    })
  }
})

// @desc    Get user's rooms
// @route   GET /api/rooms
// @access  Private
router.get('/', authenticate, queryValidation.pagination, queryValidation.roomList, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type
    } = req.query

    const query = {
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id }
      ]
    }

    if (status) query.status = status
    if (type) query.type = type

    const skip = (page - 1) * limit
    const rooms = await Room.find(query)
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Room.countDocuments(query)

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get rooms error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get rooms'
    })
  }
})

// @desc    Get room by ID
// @route   GET /api/rooms/:roomId
// @access  Private
router.get('/:roomId', authenticate, authorizeRoom('view'), async (req, res) => {
  try {
    const room = req.room

    // Don't include sensitive data
    const roomData = {
      ...room.toObject(),
      security: undefined,
      settings: {
        ...room.settings,
        password: undefined
      }
    }

    res.json({
      success: true,
      data: { room: roomData }
    })

  } catch (error) {
    console.error('Get room error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get room'
    })
  }
})

// @desc    Join room
// @route   POST /api/rooms/:roomId/join
// @access  Private
router.post('/:roomId/join', authenticate, roomValidation.join, async (req, res) => {
  try {
    const { roomId } = req.params
    const { password } = req.body

    const room = await Room.findOne({ roomId }).select('+settings.password')

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      })
    }

    // Check if user can join
    const canJoin = room.canUserJoin(req.user._id)
    if (!canJoin.allowed) {
      return res.status(403).json({
        success: false,
        error: canJoin.reason
      })
    }

    // Check password if required
    if (room.settings.requirePassword) {
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Room password is required'
        })
      }

      const bcrypt = require('bcryptjs')
      const isPasswordValid = await bcrypt.compare(password, room.settings.password)
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid room password'
        })
      }
    }

    // Add user as participant
    await room.addParticipant(req.user._id, null, 'participant')

    // Update room status to active if it was waiting
    if (room.status === 'waiting') {
      room.status = 'active'
      await room.save()
    }

    res.json({
      success: true,
      message: 'Joined room successfully',
      data: {
        roomId: room.roomId,
        encryptionKey: room.security.encryptionKey
      }
    })

  } catch (error) {
    console.error('Join room error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to join room'
    })
  }
})

// @desc    Leave room
// @route   POST /api/rooms/:roomId/leave
// @access  Private
router.post('/:roomId/leave', authenticate, authorizeRoom('participate'), async (req, res) => {
  try {
    const room = req.room

    // Remove participant
    await room.removeParticipant(req.user._id)

    // If host leaves and there are other participants, transfer host to first participant
    if (req.isHost && room.activeParticipants.length > 0) {
      const newHost = room.activeParticipants[0]
      newHost.role = 'host'
      room.host = newHost.user
      await room.save()
    }

    // If no participants left, end the room
    if (room.activeParticipants.length === 0) {
      room.status = 'ended'
      room.analytics.duration = Date.now() - room.createdAt
      await room.save()
    }

    res.json({
      success: true,
      message: 'Left room successfully'
    })

  } catch (error) {
    console.error('Leave room error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to leave room'
    })
  }
})

// @desc    Update room settings
// @route   PUT /api/rooms/:roomId/settings
// @access  Private (Host only)
router.put('/:roomId/settings', authenticate, authorizeRoom('host'), roomValidation.updateSettings, async (req, res) => {
  try {
    const room = req.room
    const { settings } = req.body

    // Hash password if provided
    if (settings.requirePassword && settings.password) {
      const bcrypt = require('bcryptjs')
      settings.password = await bcrypt.hash(settings.password, 10)
    }

    // Update settings
    room.settings = { ...room.settings, ...settings }
    await room.save()

    res.json({
      success: true,
      message: 'Room settings updated successfully',
      data: {
        settings: {
          ...room.settings,
          password: undefined
        }
      }
    })

  } catch (error) {
    console.error('Update room settings error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update room settings'
    })
  }
})

// @desc    Get room messages
// @route   GET /api/rooms/:roomId/messages
// @access  Private
router.get('/:roomId/messages', authenticate, authorizeRoom('participate'), queryValidation.pagination, async (req, res) => {
  try {
    const room = req.room
    const { page = 1, limit = 50 } = req.query

    const skip = (page - 1) * limit
    const messages = room.messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + parseInt(limit))

    await Room.populate(messages, { path: 'sender', select: 'name email avatar' })

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: room.messages.length,
          pages: Math.ceil(room.messages.length / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    })
  }
})

// @desc    Get room analytics
// @route   GET /api/rooms/:roomId/analytics
// @access  Private (Host/Moderator only)
router.get('/:roomId/analytics', authenticate, authorizeRoom('moderate'), async (req, res) => {
  try {
    const room = req.room

    const analytics = {
      ...room.analytics,
      currentParticipants: room.participantCount,
      roomDuration: room.duration,
      participantHistory: room.participants.map(p => ({
        user: p.user,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        duration: p.leftAt ? p.leftAt - p.joinedAt : Date.now() - p.joinedAt
      }))
    }

    res.json({
      success: true,
      data: { analytics }
    })

  } catch (error) {
    console.error('Get analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    })
  }
})

module.exports = router
