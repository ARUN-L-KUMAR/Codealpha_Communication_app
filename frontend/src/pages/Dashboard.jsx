import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Video, Plus, Users, Calendar, Settings, LogOut,
  Sparkles, Zap, Clock, Star, TrendingUp, Globe,
  MessageCircle, Share2, Palette, Shield, ChevronRight,
  Play, Coffee, Briefcase
} from 'lucide-react'

const Dashboard = () => {
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

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7)
    navigate(`/call/${newRoomId}`)
  }

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/call/${roomId}`)
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
        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

          {/* Create Room Card */}
          <div className="group glass-card rounded-3xl p-8 hover:bg-white/15 transition-all duration-500 transform hover:scale-105 hover:shadow-glow animate-fade-in-up glow-border">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 animate-bounce-in">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
            </div>

            <h3 className="text-2xl font-display font-bold text-white mb-3 animate-slide-up">
              Start New Meeting
            </h3>
            <p className="text-gray-300 mb-6 animate-slide-up delay-100">
              Create an instant meeting room and invite your team to join
            </p>

            <button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold py-4 px-6 rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-glow flex items-center justify-center space-x-2 animate-gradient-x hover:animate-pulse group"
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span>Create Room</span>
            </button>
          </div>

          {/* Join Room Card */}
          <div className="group glass-card rounded-3xl p-8 hover:bg-white/15 transition-all duration-500 transform hover:scale-105 hover:shadow-glow animate-fade-in-up delay-200 glow-border">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-r from-success-500 to-primary-500 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 animate-bounce-in delay-100">
                <Users className="w-8 h-8 text-white" />
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
            </div>

            <h3 className="text-2xl font-display font-bold text-white mb-3">
              Join Meeting
            </h3>
            <p className="text-gray-300 mb-6">
              Enter a room ID to join an existing meeting
            </p>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-success-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                />
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={!roomId.trim()}
                className="w-full bg-gradient-to-r from-success-500 to-primary-500 text-white font-semibold py-4 px-6 rounded-xl hover:from-success-600 hover:to-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-glow flex items-center justify-center space-x-2"
              >
                <Video className="w-5 h-5" />
                <span>Join Room</span>
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-display font-bold text-white mb-8 text-center">
            Powerful Features at Your Fingertips
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="p-3 bg-primary-500/20 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <Video className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">HD Video Calls</h3>
              <p className="text-gray-400 text-sm">Crystal clear video with unlimited participants</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="p-3 bg-accent-500/20 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <Share2 className="w-6 h-6 text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Screen Sharing</h3>
              <p className="text-gray-400 text-sm">Share your screen with one click</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="p-3 bg-success-500/20 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-6 h-6 text-success-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-time Chat</h3>
              <p className="text-gray-400 text-sm">Instant messaging during calls</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="p-3 bg-warning-500/20 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <Palette className="w-6 h-6 text-warning-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Whiteboard</h3>
              <p className="text-gray-400 text-sm">Collaborative drawing and notes</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-primary-500/20 to-accent-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Meetings</p>
                <p className="text-3xl font-bold text-white">24</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-success-500/20 to-primary-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Hours Connected</p>
                <p className="text-3xl font-bold text-white">156</p>
              </div>
              <Clock className="w-8 h-8 text-success-400" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-accent-500/20 to-warning-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Team Members</p>
                <p className="text-3xl font-bold text-white">12</p>
              </div>
              <Users className="w-8 h-8 text-accent-400" />
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card rounded-3xl p-8 max-w-md w-full mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-white flex items-center space-x-2">
                <Settings className="w-6 h-6" />
                <span>Settings</span>
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors hover:scale-110"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Notifications</h3>
                  <p className="text-gray-400 text-sm">Receive call and message notifications</p>
                </div>
                <button
                  onClick={() => handleSettingsChange('notifications', !settings.notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications ? 'bg-primary-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Join Audio */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Auto Join Audio</h3>
                  <p className="text-gray-400 text-sm">Automatically enable microphone when joining calls</p>
                </div>
                <button
                  onClick={() => handleSettingsChange('autoJoinAudio', !settings.autoJoinAudio)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoJoinAudio ? 'bg-primary-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoJoinAudio ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Join Video */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Auto Join Video</h3>
                  <p className="text-gray-400 text-sm">Automatically enable camera when joining calls</p>
                </div>
                <button
                  onClick={() => handleSettingsChange('autoJoinVideo', !settings.autoJoinVideo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoJoinVideo ? 'bg-primary-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoJoinVideo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Theme */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Theme</h3>
                  <p className="text-gray-400 text-sm">Choose your preferred theme</p>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingsChange('theme', e.target.value)}
                  className="bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save settings logic here
                  setShowSettings(false)
                }}
                className="flex-1 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-glow"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}

export default Dashboard
