const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')

const app = express()
const server = http.createServer(app)

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}))

app.use(express.json())

const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
})

const rooms = new Map()
const users = new Map()

// Default user
users.set('test@example.com', {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
})

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body
  
  if (users.has(email)) {
    return res.status(400).json({ success: false, error: 'User already exists' })
  }

  const user = { id: Date.now().toString(), name, email, password }
  users.set(email, user)

  res.json({
    success: true,
    token: 'fake-token',
    user: { id: user.id, name: user.name, email: user.email }
  })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  const user = users.get(email)

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' })
  }

  res.json({
    success: true,
    token: 'fake-token',
    user: { id: user.id, name: user.name, email: user.email }
  })
})

// Socket handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', ({ roomId, userInfo }) => {
    socket.join(roomId)
    socket.roomId = roomId
    socket.userInfo = userInfo

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { participants: new Map(), messages: [] })
    }

    const room = rooms.get(roomId)
    room.participants.set(socket.id, userInfo)

    socket.to(roomId).emit('user-joined', { socketId: socket.id, userInfo })
    socket.emit('room-state', {
      participants: Array.from(room.participants.entries()).map(([id, info]) => ({
        socketId: id, ...info
      })),
      messages: room.messages
    })
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

  socket.on('whiteboard-draw', ({ drawData, roomId }) => {
    socket.to(roomId).emit('whiteboard-draw', drawData)
  })

  socket.on('disconnect', () => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId)
      if (room) {
        room.participants.delete(socket.id)
        socket.to(socket.roomId).emit('user-left', { 
          socketId: socket.id, 
          userInfo: socket.userInfo 
        })
      }
    }
  })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' })
})

const PORT = process.env.PORT || 5000

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use`)
    console.log('🔄 Trying port 5001...')
    server.listen(5001, () => {
      console.log('🚀 ConnectPro Server Started')
      console.log(`🌐 Backend: http://localhost:5001`)
      console.log('📝 Login: test@example.com / password123')
      console.log('✅ Server ready!')
    })
  } else {
    console.error('❌ Server error:', err)
  }
})

server.listen(PORT, () => {
  console.log('🚀 ConnectPro Server Started')
  console.log(`🌐 Backend: http://localhost:${PORT}`)
  console.log('📝 Login: test@example.com / password123')
  console.log('✅ Server ready!')
})
