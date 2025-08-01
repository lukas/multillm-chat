# MultLLM Chat

A chat application that enables conversations between the latest AI agents from OpenAI, Grok, and Anthropic.

## Features

- **Multi-LLM Integration**: Connects to OpenAI GPT-4, Anthropic Claude, and Grok (when available)
- **Interactive Conversations**: Facilitates back-and-forth discussions between different AI models
- **Configurable Rounds**: Set the number of conversation rounds
- **Easy Setup**: Simple configuration with environment variables

## Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd multillm-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your API keys:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Run the application:
   ```bash
   npm start
   ```

## Configuration

Create a `.env` file with your API keys:

```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GROK_API_KEY=your_grok_api_key_here
```

## Usage

The application will start a conversation between the available AI models on a specified topic. You can modify the topic and number of rounds in the `main()` function in `index.js`.

## API Keys

- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
- **Grok**: API integration pending public availability

## License

MIT