const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const app = express()
const server = http.createServer(app)

// CORS configuration
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))

// Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
})

// In-memory storage
const rooms = new Map()
const activeConnections = new Map()
const users = new Map()

// JWT Secret
const JWT_SECRET = 'your-secret-key'

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server running' })
})

// Authentication routes
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

// Socket.IO events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Join room
  socket.on('join-room', (roomId, userInfo) => {
    socket.join(roomId)
    activeConnections.set(socket.id, { userId: userInfo.id, roomId, userInfo })
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { id: roomId, participants: new Map(), files: [] })
    }
    
    const room = rooms.get(roomId)
    room.participants.set(socket.id, userInfo)
    
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userInfo })
    console.log(`User ${userInfo.name} joined room ${roomId}`)
  })

  // File sharing
  socket.on('file-share', (data) => {
    const { fileData, fileName, fileSize, mimeType, roomId } = data
    const connection = activeConnections.get(socket.id)

    if (connection && rooms.has(roomId)) {
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

      room.files.push(fileInfo)
      io.to(roomId).emit('file-received', fileInfo)
      console.log(`📁 File shared: ${fileName} by ${connection.userInfo.name}`)
    }
  })

  // Chat messages
  socket.on('chat-message', (data) => {
    const { message, roomId } = data
    const connection = activeConnections.get(socket.id)

    if (connection) {
      const messageData = {
        id: Date.now().toString(),
        text: message,
        sender: connection.userInfo,
        timestamp: new Date().toISOString(),
        type: 'text'
      }
      socket.to(roomId).emit('chat-message', messageData)
    }
  })

  // WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.targetSocketId).emit('offer', { ...data, senderSocketId: socket.id })
  })

  socket.on('answer', (data) => {
    socket.to(data.targetSocketId).emit('answer', { ...data, senderSocketId: socket.id })
  })

  socket.on('ice-candidate', (data) => {
    socket.to(data.targetSocketId).emit('ice-candidate', { ...data, senderSocketId: socket.id })
  })

  // Disconnect
  socket.on('disconnect', () => {
    const connection = activeConnections.get(socket.id)
    if (connection) {
      const { roomId, userInfo } = connection
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId)
        room.participants.delete(socket.id)
        socket.to(roomId).emit('user-left', { socketId: socket.id, userInfo })
      }
      activeConnections.delete(socket.id)
    }
    console.log('User disconnected:', socket.id)
  })
})

// Create default test user
const createDefaultUser = async () => {
  const hashedPassword = await bcrypt.hash('password123', 10)
  const defaultUser = {
    id: 'default-user-1',
    name: 'Test User',
    email: 'test@example.com',
    password: hashedPassword,
    createdAt: new Date()
  }
  users.set('default-user-1', defaultUser)
  console.log('✅ Default user created: test@example.com / password123')
}

const PORT = 5000
server.listen(PORT, async () => {
  console.log('🎉 ================================')
  console.log('🚀 VideoConnect Pro Server Started')
  console.log('🎉 ================================')
  console.log(`🌐 Backend: http://localhost:${PORT}`)
  console.log(`📡 Socket.IO: Ready for connections`)

  // Create default user
  await createDefaultUser()

  console.log('✅ All systems operational')
  console.log('🎉 ================================')
  console.log('📝 Test Login: test@example.com / password123')
  console.log('🎉 ================================')
})
