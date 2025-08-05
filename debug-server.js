// Simple debug server that logs everything
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3008;
const HOST = process.env.HOST || 'localhost';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('🔧 Debug: Checking environment variables...');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');

// Simple test class to see if the issue is with the MultiLLMChat class
class SimpleTestChat {
  constructor() {
    console.log('🔧 Debug: SimpleTestChat constructor called');
  }
  
  async testMethod() {
    console.log('🔧 Debug: testMethod called');
    return 'Test response';
  }
}

io.on('connection', (socket) => {
  console.log('👤 Debug: User connected');

  socket.on('start_conversation', async (data) => {
    console.log('🚀 Debug: start_conversation event received');
    console.log('📊 Debug: Data:', JSON.stringify(data, null, 2));
    
    try {
      // Test basic socket emission
      console.log('📡 Debug: Emitting conversation_start event');
      socket.emit('conversation_start', { topic: data.topic, rounds: data.rounds });
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test message emission
      console.log('📡 Debug: Emitting test message');
      socket.emit('model_response', { 
        model: 'Test Model', 
        response: 'This is a test message to verify socket communication works', 
        round: 1,
        avatar: '🧪'
      });
      
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // End conversation
      console.log('📡 Debug: Emitting conversation_end event');
      socket.emit('conversation_end');
      
      console.log('✅ Debug: Test completed successfully');
      
    } catch (error) {
      console.error('❌ Debug: Error in test:', error);
      socket.emit('error', { message: `Debug test error: ${error.message}` });
    }
  });

  socket.on('disconnect', () => {
    console.log('👤 Debug: User disconnected');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🌐 Debug server running at http://${HOST}:${PORT}`);
  console.log('🔌 Socket.IO server ready');
});

// Keep the process alive and handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('🛑 Debug: Shutting down server...');
  server.close(() => {
    console.log('✅ Debug: Server closed');
    process.exit(0);
  });
});