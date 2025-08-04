const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function testWebInterface() {
  let server = null;
  let browser = null;
  
  try {
    console.log('🚀 Starting server...');
    
    // Start the server
    server = spawn('node', ['web-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });
    
    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('SERVER:', output.trim());
      if (output.includes('Socket.IO server ready')) {
        serverReady = true;
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error('SERVER ERROR:', data.toString().trim());
    });
    
    // Wait for server to be ready
    console.log('⏳ Waiting for server to start...');
    while (!serverReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Server is ready, starting browser...');
    
    // Launch browser
    browser = await chromium.launch({ 
      headless: true,   // Run headless since we don't have display
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Log all console messages from the browser
    page.on('console', msg => {
      console.log(`🌐 BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });
    
    // Log all errors
    page.on('pageerror', error => {
      console.error('🚨 BROWSER ERROR:', error.message);
    });
    
    // Log network requests
    page.on('request', request => {
      console.log('📡 REQUEST:', request.method(), request.url());
    });
    
    page.on('response', response => {
      console.log('📨 RESPONSE:', response.status(), response.url());
    });
    
    console.log('🌐 Navigating to http://localhost:3007...');
    const response = await page.goto('http://localhost:3007', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    console.log('📄 Page response status:', response.status());
    
    // Wait for page elements
    console.log('⏳ Waiting for page elements...');
    await page.waitForSelector('#topic', { timeout: 5000 });
    await page.waitForSelector('#rounds', { timeout: 5000 });
    await page.waitForSelector('.start-btn', { timeout: 5000 });
    
    console.log('✅ Page elements found');
    
    // Fill in form
    console.log('📝 Filling form...');
    await page.fill('#topic', 'Test conversation');
    await page.selectOption('#rounds', '1');
    
    console.log('🖱️ Clicking start conversation button...');
    
    // Set up listeners for socket events before clicking
    await page.evaluate(() => {
      window.socketEvents = [];
      const originalEmit = socket.emit;
      socket.emit = function(...args) {
        window.socketEvents.push(['EMIT', ...args]);
        console.log('SOCKET EMIT:', ...args);
        return originalEmit.apply(this, args);
      };
      
      ['connect', 'disconnect', 'conversation_start', 'model_response', 'error', 'conversation_end'].forEach(event => {
        socket.on(event, (data) => {
          window.socketEvents.push(['RECEIVE', event, data]);
          console.log('SOCKET RECEIVE:', event, data);
        });
      });
    });
    
    // Click the button
    await page.click('.start-btn');
    
    console.log('⏳ Waiting for conversation to start...');
    
    // Wait for conversation start event or timeout
    try {
      await page.waitForSelector('.conversation-topic', { timeout: 5000 });
      console.log('✅ Conversation topic appeared');
    } catch (error) {
      console.log('❌ Conversation topic did not appear');
    }
    
    // Wait for either success or error
    console.log('⏳ Waiting for messages or errors...');
    await page.waitForTimeout(10000);
    
    // Get all socket events that occurred
    const socketEvents = await page.evaluate(() => window.socketEvents || []);
    console.log('🔌 Socket events:', socketEvents);
    
    // Check button state
    const buttonText = await page.textContent('.start-btn');
    const buttonDisabled = await page.isDisabled('.start-btn');
    console.log('🔘 Button text:', buttonText);
    console.log('🔘 Button disabled:', buttonDisabled);
    
    // Check for any visible errors or messages
    const errorElements = await page.locator('.error').count();
    const messageElements = await page.locator('.message').count();
    const conversationElements = await page.locator('.conversation-topic').count();
    
    console.log('📊 Elements found:');
    console.log('  - Errors:', errorElements);
    console.log('  - Messages:', messageElements);
    console.log('  - Conversation topics:', conversationElements);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-screenshot.png');
    
    // Wait a bit more to see if anything delayed happens
    console.log('⏳ Waiting another 5 seconds...');
    await page.waitForTimeout(5000);
    
    const finalSocketEvents = await page.evaluate(() => window.socketEvents || []);
    console.log('🔌 Final socket events:', finalSocketEvents);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      console.log('🔒 Closing browser...');
      await browser.close();
    }
    
    if (server) {
      console.log('🛑 Killing server...');
      server.kill('SIGTERM');
      // Give it a moment to die gracefully
      setTimeout(() => {
        if (!server.killed) {
          server.kill('SIGKILL');
        }
      }, 2000);
    }
    
    console.log('✅ Test completed');
  }
}

testWebInterface();