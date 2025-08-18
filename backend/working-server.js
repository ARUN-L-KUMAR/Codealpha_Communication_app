const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')

console.log('🚀 Starting ConnectPro Server...')

const app = express()
const server = http.createServer(app)

// CORS middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true
}))

app.use(express.json())

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
})

// In-memory storage
const rooms = new Map()
const users = new Map()

// Create default test user
users.set('test@example.com', {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
})

console.log('✅ Default user created: test@example.com / password123')

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ConnectPro Server is running',
    timestamp: new Date().toISOString()
  })
})

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body
    
    console.log('📝 Registration attempt:', { name, email })
    
    if (users.has(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      })
    }

    const user = {
      id: Date.now().toString(),
      name,
      email,
      password
    }

    users.set(email, user)
    console.log('✅ User registered:', email)

    res.json({
      success: true,
      token: 'demo-token-' + user.id,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    console.error('❌ Registration error:', error)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body
    
    console.log('🔐 Login attempt:', email)
    
    const user = users.get(email)

    if (!user || user.password !== password) {
      console.log('❌ Invalid credentials for:', email)
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      })
    }

    console.log('✅ Login successful:', email)
    
    res.json({
      success: true,
      token: 'demo-token-' + user.id,
      user: { id: user.id, name: user.name, email: user.email }
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id)

  socket.on('join-room', ({ roomId, userInfo }) => {
    console.log(`🏠 User ${userInfo.name} joining room ${roomId}`)
    
    socket.join(roomId)
    socket.roomId = roomId
    socket.userInfo = userInfo

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Map(),
        messages: []
      })
      console.log(`🆕 Created new room: ${roomId}`)
    }

    const room = rooms.get(roomId)
    room.participants.set(socket.id, userInfo)

    // Notify other participants
    socket.to(roomId).emit('user-joined', { 
      socketId: socket.id, 
      userInfo 
    })

    // Send current room state to new participant
    socket.emit('room-state', {
      participants: Array.from(room.participants.entries()).map(([id, info]) => ({
        socketId: id,
        ...info
      })),
      messages: room.messages
    })

    console.log(`✅ User ${userInfo.name} joined room ${roomId}`)
  })

  // WebRTC signaling
  socket.on('offer', ({ offer, targetSocketId }) => {
    socket.to(targetSocketId).emit('offer', { offer, socketId: socket.id })
  })

  socket.on('answer', ({ answer, targetSocketId }) => {
    socket.to(targetSocketId).emit('answer', { answer, socketId: socket.id })
  })

  socket.on('ice-candidate', ({ candidate, targetSocketId }) => {
    socket.to(targetSocketId).emit('ice-candidate', { candidate, socketId: socket.id })
  })

  // Chat messages
  socket.on('chat-message', ({ message, roomId }) => {
    const room = rooms.get(roomId)
    if (room && socket.userInfo) {
      const chatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: socket.userInfo,
        timestamp: new Date().toISOString()
      }
      room.messages.push(chatMessage)
      io.to(roomId).emit('chat-message', chatMessage)
      console.log(`💬 Chat message in room ${roomId}:`, message)
    }
  })

  // Whiteboard
  socket.on('whiteboard-draw', ({ drawData, roomId }) => {
    socket.to(roomId).emit('whiteboard-draw', drawData)
  })

  socket.on('whiteboard-clear', (roomId) => {
    socket.to(roomId).emit('whiteboard-clear')
  })

  // Screen sharing
  socket.on('screen-share-start', ({ roomId }) => {
    socket.to(roomId).emit('user-started-screen-share', { userInfo: socket.userInfo })
  })

  socket.on('screen-share-stop', ({ roomId }) => {
    socket.to(roomId).emit('user-stopped-screen-share', { userInfo: socket.userInfo })
  })

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id)
    
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
          console.log(`🗑️ Deleted empty room: ${socket.roomId}`)
        }
      }
    }
  })
})

// Start server with error handling
const PORT = 5000

function startServer(port) {
  server.listen(port, () => {
    console.log('')
    console.log('🎉 ================================')
    console.log('🚀 ConnectPro Server Started!')
    console.log('🎉 ================================')
    console.log(`🌐 Backend: http://localhost:${port}`)
    console.log(`📡 Socket.IO: Ready`)
    console.log(`🔗 Health: http://localhost:${port}/api/health`)
    console.log('')
    console.log('📝 Test Login Credentials:')
    console.log('   Email: test@example.com')
    console.log('   Password: password123')
    console.log('')
    console.log('✅ Server is ready for connections!')
    console.log('🎉 ================================')
  })
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use`)
    console.log('🔄 Trying port 5001...')
    startServer(5001)
  } else {
    console.error('❌ Server error:', err)
    process.exit(1)
  }
})

// Start the server
startServer(PORT)
