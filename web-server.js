require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Add JSON and URL encoded parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active SSE connections
const sseClients = new Set();

const PORT = 3007;
const HOST = process.env.HOST || 'localhost';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SSE helper functions
function sendSSE(clients, event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    if (!client.destroyed) {
      client.write(message);
    }
  });
}

function removeDeadClients(clients) {
  clients.forEach(client => {
    if (client.destroyed) {
      clients.delete(client);
    }
  });
}

// SSE endpoint
app.get('/events', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write(`event: connected\ndata: {"message": "Connected to SSE"}\n\n`);

  // Add client to active connections
  sseClients.add(res);
  console.log(`👤 SSE client connected. Total clients: ${sseClients.size}`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
    console.log(`👤 SSE client disconnected. Total clients: ${sseClients.size}`);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    if (!res.destroyed) {
      res.write(`event: ping\ndata: {"timestamp": "${new Date().toISOString()}"}\n\n`);
    } else {
      clearInterval(keepAlive);
    }
  }, 30000);
});

// API endpoint to start conversation
app.post('/start-conversation', async (req, res) => {
  try {
    const { topic, rounds } = req.body;
    console.log(`🚀 Received start_conversation: "${topic}" with ${rounds} rounds`);
    
    const chatHandler = new MockChatHandler(sseClients);
    const result = await chatHandler.startConversation(topic, parseInt(rounds));
    
    res.json({ success: true, conversationId: result.conversationId });
  } catch (error) {
    console.error('❌ Error in start_conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mock chat handler that responds instantly
class MockChatHandler {
  constructor(io) {
    this.io = io;
  }

  async startConversation(topic, rounds = 3) {
    console.log(`🚀 Mock conversation: "${topic}" with ${rounds} rounds`);
    
    this.io.emit('conversation_start', { topic, rounds });
    
    const conversationId = `conv_${Date.now()}`;
    
    for (let round = 1; round <= rounds; round++) {
      console.log(`--- Mock Round ${round} ---`);
      this.io.emit('round_start', { round, totalRounds: rounds });
      
      // Mock OpenAI response
      this.io.emit('model_thinking', { model: 'OpenAI GPT-4', round });
      await new Promise(resolve => setTimeout(resolve, 500)); // Short delay
      
      this.io.emit('model_response', { 
        model: 'OpenAI GPT-4', 
        response: `This is a mock OpenAI response for round ${round} about: ${topic}`, 
        round,
        avatar: '🤖'
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock Anthropic response
      this.io.emit('model_thinking', { model: 'Anthropic Claude', round });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.io.emit('model_response', { 
        model: 'Anthropic Claude', 
        response: `This is a mock Anthropic response for round ${round}. The topic "${topic}" is interesting to discuss.`, 
        round,
        avatar: '🧠'
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    this.io.emit('weave_tracking', {
      conversationId: conversationId,
      dashboardUrl: '/weave'
    });
    
    this.io.emit('conversation_end');
    
    console.log('✅ Mock conversation completed');
    return { conversationId, topic, rounds };
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected');

  socket.on('start_conversation', async (data) => {
    try {
      const { topic, rounds } = data;
      console.log(`🚀 Received start_conversation: "${topic}" with ${rounds} rounds`);
      
      const chatHandler = new MockChatHandler(io);
      await chatHandler.startConversation(topic, parseInt(rounds));
      
    } catch (error) {
      console.error('❌ Error in start_conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🌐 Mock web interface running at http://${HOST}:${PORT}`);
  console.log(`🔌 Socket.IO server ready for real-time updates`);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down...');
  server.close(() => process.exit(0));
});