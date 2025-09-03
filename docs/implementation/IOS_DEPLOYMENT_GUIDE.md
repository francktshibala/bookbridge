# iOS Deployment Guide for BookBridge

## Prerequisites
- Mac with macOS 15.0 or later
- Xcode (download from App Store - ~7GB)
- Apple Developer Account ($99/year for App Store distribution)
- iPhone for testing (optional, can use simulator)

## Step-by-Step Instructions

### 1. Clone/Pull Repository
```bash
cd ~/bookbridge
git pull origin main
```

### 2. Install Dependencies
```bash
cd bookbridge
npm install
```

### 3. Build Web Assets
```bash
npm run build
```

### 4. Sync iOS Platform
```bash
npm run cap:sync ios
```

### 5. Open in Xcode
```bash
npx cap open ios
```

### 6. Configure in Xcode
1. **Select App target** in the left sidebar
2. Click **"Signing & Capabilities"** tab
3. **Team**: Select your Apple Developer team
4. **Bundle Identifier**: Change to something unique (e.g., `com.francois.bookbridge`)
5. **Signing Certificate**: Should auto-generate

### 7. Clean and Build
1. Menu: **Product → Clean Build Folder**
2. Select **iPhone 15** simulator (or your connected device)
3. Click **Run ▶️** button

### 8. If CocoaPods Error Occurs
Run these commands in Terminal:
```bash
sudo gem install cocoapods
cd ~/bookbridge/bookbridge/ios/App
pod install
open App.xcworkspace
```
Then repeat steps 6-7 in Xcode.

## Important Notes

### Production URL
The app is already configured to use:
```
https://bookbridge-mkd7.onrender.com
```

### Safety Checks
- Always use `npm run cap:sync ios` (not general sync)
- Don't modify Android files
- The production URL is already set correctly

### TestFlight Deployment (Later)
1. In Xcode: **Product → Archive**
2. **Distribute App** → App Store Connect
3. Complete metadata in App Store Connect
4. Submit for TestFlight review

### Common Issues
- **"Unable to find Xcode"**: Make sure Xcode is fully installed from App Store
- **Signing errors**: Ensure you're logged into your Apple ID in Xcode preferences
- **Build failures**: Try cleaning build folder and rebuilding

## Quick Commands Summary
```bash
# On your Mac with macOS 15.0+
cd ~/bookbridge/bookbridge
git pull
npm install
npm run build
npm run cap:sync ios
npx cap open ios
# Then continue in Xcode GUI
```

## Android Safety
This iOS build process won't affect the Android build. Both platforms coexist safely in the same project.