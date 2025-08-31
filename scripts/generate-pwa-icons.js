// Simple script to create placeholder PWA icons
const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#667eea';
  ctx.fillRect(0, 0, size, size);
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = `${size/3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📚', size/2, size/2);
  
  return canvas.toBuffer('image/png');
}

// Note: This requires the 'canvas' package. For now, use placeholder images
console.log('Please add proper PWA icons:');
console.log('1. Create a 192x192 PNG with your logo');
console.log('2. Create a 512x512 PNG with your logo');
console.log('3. Save them as public/icon-192.png and public/icon-512.png');
console.log('\nYou can use online tools like:');
console.log('- https://realfavicongenerator.net/');
console.log('- https://www.pwabuilder.com/imageGenerator');