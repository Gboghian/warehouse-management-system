#!/bin/bash

echo "🎬 Building Demo Version..."

# Build the frontend
npm run build

echo "✅ Demo build complete!"
echo ""
echo "📦 Demo files are in the 'dist' folder"
echo ""
echo "🚀 Quick Deploy Options:"
echo "1. Drag 'dist' folder to netlify.com"
echo "2. Upload 'dist' folder to any web hosting"
echo "3. Use GitHub Pages with the dist folder"
echo ""
echo "📱 Demo will include:"
echo "- Sample inventory data"
echo "- Working AI assistant"
echo "- All UI features"
echo "- No backend required!"
echo ""
echo "🔐 Demo login: admin / admin123"
