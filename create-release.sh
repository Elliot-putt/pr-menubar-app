#!/bin/bash

echo "🚀 Creating GitHub Release for PR MenuBar v1.0.0"
echo ""

echo "📦 Available distribution files:"
ls -la dist/*.dmg dist/*.zip 2>/dev/null | grep -E "\.(dmg|zip)$" || echo "No DMG/ZIP files found"

echo ""
echo "📋 Next steps:"
echo "1. Go to: https://github.com/Elliot-putt/pr-menubar-app/releases"
echo "2. Click 'Create a new release'"
echo "3. Select tag: v1.0.0"
echo "4. Title: PR MenuBar v1.0.0"
echo "5. Description:"
echo "   - Initial release of PR MenuBar"
echo "   - Clean menu bar interface"
echo "   - Filter consistency improvements"
echo "   - Build status updates"
echo "   - Improved review logic"
echo "6. Upload the DMG files from the dist/ folder"
echo "7. Publish the release!"
echo ""
echo "🎯 Your release files are ready in the dist/ folder!" 