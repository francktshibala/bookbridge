# Capacitor Implementation Testing Guide

## Android Studio Quick Run (Dev)

Use these two steps to open Android Studio and run the app while the Next dev server is running.

1) Terminal 1 – start the dev server (leave running)

cd /Users/user/bookbridge/bookbridge
export JAVA_HOME=$(/usr/libexec/java_home -v 17); export PATH=$JAVA_HOME/bin:$PATH
npm run dev -- -H 0.0.0.0 -p 3000

2) Terminal 2 – open Android Studio

npx cap open android

Notes:
- If you prefer to launch directly on the emulator: npx cap run android
- If the emulator shows localhost:3000, ensure Terminal 1 is still running. Use http://10.0.2.2:3000 inside the emulator if you open Chrome for checks.

## What's Been Implemented (Days 1-6)

### ✅ Day 1-2: Basic Capacitor Setup
- Capacitor core installed and configured
- Android and iOS platforms added
- Build scripts ready

### ✅ Day 3: Navigation & App Lifecycle
- Deep linking support
- Android back button handling
- Background/foreground state management

### ✅ Day 4: Audio System
- Native audio caching for offline playback
- Network-aware audio quality

### ✅ Day 5: File System Integration
- Native storage for books and audio
- Offline book reading capability
- File management utilities

### ✅ Day 6: API Routing
- Automatic API routing (localhost for dev, production URL for mobile)

## How to Test the Implementation

### 1. Test in Development Mode (Recommended First)

```bash
# Terminal 1: Start the web server
npm run dev

# Terminal 2: Launch on Android (easiest, no Xcode needed)
npx cap run android

# Or for iOS (requires Xcode)
npx cap run ios
```

### 2. What to Test

#### A. Basic App Functionality
1. Open the app on Android/iOS simulator
2. Navigate between pages
3. Test the back button (Android)
4. Minimize and restore the app

#### B. Book Storage (Offline Mode)
1. Go to Library
2. Open a book to read
3. Turn off internet on the device
4. The book should still be readable
5. Check native storage: The app stores books in the device's native file system

#### C. Audio Caching
1. Play audio for any book chunk
2. The audio gets cached natively
3. Turn off internet
4. Previously played audio should still work

#### D. API Routing
1. In the mobile app, all API calls automatically route to production server
2. Check the console logs - you'll see "🌐 API Call:" messages

### 3. Check Native Storage

The app creates these directories on the device:
- `/data/data/com.bookbridge.app/files/books/` - Processed book content
- `/data/data/com.bookbridge.app/files/raw-books/` - Original PDFs/EPUBs
- `/data/data/com.bookbridge.app/files/audio/` - Cached audio files

### 4. Verify Features Working

```bash
# Check if Capacitor is properly integrated
npx cap doctor

# Sync any web changes to native platforms
npm run cap:sync
```

### 5. Test Specific Features

#### Test Offline Book Reading:
1. Load a book while online
2. Turn on airplane mode
3. Close and reopen the app
4. Try to read the same book - should work offline

#### Test Audio Caching:
1. Play audio for a book chunk
2. Wait for it to finish
3. Turn off internet
4. Play the same audio again - should work from cache

#### Test Native Features:
- The app detects network changes
- Storage persists between app restarts
- API calls work in production build

### 6. Build for Production Testing

```bash
# Build the web app
npm run build

# Copy to native platforms
npm run cap:copy

# Open in Android Studio
npx cap open android

# Build APK from Android Studio
```

## What You Should See

1. **Console Logs** (in Android Studio Logcat or Xcode console):
   - `📱 Capacitor App Listener initialized`
   - `📚 Stored book content natively: [bookId]`
   - `🎵 Cached audio natively: [bookId]_[chunkIndex]`
   - `🌐 API Call: https://bookbridge.onrender.com/api/...`

2. **Network Tab** (in dev tools):
   - Mobile app makes requests to production API
   - Web app makes requests to localhost

3. **Storage**:
   - Books and audio persist after app restart
   - Works offline once content is cached

## Common Issues & Solutions

1. **App crashes on launch**: Run `npm run cap:sync`
2. **API calls failing**: Check if production server is running
3. **Storage not working**: Check app permissions in device settings
4. **Audio not playing**: Ensure audio permissions are granted

## Next Steps

If everything works, you can:
1. Build a production APK/IPA
2. Test on real devices
3. Deploy to app stores

The implementation is ready for testing - all core features should work on mobile devices!