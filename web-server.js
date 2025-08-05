require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  allowEIO3: true
});

const PORT = 3007;
const HOST = 'localhost';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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