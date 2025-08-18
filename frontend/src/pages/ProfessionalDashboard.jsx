import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Video, Plus, Users, Calendar, Settings, LogOut,
  Clock, MessageCircle, Share2, ChevronRight
} from 'lucide-react'

const ProfessionalDashboard = () => {
  const [roomId, setRoomId] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [settings, setSettings] = useState({
    notifications: true,
    autoJoinAudio: true,
    autoJoinVideo: true,
    theme: 'dark'
  })
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8)
  }

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId()
    navigate(`/call/${newRoomId}`)
  }

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/call/${roomId.trim()}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Professional Header */}
      <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">ConnectPro</h1>
                <p className="text-sm text-slate-400">Professional Communication</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-slate-700 px-3 py-1.5 rounded-md">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Online</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Welcome back,</p>
                  <p className="text-sm font-medium text-slate-100">{user?.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-md transition-all duration-200"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 px-3 py-2 rounded-md transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-2">Welcome back, {user?.name}</h2>
          <p className="text-slate-400">Ready to connect and collaborate with your team</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Create Room Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-all duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-100">Create New Room</h3>
                <p className="text-sm text-slate-400">Start a new video conference</p>
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>

          {/* Join Room Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-all duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-100">Join Room</h3>
                <p className="text-sm text-slate-400">Enter a room ID to join</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomId.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-md transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Join Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-medium text-slate-100 mb-2">Real-time Chat</h3>
            <p className="text-sm text-slate-400">Instant messaging during calls</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-medium text-slate-100 mb-2">Screen Sharing</h3>
            <p className="text-sm text-slate-400">Share your screen with participants</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-medium text-slate-100 mb-2">Whiteboard</h3>
            <p className="text-sm text-slate-400">Collaborative drawing and notes</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-slate-100 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-slate-700 rounded-md">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">No recent meetings</p>
                <p className="text-xs text-slate-400">Start your first meeting to see activity here</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-100 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Settings content will be added here */}
              <div className="text-center py-8">
                <p className="text-slate-400">Settings panel coming soon</p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium py-2 px-4 rounded-md transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfessionalDashboard
