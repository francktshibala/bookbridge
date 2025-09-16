#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// iOS App Icon sizes required for App Store submission
const iconSizes = [
  { size: 20, scale: 2, filename: 'Icon-App-20x20@2x.png' },  // 40x40
  { size: 20, scale: 3, filename: 'Icon-App-20x20@3x.png' },  // 60x60
  { size: 29, scale: 2, filename: 'Icon-App-29x29@2x.png' },  // 58x58
  { size: 29, scale: 3, filename: 'Icon-App-29x29@3x.png' },  // 87x87
  { size: 40, scale: 2, filename: 'Icon-App-40x40@2x.png' },  // 80x80
  { size: 40, scale: 3, filename: 'Icon-App-40x40@3x.png' },  // 120x120
  { size: 60, scale: 2, filename: 'Icon-App-60x60@2x.png' },  // 120x120
  { size: 60, scale: 3, filename: 'Icon-App-60x60@3x.png' },  // 180x180
  { size: 76, scale: 1, filename: 'Icon-App-76x76@1x.png' },  // 76x76
  { size: 76, scale: 2, filename: 'Icon-App-76x76@2x.png' },  // 152x152
  { size: 83.5, scale: 2, filename: 'Icon-App-83.5x83.5@2x.png' }, // 167x167
  { size: 1024, scale: 1, filename: 'Icon-App-1024x1024.png' }, // 1024x1024 (App Store)
];

async function generateIcons() {
  try {
    const sourceFile = path.join(__dirname, '..', 'infinity-book-icon-clean.svg');
    const outputDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    console.log('🎨 Generating iOS app icons from SVG...\n');

    // Convert SVG to PNG first at maximum resolution
    const svgBuffer = await fs.readFile(sourceFile);
    const pngBuffer = await sharp(svgBuffer, { density: 300 })
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Generate each required size
    for (const icon of iconSizes) {
      const size = Math.round(icon.size * icon.scale);
      const outputPath = path.join(outputDir, icon.filename);

      await sharp(pngBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png({
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputPath);

      console.log(`✅ Generated ${icon.filename} (${size}x${size})`);
    }

    // Create Contents.json for Xcode
    const contentsJson = {
      images: iconSizes.map(icon => ({
        filename: icon.filename,
        idiom: icon.size === 1024 ? 'ios-marketing' :
                icon.size === 83.5 ? 'ipad' :
                icon.size === 76 ? 'ipad' : 'universal',
        scale: `${icon.scale}x`,
        size: `${icon.size}x${icon.size}`
      })),
      info: {
        author: 'xcode',
        version: 1
      }
    };

    const contentsPath = path.join(outputDir, 'Contents.json');
    await fs.writeFile(contentsPath, JSON.stringify(contentsJson, null, 2));

    console.log('\n✅ Generated Contents.json for Xcode');
    console.log(`\n🎉 All icons generated successfully in:\n   ${outputDir}`);

    // Also save a copy to the root for reference
    const rootIconPath = path.join(__dirname, '..', 'app-icon-1024.png');
    await sharp(pngBuffer)
      .toFile(rootIconPath);
    console.log(`\n📱 Reference icon saved to: app-icon-1024.png`);

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();