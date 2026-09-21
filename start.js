// start.js - Wrapper script to ensure Chrome is installed and configured before starting the server

const { execSync } = require('child_process');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

async function start() {
  console.log('🚀 Starting Fechador with Chrome setup...');
  
  // 1. Install Chrome
  console.log('📦 Installing Chrome...');
  try {
    require('child_process').execSync(
      'npx @puppeteer/browsers install chrome@146.0.7680.31 --path=/tmp/puppeteer',
      { stdio: 'inherit', timeout: 120000 }
    );
    console.log('✅ Chrome installed successfully');
  } catch (error) {
    console.error('❌ Failed to install Chrome:', error.message);
    process.exit(1);
  }

  // Wait a bit for file system to settle
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Find Chrome executable using glob
  console.log('🔍 Finding Chrome executable...');
  const chromePaths = glob.sync('/tmp/puppeteer/**/chrome');
  
  let chromePath = null;
  for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
      try {
        // Make it executable
        fs.chmodSync(chromePath, '755');
        console.log(`✅ Found and made executable: ${chromePath}`);
        process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;
        break;
      } catch (e) {
        console.warn(`Failed to chmod ${chromePath}:`, e.message);
      }
    }
  }

  if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.error('❌ Chrome executable not found!');
    console.log('Searched paths:', glob.sync('/tmp/puppeteer/**/*'));
    process.exit(1);
  }

  console.log(`✅ Using Chrome at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);

  // Set environment variables for puppeteer
  process.env.PUPPETEER_CACHE_DIR = '/tmp/puppeteer';
  process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH;

  // Now import and start the actual server
  console.log('🚀 Starting Fechador server...');
  require('./dist/server/index.js');
}

start().catch(err => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});