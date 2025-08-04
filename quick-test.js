const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function quickTest() {
  let server = null;
  let browser = null;
  
  try {
    // Start server
    server = spawn('node', ['web-server.js'], { stdio: 'pipe' });
    
    // Wait max 2 seconds for server to start
    let serverReady = false;
    const timeout = setTimeout(() => { if (!serverReady) console.log('⚠️ Server timeout'); }, 2000);
    
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Socket.IO server ready')) {
        serverReady = true;
        clearTimeout(timeout);
      }
    });
    
    // Wait for server
    while (!serverReady && Date.now() < Date.now() + 2000) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (!serverReady) {
      console.log('❌ Server failed to start');
      return;
    }
    
    console.log('✅ Server started, launching browser...');
    
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Capture all console logs
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Go to page
    await page.goto('http://localhost:3007', { timeout: 3000 });
    
    // Check if basic elements exist
    const topicExists = await page.locator('#topic').count() > 0;
    const buttonExists = await page.locator('.start-btn').count() > 0;
    
    console.log('📋 Page elements:', { topicExists, buttonExists });
    
    if (!topicExists || !buttonExists) {
      console.log('❌ Required elements missing');
      return;
    }
    
    // Fill form and click
    await page.fill('#topic', 'Quick test');
    await page.selectOption('#rounds', '1');
    
    console.log('🖱️  Clicking start button...');
    await page.click('.start-btn');
    
    // Wait 3 seconds max and check what appeared
    await page.waitForTimeout(3000);
    
    const buttonText = await page.textContent('.start-btn');
    const conversationTopicCount = await page.locator('.conversation-topic').count();
    const messageCount = await page.locator('.message').count();
    const errorCount = await page.locator('.error').count();
    
    console.log('📊 Results after 3 seconds:');
    console.log('  Button text:', buttonText);
    console.log('  Conversation topics:', conversationTopicCount);
    console.log('  Messages:', messageCount);
    console.log('  Errors:', errorCount);
    console.log('  Console logs:', consoleLogs.length);
    
    if (consoleLogs.length > 0) {
      console.log('📄 Browser console:');
      consoleLogs.forEach(log => console.log('  ', log));
    }
    
    // Check HTML content
    const chatContent = await page.locator('#chatContainer').innerHTML();
    console.log('📝 Chat container content length:', chatContent.length);
    
    if (chatContent.length < 100) {
      console.log('❌ Chat container appears empty');
      console.log('Content:', chatContent.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill('SIGKILL');
    console.log('✅ Test complete');
  }
}

quickTest();