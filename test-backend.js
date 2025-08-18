const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server...');

const backendPath = path.join(__dirname, 'backend');
const serverProcess = spawn('node', ['server.js'], {
  cwd: backendPath,
  stdio: 'inherit'
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start backend:', error);
});

serverProcess.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});
