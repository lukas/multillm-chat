require('dotenv').config();
const wandb = require('@wandb/sdk');

// Initialize W&B (optional - only if API key is available)
let weaveEnabled = false;
if (process.env.WANDB_API_KEY) {
  try {
    wandb.init({ project: 'multillm-chat' });
    weaveEnabled = true;
    console.log('📊 W&B tracking enabled');
  } catch (error) {
    console.log('⚠️  W&B tracking disabled:', error.message);
  }
} else {
  console.log('⚠️  W&B tracking disabled (no WANDB_API_KEY found)');
}

class MultiLLMChat {
  constructor() {
    this.openai = null;
    this.anthropic = null;
    this.grok = null;
    this.initializeClients();
  }

  initializeClients() {
    // OpenAI client initialization
    if (process.env.OPENAI_API_KEY) {
      const { OpenAI } = require('openai');
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Anthropic client initialization
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Grok/X client initialization (placeholder - API details may vary)
    if (process.env.GROK_API_KEY) {
      // Initialize Grok client when API becomes available
      console.log('Grok API key detected - client initialization pending API availability');
    }
  }

  async chatWithOpenAI(message) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

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

    const message_response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }],
    });

    return message_response.content[0].text;
  }

  async chatWithGrok(message) {
    // Placeholder for Grok API integration
    // Implementation will depend on the actual Grok API structure
    throw new Error('Grok API integration pending - API not yet publicly available');
  }

  async startConversation(topic, rounds = 3) {
    console.log(`🚀 Starting multi-LLM conversation about: "${topic}"\n`);
    
    // Track conversation metadata
    const conversationId = `conv_${Date.now()}`;
    if (weaveEnabled) {
      wandb.log({
        event: 'conversation_start',
        conversation_id: conversationId,
        topic: topic,
        planned_rounds: rounds,
        timestamp: new Date().toISOString()
      });
    }
    
    let currentMessage = `Let's discuss: ${topic}`;
    const responses = [];
    
    for (let round = 1; round <= rounds; round++) {
      console.log(`--- Round ${round} ---\n`);
      
      try {
        // OpenAI response
        if (this.openai) {
          console.log('🤖 OpenAI GPT-4:');
          const startTime = Date.now();
          const openaiResponse = await this.chatWithOpenAI(currentMessage);
          const duration = Date.now() - startTime;
          
          console.log(openaiResponse);
          console.log('');
          
          // Track response metrics
          weave.track('model_response', {
            conversation_id: conversationId,
            model: 'gpt-4',
            round: round,
            input_tokens: currentMessage.length,
            output_tokens: openaiResponse.length,
            duration_ms: duration,
            timestamp: new Date().toISOString()
          });
          
          responses.push({
            model: 'OpenAI GPT-4',
            round: round,
            message: openaiResponse,
            duration: duration
          });
          
          currentMessage = openaiResponse;
        }

        // Anthropic response
        if (this.anthropic) {
          console.log('🧠 Anthropic Claude:');
          const startTime = Date.now();
          const anthropicResponse = await this.chatWithAnthropic(currentMessage);
          const duration = Date.now() - startTime;
          
          console.log(anthropicResponse);
          console.log('');
          
          // Track response metrics
          weave.track('model_response', {
            conversation_id: conversationId,
            model: 'claude-3-sonnet',
            round: round,
            input_tokens: currentMessage.length,
            output_tokens: anthropicResponse.length,
            duration_ms: duration,
            timestamp: new Date().toISOString()
          });
          
          responses.push({
            model: 'Anthropic Claude',
            round: round,
            message: anthropicResponse,
            duration: duration
          });
          
          currentMessage = anthropicResponse;
        }

        // Grok response (when available)
        // if (this.grok) {
        //   console.log('🚀 Grok:');
        //   const grokResponse = await this.chatWithGrok(currentMessage);
        //   console.log(grokResponse);
        //   console.log('');
        //   currentMessage = grokResponse;
        // }
        
      } catch (error) {
        console.error(`Error in round ${round}:`, error.message);
        weave.track('conversation_error', {
          conversation_id: conversationId,
          round: round,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Track conversation completion
    weave.track('conversation_complete', {
      conversation_id: conversationId,
      topic: topic,
      completed_rounds: rounds,
      total_responses: responses.length,
      total_duration: responses.reduce((sum, r) => sum + r.duration, 0),
      timestamp: new Date().toISOString()
    });
    
    return {
      conversationId,
      topic,
      rounds,
      responses
    };
  }
}

// Example usage
async function main() {
  const chat = new MultiLLMChat();
  
  // Start a conversation about AI ethics
  await chat.startConversation('The future of artificial intelligence and its impact on society', 2);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MultiLLMChat;