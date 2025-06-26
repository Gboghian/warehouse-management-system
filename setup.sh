#!/bin/bash

# Warehouse Management System - Easy Setup Script
echo "🏭 Warehouse Management System Setup"
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16+) first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ..
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo "✅ Installation complete!"
echo ""
echo "🚀 To start the application:"
echo "1. Start backend:  cd backend && npm start"
echo "2. Start frontend: npm run dev"
echo ""
echo "📱 Default login: admin / admin123"
echo "🤖 Try the AI Assistant tab!"
