require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const MultiLLMChat = require('./index.js');
// Removed wandb require - using simple tracking instead

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3007;
const HOST = process.env.HOST || '0.0.0.0';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tracking dashboard endpoint
app.get('/weave', (req, res) => {
  res.json({ message: 'Tracking data is logged locally in console for now. Set WANDB_API_KEY for full W&B integration.' });
});

// Enhanced MultiLLMChat class with web interface support
class WebMultiLLMChat extends MultiLLMChat {
  constructor(io) {
    super();
    this.io = io;
  }

  async startConversation(topic, rounds = 3) {
    this.io.emit('conversation_start', { topic, rounds });
    
    // Track conversation metadata
    const conversationId = `conv_${Date.now()}`;
    
    let currentMessage = `Let's discuss: ${topic}`;
    const responses = [];
    
    for (let round = 1; round <= rounds; round++) {
      this.io.emit('round_start', { round, totalRounds: rounds });
      
      try {
        // OpenAI response
        if (this.openai) {
          this.io.emit('model_thinking', { model: 'OpenAI GPT-4', round });
          const startTime = Date.now();
          const openaiResponse = await this.chatWithOpenAI(currentMessage);
          const duration = Date.now() - startTime;
          
          this.io.emit('model_response', { 
            model: 'OpenAI GPT-4', 
            response: openaiResponse, 
            round,
            avatar: '🤖'
          });
          
          responses.push({
            model: 'OpenAI GPT-4',
            round: round,
            message: openaiResponse,
            duration: duration
          });
          
          currentMessage = openaiResponse;
          
          // Add delay between responses for better UX
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Anthropic response
        if (this.anthropic) {
          this.io.emit('model_thinking', { model: 'Anthropic Claude', round });
          const startTime = Date.now();
          const anthropicResponse = await this.chatWithAnthropic(currentMessage);
          const duration = Date.now() - startTime;
          
          this.io.emit('model_response', { 
            model: 'Anthropic Claude', 
            response: anthropicResponse, 
            round,
            avatar: '🧠'
          });
          
          responses.push({
            model: 'Anthropic Claude',
            round: round,
            message: anthropicResponse,
            duration: duration
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
    
    // Emit weave dashboard link
    this.io.emit('weave_tracking', {
      conversationId: conversationId,
      dashboardUrl: '/weave'
    });
    
    this.io.emit('conversation_end');
    
    return {
      conversationId,
      topic,
      rounds,
      responses
    };
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected to web interface');

  socket.on('start_conversation', async (data) => {
    try {
      const { topic, rounds } = data;
      console.log(`🚀 Starting web conversation: "${topic}" with ${rounds} rounds`);
      console.log('📊 Data received:', data);
      
      const chat = new WebMultiLLMChat(io);
      console.log('🔧 WebMultiLLMChat instance created');
      
      const result = await chat.startConversation(topic, parseInt(rounds));
      console.log('✅ Conversation completed:', result);
    } catch (error) {
      console.error('❌ Error in start_conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected from web interface');
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🌐 Web interface running at http://${HOST}:${PORT}`);
  console.log(`🔌 Socket.IO server ready for real-time updates`);
});