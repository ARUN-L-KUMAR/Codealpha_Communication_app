// Simple server starter
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting VideoConnect Pro Backend Server...');

const serverPath = path.join(__dirname, 'backend', 'server.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'backend')
});

serverProcess.on('error', (error) => {
  console.error('❌ Server error:', error);
});

serverProcess.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});
