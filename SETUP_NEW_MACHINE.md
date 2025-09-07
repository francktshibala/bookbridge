# 🚀 BookBridge Development Setup Guide

This guide helps you set up the BookBridge development environment on a new Mac.

## 📋 Prerequisites

- macOS (preferably macOS 15.3+ for iOS development)
- Admin access to install software
- GitHub account with access to this repository

## 🛠️ Step 1: Install Core Development Tools

### 1.1 Install Xcode (Required for iOS Development)
1. Open **Mac App Store**
2. Search for **"Xcode"**
3. Install Xcode (this takes ~30-60 minutes)
4. Once installed, open Xcode and agree to license
5. Install additional components when prompted

### 1.2 Install Homebrew (Package Manager)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 1.3 Install Development Tools
```bash
# Install Git
brew install git

# Install Node.js (includes npm)
brew install node

# Install CocoaPods for iOS dependencies
sudo gem install cocoapods
```

## 📦 Step 2: Clone and Setup Project

### 2.1 Clone the Repository
```bash
# Create a development directory
mkdir ~/Development
cd ~/Development

# Clone the BookBridge repository
git clone https://github.com/francktshibala/bookbridge.git
cd bookbridge

# Check out the development branch
git checkout ios-testflight-deployment
```

### 2.2 Install Project Dependencies
```bash
# Install Node.js dependencies
npm install

# Install iOS dependencies
cd ios/App
pod install
cd ../..

# Install Capacitor CLI globally (optional but recommended)
npm install -g @capacitor/cli
```

## 🔐 Step 3: Configure Environment Variables

### 3.1 Create Environment File
```bash
# Copy the example environment file
cp .env.example .env.local
```

### 3.2 Add Your API Keys
Edit `.env.local` and add your API keys:
```
# Database
DATABASE_URL=postgresql://user:password@host:port/database
DIRECT_URL=postgresql://user:password@host:port/database

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# Pinecone Vector Database
PINECONE_API_KEY=...
PINECONE_INDEX=bookbridge-books

# Google Books API
GOOGLE_BOOKS_API_KEY=...

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001

# Email
EMAIL_FROM=...
EMAIL_SERVER=smtp://...

# Other Services
KNOWLEDGE_GRAPH_API_URL=...
```

## 🏗️ Step 4: Build and Run

### 4.1 Run Development Server
```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:3001
```

### 4.2 Build for Production
```bash
# Create production build
npm run build

# Sync with Capacitor for mobile
npx cap sync
```

### 4.3 iOS Development
```bash
# Sync iOS project
npx cap sync ios

# Open in Xcode
npx cap open ios
# Or manually open: ios/App/App.xcworkspace
```

### 4.4 Android Development
```bash
# Sync Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

## 📱 Step 5: iOS Code Signing Setup (For TestFlight)

### 5.1 Install Certificates
1. Get the `.p12` certificate file from secure storage
2. Double-click to install in Keychain Access
3. Ensure it appears in "My Certificates" tab in **login** keychain

### 5.2 Install Provisioning Profiles
1. Download provisioning profiles from Apple Developer Portal
2. Double-click to install
3. Verify in Xcode under Signing & Capabilities

### 5.3 Configure Xcode
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the project in navigator
3. Under "Signing & Capabilities":
   - Team: Select your Apple Developer team
   - Bundle Identifier: `com.bookbridge.app`
   - Provisioning Profile: Select "BookBridge TestFlight 2025"

## 🧪 Step 6: Verify Everything Works

### 6.1 Test Web Build
```bash
# Run development server
npm run dev

# Visit http://localhost:3001
# Test core features:
# - User authentication
# - Book library
# - Reading interface
# - Audio playback
```

### 6.2 Test iOS Build
1. In Xcode, select a simulator or device
2. Click "Run" (▶️) button
3. Verify app launches and connects to server

### 6.3 Test Production Build
```bash
# Build for production
npm run build

# Test production server
npm run start
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. "Module not found" errors
```bash
# Clear node modules and reinstall
rm -rf node_modules
rm -rf .next
npm install
```

#### 2. iOS build fails
```bash
# Clean and rebuild
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..
npx cap sync ios
```

#### 3. Missing environment variables
- Check `.env.local` has all required variables
- Restart development server after changes

#### 4. Database connection issues
- Verify DATABASE_URL is correct
- Run database migrations: `npx prisma migrate dev`

#### 5. Xcode signing errors
- Ensure certificates are in login keychain (not System)
- Provisioning profile must match certificate
- See CAPACITOR_COMPLETION_STATUS.md for detailed certificate fix

## 📝 Additional Scripts

### Quick Setup Script
Save this as `setup.sh` in project root:
```bash
#!/bin/bash
echo "🚀 Setting up BookBridge development environment..."

# Install dependencies
npm install

# iOS setup
cd ios/App && pod install && cd ../..

# Android setup (optional)
cd android && ./gradlew build && cd ..

# Create env file if it doesn't exist
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "⚠️  Created .env.local - please add your API keys!"
fi

echo "✅ Setup complete! Run 'npm run dev' to start development server"
```

Make it executable: `chmod +x setup.sh`

## 🚨 Important Security Notes

1. **Never commit** `.env.local` or any file with API keys
2. **Store certificates** securely (use password manager)
3. **Keep API keys** in a secure location for easy setup
4. **Use different API keys** for development vs production

## 📚 Project Documentation

- `README.md` - Project overview
- `CAPACITOR_COMPLETION_STATUS.md` - iOS/Android implementation details
- `docs/` - Additional documentation
- `CLAUDE.md` - AI assistant context (if exists)

## 🆘 Need Help?

1. Check existing documentation in `/docs`
2. Review GitHub issues for similar problems
3. Check the TestFlight deployment guide for iOS issues

---

Last updated: 2025-09-06