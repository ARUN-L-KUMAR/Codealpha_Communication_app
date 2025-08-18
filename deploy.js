#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ConnectPro Deployment Helper');
console.log('================================');

// Check if we're in the right directory
if (!fs.existsSync('frontend') || !fs.existsSync('backend')) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

// Check for required files
const requiredFiles = [
  'frontend/package.json',
  'backend/package.json',
  'vercel.json'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
}

console.log('✅ All required files found');

// Build frontend
console.log('\n📦 Building frontend...');
try {
  execSync('cd frontend && npm install && npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend build successful');
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'pipe' });
  console.log('✅ Vercel CLI found');
} catch (error) {
  console.log('📥 Installing Vercel CLI...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
  } catch (installError) {
    console.error('❌ Failed to install Vercel CLI. Please install manually: npm install -g vercel');
    process.exit(1);
  }
}

console.log('\n🌐 Ready to deploy to Vercel!');
console.log('Run the following commands:');
console.log('1. vercel (for preview deployment)');
console.log('2. vercel --prod (for production deployment)');
console.log('\n📝 Don\'t forget to:');
console.log('- Set up your backend on Railway/Render');
console.log('- Configure environment variables in Vercel dashboard');
console.log('- Update CORS settings in your backend');
console.log('\nSee DEPLOYMENT-GUIDE.md for detailed instructions.');
