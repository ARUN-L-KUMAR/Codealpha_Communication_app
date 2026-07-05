// API Configuration
const config = {
  // Use environment variables with fallbacks for development
  API_URL: import.meta.env.VITE_API_URL || 'https://codealpha-communication-app-backend.onrender.com/api',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'https://codealpha-communication-app-backend.onrender.com',
  NODE_ENV: import.meta.env.VITE_NODE_ENV || 'production',
  
  // WebRTC Configuration
  RTC_CONFIG: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }
}

export default config
