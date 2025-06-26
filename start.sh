#!/bin/bash

# Warehouse Management System - Start Script
echo "🏭 Starting Warehouse Management System..."

# Function to kill processes on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo "🚀 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting frontend server..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo "✅ Both servers started!"
echo "📱 Backend: http://localhost:4000"
echo "🌐 Frontend: http://localhost:5173"
echo ""
echo "📱 Login with: admin / admin123"
echo "🤖 Try the AI Assistant!"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for processes
wait
