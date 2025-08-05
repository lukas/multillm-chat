require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3009;
const HOST = 'localhost';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Simple tracking
let trackingEnabled = !!process.env.WANDB_API_KEY;
const trackingData = [];

function logEvent(event, data) {
  if (trackingEnabled) {
    const logEntry = { event, ...data, timestamp: new Date().toISOString() };
    trackingData.push(logEntry);
    console.log('📊 Tracked:', event, data);
  }
}

// Standalone chat class for web interface
class WebChatHandler {
  constructor(io) {
    this.io = io;
    this.openai = null;
    this.anthropic = null;
    this.initializeClients();
  }

  initializeClients() {
    console.log('🔧 Initializing API clients...');
    
    // OpenAI client initialization
    if (process.env.OPENAI_API_KEY) {
      try {
        const { OpenAI } = require('openai');
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI client initialized');
      } catch (error) {
        console.error('❌ OpenAI client initialization failed:', error.message);
      }
    } else {
      console.log('⚠️ OpenAI API key not found');
    }

    // Anthropic client initialization
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        console.log('✅ Anthropic client initialized');
      } catch (error) {
        console.error('❌ Anthropic client initialization failed:', error.message);
      }
    } else {
      console.log('⚠️ Anthropic API key not found');
    }
  }

  async chatWithOpenAI(message) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

    console.log('🤖 Calling OpenAI API...');
    const completion = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: 'gpt-4',
    });

    return completion.choices[0].message.content;
  }

  async chatWithAnthropic(message) {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Please check your API key.');
    }

    console.log('🧠 Calling Anthropic API...');
    const message_response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }],
    });

    return message_response.content[0].text;
  }

  async startConversation(topic, rounds = 3) {
    console.log(`🚀 Starting conversation: "${topic}" with ${rounds} rounds`);
    
    this.io.emit('conversation_start', { topic, rounds });
    
    const conversationId = `conv_${Date.now()}`;
    logEvent('conversation_start', { conversation_id: conversationId, topic, planned_rounds: rounds });
    
    let currentMessage = `Let's discuss: ${topic}`;
    const responses = [];
    
    for (let round = 1; round <= rounds; round++) {
      console.log(`--- Round ${round} ---`);
      this.io.emit('round_start', { round, totalRounds: rounds });
      
      try {
        // OpenAI response
        if (this.openai) {
          this.io.emit('model_thinking', { model: 'OpenAI GPT-4', round });
          const startTime = Date.now();
          const openaiResponse = await this.chatWithOpenAI(currentMessage);
          const duration = Date.now() - startTime;
          
          console.log('🤖 OpenAI response received');
          this.io.emit('model_response', { 
            model: 'OpenAI GPT-4', 
            response: openaiResponse, 
            round,
            avatar: '🤖'
          });
          
          logEvent('model_response', {
            conversation_id: conversationId,
            model: 'gpt-4',
            round,
            duration_ms: duration
          });
          
          responses.push({ model: 'OpenAI GPT-4', round, message: openaiResponse, duration });
          currentMessage = openaiResponse;
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Anthropic response
        if (this.anthropic) {
          this.io.emit('model_thinking', { model: 'Anthropic Claude', round });
          const startTime = Date.now();
          const anthropicResponse = await this.chatWithAnthropic(currentMessage);
          const duration = Date.now() - startTime;
          
          console.log('🧠 Anthropic response received');
          this.io.emit('model_response', { 
            model: 'Anthropic Claude', 
            response: anthropicResponse, 
            round,
            avatar: '🧠'
          });
          
          logEvent('model_response', {
            conversation_id: conversationId,
            model: 'claude-3-sonnet',
            round,
            duration_ms: duration
          });
          
          responses.push({ model: 'Anthropic Claude', round, message: anthropicResponse, duration });
          currentMessage = anthropicResponse;
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error in round ${round}:`, error.message);
        this.io.emit('error', { 
          message: `Error in round ${round}: ${error.message}`,
          round 
        });
        
        logEvent('conversation_error', { conversation_id: conversationId, round, error: error.message });
      }
    }
    
    logEvent('conversation_complete', {
      conversation_id: conversationId,
      topic,
      completed_rounds: rounds,
      total_responses: responses.length
    });
    
    this.io.emit('weave_tracking', {
      conversationId: conversationId,
      dashboardUrl: '/weave'
    });
    
    this.io.emit('conversation_end');
    
    console.log('✅ Conversation completed');
    return { conversationId, topic, rounds, responses };
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected to web interface');

  socket.on('start_conversation', async (data) => {
    try {
      const { topic, rounds } = data;
      console.log(`🚀 Received start_conversation: "${topic}" with ${rounds} rounds`);
      
      const chatHandler = new WebChatHandler(io);
      await chatHandler.startConversation(topic, parseInt(rounds));
      
    } catch (error) {
      console.error('❌ Error in start_conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected from web interface');
  });
});

// Tracking dashboard endpoint
app.get('/weave', (req, res) => {
  res.json({ 
    message: 'Tracking data is logged locally in console for now. Set WANDB_API_KEY for full W&B integration.',
    trackingEnabled,
    totalEvents: trackingData.length
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🌐 Fixed web interface running at http://${HOST}:${PORT}`);
  console.log(`🔌 Socket.IO server ready for real-time updates`);
  console.log(`📊 Tracking ${trackingEnabled ? 'enabled' : 'disabled'}`);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});