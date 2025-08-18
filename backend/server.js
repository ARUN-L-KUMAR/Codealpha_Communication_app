const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const app = express()
const server = http.createServer(app)

// CORS configuration - FIXED
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173","https://codealpha-communication-app.vercel.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Socket.IO configuration - FIXED
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "https://codealpha-communication-app.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
})

// In-memory storage - WORKING SOLUTION
const users = new Map()
const rooms = new Map()
const activeConnections = new Map()

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Helper functions
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' })
}

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET)
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' })
  }
}

// WORKING API ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    ports: {
      backend: 5000,
      frontend: 5173
    }
  })
})

// WORKING AUTHENTICATION ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Check if user exists
    for (let user of users.values()) {
      if (user.email === email) {
        return res.status(400).json({ error: 'User already exists' })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const userId = Date.now().toString()
    const user = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    }

    users.set(userId, user)

    // Generate token
    const token = generateToken(user)

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user
    let foundUser = null
    for (let user of users.values()) {
      if (user.email === email) {
        foundUser = user
        break
      }
    }

    if (!foundUser) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, foundUser.password)
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    // Generate token
    const token = generateToken(foundUser)

    res.json({
      message: 'Login successful',
      token,
      user: { id: foundUser.id, name: foundUser.name, email: foundUser.email }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.get(req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email }
  })
})

// WORKING SOCKET.IO IMPLEMENTATION
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Join room
  socket.on('join-room', (roomId, userInfo) => {
    socket.join(roomId)

    // Store connection info
    activeConnections.set(socket.id, {
      userId: userInfo.id,
      roomId,
      userInfo: {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email
      }
    })

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: new Map(),
        createdAt: new Date(),
        files: [],
        whiteboardData: []
      })
    }

    const room = rooms.get(roomId)
    room.participants.set(socket.id, userInfo)

    // Notify existing users about new participant
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userInfo
    })

    // Send current room state to new user
    const participantsList = Array.from(room.participants.values())
    socket.emit('room-state', {
      participants: participantsList,
      files: room.files,
      whiteboardData: room.whiteboardData
    })

    console.log(`User ${userInfo.name} (${userInfo.id}) joined room ${roomId}`)
  })

  // WebRTC signaling for multi-user
  socket.on('offer', (data) => {
    const { offer, targetSocketId, roomId } = data
    socket.to(targetSocketId).emit('offer', {
      offer,
      senderSocketId: socket.id,
      roomId
    })
  })

  socket.on('answer', (data) => {
    const { answer, targetSocketId, roomId } = data
    socket.to(targetSocketId).emit('answer', {
      answer,
      senderSocketId: socket.id,
      roomId
    })
  })

  socket.on('ice-candidate', (data) => {
    const { candidate, targetSocketId, roomId } = data
    socket.to(targetSocketId).emit('ice-candidate', {
      candidate,
      senderSocketId: socket.id,
      roomId
    })
  })

  // Chat messages - Fixed to prevent duplicates
  socket.on('chat-message', (data) => {
    const { message, roomId } = data
    const connection = activeConnections.get(socket.id)

    if (connection && rooms.has(roomId)) {
      const messageData = {
        id: Date.now().toString(),
        text: message,
        sender: connection.userInfo,
        timestamp: new Date().toISOString(),
        type: 'text'
      }

      // Send to all users in room EXCEPT the sender to prevent duplicates
      socket.to(roomId).emit('chat-message', messageData)

      console.log(`💬 Message from ${connection.userInfo.name} in room ${roomId}: "${message}"`)
    }
  })

  // File sharing - REMOVED DUPLICATE

  // Whiteboard events
  socket.on('whiteboard-draw', (data) => {
    const { drawData, roomId } = data
    const connection = activeConnections.get(socket.id)

    if (connection && rooms.has(roomId)) {
      const room = rooms.get(roomId)
      room.whiteboardData.push({
        ...drawData,
        timestamp: Date.now(),
        userId: connection.userInfo.id
      })

      // Broadcast drawing to other users
      socket.to(roomId).emit('whiteboard-draw', drawData)
    }
  })

  socket.on('whiteboard-clear', (roomId) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)
      room.whiteboardData = []

      // Broadcast clear to all users
      io.to(roomId).emit('whiteboard-clear')
    }
  })

  // Whiteboard cursor tracking
  socket.on('whiteboard-cursor', (data) => {
    const { roomId, userId, userName, x, y, color } = data
    const connection = activeConnections.get(socket.id)

    if (connection && rooms.has(roomId)) {
      // Broadcast cursor position to other users in the room (not sender)
      socket.to(roomId).emit('whiteboard-cursor', {
        userId: connection.userInfo.id,
        userName: connection.userInfo.name,
        x,
        y,
        color
      })
    }
  })

  socket.on('whiteboard-cursor-leave', (data) => {
    const { roomId } = data
    const connection = activeConnections.get(socket.id)

    if (connection && rooms.has(roomId)) {
      // Broadcast cursor leave to other users in the room
      socket.to(roomId).emit('whiteboard-cursor-leave', {
        userId: connection.userInfo.id
      })
    }
  })

  // Media state management
  socket.on('media-state-change', (data) => {
    try {
      const { roomId, mediaState } = data
      const connection = activeConnections.get(socket.id)

      if (!connection || connection.roomId !== roomId) {
        return
      }

      // Broadcast to other participants
      socket.to(roomId).emit('user-media-state-changed', {
        socketId: socket.id,
        userInfo: connection.userInfo,
        mediaState
      })

      console.log(`🎥 Media state changed: ${connection.userInfo.name} - ${JSON.stringify(mediaState)}`)

    } catch (error) {
      console.error('❌ Media state change error:', error)
    }
  })

  // Screen sharing events
  socket.on('start-screen-share', async (roomId) => {
    try {
      const connection = activeConnections.get(socket.id)
      if (!connection || connection.roomId !== roomId) {
        return
      }

      // Update media state
      await socket.emit('media-state-change', {
        roomId,
        mediaState: { screenShare: true }
      })

      socket.to(roomId).emit('user-started-screen-share', {
        socketId: socket.id,
        userInfo: connection.userInfo
      })

      console.log(`📺 Screen share started: ${connection.userInfo.name}`)

    } catch (error) {
      console.error('❌ Start screen share error:', error)
    }
  })

  socket.on('stop-screen-share', async (roomId) => {
    try {
      const connection = activeConnections.get(socket.id)
      if (!connection || connection.roomId !== roomId) {
        return
      }

      // Update media state
      await socket.emit('media-state-change', {
        roomId,
        mediaState: { screenShare: false }
      })

      socket.to(roomId).emit('user-stopped-screen-share', {
        socketId: socket.id,
        userInfo: connection.userInfo
      })

      console.log(`📺 Screen share stopped: ${connection.userInfo.name}`)

    } catch (error) {
      console.error('❌ Stop screen share error:', error)
    }
  })



  // File sharing
  socket.on('file-share', (data) => {
    try {
      const { fileData, fileName, fileSize, mimeType, roomId } = data
      const connection = activeConnections.get(socket.id)

      if (!connection || connection.roomId !== roomId) {
        return
      }

      // Validate file size (50MB limit)
      if (fileSize > 50 * 1024 * 1024) {
        socket.emit('error', { message: 'File size exceeds 50MB limit' })
        return
      }

      // Check if room exists
      if (!rooms.has(roomId)) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const room = rooms.get(roomId)
      const fileInfo = {
        id: Date.now().toString(),
        name: fileName,
        size: fileSize,
        type: mimeType || 'application/octet-stream',
        data: fileData,
        sender: connection.userInfo,
        timestamp: new Date().toISOString()
      }

      // Add to room files
      room.files.push(fileInfo)

      // Broadcast file to all users in room
      io.to(roomId).emit('file-received', fileInfo)

      console.log(`📁 File shared: ${fileName} by ${connection.userInfo.name}`)

    } catch (error) {
      console.error('❌ File share error:', error)
      socket.emit('error', { message: 'Failed to share file' })
    }
  })



  // User presence and typing indicators
  socket.on('typing-start', (roomId) => {
    const connection = activeConnections.get(socket.id)
    if (connection && connection.roomId === roomId) {
      socket.to(roomId).emit('user-typing', {
        socketId: socket.id,
        userInfo: connection.userInfo
      })
    }
  })

  socket.on('typing-stop', (roomId) => {
    const connection = activeConnections.get(socket.id)
    if (connection && connection.roomId === roomId) {
      socket.to(roomId).emit('user-stopped-typing', {
        socketId: socket.id,
        userInfo: connection.userInfo
      })
    }
  })

  // Disconnect handling
  socket.on('disconnect', () => {
    const connection = activeConnections.get(socket.id)

    if (connection) {
      const { roomId, userInfo } = connection

      // Remove from room
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId)
        room.participants.delete(socket.id)

        // Notify other users
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          userInfo
        })

        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(roomId)
          console.log(`Room ${roomId} deleted (empty)`)
        }
      }

      activeConnections.delete(socket.id)
      console.log(`User ${userInfo.name} disconnected from room ${roomId}`)
    }

    console.log('User disconnected:', socket.id)
  })
})

// WORKING SERVER STARTUP
const PORT = process.env.PORT || 5000

server.listen(PORT, '0.0.0.0', () => {
  console.log('🎉 ================================')
  console.log('🚀 RTC Server Started Successfully')
  console.log('🎉 ================================')
  console.log(`🌐 Backend: http://localhost:${PORT}`)
  console.log(`📡 Socket.IO: Ready for connections`)
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`⏰ Started at: ${new Date().toISOString()}`)
  console.log('✅ All systems operational')
  console.log('🎉 ================================')
})
