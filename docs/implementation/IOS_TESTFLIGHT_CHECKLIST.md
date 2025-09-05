# iOS TestFlight & Physical Device Deployment Checklist

## Prerequisites
- ✅ App runs successfully on iOS simulator
- ✅ Apple Developer Account ($99/year)
- ✅ Physical iPhone for testing (optional but recommended)

## Physical Device Testing

### 1. Prepare iPhone
- [ ] Enable Developer Mode: Settings → Privacy & Security → Developer Mode → On
- [ ] Connect iPhone to Mac via USB
- [ ] Trust computer when prompted on iPhone

### 2. Configure in Xcode
- [ ] Select your iPhone from device dropdown (replaces simulator)
- [ ] Signing & Capabilities → Team: Select paid developer account (not Personal Team)
- [ ] Bundle Identifier: Ensure unique (e.g., `com.bookbridge.app`)
- [ ] Click "Try Again" if provisioning profile errors appear
- [ ] Wait for "Signing for 'App' requires a development team" to resolve

### 3. Build and Run on Device
- [ ] Product → Clean Build Folder
- [ ] Click Run (▶️)
- [ ] First run may take longer (installing provisioning profile)
- [ ] App icon should appear on iPhone home screen

## TestFlight Preparation

### 1. App Store Connect Setup
- [ ] Log into [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Create new app
- [ ] Fill in app information:
  - App Name: BookBridge
  - Primary Language: English
  - Bundle ID: com.bookbridge.app
  - SKU: bookbridge-001

### 2. Prepare for Archive
- [ ] In Xcode: Select "Any iOS Device (arm64)" as build target
- [ ] Update version number if needed (Target → General → Version)
- [ ] Increment build number (must be unique for each upload)

### 3. Create Archive
- [ ] Product → Archive (this will take 5-10 minutes)
- [ ] Archives window opens automatically when complete
- [ ] Click "Distribute App"
- [ ] Choose "App Store Connect" → Next
- [ ] "Upload" → Next
- [ ] Use automatic signing → Next
- [ ] Review and Upload

### 4. TestFlight Configuration
- [ ] Wait for processing (usually 10-30 minutes)
- [ ] In App Store Connect → TestFlight tab
- [ ] Add internal testers (up to 100)
- [ ] Add external testers (up to 10,000, requires review)
- [ ] Submit for TestFlight review (external testers only)

## Required App Store Information

### Screenshots (Required Sizes)
- [ ] 6.7" (iPhone 15 Pro Max): 1290 × 2796
- [ ] 6.5" (iPhone 14 Plus): 1242 × 2688 or 1284 × 2778
- [ ] 5.5" (iPhone 8 Plus): 1242 × 2208

### App Description
- [ ] Short description (up to 170 characters)
- [ ] Full description (up to 4000 characters)
- [ ] Keywords (up to 100 characters)
- [ ] Support URL
- [ ] Privacy Policy URL (required)

### Review Information
- [ ] Demo account credentials (if needed)
- [ ] Notes for reviewer
- [ ] Contact information

## Common Issues

### Code Signing Errors
- Ensure Apple Developer account is active
- Xcode → Preferences → Accounts → Download certificates
- Clean build folder and try again

### Archive Not Showing
- Ensure scheme is set to Release
- Product → Scheme → Edit Scheme → Archive → Release

### Upload Failures
- Check for email from Apple about issues
- Validate archive before uploading
- Ensure all app icons are included

## Timeline Estimates
- Physical device testing: 30 minutes
- Archive and upload: 30-45 minutes
- TestFlight processing: 10-30 minutes
- TestFlight review (external): 24-48 hours
- App Store review: 24-72 hours (typically)

## Success Metrics
- [ ] App installs on physical devices via TestFlight
- [ ] No crashes reported by testers
- [ ] Core functionality works as expected
- [ ] Ready for App Store submission