const { chromium } = require('playwright');

async function testConversation() {
  console.log('🧪 Starting Playwright test...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    console.log(`🌐 Browser console: ${msg.text()}`);
  });
  
  // Set up error handling
  page.on('pageerror', error => {
    console.error(`❌ Browser error: ${error.message}`);
  });
  
  try {
    // Navigate to the app
    console.log('📱 Navigating to http://localhost:3007');
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForSelector('#topic', { timeout: 5000 });
    console.log('✅ Page loaded');
    
    // Fill in the topic
    await page.fill('#topic', 'Test conversation topic');
    console.log('✅ Topic filled');
    
    // Select 1 round for faster testing
    await page.selectOption('#rounds', '1');
    console.log('✅ Rounds selected');
    
    // Click start conversation
    console.log('🚀 Clicking start conversation button...');
    await page.click('.start-btn');
    
    // Wait for conversation to start
    await page.waitForSelector('.conversation-topic', { timeout: 10000 });
    console.log('✅ Conversation started');
    
    // Wait for button to be disabled and text to change
    const buttonText = await page.textContent('.start-btn');
    console.log(`📝 Button text: ${buttonText}`);
    
    // Wait for either a model response or an error
    console.log('⏳ Waiting for model response or error...');
    
    await Promise.race([
      page.waitForSelector('.message', { timeout: 30000 }),
      page.waitForSelector('.error', { timeout: 30000 }),
      page.waitForSelector('.completion', { timeout: 30000 })
    ]);
    
    // Check what happened
    const hasMessage = await page.locator('.message').count() > 0;
    const hasError = await page.locator('.error').count() > 0;
    const hasCompletion = await page.locator('.completion').count() > 0;
    
    console.log(`📊 Results: Messages: ${hasMessage}, Errors: ${hasError}, Completion: ${hasCompletion}`);
    
    if (hasMessage) {
      console.log('✅ SUCCESS: Conversation worked! Messages were displayed.');
      const messageCount = await page.locator('.message').count();
      console.log(`📝 Found ${messageCount} messages`);
      
      // Get first message content
      const firstMessage = await page.locator('.message').first().textContent();
      console.log(`📄 First message preview: ${firstMessage.substring(0, 100)}...`);
    } else if (hasError) {
      console.log('❌ FAILED: Conversation had an error');
      const errorText = await page.locator('.error').textContent();
      console.log(`🔍 Error: ${errorText}`);
    } else {
      console.log('⚠️  INCONCLUSIVE: No clear success or error state');
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-failure.png' });
    console.log('📸 Screenshot saved as test-failure.png');
    
  } finally {
    await browser.close();
    console.log('🧪 Test completed');
  }
}

testConversation();