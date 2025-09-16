# App Icons

## Store Submissions Directory
The `store-submissions/` folder contains backup copies of all app icons used for iOS and Android app stores.

### iOS Icons (13 files)
- **Icon-App-20x20@2x.png** - 40x40 (Notification 2x)
- **Icon-App-20x20@3x.png** - 60x60 (Notification 3x)
- **Icon-App-29x29@2x.png** - 58x58 (Settings 2x)
- **Icon-App-29x29@3x.png** - 87x87 (Settings 3x)
- **Icon-App-40x40@2x.png** - 80x80 (Spotlight 2x)
- **Icon-App-40x40@3x.png** - 120x120 (Spotlight 3x)
- **Icon-App-60x60@2x.png** - 120x120 (iPhone App 2x)
- **Icon-App-60x60@3x.png** - 180x180 (iPhone App 3x)
- **Icon-App-76x76@1x.png** - 76x76 (iPad App 1x)
- **Icon-App-76x76@2x.png** - 152x152 (iPad App 2x)
- **Icon-App-83.5x83.5@2x.png** - 167x167 (iPad Pro App)
- **Icon-App-1024x1024.png** - 1024x1024 (App Store)
- **Icon-App-120x120.png** - 120x120 (Additional)

### Store Submission Icons
- **app-icon-1024.png** - Apple App Store submission
- **app-icon-512.png** - Google Play Store submission

## Important Notes
- These are backup copies only
- The actual iOS icons used by the app are in: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- The actual Android icons used by the app are in: `android/app/src/main/res/mipmap-*/`
- DO NOT delete the icons from their original locations

## Regenerating Icons
To regenerate all iOS icons from the SVG source:
```bash
node scripts/generate-ios-icons.js
```

Source files:
- `infinity-book-icon-clean.svg` - Clean version for icon generation
- `infinity-book-icon.svg` - Original design