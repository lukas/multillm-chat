const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3008;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/test', (req, res) => {
  res.json({ status: 'Server is working', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log('🔌 Socket connected');

  socket.on('start_conversation', async (data) => {
    console.log('📝 Received start_conversation:', data);
    
    // Immediately emit test events
    socket.emit('conversation_start', { topic: data.topic, rounds: data.rounds });
    
    setTimeout(() => {
      socket.emit('model_response', { 
        model: 'Test Model', 
        response: 'This is a test response to verify the socket connection works properly.', 
        round: 1,
        avatar: '🧪'
      });
    }, 1000);
    
    setTimeout(() => {
      socket.emit('conversation_end');
    }, 2000);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });
});

const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🌐 Minimal test server running at http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});