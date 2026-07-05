# ConnectPro Deployment Guide

## Deployment Options

### Option 1: Frontend on Vercel + Backend on Railway/Render (Recommended)

This is the recommended approach as it leverages each platform's strengths.

#### Step 1: Deploy Backend to Railway/Render

1. **Railway Deployment:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Deploy backend
   cd backend
   railway init
   railway up
   ```

2. **Render Deployment:**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Create a new Web Service
   - Set build command: `cd backend && npm install`
   - Set start command: `cd backend && npm start`
   - Add environment variables (see below)

#### Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   # From project root
   vercel
   ```

3. **Configure Environment Variables in Vercel:**
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add:
     - `VITE_API_URL`: Your backend URL + `/api` (e.g., `https://your-backend.railway.app/api`)
     - `VITE_SOCKET_URL`: Your backend URL (e.g., `https://your-backend.railway.app`)
     - `VITE_NODE_ENV`: `production`

#### Step 3: Update Backend CORS

Update your backend's CORS configuration to include your Vercel domain:

```javascript
// In backend/server.js
const corsOptions = {
  origin: [
    "http://localhost:5173", 
    "http://localhost:3000", 
    "https://your-vercel-app.vercel.app"  // Add your Vercel domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
```

### Option 2: Full Stack on Vercel (Serverless)

This option converts your Express backend to Vercel serverless functions.

#### Required Changes:

1. **Create API Routes Structure:**
   ```
   api/
   ├── auth/
   │   ├── login.js
   │   ├── register.js
   │   └── me.js
   └── health.js
   ```

2. **Convert Express Routes to Serverless Functions**
3. **Handle Socket.IO with Vercel's WebSocket support**

## Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Frontend (Vercel Environment Variables)
```
VITE_API_URL=https://your-backend-url.com/api
VITE_SOCKET_URL=https://your-backend-url.com
VITE_NODE_ENV=production
```

## Quick Deploy Commands

### Deploy Frontend to Vercel
```bash
# From project root
vercel --prod
```

### Deploy Backend to Railway
```bash
cd backend
railway up
```

## Post-Deployment Checklist

- [ ] Backend is accessible at your deployed URL
- [ ] Frontend can connect to backend API
- [ ] Socket.IO connections work
- [ ] WebRTC video calls function properly
- [ ] Authentication works
- [ ] File sharing works (if implemented)
- [ ] All environment variables are set correctly

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Update backend CORS to include your frontend domain
2. **Socket.IO Connection Failed**: Check SOCKET_URL environment variable
3. **API Calls Failing**: Verify API_URL environment variable
4. **Build Failures**: Check all dependencies are in package.json

### Debug Commands:
```bash
# Check environment variables
vercel env ls

# View deployment logs
vercel logs

# Test API endpoints
curl https://your-backend-url.com/api/health
```
