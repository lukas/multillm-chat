require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const MultiLLMChat = require('./index.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Enhanced MultiLLMChat class with web interface support
class WebMultiLLMChat extends MultiLLMChat {
  constructor(io) {
    super();
    this.io = io;
  }

  async startConversation(topic, rounds = 3) {
    this.io.emit('conversation_start', { topic, rounds });
    
    let currentMessage = `Let's discuss: ${topic}`;
    
    for (let round = 1; round <= rounds; round++) {
      this.io.emit('round_start', { round, totalRounds: rounds });
      
      try {
        // OpenAI response
        if (this.openai) {
          this.io.emit('model_thinking', { model: 'OpenAI GPT-4', round });
          const openaiResponse = await this.chatWithOpenAI(currentMessage);
          this.io.emit('model_response', { 
            model: 'OpenAI GPT-4', 
            response: openaiResponse, 
            round,
            avatar: '🤖'
          });
          currentMessage = openaiResponse;
          
          // Add delay between responses for better UX
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Anthropic response
        if (this.anthropic) {
          this.io.emit('model_thinking', { model: 'Anthropic Claude', round });
          const anthropicResponse = await this.chatWithAnthropic(currentMessage);
          this.io.emit('model_response', { 
            model: 'Anthropic Claude', 
            response: anthropicResponse, 
            round,
            avatar: '🧠'
          });
          currentMessage = anthropicResponse;
          
          // Add delay between responses for better UX
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        this.io.emit('error', { 
          message: `Error in round ${round}: ${error.message}`,
          round 
        });
      }
    }
    
    this.io.emit('conversation_end');
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected to web interface');

  socket.on('start_conversation', async (data) => {
    const { topic, rounds } = data;
    console.log(`🚀 Starting web conversation: "${topic}" with ${rounds} rounds`);
    
    const chat = new WebMultiLLMChat(io);
    await chat.startConversation(topic, parseInt(rounds));
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected from web interface');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🌐 Web interface running at http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO server ready for real-time updates`);
});