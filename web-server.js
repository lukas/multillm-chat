require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

const PORT = 3007;
const HOST = '0.0.0.0';

// Store active SSE connections
const sseClients = new Set();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SSE endpoint
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send keep-alive comment every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  // Add client to set
  sseClients.add(res);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Helper function to broadcast to all SSE clients
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error writing to SSE client:', error);
      sseClients.delete(client);
    }
  });
}

// Start conversation endpoint
app.post('/start-conversation', (req, res) => {
  const { topic, rounds } = req.body;
  
  if (!topic || !rounds) {
    return res.status(400).json({ error: 'Topic and rounds are required' });
  }

  console.log(`🚀 Received start_conversation: "${topic}" with ${rounds} rounds`);
  
  // Start conversation asynchronously
  const chatHandler = new MockChatHandler();
  chatHandler.startConversation(topic, parseInt(rounds)).catch(error => {
    console.error('❌ Error in start_conversation:', error);
    broadcast('error', { message: error.message });
  });

  res.json({ status: 'started' });
});

// Mock chat handler that responds instantly
class MockChatHandler {
  constructor() {
    // No longer needs io parameter since we use broadcast function
  }

  async startConversation(topic, rounds = 3) {
    console.log(`🚀 Mock conversation: "${topic}" with ${rounds} rounds`);
    
    broadcast('conversation_start', { topic, rounds });
    
    const conversationId = `conv_${Date.now()}`;
    
    for (let round = 1; round <= rounds; round++) {
      console.log(`--- Mock Round ${round} ---`);
      broadcast('round_start', { round, totalRounds: rounds });
      
      // Mock OpenAI response
      broadcast('model_thinking', { model: 'OpenAI GPT-4', round });
      await new Promise(resolve => setTimeout(resolve, 500)); // Short delay
      
      broadcast('model_response', { 
        model: 'OpenAI GPT-4', 
        response: `This is a mock OpenAI response for round ${round} about: ${topic}`, 
        round,
        avatar: '🤖'
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock Anthropic response
      broadcast('model_thinking', { model: 'Anthropic Claude', round });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      broadcast('model_response', { 
        model: 'Anthropic Claude', 
        response: `This is a mock Anthropic response for round ${round}. The topic "${topic}" is interesting to discuss.`, 
        round,
        avatar: '🧠'
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    broadcast('weave_tracking', {
      conversationId: conversationId,
      dashboardUrl: '/weave'
    });
    
    broadcast('conversation_end');
    
    console.log('✅ Mock conversation completed');
    return { conversationId, topic, rounds };
  }
}

server.listen(PORT, HOST, () => {
  console.log(`🌐 Mock web interface running at http://${HOST}:${PORT}`);
  console.log(`📡 SSE server ready for real-time updates`);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down...');
  server.close(() => process.exit(0));
});