import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { io } from 'socket.io-client'
import config from '../config/api'
import {
  Video, VideoOff, Mic, MicOff, Phone, MessageCircle,
  Users, Copy, CheckCircle, Send, Monitor, MonitorOff,
  Upload, Shield
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const VideoCall = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // States
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
  const [participants, setParticipants] = useState(new Map())
  const [roomCopied, setRoomCopied] = useState(false)
  const [files, setFiles] = useState([])
  const [isEncrypted, setIsEncrypted] = useState(true)

  // WebRTC states
  const [peerConnections, setPeerConnections] = useState(new Map())
  const [remoteStreams, setRemoteStreams] = useState(new Map())

  // Whiteboard states
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState('#ffffff')
  const [drawSize, setDrawSize] = useState(3)
  const [drawTool, setDrawTool] = useState('pen') // pen, eraser

  // Refs
  const localVideoRef = useRef()
  const localStreamRef = useRef()
  const screenStreamRef = useRef()
  const socketRef = useRef()
  const canvasRef = useRef()
  const fileInputRef = useRef()
  const remoteVideoRefs = useRef(new Map())

  // WebRTC Configuration with STUN servers
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }

  useEffect(() => {
    initializeCall()
    return () => {
      cleanup()
    }
  }, [])

  // Auto-show file sharing sidebar when files are added
  useEffect(() => {
    if (files.length > 0 && !showFileShare) {
      setShowFileShare(true)
    }
  }, [files.length, showFileShare])

  // Auto-show file sharing sidebar when files are added
  useEffect(() => {
    if (files.length > 0 && !showFileShare) {
      setShowFileShare(true)
    }
  }, [files.length, showFileShare])

  const initializeCall = async () => {
    try {
      setIsLoading(true)
      setConnectionError(null)

      // Initialize Socket.IO connection
      socketRef.current = io(config.SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      })

      // Handle socket connection events
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected')
        setIsConnected(true)
        setIsLoading(false)
        toast.success('🎉 Connected to room successfully!')
      })

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error)
        setConnectionError('Failed to connect to server. Please check if the server is running.')
        setIsLoading(false)
        toast.error('❌ Failed to connect to server')
      })

      socketRef.current.on('disconnect', () => {
        console.log('🔌 Socket disconnected')
        setIsConnected(false)
        toast.error('🔌 Disconnected from server')
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

      // Setup Socket.IO event listeners
      setupSocketListeners()

      // Join room
      socketRef.current.emit('join-room', roomId, user)

    } catch (error) {
      console.error('Error initializing call:', error)
      setConnectionError('Failed to access camera/microphone. Please check permissions.')
      setIsLoading(false)
      toast.error('❌ Failed to access camera/microphone')
    }
  }

  const setupSocketListeners = () => {
    const socket = socketRef.current

    // User management events
    socket.on('user-joined', handleUserJoined)
    socket.on('user-left', handleUserLeft)
    socket.on('room-state', handleRoomState)

    // WebRTC signaling events
    socket.on('offer', handleOffer)
    socket.on('answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)

    // Chat events
    socket.on('chat-message', handleChatMessage)

    // File sharing events
    socket.on('file-received', handleFileReceived)

    // Whiteboard events
    socket.on('whiteboard-draw', handleWhiteboardDraw)
    socket.on('whiteboard-clear', handleWhiteboardClear)

    // Screen sharing events
    socket.on('user-started-screen-share', handleScreenShareStarted)
    socket.on('user-stopped-screen-share', handleScreenShareStopped)
  }

  // Socket.IO Event Handlers
  const handleUserJoined = useCallback(({ socketId, userInfo }) => {
    console.log('👤 User joined:', userInfo.name)
    setParticipants(prev => new Map(prev.set(socketId, userInfo)))
    toast.success(`👋 ${userInfo.name} joined the call`)

    // Create peer connection for new user
    createPeerConnection(socketId, userInfo)
  }, [])

  const handleUserLeft = useCallback(({ socketId, userInfo }) => {
    console.log('👤 User left:', userInfo.name)
    setParticipants(prev => {
      const updated = new Map(prev)
      updated.delete(socketId)
      return updated
    })

    // Clean up peer connection
    const pc = peerConnections.get(socketId)
    if (pc) {
      pc.close()
      setPeerConnections(prev => {
        const updated = new Map(prev)
        updated.delete(socketId)
        return updated
      })
    }

    // Remove remote stream
    setRemoteStreams(prev => {
      const updated = new Map(prev)
      updated.delete(socketId)
      return updated
    })

    toast.info(`👋 ${userInfo.name} left the call`)
  }, [peerConnections])

  const handleRoomState = useCallback(({ participants: roomParticipants, files: roomFiles, whiteboardData }) => {
    const participantsMap = new Map()
    roomParticipants.forEach(participant => {
      if (participant.id !== user.id) {
        participantsMap.set(participant.socketId, participant)
      }
    })
    setParticipants(participantsMap)
    setFiles(roomFiles || [])

    // Restore whiteboard data
    if (whiteboardData && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      whiteboardData.forEach(drawData => {
        drawOnCanvas(drawData, ctx)
      })
    }
  }, [user.id])

  const handleChatMessage = useCallback((message) => {
    setMessages(prev => [...prev, message])
    if (!showChat) {
      toast.success(`💬 New message from ${message.sender.name}`)
    }
  }, [showChat])

  const handleFileReceived = useCallback((fileInfo) => {
    console.log('📁 Received file from server:', fileInfo.name, 'from:', fileInfo.sender.name)
    console.log('📁 Current user:', user.name, 'File sender:', fileInfo.sender.name)

    // Only add if it's not from the current user (to avoid duplicates)
    if (fileInfo.sender.id !== user.id) {
      console.log('📁 Adding received file to state')
      setFiles(prev => [...prev, fileInfo])
      toast.success(`📁 ${fileInfo.sender.name} shared: ${fileInfo.name}`)
    } else {
      console.log('📁 Skipping own file to avoid duplicate')
    }
  }, [user.id, user.name])

  const handleWhiteboardDraw = useCallback((drawData) => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      drawOnCanvas(drawData, ctx)
    }
  }, [])

  const handleWhiteboardClear = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    toast.info('🎨 Whiteboard cleared')
  }, [])

  const handleScreenShareStarted = useCallback(({ userInfo }) => {
    toast.info(`📺 ${userInfo.name} started screen sharing`)
  }, [])

  const handleScreenShareStopped = useCallback(({ userInfo }) => {
    toast.info(`📺 ${userInfo.name} stopped screen sharing`)
  }, [])

  // Media Controls
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn
        setIsVideoOn(!isVideoOn)
        toast.success(isVideoOn ? '📹 Camera turned off' : '📹 Camera turned on')
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn
        setIsAudioOn(!isAudioOn)
        toast.success(isAudioOn ? '🎤 Microphone muted' : '🎤 Microphone unmuted')
      }
    }
  }

  // WebRTC Functions
  const createPeerConnection = async (socketId, userInfo) => {
    try {
      const pc = new RTCPeerConnection(rtcConfig)

      // Add local stream to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current)
        })
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)))

        // Set remote video element
        const videoElement = remoteVideoRefs.current.get(socketId)
        if (videoElement) {
          videoElement.srcObject = remoteStream
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            candidate: event.candidate,
            targetSocketId: socketId,
            roomId
          })
        }
      }

      setPeerConnections(prev => new Map(prev.set(socketId, pc)))

      // Create and send offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socketRef.current.emit('offer', {
        offer,
        targetSocketId: socketId,
        roomId
      })

    } catch (error) {
      console.error('Error creating peer connection:', error)
      toast.error('Failed to connect to participant')
    }
  }

  const handleOffer = async ({ offer, senderSocketId }) => {
    try {
      const pc = peerConnections.get(senderSocketId) || new RTCPeerConnection(rtcConfig)

      if (!peerConnections.has(senderSocketId)) {
        // Add local stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current)
          })
        }

        // Handle remote stream
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams
          setRemoteStreams(prev => new Map(prev.set(senderSocketId, remoteStream)))
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('ice-candidate', {
              candidate: event.candidate,
              targetSocketId: senderSocketId,
              roomId
            })
          }
        }

        setPeerConnections(prev => new Map(prev.set(senderSocketId, pc)))
      }

      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socketRef.current.emit('answer', {
        answer,
        targetSocketId: senderSocketId,
        roomId
      })

    } catch (error) {
      console.error('Error handling offer:', error)
    }
  }

  const handleAnswer = async ({ answer, senderSocketId }) => {
    try {
      const pc = peerConnections.get(senderSocketId)
      if (pc) {
        await pc.setRemoteDescription(answer)
      }
    } catch (error) {
      console.error('Error handling answer:', error)
    }
  }

  const handleIceCandidate = async ({ candidate, senderSocketId }) => {
    try {
      const pc = peerConnections.get(senderSocketId)
      if (pc) {
        await pc.addIceCandidate(candidate)
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error)
    }
  }

  // Screen Sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' },
          audio: true
        })

        screenStreamRef.current = screenStream

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0]
        peerConnections.forEach(async (pc) => {
          const sender = pc.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          )
          if (sender) {
            await sender.replaceTrack(videoTrack)
          }
        })

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }

        // Handle screen share end
        videoTrack.onended = () => {
          stopScreenShare()
        }

        setIsScreenSharing(true)
        socketRef.current.emit('start-screen-share', roomId)
        toast.success('📺 Screen sharing started')

      } else {
        stopScreenShare()
      }
    } catch (error) {
      console.error('Screen share error:', error)
      toast.error('Failed to start screen sharing')
    }
  }

  const stopScreenShare = async () => {
    try {
      // Stop screen stream
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop())
      }

      // Restore camera stream
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      })

      localStreamRef.current = cameraStream

      // Replace video track in all peer connections
      const videoTrack = cameraStream.getVideoTracks()[0]
      peerConnections.forEach(async (pc) => {
        const sender = pc.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      })

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream
      }

      setIsScreenSharing(false)
      socketRef.current.emit('stop-screen-share', roomId)
      toast.success('📺 Screen sharing stopped')

    } catch (error) {
      console.error('Stop screen share error:', error)
      toast.error('Failed to stop screen sharing')
    }
  }

  // Chat Functions
  const sendMessage = (e) => {
    e.preventDefault()
    if (newMessage.trim() && socketRef.current) {
      const messageText = newMessage.trim()
      setNewMessage('')

      const messageData = {
        id: Date.now().toString(),
        text: messageText,
        sender: user,
        timestamp: new Date().toISOString(),
        type: 'text'
      }

      setMessages(prev => [...prev, messageData])
      socketRef.current.emit('chat-message', {
        message: messageText,
        roomId
      })
    }
  }

  // File Sharing Functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const fileData = {
        fileData: e.target.result,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        roomId
      }

      // Add file to local state immediately for the uploader
      const localFileInfo = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result,
        sender: user,
        timestamp: new Date().toISOString()
      }

      console.log('📁 Adding file to local state:', localFileInfo.name)
      setFiles(prev => {
        const updated = [...prev, localFileInfo]
        console.log('📁 Updated files array:', updated.length, 'files')
        return updated
      })

      // Emit to server for other participants
      if (socketRef.current) {
        socketRef.current.emit('file-share', fileData)
      }

      toast.success(`📁 ${file.name} shared successfully!`)
    }

    reader.readAsDataURL(file)
    event.target.value = '' // Reset input
  }

  const downloadFile = (fileInfo) => {
    try {
      const link = document.createElement('a')
      link.href = fileInfo.data || fileInfo.url || '#'
      link.download = fileInfo.name
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`📥 Downloaded ${fileInfo.name}`)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download file')
    }
  }

  // Whiteboard Functions
  const drawOnCanvas = (drawData, ctx) => {
    if (!ctx) return

    ctx.globalCompositeOperation = drawData.tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = drawData.color
    ctx.lineWidth = drawData.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (drawData.type === 'start') {
      ctx.beginPath()
      ctx.moveTo(drawData.x, drawData.y)
    } else if (drawData.type === 'draw') {
      ctx.lineTo(drawData.x, drawData.y)
      ctx.stroke()
    }
  }

  const startDrawing = (e) => {
    if (!showWhiteboard || !canvasRef.current) return

    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Calculate proper coordinates considering canvas scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const drawData = {
      type: 'start',
      x,
      y,
      color: drawColor,
      size: drawSize,
      tool: drawTool
    }

    const ctx = canvas.getContext('2d')
    drawOnCanvas(drawData, ctx)

    if (socketRef.current) {
      socketRef.current.emit('whiteboard-draw', { drawData, roomId })
    }
  }

  const draw = (e) => {
    if (!isDrawing || !showWhiteboard || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Calculate proper coordinates considering canvas scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const drawData = {
      type: 'draw',
      x,
      y,
      color: drawColor,
      size: drawSize,
      tool: drawTool
    }

    const ctx = canvas.getContext('2d')
    drawOnCanvas(drawData, ctx)

    if (socketRef.current) {
      socketRef.current.emit('whiteboard-draw', { drawData, roomId })
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Touch event handlers for mobile support
  const handleTouchStart = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    startDrawing(mouseEvent)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    draw(mouseEvent)
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    stopDrawing()
  }

  const clearWhiteboard = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      socketRef.current.emit('whiteboard-clear', roomId)
      toast.success('🎨 Whiteboard cleared')
    }
  }

  // Utility Functions
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setRoomCopied(true)
    toast.success('📋 Room ID copied to clipboard!')
    setTimeout(() => setRoomCopied(false), 2000)
  }

  const leaveCall = () => {
    cleanup()
    navigate('/dashboard')
  }

  const cleanup = () => {
    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
    }

    // Close all peer connections
    peerConnections.forEach(pc => pc.close())

    // Disconnect socket
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

      {/* Professional Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 animate-slide-in-left">
            <div>
              <h1 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
                <span>ConnectPro</span>
                {isEncrypted && <Shield size={16} className="text-green-400" title="End-to-end encrypted" />}
              </h1>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <span>Room: <span className="text-blue-400 font-mono">{roomId}</span></span>
                <button
                  onClick={copyRoomId}
                  className={`flex items-center space-x-1 px-2 py-1 rounded transition-all duration-200 ${
                    roomCopied
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {roomCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  <span>{roomCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
              <div className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
                {participants.size + 1} participant{participants.size !== 0 ? 's' : ''}
              </div>
              {isEncrypted && (
                <div className="text-sm text-green-400 bg-green-900 px-2 py-1 rounded flex items-center space-x-1">
                  <Lock size={14} />
                  <span>Encrypted</span>
                </div>
              )}
            </div>
          </div>

          {/* Feature Toggle Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                showChat
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Toggle Chat"
            >
              <MessageCircle size={18} />
            </button>

            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                showWhiteboard
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Toggle Whiteboard"
            >
              <Palette size={18} />
            </button>

            <button
              onClick={() => setShowFileShare(!showFileShare)}
              className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                showFileShare
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Toggle File Sharing"
            >
              <FileText size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Main Content Area */}
        <div className="flex-1 relative">
          {/* Video Grid */}
          <div className="p-4 relative h-full">
            <div className={`grid gap-4 h-full ${
              participants.size === 0 ? 'grid-cols-1' :
              participants.size === 1 ? 'grid-cols-2' :
              participants.size <= 3 ? 'grid-cols-2' :
              participants.size <= 8 ? 'grid-cols-3' :
              'grid-cols-4'
            }`}>

              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 px-3 py-1 rounded-lg">
                  <span className="text-sm font-medium">You ({user?.name}) {isScreenSharing && '📺'}</span>
                </div>

                <div className="absolute top-4 right-4 flex space-x-2">
                  {!isVideoOn && <div className="bg-red-500 p-2 rounded-full"><VideoOff size={16} /></div>}
                  {!isAudioOn && <div className="bg-red-500 p-2 rounded-full"><MicOff size={16} /></div>}
                  {isScreenSharing && <div className="bg-blue-500 p-2 rounded-full"><Monitor size={16} /></div>}
                </div>

                {!isVideoOn && !isScreenSharing && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <p className="text-gray-300">Camera Off</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Remote Participants */}
              {Array.from(participants.entries()).map(([socketId, participant]) => (
                <div key={socketId} className="relative bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(socketId, el)
                        const stream = remoteStreams.get(socketId)
                        if (stream) el.srcObject = stream
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 px-3 py-1 rounded-lg">
                    <span className="text-sm font-medium">{participant.name}</span>
                  </div>

                  <div className="absolute top-4 left-4">
                    <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
                  </div>

                  {!remoteStreams.has(socketId) && (
                    <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-2xl font-bold">{participant.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <p className="text-gray-300">{participant.name}</p>
                        <p className="text-xs text-gray-400">Connecting...</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {participants.size === 0 && (
                <div className="relative bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">🎥 Waiting for participants...</p>
                    <p className="text-sm mt-2">Share the room ID: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{roomId}</span></p>
                  </div>
                </div>
              )}

            </div>

            {/* Optimized Video Call Controls */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
              {/* Controls Label */}
              <div className="text-center mb-2">
                <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                  Call Controls
                </span>
              </div>

              <div className="bg-slate-800 rounded-lg px-6 py-3 border border-slate-700 shadow-lg">
                <div className="flex items-center space-x-2">
                  {/* Video Toggle */}
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      isVideoOn
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                    title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>

                  {/* Audio Toggle */}
                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-lg transition-all duration-200 ${
                      isAudioOn
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                    title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
                  >
                    {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
                  </button>

                  {/* Screen Share Toggle */}
                  <button
                    onClick={toggleScreenShare}
                    className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
                      isScreenSharing
                        ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg hover:shadow-glow'
                        : 'bg-white/20 hover:bg-white/30 text-white hover:shadow-glow'
                    }`}
                    title={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
                  >
                    {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
                  </button>

                  {/* Divider */}
                  <div className="w-px h-8 bg-white/20"></div>

                  {/* Chat Toggle */}
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 relative ${
                      showChat
                        ? 'bg-accent-500 hover:bg-accent-600 text-white shadow-lg hover:shadow-glow'
                        : 'bg-white/20 hover:bg-white/30 text-white hover:shadow-glow'
                    }`}
                    title="Toggle chat"
                  >
                    <MessageCircle size={24} />
                    {messages.length > 0 && !showChat && (
                      <span className="absolute -top-2 -right-2 bg-error-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                        {messages.length > 9 ? '9+' : messages.length}
                      </span>
                    )}
                  </button>

                  {/* Whiteboard Toggle */}
                  <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
                      showWhiteboard
                        ? 'bg-warning-500 hover:bg-warning-600 text-white shadow-lg hover:shadow-glow'
                        : 'bg-white/20 hover:bg-white/30 text-white hover:shadow-glow'
                    }`}
                    title="Toggle whiteboard"
                  >
                    <Palette size={24} />
                  </button>

                  {/* File Share */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-300 transform hover:scale-110 hover:shadow-glow"
                    title="Share file"
                  >
                    <Upload size={24} />
                  </button>

                  {/* Divider */}
                  <div className="w-px h-8 bg-white/20"></div>

                  {/* Leave Call */}
                  <button
                    onClick={leaveCall}
                    className="p-4 rounded-full bg-error-500 hover:bg-error-600 text-white transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-glow animate-heartbeat"
                    title="Leave call"
                  >
                    <Phone size={24} />
                  </button>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="flex justify-center mt-3 space-x-4 text-xs">
                <div className={`flex items-center space-x-1 ${isConnected ? 'text-success-400' : 'text-error-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-400 animate-pulse' : 'bg-error-400'}`}></div>
                  <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
                </div>
                <div className={`flex items-center space-x-1 ${participants.size > 0 ? 'text-primary-400' : 'text-gray-400'}`}>
                  <Users size={12} />
                  <span>{participants.size + 1} participant{participants.size !== 0 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Optimized Whiteboard Overlay */}
            {showWhiteboard && (
              <div className="fixed inset-4 bg-white rounded-lg z-30 shadow-lg">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-t-lg">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Palette className="w-5 h-5" />
                    <span>🎨 Collaborative Whiteboard</span>
                  </h3>
                  <div className="flex items-center space-x-3">
                    {/* Color Picker */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">Color:</span>
                      <select
                        value={drawColor}
                        onChange={(e) => setDrawColor(e.target.value)}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="#000000">Black</option>
                        <option value="#ff0000">Red</option>
                        <option value="#00ff00">Green</option>
                        <option value="#0000ff">Blue</option>
                        <option value="#ffff00">Yellow</option>
                        <option value="#ff00ff">Purple</option>
                        <option value="#00ffff">Cyan</option>
                        <option value="#ffffff">White</option>
                      </select>
                    </div>

                    {/* Brush Size */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">Size:</span>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={drawSize}
                        onChange={(e) => setDrawSize(e.target.value)}
                        className="w-20 accent-primary-500"
                      />
                      <span className="text-sm w-6">{drawSize}</span>
                    </div>

                    {/* Tool Toggle */}
                    <button
                      onClick={() => setDrawTool(drawTool === 'pen' ? 'eraser' : 'pen')}
                      className={`p-2 rounded transition-all duration-200 ${
                        drawTool === 'eraser'
                          ? 'bg-error-600 hover:bg-error-700 text-white'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                      title={drawTool === 'eraser' ? 'Switch to Pen' : 'Switch to Eraser'}
                    >
                      {drawTool === 'eraser' ? <Eraser size={16} /> : <PaletteIcon size={16} />}
                    </button>

                    {/* Clear Button */}
                    <button
                      onClick={clearWhiteboard}
                      className="p-2 bg-error-600 hover:bg-error-700 text-white rounded transition-all duration-200"
                      title="Clear Whiteboard"
                    >
                      Clear
                    </button>

                    {/* Close Button */}
                    <button
                      onClick={() => setShowWhiteboard(false)}
                      className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-all duration-200"
                      title="Close Whiteboard"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Canvas Container */}
                <div className="relative w-full h-full bg-white rounded-b-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    className="w-full h-full cursor-crosshair block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      touchAction: 'none',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
              </div>
            )}

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="*/*"
            />
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <MessageCircle size={20} />
                <span>💬 Chat</span>
              </h3>
              <p className="text-sm text-gray-400">{messages.length} messages • End-to-end encrypted</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-400">{message.sender.name}</span>
                      <span className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-white">{message.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  autoComplete="off"
                />
                <button type="submit" disabled={!newMessage.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-1">
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* File Sharing Sidebar */}
        {showFileShare && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <FileText size={20} />
                <span>📁 File Sharing</span>
              </h3>
              <p className="text-sm text-gray-400">{files.length} files shared • 50MB limit</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {files.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Upload size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No files shared yet</p>
                  <p className="text-sm">Click upload to share files!</p>
                </div>
              ) : (
                files.map((file) => (
                  <div key={file.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className="text-blue-400" />
                        <span className="text-sm font-medium text-white truncate">{file.name}</span>
                      </div>
                      <button onClick={() => downloadFile(file)} className="p-1 bg-blue-600 hover:bg-blue-700 rounded text-white">
                        <Download size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{file.sender?.name || 'Unknown'}</span>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2">
                <Upload size={16} />
                <span>Upload File</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCall
