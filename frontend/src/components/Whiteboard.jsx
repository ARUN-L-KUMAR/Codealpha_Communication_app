import React, { useRef, useEffect, useState } from 'react'
import { Palette, Eraser, RotateCcw, Download } from 'lucide-react'

const Whiteboard = ({ socket, roomId, isVisible, onClose, mode = 'overlay', user }) => {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState('pen')
  const [currentColor, setCurrentColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(2)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })
  const [cursors, setCursors] = useState(new Map()) // Track other users' cursors

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isVisible) return

    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const rect = container.getBoundingClientRect()
      // Set actual canvas size
      canvas.width = rect.width
      canvas.height = rect.height

      // Set display size (CSS)
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'

      // Fill with white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Reset drawing properties
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    // Initial resize
    setTimeout(resizeCanvas, 100) // Delay to ensure parent is rendered

    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [isVisible])

  useEffect(() => {
    if (!socket) return

    // Listen for drawing events from other users
    socket.on('whiteboard-draw', (drawData) => {
      drawOnCanvas(drawData)
    })

    socket.on('whiteboard-clear', () => {
      clearCanvas()
    })

    // Listen for cursor movements from other users
    socket.on('whiteboard-cursor', handleCursorMove)
    socket.on('whiteboard-cursor-leave', handleCursorLeave)

    return () => {
      socket.off('whiteboard-draw')
      socket.off('whiteboard-clear')
      socket.off('whiteboard-cursor')
      socket.off('whiteboard-cursor-leave')
    }
  }, [socket])

  // Handle cursor movement from other users
  const handleCursorMove = (data) => {
    try {
      const { userId, userName, x, y, color } = data
      if (userId !== user?.id) {
        setCursors(prev => new Map(prev.set(userId, {
          userName,
          x,
          y,
          color: color || '#3b82f6',
          lastSeen: Date.now()
        })))
      }
    } catch (error) {
      console.error('Error handling cursor move:', error)
    }
  }

  // Handle cursor leave from other users
  const handleCursorLeave = (data) => {
    try {
      const { userId } = data
      setCursors(prev => {
        const newCursors = new Map(prev)
        newCursors.delete(userId)
        return newCursors
      })
    } catch (error) {
      console.error('Error handling cursor leave:', error)
    }
  }

  // Clean up old cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCursors(prev => {
        const newCursors = new Map()
        prev.forEach((cursor, userId) => {
          if (now - cursor.lastSeen < 5000) { // Keep cursors for 5 seconds
            newCursors.set(userId, cursor)
          }
        })
        return newCursors
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const getTouchPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    console.log('🎨 Starting to draw')
    setIsDrawing(true)

    const pos = e.touches ? getTouchPos(e) : getMousePos(e)
    console.log('🎨 Start position:', pos)
    setLastPosition(pos)

    const canvas = canvasRef.current
    if (!canvas) {
      console.error('❌ Canvas not found')
      return
    }

    const ctx = canvas.getContext('2d')

    // Set drawing properties
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = lineWidth * 3
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = currentColor
      ctx.lineWidth = lineWidth
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()

    const pos = e.touches ? getTouchPos(e) : getMousePos(e)
    console.log('🎨 Drawing to position:', pos)

    const canvas = canvasRef.current
    if (!canvas) {
      console.error('❌ Canvas not found during draw')
      return
    }

    const ctx = canvas.getContext('2d')

    // Set drawing properties
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = lineWidth * 3
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = currentColor
      ctx.lineWidth = lineWidth
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw line from last position to current position
    ctx.beginPath()
    ctx.moveTo(lastPosition.x, lastPosition.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    console.log('🎨 Drew line from', lastPosition, 'to', pos)

    // Emit drawing data to other users
    const drawData = {
      fromX: lastPosition.x,
      fromY: lastPosition.y,
      toX: pos.x,
      toY: pos.y,
      color: currentColor,
      lineWidth: lineWidth,
      tool: currentTool,
      type: 'draw'
    }

    socket?.emit('whiteboard-draw', { drawData, roomId })

    // Update last position
    setLastPosition(pos)
  }

  // Handle mouse movement for cursor tracking
  const handleMouseMove = (e) => {
    if (isDrawing) {
      draw(e)
    } else {
      // Track cursor position for other users
      const pos = e.touches ? getTouchPos(e) : getMousePos(e)

      // Throttle cursor updates to avoid spam
      if (socket && user && Date.now() - (window.lastCursorUpdate || 0) > 50) {
        socket.emit('whiteboard-cursor', {
          roomId,
          userId: user.id,
          userName: user.name,
          x: pos.x,
          y: pos.y,
          color: currentColor
        })
        window.lastCursorUpdate = Date.now()
      }
    }
  }

  // Handle mouse leave for cursor tracking
  const handleMouseLeave = (e) => {
    stopDrawing(e)

    // Notify others that cursor left
    if (socket && user) {
      socket.emit('whiteboard-cursor-leave', {
        roomId,
        userId: user.id
      })
    }
  }

  const stopDrawing = (e) => {
    if (!isDrawing) return
    e?.preventDefault()
    setIsDrawing(false)
  }

  const drawOnCanvas = (drawData) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    // Set drawing properties
    if (drawData.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = drawData.lineWidth * 3
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = drawData.color
      ctx.lineWidth = drawData.lineWidth
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw line from fromX,fromY to toX,toY
    ctx.beginPath()
    ctx.moveTo(drawData.fromX, drawData.fromY)
    ctx.lineTo(drawData.toX, drawData.toY)
    ctx.stroke()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const handleClear = () => {
    clearCanvas()
    socket?.emit('whiteboard-clear', roomId)
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500']

  if (!isVisible) return null

  const containerClass = mode === 'split'
    ? "h-full bg-white flex flex-col"
    : "fixed inset-0 bg-white z-50 flex flex-col"

  return (
    <div className={containerClass}>
      {/* Enhanced Toolbar */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 border-b border-gray-300 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Tools:</span>
            <button
              onClick={() => setCurrentTool('pen')}
              className={`p-3 rounded-lg transition-all duration-200 ${
                currentTool === 'pen'
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
              }`}
              title="Pen Tool"
            >
              <Palette size={20} />
            </button>
            <button
              onClick={() => setCurrentTool('eraser')}
              className={`p-3 rounded-lg transition-all duration-200 ${
                currentTool === 'eraser'
                  ? 'bg-red-500 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-300'
              }`}
              title="Eraser Tool"
            >
              <Eraser size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700 w-8 text-center">{lineWidth}px</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Color:</span>
            <div className="flex space-x-2">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`w-8 h-8 rounded-full border-3 transition-all duration-200 hover:scale-110 ${
                    currentColor === color
                      ? 'border-gray-800 shadow-lg transform scale-110'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Color: ${color}`}
                />
              ))}
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
                title="Custom Color"
              />
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">

          <button
            onClick={handleClear}
            className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
            title="Clear Whiteboard"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={downloadCanvas}
            className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
            title="Download as PNG"
          >
            <Download size={20} />
          </button>
          {mode === 'overlay' && (
            <button
              onClick={onClose}
              className="p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
              title="Close Whiteboard"
            >
              ✕
            </button>
          )}

          {mode === 'split' && (
            <div className="text-sm font-medium text-gray-600">
              Split Screen Mode
            </div>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={handleMouseLeave}
          onTouchStart={startDrawing}
          onTouchMove={handleMouseMove}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="absolute inset-0 cursor-crosshair border border-gray-200"
          style={{
            touchAction: 'none',
            width: '100%',
            height: '100%'
          }}
        />

        {/* Render other users' cursors */}
        {Array.from(cursors.entries()).map(([userId, cursor]) => (
          <div
            key={userId}
            className="absolute pointer-events-none z-10 transition-all duration-100"
            style={{
              left: cursor.x - 8,
              top: cursor.y - 8,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Cursor pointer */}
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: cursor.color }}
            />

            {/* User name label */}
            <div
              className="absolute top-5 left-2 px-2 py-1 rounded text-xs font-medium text-white shadow-lg whitespace-nowrap"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </div>
          </div>
        ))}

        {/* Drawing indicator */}
        {isDrawing && (
          <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
            Drawing...
          </div>
        )}

        {/* Tool indicator */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-lg">
          <div className="text-sm font-medium text-gray-700">
            Tool: <span className="capitalize">{currentTool}</span>
          </div>
          <div className="text-xs text-gray-500">
            Size: {lineWidth}px | Color: {currentColor}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Whiteboard
