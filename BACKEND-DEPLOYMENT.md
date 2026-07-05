# Backend Deployment Guide

## 🚀 Quick Deploy to Railway (Recommended)

### Step 1: Deploy Backend
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Choose "backend" as root directory
6. Railway will auto-deploy

### Step 2: Set Environment Variables
In Railway dashboard, go to Variables tab and add:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=https://codealpha-communication-app.vercel.app
```

### Step 3: Get Your Backend URL
Railway will give you a URL like: `https://your-app.railway.app`

### Step 4: Update Frontend Environment Variables
In Vercel dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://your-backend-url.railway.app/api
VITE_SOCKET_URL=https://your-backend-url.railway.app
VITE_NODE_ENV=production
```

### Step 5: Redeploy Frontend
Go to Vercel → Deployments → Redeploy

## 🔧 Alternative: Render Deployment

### Step 1: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. New → Web Service
4. Connect GitHub repo
5. Configure:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

### Step 2: Environment Variables
Same as Railway above.

## ✅ Test Your Deployment

1. Visit your backend URL: `https://your-backend-url.com/api/health`
2. Should return: `{"status":"OK","message":"Server is running"}`
3. Try registering on your frontend
4. Should work without CORS errors

## 🐛 Troubleshooting

- **CORS Error**: Check backend environment variables
- **500 Error**: Check backend logs in Railway/Render dashboard
- **Connection Failed**: Verify backend URL in Vercel environment variables
