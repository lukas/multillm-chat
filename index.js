require('dotenv').config();
const weave = require('weave');

// Initialize Weave
weave.init('multillm-chat');

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
    
    let currentMessage = `Let's discuss: ${topic}`;
    
    for (let round = 1; round <= rounds; round++) {
      console.log(`--- Round ${round} ---\n`);
      
      try {
        // OpenAI response
        if (this.openai) {
          console.log('🤖 OpenAI GPT-4:');
          const openaiResponse = await this.chatWithOpenAI(currentMessage);
          console.log(openaiResponse);
          console.log('');
          currentMessage = openaiResponse;
        }

        // Anthropic response
        if (this.anthropic) {
          console.log('🧠 Anthropic Claude:');
          const anthropicResponse = await this.chatWithAnthropic(currentMessage);
          console.log(anthropicResponse);
          console.log('');
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
      }
    }
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