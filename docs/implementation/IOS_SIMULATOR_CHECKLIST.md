# iOS Simulator Testing Checklist

## Current Status
- ✅ Xcode 15.2 installed and opened
- ✅ Capacitor config pointing to production URL: `https://bookbridge-mkd7.onrender.com`
- ✅ ATS configured for secure HTTPS connections
- ⏳ iOS 17.2 runtime needs to be installed

## Steps to Complete in Xcode

### 1. Install iOS Runtime
- [ ] In Xcode, click "Get" button for iOS 17.2 runtime (shown at top center)
- [ ] Wait for download to complete (~5GB, may take 10-30 minutes)

### 2. Configure Signing
- [ ] Select "App" target in left sidebar
- [ ] Go to "Signing & Capabilities" tab
- [ ] Ensure Team is set to "Francois Tshibala (Personal Team)"
- [ ] Set Bundle Identifier to: `com.francois.bookbridge`

### 3. Build and Run
- [ ] Select iPhone 15 simulator from device dropdown
- [ ] Product → Clean Build Folder (Cmd+Shift+K)
- [ ] Click Run button (▶️) or press Cmd+R
- [ ] Wait for build to complete

## Testing Checklist

### Core Functionality Tests
- [ ] App launches without crashes
- [ ] Home page loads with content
- [ ] Library page shows book list
- [ ] Can open a book to read
- [ ] Text displays properly
- [ ] CEFR level controls work
- [ ] Audio playback functions
- [ ] Word highlighting syncs with audio

### Network Validation
- [ ] Check Xcode console for API calls to `https://bookbridge-mkd7.onrender.com`
- [ ] No localhost or 10.0.2.2 references
- [ ] No network errors or CORS issues
- [ ] Images and assets load properly

### Navigation Tests
- [ ] All navigation links work
- [ ] Back navigation functions properly
- [ ] No broken routes or 404 pages

## Common Issues & Solutions

### If build fails:
1. Clean build folder: Product → Clean Build Folder
2. Delete derived data: ~/Library/Developer/Xcode/DerivedData
3. Restart Xcode

### If simulator won't start:
1. Quit Simulator app
2. In Xcode: Window → Devices and Simulators
3. Delete and re-add the simulator

### If network requests fail:
1. Check console for specific errors
2. Verify Info.plist has correct ATS settings
3. Ensure production server is running

## Success Criteria
- App runs on iOS simulator without crashes
- All core features work as on Android
- Network requests hit production server
- No console errors or warnings

## Next Steps After Simulator Success
1. Test on physical iPhone (if available)
2. Prepare for TestFlight submission
3. Create App Store Connect listing