import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { io } from 'socket.io-client'
import config from '../config/api'
import {
  Video, VideoOff, Mic, MicOff, Phone, MessageCircle,
  Users, Copy, CheckCircle, Send, Monitor, MonitorOff,
  Upload, Shield, Settings, Palette, Eraser, Download,
  FileText, Maximize2, Minimize2, X, Plus, ChevronDown,
  Image, File, Smile, Paperclip, Search, Star, Archive,
  Eye, EyeOff, RotateCcw, Save, Share2, Trash2, Edit3,
  ChevronLeft, ChevronRight, MoreVertical, Bell, BellOff,
  Move, Square, Circle, ArrowRight, Type, MousePointer,
  Layers, Grid, ZoomIn, ZoomOut, RotateCw, Undo2, Redo2,
  PanelRightClose
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
  const [chatFilter, setChatFilter] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  
  // Panel management states
  const [panelWidths, setPanelWidths] = useState({
    chat: 384,
    whiteboard: 384,
    fileShare: 384
  })
  const [collapsedPanels, setCollapsedPanels] = useState({
    chat: false,
    whiteboard: false,
    fileShare: false
  })
  const [isResizing, setIsResizing] = useState(null)
  const [darkMode, setDarkMode] = useState(true)
  
  // Camera states
  const [cameraMode, setCameraMode] = useState('normal') // normal, mini, fullscreen
  const [miniCameraPosition, setMiniCameraPosition] = useState({ x: 20, y: 20 })
  const [isDraggingCamera, setIsDraggingCamera] = useState(false)

  // Whiteboard states
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#ffffff')
  const [drawSize, setDrawSize] = useState(3)
  const [drawTool, setDrawTool] = useState('pen') // pen, eraser, line, rectangle, circle
  const [whiteboardHistory, setWhiteboardHistory] = useState([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [showWhiteboardTools, setShowWhiteboardTools] = useState(true)
  const [whiteboardBackground, setWhiteboardBackground] = useState('#1e293b')
  
  // Enhanced whiteboard layout states
  const [whiteboardMode, setWhiteboardMode] = useState('sidebar') // sidebar, floating, fullscreen, split
  const [floatingWhiteboardPosition, setFloatingWhiteboardPosition] = useState({ x: 100, y: 100 })
  const [floatingWhiteboardSize, setFloatingWhiteboardSize] = useState({ width: 600, height: 400 })
  const [isDraggingWhiteboard, setIsDraggingWhiteboard] = useState(false)
  const [isResizingWhiteboard, setIsResizingWhiteboard] = useState(false)
  const [activeTab, setActiveTab] = useState('chat') // chat, whiteboard, files

  // File sharing states
  const [files, setFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})
  const [dragActive, setDragActive] = useState(false)
  const [fileFilter, setFileFilter] = useState('all') // all, images, documents, others
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showFilePreview, setShowFilePreview] = useState(null)

  // Refs
  const localVideoRef = useRef()
  const localStreamRef = useRef()
  const socketRef = useRef()
  const canvasRef = useRef()
  const fileInputRef = useRef()
  const chatContainerRef = useRef()
  const typingTimeoutRef = useRef()
  const messageInputRef = useRef()

  // Mouse event handlers for floating whiteboard
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingWhiteboard) {
        setFloatingWhiteboardPosition(prev => ({
          x: e.clientX - 150, // Offset for better UX
          y: e.clientY - 20
        }))
      }
      
      if (isResizingWhiteboard) {
        setFloatingWhiteboardSize(prev => ({
          width: Math.max(400, e.clientX - floatingWhiteboardPosition.x),
          height: Math.max(300, e.clientY - floatingWhiteboardPosition.y)
        }))
      }
    }

    const handleMouseUp = () => {
      setIsDraggingWhiteboard(false)
      setIsResizingWhiteboard(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && whiteboardMode === 'fullscreen') {
        setWhiteboardMode('sidebar')
      }
    }

    if (isDraggingWhiteboard || isResizingWhiteboard) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDraggingWhiteboard, isResizingWhiteboard, whiteboardMode, floatingWhiteboardPosition.x, floatingWhiteboardPosition.y])

  useEffect(() => {
    initializeCall()
    return () => cleanup()
  }, [])

  // Monitor video state and stream changes
  useEffect(() => {
    const checkVideoPlayback = () => {
      if (localVideoRef.current && localStreamRef.current && isVideoOn) {
        console.log('🔍 Checking video playback...')
        
        // Ensure stream is connected
        if (localVideoRef.current.srcObject !== localStreamRef.current) {
          console.log('🔗 Reconnecting stream to video element')
          localVideoRef.current.srcObject = localStreamRef.current
        }
        
        // Check if video is playing
        if (localVideoRef.current.paused && localVideoRef.current.readyState >= 2) {
          console.log('▶️ Video is paused, trying to play')
          localVideoRef.current.play().catch(error => {
            console.warn('Auto-play failed:', error)
          })
        }
        
        // Log video state for debugging
        console.log('📺 Video state:', {
          paused: localVideoRef.current.paused,
          readyState: localVideoRef.current.readyState,
          videoWidth: localVideoRef.current.videoWidth,
          videoHeight: localVideoRef.current.videoHeight,
          srcObject: !!localVideoRef.current.srcObject
        })
      }
    }
    
    if (isVideoOn) {
      checkVideoPlayback()
      // Check every 3 seconds when video should be on
      const interval = setInterval(checkVideoPlayback, 3000)
      return () => clearInterval(interval)
    }
  }, [isVideoOn])

  const initializeCall = async () => {
    try {
      setIsLoading(true)
      setConnectionError(null)
      console.log('🚀 Initializing call for room:', roomId, 'user:', user.name)

      // Test backend connection first
      try {
        const response = await fetch(`${config.API_URL.replace('/api', '')}/api/health`)
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

      // Check media device permissions first
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' })
        console.log('📹 Camera permission:', permissions.state)
        
        const audioPermissions = await navigator.permissions.query({ name: 'microphone' })
        console.log('🎤 Microphone permission:', audioPermissions.state)
      } catch (permError) {
        console.warn('Permission check failed:', permError)
      }

      // Get user media with better error handling
      console.log('🎥 Requesting camera and microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      console.log('✅ Media stream obtained:', stream)
      console.log('📹 Video tracks:', stream.getVideoTracks())
      console.log('🎤 Audio tracks:', stream.getAudioTracks())

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        console.log('✅ Video element connected to stream')
        
        // Force video element attributes
        localVideoRef.current.autoplay = true
        localVideoRef.current.muted = true
        localVideoRef.current.playsInline = true
        
        // Ensure video plays
        try {
          await localVideoRef.current.play()
          console.log('✅ Video playback started')
        } catch (playError) {
          console.warn('Video autoplay prevented:', playError)
          // Try to play again after user interaction
          localVideoRef.current.addEventListener('click', () => {
            localVideoRef.current.play().catch(console.error)
          }, { once: true })
        }
      } else {
        console.error('❌ Video element not found')
      }

      // Set initial states based on stream
      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      
      if (videoTrack) {
        setIsVideoOn(videoTrack.enabled)
        console.log('📹 Video track enabled:', videoTrack.enabled)
      }
      
      if (audioTrack) {
        setIsAudioOn(audioTrack.enabled)
        console.log('🎤 Audio track enabled:', audioTrack.enabled)
      }

      // Initialize Socket.IO connection
      socketRef.current = io(config.SOCKET_URL, {
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

    } catch (error) {
      console.error('Error initializing call:', error)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setConnectionError('Camera and microphone access denied. Please allow permissions and refresh the page.')
        toast.error('❌ Camera/microphone access denied')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setConnectionError('No camera or microphone found. Please connect a camera/microphone and try again.')
        toast.error('❌ No camera/microphone found')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setConnectionError('Camera/microphone is already in use by another application.')
        toast.error('❌ Camera/microphone in use by another app')
      } else {
        setConnectionError('Failed to access camera/microphone: ' + error.message)
        toast.error('❌ Failed to access camera/microphone')
      }
      
      setIsLoading(false)
      console.error('Camera error details:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
      })
    }
  }

  const forceStartVideo = async () => {
    try {
      console.log('🎬 Force starting video...')
      
      if (localVideoRef.current && localStreamRef.current) {
        // Re-connect stream to video element
        localVideoRef.current.srcObject = localStreamRef.current
        
        // Force video attributes
        localVideoRef.current.autoplay = true
        localVideoRef.current.muted = true
        localVideoRef.current.playsInline = true
        
        // Try to play
        await localVideoRef.current.play()
        
        // Enable video track
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = true
          setIsVideoOn(true)
        }
        
        console.log('✅ Video force started')
        toast.success('✅ Video started')
      } else {
        console.log('🔄 No stream found, restarting camera...')
        await restartCamera()
      }
    } catch (error) {
      console.error('❌ Force start video failed:', error)
      toast.error('❌ Failed to start video')
    }
  }

  const restartCamera = async () => {
    try {
      console.log('🔄 Restarting camera...')
      
      // Stop existing stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('🛑 Stopped track:', track.kind)
        })
      }
      
      // Clear video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Get new stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('✅ New stream obtained:', stream)
      
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        
        // Force video attributes
        localVideoRef.current.autoplay = true
        localVideoRef.current.muted = true
        localVideoRef.current.playsInline = true
        
        // Try to play
        try {
          await localVideoRef.current.play()
          console.log('✅ Video restarted and playing')
        } catch (playError) {
          console.warn('Video restart play error:', playError)
        }
      }
      
      // Update states
      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      
      setIsVideoOn(videoTrack?.enabled || false)
      setIsAudioOn(audioTrack?.enabled || false)
      
      toast.success('✅ Camera restarted successfully')
      console.log('✅ Camera restarted successfully')
      
    } catch (error) {
      console.error('❌ Failed to restart camera:', error)
      toast.error('❌ Failed to restart camera: ' + error.message)
    }
  }

  const toggleVideo = () => {
    console.log('🎥 Toggle video called, current state:', isVideoOn)
    
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      console.log('📹 Video track found:', videoTrack)
      
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
        
        console.log('✅ Video track toggled to:', videoTrack.enabled)
        toast.success(videoTrack.enabled ? '📹 Camera on' : '📹 Camera off')
        
        // Emit video state to other participants
        if (socketRef.current) {
          socketRef.current.emit('video-toggle', roomId, {
            userId: user.id,
            videoEnabled: videoTrack.enabled
          })
        }
      } else {
        console.error('❌ No video track found')
        toast.error('❌ No camera found')
      }
    } else {
      console.error('❌ No local stream found')
      toast.error('❌ Camera not initialized')
    }
  }

  const toggleAudio = () => {
    console.log('🎤 Toggle audio called, current state:', isAudioOn)
    
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      console.log('🎤 Audio track found:', audioTrack)
      
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
        
        console.log('✅ Audio track toggled to:', audioTrack.enabled)
        toast.success(audioTrack.enabled ? '🎤 Microphone on' : '🎤 Microphone off')
        
        // Emit audio state to other participants
        if (socketRef.current) {
          socketRef.current.emit('audio-toggle', roomId, {
            userId: user.id,
            audioEnabled: audioTrack.enabled
          })
        }
      } else {
        console.error('❌ No audio track found')
        toast.error('❌ No microphone found')
      }
    } else {
      console.error('❌ No local stream found')
      toast.error('❌ Microphone not initialized')
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
        timestamp: new Date().toLocaleTimeString(),
        type: 'text'
      }
      
      socketRef.current.emit('chat-message', roomId, message)
      setMessages(prev => [...prev, message])
      setNewMessage('')
      
      // Stop typing indicator
      clearTimeout(typingTimeoutRef.current)
      socketRef.current.emit('typing-stop', roomId, user.name)
      setIsTyping(false)
    }
  }

  const handleTyping = (value) => {
    setNewMessage(value)
    
    if (!isTyping) {
      setIsTyping(true)
      socketRef.current?.emit('typing-start', roomId, user.name)
    }
    
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socketRef.current?.emit('typing-stop', roomId, user.name)
    }, 1000)
  }

  const filteredMessages = messages.filter(message =>
    message.text.toLowerCase().includes(chatFilter.toLowerCase()) ||
    message.sender.toLowerCase().includes(chatFilter.toLowerCase())
  )

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setRoomCopied(true)
    toast.success('📋 Room ID copied!')
    setTimeout(() => setRoomCopied(false), 2000)
  }

  // Enhanced Whiteboard functions
  const saveWhiteboardState = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const imageData = canvas.toDataURL()
      setWhiteboardHistory(prev => {
        const newHistory = prev.slice(0, currentHistoryIndex + 1)
        newHistory.push(imageData)
        return newHistory
      })
      setCurrentHistoryIndex(prev => prev + 1)
    }
  }

  const undoWhiteboard = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(prev => prev - 1)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      img.src = whiteboardHistory[currentHistoryIndex - 1]
    }
  }

  const redoWhiteboard = () => {
    if (currentHistoryIndex < whiteboardHistory.length - 1) {
      setCurrentHistoryIndex(prev => prev + 1)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      img.src = whiteboardHistory[currentHistoryIndex + 1]
    }
  }

  const startDrawing = (e) => {
    setIsDrawing(true)
    saveWhiteboardState()
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
    ctx.strokeStyle = drawTool === 'eraser' ? whiteboardBackground : drawColor

    if (drawTool === 'pen' || drawTool === 'eraser') {
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

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
      ctx.fillStyle = whiteboardBackground
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      saveWhiteboardState()

      if (socketRef.current) {
        socketRef.current.emit('whiteboard-clear', roomId)
      }
      toast.success('🧹 Whiteboard cleared!')
    }
  }

  const saveWhiteboardImage = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const link = document.createElement('a')
      link.download = `whiteboard-${roomId}-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast.success('💾 Whiteboard saved!')
    }
  }

  // Enhanced File sharing functions
  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files)
    uploadFiles(selectedFiles)
  }

  const uploadFiles = (selectedFiles) => {
    selectedFiles.forEach((file, index) => {
      const fileId = Date.now() + index
      const fileData = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        sender: user.name,
        timestamp: new Date().toLocaleTimeString(),
        url: URL.createObjectURL(file),
        category: getFileCategory(file.type)
      }

      // Simulate upload progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[fileId] || 0
          if (currentProgress >= 100) {
            clearInterval(interval)
            setFiles(prevFiles => [...prevFiles, fileData])
            
            if (socketRef.current) {
              socketRef.current.emit('file-share', roomId, fileData)
            }
            
            toast.success(`📁 File "${file.name}" uploaded successfully!`)
            return prev
          }
          return { ...prev, [fileId]: currentProgress + 10 }
        })
      }, 100)
    })
  }

  const getFileCategory = (type) => {
    if (type.startsWith('image/')) return 'image'
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'document'
    return 'other'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    uploadFiles(droppedFiles)
  }

  const downloadFile = (file) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.click()
    toast.success(`⬇️ Downloaded ${file.name}`)
  }

  const deleteFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('🗑️ File deleted')
  }

  const filteredFiles = files.filter(file => {
    const matchesFilter = fileFilter === 'all' || file.category === fileFilter || 
                         (fileFilter === 'documents' && file.category === 'document')
    return matchesFilter
  })

  // Panel management functions
  const togglePanelCollapse = (panel) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }))
  }

  const handlePanelResize = (panel, newWidth) => {
    setPanelWidths(prev => ({
      ...prev,
      [panel]: Math.max(280, Math.min(600, newWidth))
    }))
  }

  const startResizing = (panel) => {
    setIsResizing(panel)
  }

  const stopResizing = () => {
    setIsResizing(null)
  }

  // Camera management functions
  const toggleCameraMode = () => {
    setCameraMode(prev => {
      if (prev === 'normal') return 'mini'
      if (prev === 'mini') return 'fullscreen'
      return 'normal'
    })
  }

  const handleCameraDrag = (e) => {
    if (isDraggingCamera && cameraMode === 'mini') {
      setMiniCameraPosition({
        x: e.clientX - 100,
        y: e.clientY - 75
      })
    }
  }

  // Enhanced whiteboard management functions
  const toggleWhiteboardMode = (targetMode = null) => {
    if (targetMode) {
      setWhiteboardMode(targetMode)
      if (targetMode === 'floating') {
        setFloatingWhiteboardPosition({ x: 50, y: 50 })
        setFloatingWhiteboardSize({ width: 600, height: 400 })
      }
    } else {
      const modes = ['sidebar', 'floating', 'fullscreen', 'split']
      const currentIndex = modes.indexOf(whiteboardMode)
      const nextIndex = (currentIndex + 1) % modes.length
      setWhiteboardMode(modes[nextIndex])
    }
    
    // Auto-show whiteboard when changing modes
    if (!showWhiteboard) {
      setShowWhiteboard(true)
    }
  }

  const handleWhiteboardDrag = (e) => {
    if (isDraggingWhiteboard && whiteboardMode === 'floating') {
      setFloatingWhiteboardPosition({
        x: e.clientX - floatingWhiteboardSize.width / 2,
        y: e.clientY - 30
      })
    }
  }

  const handleWhiteboardResize = (e) => {
    if (isResizingWhiteboard && whiteboardMode === 'floating') {
      const newWidth = Math.max(400, Math.min(1000, e.clientX - floatingWhiteboardPosition.x))
      const newHeight = Math.max(300, Math.min(700, e.clientY - floatingWhiteboardPosition.y))
      
      setFloatingWhiteboardSize({
        width: newWidth,
        height: newHeight
      })
    }
  }

  const popOutWhiteboard = () => {
    setWhiteboardMode('floating')
    setShowWhiteboard(true)
    setFloatingWhiteboardPosition({ x: 150, y: 100 })
    setFloatingWhiteboardSize({ width: 700, height: 500 })
  }

  const toggleFullscreenWhiteboard = () => {
    if (whiteboardMode === 'fullscreen') {
      setWhiteboardMode('sidebar')
    } else {
      setWhiteboardMode('fullscreen')
      setShowWhiteboard(true)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case 'Enter':
            if (showChat && newMessage.trim()) {
              e.preventDefault()
              sendMessage()
            }
            break
          case 'z':
            if (showWhiteboard) {
              e.preventDefault()
              undoWhiteboard()
            }
            break
          case 'd':
            e.preventDefault()
            setDarkMode(prev => !prev)
            break
          default:
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showChat, showWhiteboard, newMessage])

  // Mouse events for resizing and dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX
        handlePanelResize(isResizing, newWidth)
      }
      handleCameraDrag(e)
      handleWhiteboardDrag(e)
      handleWhiteboardResize(e)
    }

    const handleMouseUp = () => {
      stopResizing()
      setIsDraggingCamera(false)
      setIsDraggingWhiteboard(false)
      setIsResizingWhiteboard(false)
    }

    if (isResizing || isDraggingCamera || isDraggingWhiteboard || isResizingWhiteboard) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, isDraggingCamera, isDraggingWhiteboard, isResizingWhiteboard])

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

      {/* Enhanced Header with Better Spacing */}
      <header className="bg-slate-800/95 backdrop-blur-md border-b border-slate-700/50 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
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
              <div className="flex items-center space-x-4 text-sm text-slate-400 mt-2">
                <div className="flex items-center space-x-2">
                  <span>Room:</span>
                  <span className="text-blue-400 font-mono font-semibold">{roomId}</span>
                  <button
                    onClick={copyRoomId}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                      roomCopied
                        ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300 shadow-lg'
                    }`}
                  >
                    {roomCopied ? <CheckCircle size={12} /> : <Copy size={12} />}
                    <span className="text-xs">{roomCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Enhanced Connection Status */}
              <div className="flex items-center space-x-3 bg-slate-700/50 px-4 py-2 rounded-xl">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse shadow-lg`}></div>
                  <span className="text-sm font-medium text-slate-200">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              </div>

              {/* Enhanced Participants Count */}
              <div className="flex items-center space-x-3 bg-slate-700/50 px-4 py-2 rounded-xl">
                <Users size={18} className="text-blue-400" />
                <span className="text-sm font-medium text-slate-200">
                  {participants.length + 1}
                </span>
                <span className="text-xs text-slate-400">
                  participant{participants.length !== 0 ? 's' : ''}
                </span>
              </div>

              {/* Enhanced User Info */}
              <div className="flex items-center space-x-3 bg-slate-700/50 px-4 py-2 rounded-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-slate-200">{user.name}</span>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center space-x-2 bg-slate-700/50 hover:bg-slate-600/50 px-3 py-2 rounded-xl transition-colors"
                title="Toggle theme"
              >
                {darkMode ? (
                  <>
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <span className="text-xs text-slate-300">Light</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-slate-600 rounded-full"></div>
                    <span className="text-xs text-slate-300">Dark</span>
                  </>
                )}
              </button>
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

      {/* Main Content with Flexible Layout */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Enhanced Video Area */}
        <div className={`flex-1 relative ${darkMode ? 'bg-slate-900' : 'bg-gray-100'} transition-colors duration-300`}>
          {/* Main Video Container */}
          {cameraMode !== 'mini' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${
                  cameraMode === 'fullscreen' ? '' : 'rounded-lg'
                } ${!isVideoOn ? 'hidden' : ''}`}
                style={{ 
                  display: isVideoOn ? 'block' : 'none',
                  backgroundColor: '#1e293b' // Fallback background
                }}
                onLoadedMetadata={() => {
                  console.log('✅ Video metadata loaded')
                  console.log('📹 Video dimensions:', localVideoRef.current?.videoWidth, 'x', localVideoRef.current?.videoHeight)
                }}
                onCanPlay={() => {
                  console.log('✅ Video can play')
                }}
                onPlay={() => {
                  console.log('✅ Video started playing')
                }}
                onError={(e) => {
                  console.error('❌ Video error:', e)
                }}
              />
              
              {/* Debug info overlay */}
              {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
                  <div>Video On: {isVideoOn ? 'Yes' : 'No'}</div>
                  <div>Stream: {localStreamRef.current ? 'Connected' : 'No Stream'}</div>
                  <div>Video Tracks: {localStreamRef.current?.getVideoTracks().length || 0}</div>
                  <div>Video Element: {localVideoRef.current ? 'Found' : 'Missing'}</div>
                  <div>Playing: {localVideoRef.current?.paused === false ? 'Yes' : 'No'}</div>
                  <div>ReadyState: {localVideoRef.current?.readyState || 0}</div>
                  <button 
                    onClick={() => {
                      console.log('🔍 Manual video check')
                      console.log('localVideoRef.current:', localVideoRef.current)
                      console.log('localStreamRef.current:', localStreamRef.current)
                      console.log('isVideoOn:', isVideoOn)
                      forceStartVideo()
                    }}
                    className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Debug Video
                  </button>
                </div>
              )}
              
              {!isVideoOn && (
                <div className="absolute inset-0 bg-slate-700 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <VideoOff size={64} className="mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-400 text-lg mb-4">Camera is off</p>
                    <div className="space-y-2">
                      <button
                        onClick={toggleVideo}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors mr-2"
                      >
                        Turn On Camera
                      </button>
                      <button
                        onClick={forceStartVideo}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors mr-2"
                      >
                        Force Start Video
                      </button>
                      <button
                        onClick={restartCamera}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Restart Camera
                      </button>
                    </div>
                    
                    {/* Additional troubleshooting info */}
                    <div className="mt-4 text-xs text-slate-500">
                      <p>• Check browser permissions</p>
                      <p>• Close other camera apps</p>
                      <p>• Try restarting camera</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Camera Mode Toggle */}
              <button
                onClick={toggleCameraMode}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-colors"
                title="Toggle camera mode"
              >
                {cameraMode === 'normal' ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          )}

          {/* Mini Camera (Floating) */}
          {cameraMode === 'mini' && (
            <div
              className="absolute z-50 w-48 h-36 bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-600 overflow-hidden cursor-move"
              style={{
                left: miniCameraPosition.x,
                top: miniCameraPosition.y
              }}
              onMouseDown={(e) => {
                setIsDraggingCamera(true)
                e.preventDefault()
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 flex space-x-1">
                <button
                  onClick={toggleCameraMode}
                  className="bg-black/60 hover:bg-black/80 text-white p-1 rounded"
                  title="Expand camera"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Video Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-3 bg-slate-800/95 backdrop-blur-md rounded-2xl px-8 py-4 shadow-2xl border border-slate-700/50">
              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 btn-enhanced ${
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
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 btn-enhanced ${
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
                className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 btn-enhanced ${
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

              {/* Chat Toggle with Badge */}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`relative p-4 rounded-xl transition-all duration-300 transform hover:scale-105 btn-enhanced ${
                  showChat
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                }`}
                title="Toggle chat"
              >
                <MessageCircle size={22} />
                {messages.length > 0 && !showChat && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {messages.length > 9 ? '9+' : messages.length}
                  </span>
                )}
              </button>

              {/* Enhanced Whiteboard Toggle with Mode Dropdown */}
              <div className="relative group">
                <button
                  onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className={`relative p-4 rounded-xl transition-all duration-300 transform hover:scale-105 btn-enhanced ${
                    showWhiteboard
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                  }`}
                  title={`Toggle whiteboard (${whiteboardMode} mode)`}
                >
                  <Palette size={22} />
                  {showWhiteboard && (
                    <span className="absolute -bottom-1 -right-1 bg-purple-400 text-white text-xs px-1 rounded">
                      {whiteboardMode.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                
                {/* Mode Quick Switcher Dropdown */}
                <div className="absolute bottom-full mb-2 left-0 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 min-w-[160px] z-50">
                  <div className="p-2 border-b border-slate-700">
                    <div className="text-xs text-slate-400 font-medium">Whiteboard Modes</div>
                  </div>
                  <div className="p-1">
                    {[
                      { mode: 'sidebar', icon: PanelRightClose, label: 'Sidebar', desc: 'Side panel' },
                      { mode: 'floating', icon: Move, label: 'Floating', desc: 'Draggable window' },
                      { mode: 'fullscreen', icon: Maximize2, label: 'Fullscreen', desc: 'Full screen mode' },
                      { mode: 'split', icon: Layers, label: 'Split View', desc: 'Side by side' }
                    ].map(({ mode, icon: Icon, label, desc }) => (
                      <button
                        key={mode}
                        onClick={() => {
                          toggleWhiteboardMode(mode)
                          if (!showWhiteboard) setShowWhiteboard(true)
                        }}
                        className={`w-full flex items-center space-x-3 p-2 rounded text-sm transition-all hover:bg-slate-700 ${
                          whiteboardMode === mode && showWhiteboard
                            ? 'bg-purple-600/50 text-purple-200 border-l-2 border-purple-400'
                            : 'text-slate-300'
                        }`}
                      >
                        <Icon size={16} className="flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-slate-500">{desc}</div>
                        </div>
                        {whiteboardMode === mode && showWhiteboard && (
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* File Share Toggle with Badge */}
              <button
                onClick={() => setShowFileShare(!showFileShare)}
                className={`relative p-4 rounded-xl transition-all duration-300 transform hover:scale-105 btn-enhanced ${
                  showFileShare
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'
                }`}
                title="Toggle file sharing"
              >
                <Upload size={22} />
                {files.length > 0 && !showFileShare && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {files.length > 9 ? '9+' : files.length}
                  </span>
                )}
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-slate-600"></div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white shadow-lg transition-all duration-300 transform hover:scale-105 btn-enhanced"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts Helper */}
          <div className="absolute bottom-20 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg opacity-70">
            <div>Ctrl+Enter: Send message</div>
            <div>Ctrl+Z: Undo whiteboard</div>
            <div>Ctrl+D: Toggle theme</div>
          </div>
        </div>

        {/* Enhanced Chat Sidebar with Resize */}
        {showChat && (
          <div 
            className={`bg-slate-800/95 backdrop-blur-md border-l-2 border-blue-500/30 flex flex-col shadow-2xl transition-all duration-300 ${
              collapsedPanels.chat ? 'w-12' : ''
            }`}
            style={{ width: collapsedPanels.chat ? '48px' : `${panelWidths.chat}px` }}
          >
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 w-1 h-full bg-blue-500/50 hover:bg-blue-500 cursor-col-resize transition-colors"
              onMouseDown={() => startResizing('chat')}
            />
            
            {!collapsedPanels.chat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-400 flex items-center">
                      <MessageCircle size={18} className="mr-2" />
                      Chat
                      <span className="ml-2 text-xs bg-blue-600/30 px-2 py-1 rounded-full">
                        {messages.length}
                      </span>
                    </h3>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => togglePanelCollapse('chat')}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Collapse panel"
                      >
                        <ChevronDown size={16} className="transform rotate-90" />
                      </button>
                      <button
                        onClick={() => setShowChat(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Chat Search */}
                  <div className="mt-3 relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={chatFilter}
                      onChange={(e) => setChatFilter(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* Messages Container */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth custom-scrollbar"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {filteredMessages.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">
                      <MessageCircle size={64} className="mx-auto mb-4 opacity-30" />
                      <p className="text-lg mb-2">
                        {chatFilter ? 'No matching messages' : 'No messages yet'}
                      </p>
                      <p className="text-sm opacity-75">
                        {chatFilter ? 'Try a different search term' : 'Start the conversation!'}
                      </p>
                      {!chatFilter && (
                        <div className="mt-4 space-y-2">
                          <button className="block w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            💬 Say hello to the team
                          </button>
                          <button className="block w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            🎉 Share your excitement
                          </button>
                          <button className="block w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            📝 Ask a question
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {filteredMessages.map((message, index) => (
                        <div
                          key={message.id}
                          className={`group relative message-slide-in ${
                            message.sender === user.name 
                              ? 'ml-8' 
                              : 'mr-8'
                          }`}
                        >
                          <div
                            className={`rounded-2xl p-4 backdrop-blur-sm border transition-all duration-200 hover:shadow-lg ${
                              message.sender === user.name
                                ? 'bg-blue-600/90 border-blue-500/30 text-white rounded-br-md'
                                : 'bg-slate-700/80 border-slate-600/30 text-slate-200 rounded-bl-md'
                            }`}
                          >
                            {message.sender !== user.name && (
                              <div className="flex items-center mb-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-xs font-bold text-white">
                                    {message.sender.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium text-purple-400 text-sm">
                                  {message.sender}
                                </span>
                              </div>
                            )}
                            
                            <p className="text-sm leading-relaxed break-words">
                              {message.text}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs opacity-60">
                                {message.timestamp}
                              </span>
                              {message.sender === user.name && (
                                <div className="flex items-center space-x-1 text-xs opacity-60">
                                  <CheckCircle size={12} />
                                  <span>Sent</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Message actions - appears on hover */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 bg-slate-800/80 rounded-lg text-slate-400 hover:text-white">
                              <Star size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {typingUsers.length > 0 && (
                        <div className="flex items-center space-x-2 text-slate-400 text-sm italic">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                          </div>
                          <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Enhanced Message Input */}
                <div className="p-4 border-t border-slate-700/50 bg-slate-700/20">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <div className="relative">
                        <textarea
                          ref={messageInputRef}
                          value={newMessage}
                          onChange={(e) => handleTyping(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              sendMessage()
                            }
                          }}
                          placeholder="Type a message... (Shift+Enter for new line)"
                          rows={newMessage.split('\n').length}
                          className="w-full bg-slate-700/80 border border-slate-600/50 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm resize-none max-h-32"
                          style={{ minHeight: '44px' }}
                        />
                        <button
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Add emoji"
                        >
                          <Smile size={16} />
                        </button>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button className="flex items-center space-x-1 text-xs text-slate-400 hover:text-blue-400 transition-colors">
                            <Paperclip size={12} />
                            <span>Attach</span>
                          </button>
                        </div>
                        <span className="text-xs text-slate-500">
                          {newMessage.length}/1000
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-105 btn-enhanced ${
                        newMessage.trim()
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Collapsed Chat Panel */
              <div className="flex flex-col items-center justify-center h-full">
                <button
                  onClick={() => togglePanelCollapse('chat')}
                  className="p-3 text-blue-400 hover:text-blue-300 transition-colors"
                  title="Expand chat"
                >
                  <MessageCircle size={20} />
                </button>
                {messages.length > 0 && (
                  <span className="text-xs text-blue-400 mt-2">{messages.length}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Whiteboard - Multiple Layout Modes */}
        {showWhiteboard && whiteboardMode === 'sidebar' && (
          <div 
            className={`bg-slate-800/95 backdrop-blur-md border-l-2 border-purple-500/30 flex flex-col shadow-2xl transition-all duration-300 panel-border-purple ${
              collapsedPanels.whiteboard ? 'w-12' : ''
            }`}
            style={{ width: collapsedPanels.whiteboard ? '48px' : `${panelWidths.whiteboard}px` }}
          >
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 w-1 h-full bg-purple-500/50 hover:bg-purple-500 cursor-col-resize transition-colors resize-handle"
              onMouseDown={() => startResizing('whiteboard')}
            />
            
            {!collapsedPanels.whiteboard ? (
              <>
                {/* Whiteboard Header */}
                <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-purple-400 flex items-center">
                      <Palette size={18} className="mr-2" />
                      Whiteboard
                      <span className="ml-2 text-xs bg-purple-600/30 px-2 py-1 rounded-full">
                        {whiteboardMode}
                      </span>
                    </h3>
                    <div className="flex items-center space-x-1">
                      {/* Mode Selector */}
                      <div className="relative group">
                        <button className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                        <div className="absolute right-0 top-8 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 min-w-48">
                          <div className="p-2 space-y-1">
                            <button
                              onClick={popOutWhiteboard}
                              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center space-x-2"
                            >
                              <Move size={14} />
                              <span>Pop Out (Floating)</span>
                            </button>
                            <button
                              onClick={toggleFullscreenWhiteboard}
                              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center space-x-2"
                            >
                              <Maximize2 size={14} />
                              <span>Full Screen</span>
                            </button>
                            <button
                              onClick={() => setWhiteboardMode('split')}
                              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center space-x-2"
                            >
                              <Layers size={14} />
                              <span>Split View</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => togglePanelCollapse('whiteboard')}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="Collapse panel"
                      >
                        <ChevronDown size={16} className="transform rotate-90" />
                      </button>
                      <button
                        onClick={() => setShowWhiteboard(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Enhanced Drawing Tools */}
                {showWhiteboardTools && (
                  <div className="p-4 border-b border-slate-700/50 bg-slate-700/20 space-y-4 whiteboard-scrollbar overflow-y-auto max-h-80">
                    {/* Tool Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">Drawing Tools</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { tool: 'pen', icon: Edit3, label: 'Pen', tooltip: 'Pen - draw freehand' },
                          { tool: 'eraser', icon: Eraser, label: 'Eraser', tooltip: 'Eraser - remove content' },
                          { tool: 'line', icon: ArrowRight, label: 'Line', tooltip: 'Line - draw straight lines' },
                          { tool: 'rectangle', icon: Square, label: 'Rect', tooltip: 'Rectangle - draw rectangles' },
                          { tool: 'circle', icon: Circle, label: 'Circle', tooltip: 'Circle - draw circles' },
                          { tool: 'text', icon: Type, label: 'Text', tooltip: 'Text - add text annotations' }
                        ].map(({ tool, icon: Icon, label, tooltip }) => (
                          <button
                            key={tool}
                            onClick={() => setDrawTool(tool)}
                            className={`flex flex-col items-center p-3 rounded-xl text-sm transition-all duration-200 tooltip ${
                              drawTool === tool
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                            data-tooltip={tooltip}
                          >
                            <Icon size={16} />
                            <span className="mt-1 text-xs">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Palette */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">Colors</label>
                      <div className="grid grid-cols-7 gap-2">
                        {[
                          '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
                          '#ffff00', '#ff00ff', '#00ffff', '#ffa500',
                          '#800080', '#008000', '#000000', '#808080',
                          '#ffc0cb', '#add8e6'
                        ].map((color, index) => (
                          <button
                            key={color}
                            onClick={() => setDrawColor(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 tooltip ${
                              drawColor === color ? 'border-white scale-110 shadow-lg' : 'border-slate-600'
                            }`}
                            style={{ backgroundColor: color }}
                            data-tooltip={color}
                          />
                        ))}
                      </div>
                      
                      {/* Custom Color Picker */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={drawColor}
                          onChange={(e) => setDrawColor(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-slate-600 bg-transparent cursor-pointer"
                        />
                        <span className="text-xs text-slate-400">Custom</span>
                      </div>
                    </div>

                    {/* Brush Size */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300 flex items-center justify-between">
                        Brush Size
                        <span className="text-purple-400 font-bold">{drawSize}px</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={drawSize}
                        onChange={(e) => setDrawSize(e.target.value)}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Fine</span>
                        <span>Thick</span>
                      </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-300">Background</label>
                      <div className="flex space-x-2">
                        {['#1e293b', '#ffffff', '#000000', '#f0f0f0'].map(color => (
                          <button
                            key={color}
                            onClick={() => setWhiteboardBackground(color)}
                            className={`w-8 h-8 rounded-lg border-2 transition-all tooltip ${
                              whiteboardBackground === color ? 'border-white scale-110' : 'border-slate-600'
                            }`}
                            style={{ backgroundColor: color }}
                            data-tooltip={`Background: ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-4 border-b border-slate-700/50 bg-slate-700/10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={undoWhiteboard}
                      disabled={currentHistoryIndex <= 0}
                      className="flex items-center justify-center space-x-2 p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors tooltip"
                      data-tooltip="Undo last action (Ctrl+Z)"
                    >
                      <Undo2 size={16} />
                      <span>Undo</span>
                    </button>
                    
                    <button
                      onClick={redoWhiteboard}
                      disabled={currentHistoryIndex >= whiteboardHistory.length - 1}
                      className="flex items-center justify-center space-x-2 p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors tooltip"
                      data-tooltip="Redo last action"
                    >
                      <Redo2 size={16} />
                      <span>Redo</span>
                    </button>
                    
                    <button
                      onClick={saveWhiteboardImage}
                      className="flex items-center justify-center space-x-2 p-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors tooltip"
                      data-tooltip="Save whiteboard as image"
                    >
                      <Save size={16} />
                      <span>Save</span>
                    </button>
                    
                    <button
                      onClick={clearWhiteboard}
                      className="flex items-center justify-center space-x-2 p-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors tooltip"
                      data-tooltip="Clear entire whiteboard"
                    >
                      <Trash2 size={16} />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Enhanced Canvas */}
                <div className="flex-1 p-4">
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={panelWidths.whiteboard - 32}
                      height={400}
                      className="w-full h-full rounded-xl border-2 border-slate-600 cursor-crosshair shadow-lg canvas-glow"
                      style={{ backgroundColor: whiteboardBackground }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    
                    {/* Canvas Overlay Info */}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      {drawTool.charAt(0).toUpperCase() + drawTool.slice(1)} • {drawSize}px
                    </div>
                    
                    {/* Participants Drawing Indicator */}
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      👥 {participants.length + 1}
                    </div>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-2 right-2 flex space-x-1">
                      <button className="bg-black/60 hover:bg-black/80 text-white p-1 rounded tooltip" data-tooltip="Zoom in">
                        <ZoomIn size={14} />
                      </button>
                      <button className="bg-black/60 hover:bg-black/80 text-white p-1 rounded tooltip" data-tooltip="Zoom out">
                        <ZoomOut size={14} />
                      </button>
                      <button className="bg-black/60 hover:bg-black/80 text-white p-1 rounded tooltip" data-tooltip="Reset view">
                        <Grid size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Canvas Stats */}
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>History: {whiteboardHistory.length} states</span>
                    <span>{panelWidths.whiteboard - 32}×400px</span>
                  </div>
                </div>
              </>
            ) : (
              /* Collapsed Whiteboard Panel */
              <div className="flex flex-col items-center justify-center h-full">
                <button
                  onClick={() => togglePanelCollapse('whiteboard')}
                  className="p-3 text-purple-400 hover:text-purple-300 transition-colors"
                  title="Expand whiteboard"
                >
                  <Palette size={20} />
                </button>
                <span className="text-xs text-purple-400 mt-2 transform -rotate-90">
                  {whiteboardMode}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Enhanced File Sharing Sidebar */}
        {showFileShare && (
          <div className="w-96 bg-slate-800/95 backdrop-blur-md border-l border-slate-700/50 flex flex-col shadow-2xl">
            {/* File Sharing Header */}
            <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-green-600/20 to-emerald-600/20">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-400 flex items-center">
                  <Upload size={18} className="mr-2" />
                  File Sharing
                  <span className="ml-2 text-xs bg-green-600/30 px-2 py-1 rounded-full">
                    {files.length}
                  </span>
                </h3>
                <button
                  onClick={() => setShowFileShare(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* File Filter */}
              <div className="mt-3 flex space-x-2">
                {[
                  { key: 'all', label: 'All', icon: File },
                  { key: 'images', label: 'Images', icon: Image },
                  { key: 'documents', label: 'Docs', icon: FileText }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setFileFilter(key)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs transition-colors ${
                      fileFilter === key
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Upload Area */}
            <div className="p-4 border-b border-slate-700/50">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                className="hidden"
              />
              
              {/* Drag & Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-green-500 bg-green-500/10 scale-105 drag-active'
                    : 'border-slate-600 hover:border-green-500/50 hover:bg-green-500/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload size={32} className={`mx-auto mb-3 transition-colors ${
                  dragActive ? 'text-green-400' : 'text-slate-400'
                }`} />
                <p className="text-sm font-medium text-slate-300 mb-2">
                  {dragActive ? 'Drop files here' : 'Drag & drop files or'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Browse Files
                </button>
                <p className="text-xs text-slate-500 mt-2">
                  Support: Images, Documents, Videos (Max: 10MB)
                </p>
              </div>
              
              {/* Upload Progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-3 space-y-2">
                  {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="bg-slate-700/50 rounded-lg p-2">
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-1">
                        <div
                          className="bg-green-500 h-1 rounded-full transition-all duration-300 progress-bar"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredFiles.length === 0 ? (
                <div className="text-center text-slate-400 py-12 px-4">
                  <div className="mb-6">
                    <div className="relative">
                      <Upload size={80} className="mx-auto mb-4 opacity-20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-dashed border-green-400/30 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">
                    {fileFilter === 'all' ? 'No files shared yet' : `No ${fileFilter} found`}
                  </h3>
                  
                  <p className="text-sm opacity-75 mb-6">
                    {fileFilter === 'all' 
                      ? 'Start sharing files to collaborate with your team' 
                      : 'Try uploading some files or change the filter'
                    }
                  </p>

                  {fileFilter === 'all' && (
                    <div className="space-y-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <FileText size={20} />
                        <span className="font-medium">Upload Document</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*'
                          input.multiple = true
                          input.onchange = (e) => uploadFiles(Array.from(e.target.files))
                          input.click()
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <Image size={20} />
                        <span className="font-medium">Upload Images</span>
                      </button>

                      <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">💡 Pro Tips:</h4>
                        <ul className="text-xs text-slate-400 space-y-1">
                          <li>• Drag & drop files anywhere in this area</li>
                          <li>• Upload multiple files at once</li>
                          <li>• Preview images before sharing</li>
                          <li>• Max file size: 10MB per file</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group bg-slate-700/60 hover:bg-slate-700/80 rounded-xl p-4 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200 hover:shadow-lg"
                    >
                      <div className="flex items-start space-x-3">
                        {/* File Icon */}
                        <div className={`p-2 rounded-lg ${
                          file.category === 'image' 
                            ? 'bg-purple-600/20 text-purple-400' 
                            : file.category === 'document'
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'bg-slate-600/20 text-slate-400'
                        }`}>
                          {file.category === 'image' ? (
                            <Image size={20} />
                          ) : file.category === 'document' ? (
                            <FileText size={20} />
                          ) : (
                            <File size={20} />
                          )}
                        </div>
                        
                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                            {file.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
                            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                            <span>{file.sender}</span>
                            <span>•</span>
                            <span>{file.timestamp}</span>
                          </div>
                          
                          {/* File Preview for Images */}
                          {file.category === 'image' && file.url && (
                            <div className="mt-2">
                              <img
                                src={file.url}
                                alt={file.name}
                                className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowFilePreview(file)}
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* File Actions */}
                        <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadFile(file)}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          
                          {file.category === 'image' && (
                            <button
                              onClick={() => setShowFilePreview(file)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Preview"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          
                          {file.sender === user.name && (
                            <button
                              onClick={() => deleteFile(file.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* File Statistics */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-700/20">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{filteredFiles.length} files shown</span>
                <span>
                  {(filteredFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB total
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Whiteboard */}
        {showWhiteboard && whiteboardMode === 'floating' && (
          <div
            className="fixed z-50 bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 overflow-hidden camera-transition"
            style={{
              left: floatingWhiteboardPosition.x,
              top: floatingWhiteboardPosition.y,
              width: floatingWhiteboardSize.width,
              height: floatingWhiteboardSize.height
            }}
          >
            {/* Floating Header */}
            <div 
              className="p-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-b border-slate-700/50 cursor-move flex items-center justify-between"
              onMouseDown={(e) => {
                setIsDraggingWhiteboard(true)
                e.preventDefault()
              }}
            >
              <div className="flex items-center space-x-2">
                <Palette size={16} className="text-purple-400" />
                <span className="text-sm font-semibold text-purple-400">Floating Whiteboard</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setWhiteboardMode('sidebar')}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 transition-colors"
                  title="Dock to sidebar"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={toggleFullscreenWhiteboard}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 transition-colors"
                  title="Full screen"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={() => setShowWhiteboard(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Floating Canvas */}
            <div className="flex-1 p-4" style={{ height: floatingWhiteboardSize.height - 60 }}>
              <canvas
                ref={canvasRef}
                width={floatingWhiteboardSize.width - 32}
                height={floatingWhiteboardSize.height - 100}
                className="w-full h-full rounded-lg border border-slate-600 cursor-crosshair"
                style={{ backgroundColor: whiteboardBackground }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              
              {/* Floating Tools Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-black/80 rounded-lg px-3 py-2">
                  {[
                    { tool: 'pen', icon: Edit3 },
                    { tool: 'eraser', icon: Eraser },
                    { tool: 'line', icon: ArrowRight }
                  ].map(({ tool, icon: Icon }) => (
                    <button
                      key={tool}
                      onClick={() => setDrawTool(tool)}
                      className={`p-2 rounded transition-colors ${
                        drawTool === tool ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center space-x-2 bg-black/80 rounded-lg px-3 py-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={drawSize}
                    onChange={(e) => setDrawSize(e.target.value)}
                    className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-white">{drawSize}px</span>
                </div>
                
                <div className="flex items-center space-x-1 bg-black/80 rounded-lg px-2 py-2">
                  {['#ffffff', '#ff0000', '#00ff00', '#0000ff'].map(color => (
                    <button
                      key={color}
                      onClick={() => setDrawColor(color)}
                      className={`w-6 h-6 rounded border-2 ${
                        drawColor === color ? 'border-white' : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Resize Handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600/50 hover:bg-purple-600 cursor-se-resize"
              onMouseDown={(e) => {
                setIsResizingWhiteboard(true)
                e.preventDefault()
              }}
            />
          </div>
        )}

        {/* Fullscreen Whiteboard */}
        {showWhiteboard && whiteboardMode === 'fullscreen' && (
          <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col">
            {/* Fullscreen Header */}
            <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Palette size={24} className="text-purple-400" />
                  <h2 className="text-xl font-bold text-purple-400">Fullscreen Whiteboard</h2>
                  <span className="text-sm text-slate-400">Press ESC to exit</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setWhiteboardMode('sidebar')}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <ChevronRight size={16} />
                    <span>Sidebar</span>
                  </button>
                  <button
                    onClick={() => setShowWhiteboard(false)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Fullscreen Content */}
            <div className="flex flex-1">
              {/* Fullscreen Tools Sidebar */}
              <div className="w-64 bg-slate-800/50 border-r border-slate-700/50 p-4 space-y-6">
                {/* Drawing Tools */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-300">Tools</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { tool: 'pen', icon: Edit3, label: 'Pen' },
                      { tool: 'eraser', icon: Eraser, label: 'Eraser' },
                      { tool: 'line', icon: ArrowRight, label: 'Line' },
                      { tool: 'rectangle', icon: Square, label: 'Rectangle' },
                      { tool: 'circle', icon: Circle, label: 'Circle' },
                      { tool: 'text', icon: Type, label: 'Text' }
                    ].map(({ tool, icon: Icon, label }) => (
                      <button
                        key={tool}
                        onClick={() => setDrawTool(tool)}
                        className={`flex flex-col items-center p-3 rounded-lg text-sm transition-all ${
                          drawTool === tool
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="mt-1">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-300">Colors</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      '#ffffff', '#ff0000', '#00ff00', '#0000ff',
                      '#ffff00', '#ff00ff', '#00ffff', '#ffa500',
                      '#800080', '#008000', '#000000', '#808080'
                    ].map(color => (
                      <button
                        key={color}
                        onClick={() => setDrawColor(color)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          drawColor === color ? 'border-white scale-110' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Brush Size */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-300">Size: {drawSize}px</h3>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={drawSize}
                    onChange={(e) => setDrawSize(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={undoWhiteboard}
                    disabled={currentHistoryIndex <= 0}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors"
                  >
                    <Undo2 size={16} />
                    <span>Undo</span>
                  </button>
                  <button
                    onClick={clearWhiteboard}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Clear</span>
                  </button>
                  <button
                    onClick={saveWhiteboardImage}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <Save size={16} />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Fullscreen Canvas */}
              <div className="flex-1 p-6">
                <canvas
                  ref={canvasRef}
                  width={window.innerWidth - 300}
                  height={window.innerHeight - 150}
                  className="w-full h-full rounded-xl border border-slate-600 cursor-crosshair shadow-2xl"
                  style={{ backgroundColor: whiteboardBackground }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </div>
          </div>
        )}

        {/* File Preview Modal */}
        {showFilePreview && (
          <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">{showFilePreview?.name}</h3>
                <button
                  onClick={() => setShowFilePreview(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {showFilePreview?.category === 'image' ? (
                  <img
                    src={showFilePreview?.url}
                    alt={showFilePreview?.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText size={64} className="mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-300">Preview not available for this file type</p>
                  </div>
                )}
              </div>
              <div className="flex justify-center space-x-3 p-4 border-t border-slate-700">
                <button
                  onClick={() => downloadFile(showFilePreview)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split-view Whiteboard */}
        {showWhiteboard && whiteboardMode === 'split' && (
          <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex">
            {/* Split View - Video Section */}
            <div className="w-1/2 p-4 border-r border-slate-700/50">
              <div className="h-full bg-slate-800/50 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Video Call</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setWhiteboardMode('sidebar')}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                    >
                      Sidebar
                    </button>
                    <button
                      onClick={() => setShowWhiteboard(false)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
                
                {/* Video Grid in Split View */}
                <div className="flex-1 grid grid-cols-1 gap-4">
                  {/* Local Video */}
                  <div className="relative bg-slate-900 rounded-xl overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      You
                    </div>
                  </div>
                  
                  {/* Remote Videos */}
                  {participants.map(participant => (
                    <div key={participant.id} className="relative bg-slate-900 rounded-xl overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-white font-bold text-xl">
                              {participant.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm">{participant.name}</p>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {participant.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Split View - Whiteboard Section */}
            <div className="w-1/2 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Palette size={20} className="text-purple-400" />
                  <h3 className="text-lg font-semibold text-purple-400">Collaborative Whiteboard</h3>
                </div>
                
                {/* Split View Tools */}
                <div className="flex items-center space-x-2">
                  {[
                    { tool: 'pen', icon: Edit3 },
                    { tool: 'eraser', icon: Eraser },
                    { tool: 'line', icon: ArrowRight },
                    { tool: 'rectangle', icon: Square }
                  ].map(({ tool, icon: Icon }) => (
                    <button
                      key={tool}
                      onClick={() => setDrawTool(tool)}
                      className={`p-2 rounded transition-colors ${
                        drawTool === tool ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title={tool.charAt(0).toUpperCase() + tool.slice(1)}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Split Canvas */}
              <div className="flex-1 relative">
                <canvas
                  ref={canvasRef}
                  width={window.innerWidth / 2 - 50}
                  height={window.innerHeight - 200}
                  className="w-full h-full rounded-xl border border-slate-600 cursor-crosshair"
                  style={{ backgroundColor: whiteboardBackground }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                
                {/* Split View Bottom Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 bg-black/80 rounded-lg px-3 py-2">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={drawSize}
                      onChange={(e) => setDrawSize(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-white text-sm">{drawSize}px</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 bg-black/80 rounded-lg px-2 py-2">
                    {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(color => (
                      <button
                        key={color}
                        onClick={() => setDrawColor(color)}
                        className={`w-6 h-6 rounded border-2 ${
                          drawColor === color ? 'border-white' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-1 bg-black/80 rounded-lg px-2 py-2">
                    <button
                      onClick={undoWhiteboard}
                      disabled={currentHistoryIndex <= 0}
                      className="text-white hover:text-purple-400 p-1 disabled:text-slate-600"
                      title="Undo"
                    >
                      <Undo2 size={16} />
                    </button>
                    <button
                      onClick={clearWhiteboard}
                      className="text-white hover:text-red-400 p-1"
                      title="Clear"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={saveWhiteboardImage}
                      className="text-white hover:text-green-400 p-1"
                      title="Save"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCall
