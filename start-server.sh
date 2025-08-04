#!/bin/bash

echo "🔄 Stopping any existing servers..."
pkill -f "node.*web-server" 2>/dev/null || true
pkill -f "node.*minimal-test" 2>/dev/null || true

# Wait a moment
sleep 1

echo "🚀 Starting web server..."
node web-server.js