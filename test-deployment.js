#!/usr/bin/env node

const https = require('https');
const http = require('http');

async function testEndpoint(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    }).on('error', reject);
  });
}

async function testDeployment() {
  console.log('🧪 Testing Deployment');
  console.log('====================');
  
  // Get URLs from command line arguments or use defaults
  const frontendUrl = process.argv[2] || 'http://localhost:5173';
  const backendUrl = process.argv[3] || 'http://localhost:5000';
  
  console.log(`Frontend URL: ${frontendUrl}`);
  console.log(`Backend URL: ${backendUrl}`);
  console.log('');
  
  // Test backend health endpoint
  try {
    console.log('🔍 Testing backend health endpoint...');
    const healthResponse = await testEndpoint(`${backendUrl}/api/health`);
    
    if (healthResponse.status === 200) {
      console.log('✅ Backend health check passed');
    } else {
      console.log(`❌ Backend health check failed (Status: ${healthResponse.status})`);
    }
  } catch (error) {
    console.log(`❌ Backend health check failed: ${error.message}`);
  }
  
  // Test frontend
  try {
    console.log('🔍 Testing frontend...');
    const frontendResponse = await testEndpoint(frontendUrl);
    
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is accessible');
    } else {
      console.log(`❌ Frontend test failed (Status: ${frontendResponse.status})`);
    }
  } catch (error) {
    console.log(`❌ Frontend test failed: ${error.message}`);
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. If backend fails, check your backend deployment');
  console.log('2. If frontend fails, check your Vercel deployment');
  console.log('3. Test video calling functionality manually');
  console.log('4. Check browser console for any errors');
}

testDeployment();
