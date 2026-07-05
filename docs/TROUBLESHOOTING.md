# 🔧 ConnectPro Troubleshooting Guide

## ❌ **Error: EADDRINUSE - Port Already in Use**

### **Problem:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

### **Solution:**

#### **Option 1: Kill Ports Automatically**
Run the following command to kill any processes on ports 5000 and 5173:
```bash
npx kill-port 5000 5173
```
Then start the development servers:
```bash
npm run dev
```

#### **Option 2: Manual Fix**
1. **Find processes using port 5000:**
   ```cmd
   netstat -ano | findstr :5000
   ```

2. **Kill the process (replace XXXX with actual PID):**
   ```cmd
   taskkill /PID XXXX /F
   ```

3. **Start the server:**
   ```cmd
   cd backend
   node server.js
   ```

#### **Option 3: Use Different Port**
1. Edit `server.js`
2. Change `const PORT = 5000` to `const PORT = 5001`
3. Update frontend Socket.IO connection to use port 5001

## 🚀 **Server Not Starting**

### **Check Dependencies:**
```cmd
cd backend
npm install
```

### **Test Basic Server:**
```cmd
cd backend
node test-basic.js
```

### **Check Node.js Version:**
```cmd
node --version
```
*Requires Node.js v14 or higher*

## 🌐 **Frontend Not Loading**

### **Check if Vite is Running:**
```cmd
cd frontend
npm run dev
```

### **Install Frontend Dependencies:**
```cmd
cd frontend
npm install
```

### **Clear Cache:**
```cmd
cd frontend
npm run build
```

## 🔗 **Connection Issues**

### **Backend Health Check:**
Visit: http://localhost:5000/api/health

Should show:
```json
{
  "status": "OK",
  "message": "ConnectPro Server is running"
}
```

### **Frontend Access:**
Visit: http://localhost:5173

### **Socket.IO Connection:**
Check browser console for Socket.IO connection errors

## 🎥 **Video/Audio Issues**

### **Camera/Microphone Permissions:**
1. Click the camera/microphone icon in browser address bar
2. Allow permissions for localhost
3. Refresh the page

### **WebRTC Issues:**
1. Use Chrome or Edge (best WebRTC support)
2. Disable VPN if using one
3. Check firewall settings
4. Try different network

## 📱 **Login Issues**

### **Test Credentials:**
- Email: `test@example.com`
- Password: `password123`

### **Registration:**
- Create new account if login fails
- Check browser console for API errors

## 🛠️ **Quick Fixes**

### **Complete Reset:**
1. Close all browser tabs
2. Kill all Node.js processes:
   ```cmd
   taskkill /IM node.exe /F
   ```
3. Run `npm run dev` in the root folder.

### **Port Conflicts:**
```cmd
# Kill all processes on port 5000
for /f "tokens=5" %a in ('netstat -ano ^| findstr :5000') do taskkill /PID %a /F

# Kill all processes on port 5173  
for /f "tokens=5" %a in ('netstat -ano ^| findstr :5173') do taskkill /PID %a /F
```

### **Browser Cache:**
1. Press `Ctrl + Shift + R` to hard refresh
2. Clear browser cache
3. Try incognito/private mode

## 📋 **System Requirements**

### **Required:**
- Node.js v14+
- Modern browser (Chrome, Edge, Firefox)
- Available ports: 5000, 5173

### **Recommended:**
- Chrome or Edge for best WebRTC support
- Stable internet connection
- Camera and microphone for video calls

## 🆘 **Still Having Issues?**

### **Check These Files:**
1. `working-server.js` - Backend server
2. `package.json` - Dependencies
3. Browser console - JavaScript errors
4. Network tab - API requests

### **Common Solutions:**
1. Restart computer
2. Update Node.js
3. Update browser
4. Disable antivirus temporarily
5. Try different network

### **Debug Steps:**
1. Test backend: http://localhost:5000/api/health
2. Test frontend: http://localhost:5173
3. Check browser console for errors
4. Verify login credentials
5. Test with different browser

## ✅ **Success Indicators**

### **Backend Running:**
```
🎉 ================================
🚀 ConnectPro Server Started!
🎉 ================================
🌐 Backend: http://localhost:5000
📡 Socket.IO: Ready
✅ Server is ready for connections!
```

### **Frontend Running:**
```
Local:   http://localhost:5173/
Network: use --host to expose
```

### **App Working:**
- Login page loads
- Can login with test@example.com / password123
- Dashboard shows "Create Room" and "Join Room" options
- Video calls work with camera/microphone permissions

## 🎉 **Success!**

When everything is working:
1. Backend shows "Server Started" message
2. Frontend loads at http://localhost:5173
3. Login works with test credentials
4. Video calls, chat, and whiteboard function properly

**Your ConnectPro platform is ready for professional communication!** 🚀
