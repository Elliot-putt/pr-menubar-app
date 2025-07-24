#!/bin/bash

echo "🚀 Installing PR MenuBar..."

# Kill any running instances
pkill -f "PR MenuBar" 2>/dev/null || true

# Copy the app to Applications
if [ -d "dist/mac-arm64/PR MenuBar.app" ]; then
    echo "📦 Copying PR MenuBar.app to Applications..."
    cp -R "dist/mac-arm64/PR MenuBar.app" "/Applications/"
    echo "✅ PR MenuBar installed successfully!"
    echo "🎯 You can now find it in your Applications folder"
    echo "🔧 To start the app, go to Applications and double-click 'PR MenuBar'"
else
    echo "❌ App not found in dist/mac-arm64/PR MenuBar.app"
    echo "💡 Try running 'npm run build:mac' first"
fi 