import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProfessionalLogin from './pages/ProfessionalLogin'
import ProfessionalRegister from './pages/ProfessionalRegister'
import ProfessionalDashboard from './pages/ProfessionalDashboard'
import VideoCall from './pages/VideoCallNew'
import ProtectedRoute from './components/ProtectedRoute'

function AppContent() {
  const location = useLocation()
  const isVideoCall = location.pathname.startsWith('/call/')

  return (
    <div className={isVideoCall ? "min-h-screen" : "min-h-screen bg-gradient-to-br from-secondary-900 via-primary-900 to-accent-900 animate-gradient-xy"}>
      {/* Global Background Effects - only show when not in video call */}
      {!isVideoCall && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-success-500/3 rounded-full blur-3xl animate-float"></div>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<ProfessionalLogin />} />
        <Route path="/register" element={<ProfessionalRegister />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ProfessionalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/call/:roomId"
          element={
            <ProtectedRoute>
              <VideoCall />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
