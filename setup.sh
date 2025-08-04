#!/bin/bash

# Multi-LLM Chat Setup Script
set -e

echo "🚀 Setting up Multi-LLM Chat Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (version 14 or higher) first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) is installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) is installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browser dependencies (for testing)
echo "🎭 Installing Playwright browser dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libxkbcommon0 libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libcairo2 libpango-1.0-0 libasound2t64 2>/dev/null || echo "⚠️  Could not install browser dependencies (may need sudo)"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Grok API Configuration (when available)
GROK_API_KEY=your_grok_api_key_here

# Weave Configuration (optional - for tracking and analytics)
WANDB_API_KEY=your_wandb_api_key_here
EOL
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env and add your API keys before running the application"
else
    echo "✅ .env file already exists"
fi

# Make the script executable
chmod +x setup.sh

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your API keys:"
echo "   - OpenAI: https://platform.openai.com/api-keys"
echo "   - Anthropic: https://console.anthropic.com/"
echo "   - Weave/W&B (optional): https://wandb.ai/settings"
echo ""
echo "2. Run the application:"
echo "   npm start          # Console mode"
echo "   npm run web        # Web interface mode"
echo ""
echo "3. Or run in development mode:"
echo "   npm run dev        # Console mode with auto-reload"
echo "   npm run web-dev    # Web interface with auto-reload"
echo ""
echo "Happy chatting with multiple AI models! 🤖🧠"