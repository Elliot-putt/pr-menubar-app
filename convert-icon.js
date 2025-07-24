const { nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Helper script to convert images to proper menu bar icon format
function convertImageToIcon(inputPath, outputPath = 'assets/icon.png') {
  try {
    console.log('Converting image:', inputPath);
    
    // Create native image from input
    const image = nativeImage.createFromPath(inputPath);
    const originalSize = image.getSize();
    console.log('Original image size:', originalSize);
    
    // Resize to 16x16 for menu bar (optimal size for macOS)
    const resizedImage = image.resize({ width: 16, height: 16 });
    
    // Save as PNG
    const pngBuffer = resizedImage.toPNG();
    
    // Ensure assets directory exists
    const assetsDir = path.dirname(outputPath);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(outputPath, pngBuffer);
    console.log('Icon saved successfully to:', outputPath);
    console.log('New icon size: 16x16 pixels');
    
    return true;
  } catch (error) {
    console.error('Error converting image:', error.message);
    return false;
  }
}

// If this script is run directly
if (require.main === module) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.log('Usage: node convert-icon.js <path-to-your-image>');
    console.log('Example: node convert-icon.js ~/Desktop/my-icon.png');
    process.exit(1);
  }
  
  const success = convertImageToIcon(inputPath);
  if (success) {
    console.log('✅ Icon conversion completed!');
    console.log('Restart your app to see the new icon.');
  } else {
    console.log('❌ Icon conversion failed.');
    process.exit(1);
  }
}

module.exports = { convertImageToIcon }; 