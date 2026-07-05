const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const app = express()
const server = http.createServer(app)

// Minimal CORS configuration for performance
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}))

app.use(express.json({ limit: '5mb' }))

// Optimized Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  // Performance optimizations
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6
})

// In-memory storage (optimized)
const rooms = new Map()
const users = new Map()
const JWT_SECRET = 'your-secret-key'

// Helper functions
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' })
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    
    if (users.has(email)) {
      return res.status(400).json({ success: false, error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword
    }

    users.set(email, user)
    const token = generateToken(user)

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = users.get(email)

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const token = generateToken(user)
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// Socket.IO optimized handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', ({ roomId, userInfo }) => {
    socket.join(roomId)
    socket.roomId = roomId
    socket.userInfo = userInfo

    // Get or create room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Map(),
        messages: [],
        files: []
      })
    }

    const room = rooms.get(roomId)
    room.participants.set(socket.id, userInfo)

    // Notify others
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userInfo })

    // Send room state
    socket.emit('room-state', {
      participants: Array.from(room.participants.entries()).map(([id, info]) => ({
        socketId: id,
        ...info
      })),
      messages: room.messages,
      files: room.files
    })

    console.log(`User ${userInfo.name} joined room ${roomId}`)
  })

  socket.on('offer', ({ offer, targetSocketId }) => {
    socket.to(targetSocketId).emit('offer', { offer, socketId: socket.id })
  })

  socket.on('answer', ({ answer, targetSocketId }) => {
    socket.to(targetSocketId).emit('answer', { answer, socketId: socket.id })
  })

  socket.on('ice-candidate', ({ candidate, targetSocketId }) => {
    socket.to(targetSocketId).emit('ice-candidate', { candidate, socketId: socket.id })
  })

  socket.on('chat-message', ({ message, roomId }) => {
    const room = rooms.get(roomId)
    if (room) {
      const chatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: socket.userInfo,
        timestamp: new Date().toISOString()
      }
      room.messages.push(chatMessage)
      io.to(roomId).emit('chat-message', chatMessage)
    }
  })

  socket.on('screen-share-start', ({ roomId }) => {
    socket.to(roomId).emit('user-started-screen-share', { userInfo: socket.userInfo })
  })

  socket.on('screen-share-stop', ({ roomId }) => {
    socket.to(roomId).emit('user-stopped-screen-share', { userInfo: socket.userInfo })
  })

  socket.on('whiteboard-draw', ({ drawData, roomId }) => {
    socket.to(roomId).emit('whiteboard-draw', drawData)
  })

  socket.on('whiteboard-clear', (roomId) => {
    socket.to(roomId).emit('whiteboard-clear')
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    
    if (socket.roomId) {
      const room = rooms.get(socket.roomId)
      if (room) {
        room.participants.delete(socket.id)
        socket.to(socket.roomId).emit('user-left', { 
          socketId: socket.id, 
          userInfo: socket.userInfo 
        })

        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(socket.roomId)
          console.log(`Room ${socket.roomId} deleted (empty)`)
        }
      }
    }
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Create default user for testing
const createDefaultUser = async () => {
  const defaultEmail = 'test@example.com'
  if (!users.has(defaultEmail)) {
    const hashedPassword = await bcrypt.hash('password123', 10)
    users.set(defaultEmail, {
      id: '1',
      name: 'Test User',
      email: defaultEmail,
      password: hashedPassword
    })
    console.log('✅ Default user created: test@example.com / password123')
  }
}

const PORT = process.env.PORT || 5000

server.listen(PORT, async () => {
  console.log('🚀 Fast Server Started')
  console.log(`🌐 Backend: http://localhost:${PORT}`)
  console.log(`📡 Socket.IO: Ready`)
  
  await createDefaultUser()
  
  console.log('✅ Server ready')
  console.log('📝 Test Login: test@example.com / password123')
})
