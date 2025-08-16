import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { io } from 'socket.io-client'
import {
  Video, VideoOff, Mic, MicOff, Phone, MessageCircle,
  Users, Copy, CheckCircle, Send, Monitor, MonitorOff,
  Upload, Shield, Settings, Palette, Eraser, Download,
  FileText, Maximize2, Minimize2
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const VideoCall = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  console.log('🎥 VideoCall component loaded:', { roomId, user })

  // Add early return for debugging
  if (!user) {
    console.log('❌ No user found, redirecting to login')
    return (
      <div className="min-h-screen bg-yellow-500 text-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">⚠️ Authentication Required</h1>
          <p className="text-xl mb-4">Please log in to join the video call</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (!roomId) {
    console.log('❌ No room ID found')
    return (
      <div className="min-h-screen bg-red-500 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">❌ Invalid Room</h1>
          <p className="text-xl mb-4">Room ID is missing</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Media states
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // UI states
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [showFileShare, setShowFileShare] = useState(false)
  const [participants, setParticipants] = useState([])
  const [roomCopied, setRoomCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Whiteboard states
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#ffffff')
  const [drawSize, setDrawSize] = useState(3)
  const [drawTool, setDrawTool] = useState('pen') // pen, eraser

  // File sharing states
  const [files, setFiles] = useState([])

  // Refs
  const localVideoRef = useRef()
  const localStreamRef = useRef()
  const socketRef = useRef()
  const canvasRef = useRef()
  const fileInputRef = useRef()

  useEffect(() => {
    initializeCall()
    return () => cleanup()
  }, [])

  const initializeCall = async () => {
    try {
      setIsLoading(true)
      setConnectionError(null)
      console.log('🚀 Initializing call for room:', roomId, 'user:', user.name)

      // Test backend connection first
      try {
        const response = await fetch('http://localhost:5000/api/health')
        if (!response.ok) {
          throw new Error('Backend server not responding')
        }
        console.log('✅ Backend server is running')
      } catch (error) {
        console.error('❌ Backend server not accessible:', error)
        setConnectionError('Cannot connect to server. Please check if backend is running.')
        setIsLoading(false)
        toast.error('❌ Cannot connect to server. Please check if backend is running.')
        return
      }

      // Initialize Socket.IO connection
      socketRef.current = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      })

      // Socket event listeners
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected successfully')
        setIsConnected(true)
        setIsLoading(false)
        setConnectionError(null)
        toast.success('🎉 Connected to room!')
        socketRef.current.emit('join-room', roomId, user)
      })

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        setConnectionError('Failed to connect to server: ' + error.message)
        setIsLoading(false)
        setIsConnected(false)
        toast.error('❌ Failed to connect to server: ' + error.message)
      })

      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason)
        setIsConnected(false)
        toast.error('🔌 Disconnected from server: ' + reason)
      })

      socketRef.current.on('user-joined', (userData) => {
        setParticipants(prev => [...prev, userData])
        toast.success(`👋 ${userData.name} joined`)
      })

      socketRef.current.on('user-left', (userData) => {
        setParticipants(prev => prev.filter(p => p.id !== userData.id))
        toast.error(`👋 ${userData.name} left`)
      })

      socketRef.current.on('chat-message', (message) => {
        setMessages(prev => [...prev, message])
      })

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

    } catch (error) {
      console.error('Error initializing call:', error)
      setConnectionError('Failed to access camera/microphone: ' + error.message)
      setIsLoading(false)
      toast.error('❌ Failed to access camera/microphone')
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
        toast.success(videoTrack.enabled ? '📹 Camera on' : '📹 Camera off')
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
        toast.success(audioTrack.enabled ? '🎤 Microphone on' : '🎤 Microphone off')
      }
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }
        
        setIsScreenSharing(true)
        toast.success('🖥️ Screen sharing started')
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
          }
          toast.info('🖥️ Screen sharing stopped')
        }
      } else {
        setIsScreenSharing(false)
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
        }
        toast.info('🖥️ Screen sharing stopped')
      }
    } catch (error) {
      console.error('Screen share error:', error)
      toast.error('❌ Failed to share screen')
    }
  }

  const sendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      const message = {
        id: Date.now(),
        text: newMessage,
        sender: user.name,
        timestamp: new Date().toLocaleTimeString()
      }
      
      socketRef.current.emit('chat-message', roomId, message)
      setMessages(prev => [...prev, message])
      setNewMessage('')
    }
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setRoomCopied(true)
    toast.success('📋 Room ID copied!')
    setTimeout(() => setRoomCopied(false), 2000)
  }

  // Whiteboard functions
  const startDrawing = (e) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineWidth = drawSize
    ctx.lineCap = 'round'
    ctx.strokeStyle = drawTool === 'eraser' ? '#1e293b' : drawColor

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)

    // Emit drawing data to other participants
    if (socketRef.current) {
      socketRef.current.emit('whiteboard-draw', roomId, {
        x, y, color: drawColor, size: drawSize, tool: drawTool
      })
    }
  }

  const clearWhiteboard = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (socketRef.current) {
        socketRef.current.emit('whiteboard-clear', roomId)
      }
      toast.success('🧹 Whiteboard cleared!')
    }
  }

  // File sharing functions
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const fileData = {
        id: Date.now(),
        name: file.name,
        size: file.size,
        type: file.type,
        sender: user.name,
        timestamp: new Date().toLocaleTimeString()
      }

      setFiles(prev => [...prev, fileData])

      if (socketRef.current) {
        socketRef.current.emit('file-share', roomId, fileData)
      }

      toast.success(`📁 File "${file.name}" shared!`)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const leaveCall = () => {
    cleanup()
    navigate('/dashboard')
  }

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
  }

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting to room...</h2>
          <p className="text-slate-400">Setting up your video call</p>
        </div>
      </div>
    )
  }

  // Show error screen
  if (connectionError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-400">Connection Failed</h2>
          <p className="text-slate-400 mb-6">{connectionError}</p>
          <div className="space-y-3">
            <button
              onClick={initializeCall}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white relative">
      <Toaster position="top-right" />

      {/* Enhanced Header */}
      <header className="bg-slate-800/95 backdrop-blur-md border-b border-slate-700/50 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Video size={18} className="text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  ConnectPro
                </span>
                <Shield size={18} className="text-green-400 animate-pulse" title="End-to-end encrypted" />
              </h1>
              <div className="flex items-center space-x-3 text-sm text-slate-400 mt-1">
                <span>Room: <span className="text-blue-400 font-mono font-semibold">{roomId}</span></span>
                <button
                  onClick={copyRoomId}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    roomCopied
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300 shadow-lg'
                  }`}
                >
                  {roomCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  <span>{roomCopied ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 bg-slate-700/50 px-3 py-2 rounded-lg">
                <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse shadow-lg`}></span>
                <span className="text-sm font-medium text-slate-200">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>

              {/* Participants Count */}
              <div className="flex items-center space-x-2 bg-slate-700/50 px-3 py-2 rounded-lg">
                <Users size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-slate-200">
                  {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
                </span>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-2 bg-slate-700/50 px-3 py-2 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-slate-200">{user.name}</span>
              </div>
            </div>
          </div>

          <button
            onClick={leaveCall}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-red-500/25"
          >
            <Phone size={18} />
            <span className="font-medium">Leave Call</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Video Area */}
        <div className="flex-1 relative bg-slate-800">
          <div className="absolute inset-0 flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover rounded-lg"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <VideoOff size={48} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-slate-400">Camera is off</p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Video Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-3 bg-slate-800/95 backdrop-blur-md rounded-2xl px-8 py-4 shadow-2xl border border-slate-700/50">
              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  isVideoOn
                    ? 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25'
                }`}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>

              {/* Audio Toggle */}
              <button
                onClick={toggleAudio}
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  isAudioOn
                    ? 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25'
                }`}
                title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  isScreenSharing
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                }`}
                title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
              >
                {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-slate-600"></div>

              {/* Chat Toggle */}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  showChat
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                }`}
                title="Toggle chat"
              >
                <MessageCircle size={22} />
              </button>

              {/* Whiteboard Toggle */}
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  showWhiteboard
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                }`}
                title="Toggle whiteboard"
              >
                <Palette size={22} />
              </button>

              {/* File Share Toggle */}
              <button
                onClick={() => setShowFileShare(!showFileShare)}
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  showFileShare
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                }`}
                title="Toggle file sharing"
              >
                <Upload size={22} />
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-slate-600"></div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white shadow-lg transition-all duration-300 transform hover:scale-105"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-slate-800/95 backdrop-blur-md border-l border-slate-700/50 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-700/50 bg-slate-700/50">
              <h3 className="font-semibold text-blue-400 flex items-center">
                <MessageCircle size={18} className="mr-2" />
                Chat
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="bg-slate-700/80 rounded-xl p-3 backdrop-blur-sm border border-slate-600/30">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-blue-400">{message.sender}</span>
                      <span className="text-xs text-slate-400">{message.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-200">{message.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-700/50 bg-slate-700/30">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-700/80 border border-slate-600/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Whiteboard Sidebar */}
        {showWhiteboard && (
          <div className="w-96 bg-slate-800/95 backdrop-blur-md border-l border-slate-700/50 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-700/50 bg-slate-700/50">
              <h3 className="font-semibold text-purple-400 flex items-center justify-between">
                <span className="flex items-center">
                  <Palette size={18} className="mr-2" />
                  Whiteboard
                </span>
                <button
                  onClick={clearWhiteboard}
                  className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </h3>
            </div>

            {/* Drawing Tools */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-700/30">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-300 w-16">Tool:</span>
                  <button
                    onClick={() => setDrawTool('pen')}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      drawTool === 'pen' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Pen
                  </button>
                  <button
                    onClick={() => setDrawTool('eraser')}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      drawTool === 'eraser' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Eraser size={14} className="inline mr-1" />
                    Eraser
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-300 w-16">Color:</span>
                  <div className="flex space-x-1">
                    {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
                      <button
                        key={color}
                        onClick={() => setDrawColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          drawColor === color ? 'border-white scale-110' : 'border-slate-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-300 w-16">Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={drawSize}
                    onChange={(e) => setDrawSize(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-slate-400 w-8">{drawSize}px</span>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-4">
              <canvas
                ref={canvasRef}
                width={320}
                height={400}
                className="w-full h-full bg-slate-900 rounded-xl border border-slate-600 cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
          </div>
        )}

        {/* File Sharing Sidebar */}
        {showFileShare && (
          <div className="w-80 bg-slate-800/95 backdrop-blur-md border-l border-slate-700/50 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-700/50 bg-slate-700/50">
              <h3 className="font-semibold text-green-400 flex items-center">
                <Upload size={18} className="mr-2" />
                File Sharing
              </h3>
            </div>

            {/* Upload Area */}
            <div className="p-4 border-b border-slate-700/50">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Upload size={18} />
                <span>Upload File</span>
              </button>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {files.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <FileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No files shared yet</p>
                  <p className="text-sm">Upload a file to share</p>
                </div>
              ) : (
                files.map((file) => (
                  <div key={file.id} className="bg-slate-700/80 rounded-xl p-3 backdrop-blur-sm border border-slate-600/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {file.sender} • {file.timestamp}
                        </p>
                      </div>
                      <button className="ml-2 text-green-400 hover:text-green-300 transition-colors">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCall
