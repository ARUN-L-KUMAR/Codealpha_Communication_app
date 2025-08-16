# 🎥 Real-Time Communication App

A minimal but fully functional real-time communication app with video calling, built with React, Express, and WebRTC.

## ✨ Features

- **User Authentication** - JWT-based registration and login
- **1:1 Video Calling** - WebRTC peer-to-peer video calls
- **Real-time Chat** - Socket.IO powered messaging during calls
- **Responsive Design** - Tailwind CSS for modern UI
- **Protected Routes** - Secure dashboard and call pages

## 🚀 Quick Start

### Option 1: One-Click Start (Windows)
```bash
# Double-click this file
start.bat
```

### Option 2: Manual Start
```bash
# Install all dependencies
npm run install-all

# Start both frontend and backend
npm run dev
```

### Option 3: Separate Terminals
```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend  
cd frontend
npm install
npm run dev
```

## 🌐 Application URLs

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 📱 How to Use

1. **Register/Login**
   - Open http://localhost:5173
   - Create a new account or login
   - You'll be redirected to the dashboard

2. **Start a Video Call**
   - Click "Create Room" to start a new call
   - Share the room ID with someone else
   - Or enter a room ID to join an existing call

3. **Video Call Features**
   - Toggle camera on/off
   - Mute/unmute microphone
   - Real-time chat during calls
   - Leave call to return to dashboard

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast development server
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **WebRTC** - Peer-to-peer video calling

### Backend
- **Express.js** - Web server framework
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
fresh-app/
├── backend/
│   ├── server.js          # Express server with Socket.IO
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── pages/          # Page components
│   │   └── main.jsx        # App entry point
│   ├── index.html          # HTML template
│   └── package.json        # Frontend dependencies
├── package.json            # Root package.json
├── start.bat              # Windows startup script
└── README.md              # This file
```

## 🔧 Development

### Backend API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/health` - Health check

### Socket.IO Events
- `join-room` - Join a video call room
- `offer` - WebRTC offer for connection
- `answer` - WebRTC answer for connection
- `ice-candidate` - ICE candidate exchange
- `chat-message` - Real-time chat messages

### Environment Variables
Create `.env` file in backend folder:
```
JWT_SECRET=your-secret-key-here
PORT=5000
```

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Protected routes
- Secure WebRTC connections

## 🌟 Key Features Explained

### Authentication Flow
1. User registers/logs in
2. Server returns JWT token
3. Token stored in localStorage
4. Protected routes check for valid token
5. Automatic redirect to dashboard on success

### Video Calling Flow
1. User creates or joins room
2. Socket.IO connection established
3. WebRTC peer connection setup
4. Media stream (video/audio) captured
5. Signaling through Socket.IO
6. Direct peer-to-peer connection

### Real-time Chat
1. Messages sent through Socket.IO
2. Broadcast to all users in room
3. Real-time display in chat sidebar
4. Persistent during video call

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill processes on ports 5000 and 5173
npx kill-port 5000 5173
```

**Camera/Microphone Access**
- Ensure HTTPS or localhost
- Check browser permissions
- Allow camera/microphone access

**Connection Issues**
- Check if both servers are running
- Verify URLs: http://localhost:5173 and http://localhost:5000
- Check browser console for errors

### Browser Requirements
- Chrome 60+ (recommended)
- Firefox 60+
- Safari 11+
- Edge 79+

## 📈 Next Steps

This is a minimal but complete implementation. To extend:

1. **Multi-user calls** - Support more than 2 participants
2. **Screen sharing** - Add screen capture functionality
3. **File sharing** - Upload and share files during calls
4. **Recording** - Record video calls
5. **Database** - Replace in-memory storage with MongoDB/PostgreSQL
6. **Deployment** - Deploy to cloud platforms

## 🎯 Success Criteria

✅ **Authentication** - Users can register and login  
✅ **Protected Routes** - Dashboard requires authentication  
✅ **Video Calling** - 1:1 WebRTC video calls work  
✅ **Real-time Chat** - Messages during video calls  
✅ **Responsive UI** - Works on desktop and mobile  
✅ **Error-free** - No console errors, clean startup  

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Verify all dependencies are installed
3. Ensure ports 5000 and 5173 are available
4. Check browser console for errors

**The app should start cleanly and work immediately!** 🚀
