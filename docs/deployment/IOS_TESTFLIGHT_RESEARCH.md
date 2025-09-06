# iOS TestFlight Deployment Research & Implementation Plan

## Overview
This document contains research findings and the implementation plan for deploying BookBridge iOS app to TestFlight for beta testing.

## Current App Status
- **App**: BookBridge ESL - AI-powered reading app with audio features
- **Framework**: Next.js web app wrapped with Capacitor for iOS
- **Bundle ID**: com.bookbridge.app
- **iOS Development**: ✅ App builds and runs successfully in Xcode
- **Testing**: ✅ Tested on iPhone 15 simulator, all features working
- **Signing**: Currently using automatic signing for development
- **Similar Success**: Android version already deployed via internal testing

## Research Status
- [x] Agent 1: App Store Connect & TestFlight Setup
- [x] Agent 2: Technical Requirements & Build Process  
- [x] Agent 3: App Requirements & Review Guidelines

---

## AGENT RESEARCH INSTRUCTIONS

### Agent 1: App Store Connect & TestFlight Setup Research
**Save findings in section: "1. App Store Connect & TestFlight Setup" below**

Research Questions:
1. What are the exact steps to set up an app in App Store Connect for TestFlight?
2. How do you create and configure a TestFlight beta testing group?
3. What information is required when creating the app (bundle ID, SKU, etc.)?
4. How do you invite internal vs external testers? What are the limits?
5. What is the TestFlight review process timeline for external testing?
6. How do you manage TestFlight builds and versions?
7. What analytics and crash reporting are available in TestFlight?

Focus on: Step-by-step process, required information, and common setup mistakes to avoid.

### Agent 2: Technical Requirements & Build Process Research  
**Save findings in section: "2. Technical Requirements & Build Process" below**

Research Questions:
1. What certificates and provisioning profiles are needed for TestFlight?
2. How do you create an iOS Distribution certificate?
3. What is the exact Xcode build and archive process for TestFlight?
4. How do you upload builds to TestFlight (Xcode vs Transporter app)?
5. What build settings must be configured (version numbers, build numbers)?
6. How does code signing work for TestFlight distribution?
7. What are common technical errors and how to resolve them?

Focus on: Technical setup, Xcode configuration, and troubleshooting common build/upload issues.

### Agent 3: App Requirements & Review Guidelines Research
**Save findings in section: "3. App Requirements & Review Guidelines" below**

Research Questions:
1. What app metadata is required for TestFlight (descriptions, keywords, screenshots)?
2. What are Apple's TestFlight review guidelines?
3. What icon sizes and launch screen requirements exist?
4. What privacy policy and terms of service requirements apply?
5. What are common TestFlight rejection reasons and how to avoid them?
6. Are there special requirements for apps using audio, network, or file storage?
7. What export compliance information is needed?

Focus on: Compliance requirements, metadata preparation, and avoiding rejection.

---

## 1. App Store Connect & TestFlight Setup

### Prerequisites and Account Setup

#### Apple Developer Account Requirements
- **Active Apple Developer Program membership** ($99/year)
- **Account roles**: You need Account Holder or Admin role to:
  - Create distribution certificates
  - Manage provisioning profiles
  - Submit apps for review
  - Manage TestFlight testers

#### Certificates and Provisioning Profiles
- **Distribution Certificate**: Required for signing your app
  - Can be created manually or managed automatically by Xcode
  - Only Account Holders and Admins can create these
- **App Store Provisioning Profile**: Links your app to your certificate
  - Contains your distribution certificate
  - Must match your app's Bundle ID
  - Can use Xcode's automatic signing for convenience

### Step-by-Step TestFlight Setup Process

#### Step 1: Prepare Your App in Xcode
1. Select your project in Xcode
2. Set build configuration to "Release"
3. Update version number and build number
4. Select "Any iOS Device" as the build target
5. Choose Product → Archive from the menu

#### Step 2: Upload to App Store Connect
1. In the Xcode Organizer, select your archive
2. Click "Distribute App"
3. Choose "App Store Connect" as distribution method
4. Follow the upload wizard
5. Wait for processing (usually 5-30 minutes)

#### Step 3: Configure TestFlight in App Store Connect
1. Log into App Store Connect
2. Navigate to your app
3. Click the TestFlight tab
4. Add required test information:
   - Beta App Description
   - What to Test notes
   - Feedback email address
   - Beta App Review information (for external testing)

#### Step 4: Create Tester Groups
1. **Internal Testing Groups** (up to 100 testers):
   - For team members with App Store Connect access
   - No review required
   - Immediate availability
   
2. **External Testing Groups** (up to 10,000 testers):
   - For users outside your organization
   - Requires Beta App Review (first build only)
   - Can use email invitations or public links

#### Step 5: Distribute Builds to Testers
1. Assign builds to specific groups
2. Choose distribution method:
   - **Email invitations**: For specific testers with known emails
   - **Public links**: For broader distribution via marketing channels
3. Set tester criteria if needed (device types, OS versions)

### TestFlight Tester Management

#### Organization Strategies
- **Core functionality testers**: Focus on critical features
- **Edge case hunters**: Tech-savvy users for boundary testing
- **UX/UI specialists**: Design and interface feedback
- **Device diversity team**: Various iOS versions and devices

#### Staged Testing Approach
1. Start with internal team testing
2. Expand to trusted external testers
3. Gradually increase tester pool
4. Use different groups for different features

#### Clear Test Instructions
- Write detailed "What to Test" notes
- Highlight new features and changes
- Specify areas needing feedback
- Include known issues to avoid duplicate reports

#### Feedback Management
- Monitor TestFlight Feedback section regularly
- Respond to critical issues promptly
- Track common themes in feedback
- Use crash reports and analytics data

### Requirements and Limitations

#### Technical Requirements
- Builds expire after 90 days
- Testers can install on up to 30 devices
- Maximum 100 builds can be shared
- Builds must include valid provisioning profiles

#### Review Process
- First external build requires Beta App Review
- Subsequent builds usually process faster
- Follow App Review Guidelines
- Review typically takes 24-48 hours

#### Tester Limits
- Internal: 100 testers (App Store Connect users)
- External: 10,000 testers
- Public links can be disabled when limit reached

### Best Practices

1. **Start Small**: Begin with internal testing before external
2. **Clear Communication**: Provide detailed test notes and feedback instructions
3. **Regular Updates**: Keep testers engaged with frequent builds
4. **Monitor Analytics**: Track crashes, sessions, and tester engagement
5. **Staged Rollout**: Use groups to control distribution
6. **Feedback Loop**: Respond to tester feedback promptly
7. **Version Control**: Use meaningful version and build numbers
8. **Documentation**: Keep release notes updated

### Common Pitfalls to Avoid

- Don't skip internal testing phase
- Avoid vague test instructions
- Don't ignore tester feedback
- Remember to disable public links when testing is complete
- Don't forget to expire old builds
- Avoid testing with production data

## 2. Technical Requirements & Build Process
This section covers what you need to successfully build, sign, archive, and upload an iOS build to TestFlight via App Store Connect, plus the most common errors and how to fix them.

### 2.1 Prerequisites
- **Apple Developer Program**: Active membership. Role should be Account Holder, Admin, or App Manager for uploads.
- **Bundle Identifier**: One unique `com.yourcompany.yourapp` App ID created in Apple Developer (Certificates, Identifiers & Profiles) with all required capabilities enabled (Push, Background Modes, Keychain Sharing, Sign in with Apple, etc.).
- **Consistent identifiers**: The Xcode project `PRODUCT_BUNDLE_IDENTIFIER` must match the App Store Connect app record’s primary bundle ID.
- **Current Xcode**: Use the current stable Xcode matching App Store Connect’s accepted SDK/toolchain. Keep CLI tools matched to this Xcode.
- **Mac keychain access**: You can create a Certificate Signing Request (CSR) and install certificates/profiles.

### 2.2 Certificates & Provisioning Profiles
TestFlight uses the same distribution signing as App Store distribution.

- **Certificate type**: Apple Distribution certificate (aka iOS Distribution). Limit: 2 active per team. Create via Apple Developer → Certificates → iOS, tvOS, watchOS → Apple Distribution.
  1) Generate a CSR in Keychain Access (Keychain Access → Certificate Assistant → Request a Certificate…).
  2) Upload CSR, download `.cer`, double-click to install in login keychain.
- **Provisioning profile**: App Store provisioning profile tied to the App ID and Apple Distribution certificate. Create via Profiles → iOS App Store → select App ID → select the distribution certificate → download and install. If using Xcode “Automatically manage signing,” Xcode will create/manage this for you.
- **Automatic signing (recommended)**: In Xcode target → Signing & Capabilities, check “Automatically manage signing” and select your Team. Ensure the Release configuration uses the Apple Distribution signing identity and the App Store profile.

### 2.3 Code Signing & Entitlements
- **Release configuration** must sign with Apple Distribution and an App Store profile.
- **Capabilities ↔ entitlements** must match. If you enable Push, Background Audio/Fetch, Sign in with Apple, App Groups, or Keychain Sharing in the Apple portal, ensure the same capabilities are added in Xcode (which writes to the app’s `.entitlements`). Mismatches commonly cause upload rejections (Invalid Entitlements or Invalid Provisioning Profile).

### 2.4 Versioning & Build Numbers
- **Marketing version**: `CFBundleShortVersionString` (e.g., 1.2.0). This changes when you ship a new version to users.
- **Build number**: `CFBundleVersion` (e.g., 123). This must be strictly incremented for every new upload to the same version. If App Store Connect has a higher build already, bump the build number before archiving.

### 2.5 Build Settings (Release)
- Build Active Architecture Only: No (Release)
- Swift version/toolchain: Use the version supported by current App Store Connect requirements.
- Bitcode: No/disabled (Apple no longer requires App Store bitcode; keep defaults for your Xcode).
- Strip Swift Symbols: Yes (Xcode’s default export handles SwiftSupport as needed).
- Info.plist: Include required `NS*UsageDescription` keys for any privacy-sensitive APIs you use (Camera, Microphone, Photo Library, Bluetooth, etc.). Missing keys will be rejected.

### 2.6 Archive & Upload (Xcode UI)
1) Open the iOS workspace (for Capacitor/CocoaPods: open the `.xcworkspace`).
2) Set scheme to the app target and configuration to Release. Select destination “Any iOS Device (arm64)” / generic iOS Device.
3) Product → Archive. When the Organizer opens with the archive:
   - Validate (optional but good) → Distribute App → App Store Connect → Upload.
   - Ensure correct signing is displayed. Complete the upload.
4) After processing (a few minutes), the build appears in App Store Connect → TestFlight. Assign to internal testers immediately; external testers require Beta App Review.

### 2.7 Archive & Upload (CLI)
For CI or scripted builds, you can use `xcodebuild` and then upload with Xcode/Transporter:

Example commands (adjust paths/names):

```
xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/App.xcarchive \
  clean archive

xcodebuild \
  -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build
```

Minimal `ExportOptions.plist` (App Store/TestFlight):

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
</dict>
</plist>
```

Upload the resulting `.ipa` using:
- Xcode Organizer → Distribute → App Store Connect → Upload, or
- Apple’s Transporter app (drag-and-drop the `.ipa`).

### 2.8 Capacitor-specific Notes (this project)
- Run web build and sync native iOS before archiving: `npm run build` (or your prod build) → `npx cap sync ios`.
- Open `ios/App/App.xcworkspace` in Xcode. Ensure `Info.plist` contains usage descriptions for any plugins you use (e.g., microphone for TTS/recording, photo library if accessed).
- Ensure background modes match app needs (e.g., Audio for background playback) in both the Apple portal and Xcode capabilities.

### 2.9 Common Upload Errors & Fixes
- **ITMS-90161: Invalid Provisioning Profile**: You archived with a Development/Ad Hoc profile or profile not matching the App ID/capabilities. Re-archive with App Store profile and Apple Distribution certificate.
- **ITMS-90035: Invalid Signature**: Signed with the wrong identity (e.g., iPhone Developer). Ensure Release signs with Apple Distribution and no debug-only frameworks are included.
- **SwiftSupport/ITMS-90426**: Outdated toolchain or missing Swift symbols. Use current Xcode and export via Xcode/standard export to include SwiftSupport.
- **Missing Info.plist privacy keys (ITMS-90713 and related)**: Add `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, etc., for any APIs you touch (even indirectly via SDKs).
- **Privacy Manifest issues**: As Apple enforces privacy manifests for SDKs, update third-party SDKs to versions that include manifests, and add an app privacy manifest if you use required APIs. Remove disallowed API usage or declare allowed reasons where applicable.
- **Encryption/export compliance**: If the app uses or links to encryption (most apps do), answer the export compliance questions in App Store Connect. Most apps qualify for exemptions; provide required info.
- **Version/build conflicts**: If build processing fails with version/build errors, increment `CFBundleVersion`. Don’t reuse a previously uploaded build number.
- **Invalid entitlements**: Ensure the provisioning profile was generated after enabling capabilities and that Xcode’s entitlements file includes the same capabilities.

### 2.10 Quick Build-to-TestFlight Checklist
- Apple Distribution certificate installed and valid; App Store profile matches App ID and capabilities.
- Xcode target uses Automatic signing (Team set) for Release; bundle ID matches App Store Connect.
- Version and build updated (build > last uploaded).
- Required `NS*UsageDescription` keys present; background modes/capabilities correct.
- Archive with Release → Upload via Organizer or Transporter; wait for processing; enable for testers.

## 3. App Requirements & Review Guidelines

This section covers compliance requirements, metadata preparation, and strategies for avoiding TestFlight rejection to ensure smooth beta testing deployment.

### 3.1 Required App Metadata for TestFlight

#### Beta App Description (Required for External Testing)
- **Purpose**: Highlights new features and content your beta app offers
- **Requirement**: Required field in App Store Connect for external testers
- **Content**: Should explain what features testers should focus on and provide feedback about
- **Audience**: Must be appropriate for all audiences (4+ age rating)
- **Flexibility**: Can differ from your final App Store description

#### App Screenshots (New 2024 Feature)
- **Auto-inclusion**: As of October 2024, approved screenshots from your App Store listing automatically display in TestFlight invites
- **Opt-out Available**: Can deselect "App Information" checkbox if you prefer not to show screenshots
- **Requirements**: Must adhere to 4+ age rating even if your app targets higher age groups
- **Source**: Screenshots pulled from latest approved App Store version in "Ready for Distribution" state

#### Feedback Email (Required)
- **Location**: TestFlight settings in App Store Connect
- **Purpose**: Where testers can send feedback through the TestFlight app
- **Accessibility**: Should be monitored regularly during beta testing period

### 3.2 App Icon Requirements

#### Essential Icon Sizes for iOS
- **iPhone App Icon**: 180x180px (for iPhone 6 and later)
- **iPhone Smaller Devices**: 120x120px (iPhone 5s and earlier)
- **App Store Icon**: 1024x1024px (PNG format, required for TestFlight submission)
- **Spotlight Search**: 120x120px (iPhone 6+), 80x80px (smaller iPhones)
- **Settings**: 87x87px (iPhone 6+), 58x58px (smaller iPhones)

#### TestFlight-Specific Icon Requirements
- **Mandatory**: 1024x1024px App Store Icon in Asset Catalog is required for TestFlight submission
- **Format**: PNG format without transparency
- **Setup**: Added through Xcode Asset Catalog under App Icon section
- **Visibility**: Icon appears in App Store Connect only after first approved build

### 3.3 Launch Screen Requirements

#### Modern Approach (Recommended)
- **Storyboard-based**: Use launch storyboards instead of static images (iOS 7+)
- **Adaptability**: Better support for various screen sizes and orientations
- **Future-proof**: Handles new device sizes automatically

#### Legacy Static Images (If Required)
- **iPhone Standard**: 320x480px (Default.png)
- **iPhone Retina**: 640x960px (Default@2x.png)
- **iPhone 5/5s**: 640x1136px (Default-568h@2x.png)
- **iPhone 6**: 750x1334px portrait, 1334x750px landscape
- **iPhone 6 Plus**: 1242x2208px portrait, 2208x1242px landscape

### 3.4 Privacy Policy Requirements

#### Mandatory Privacy Information
- **App Store Connect**: Privacy policy link required in metadata field
- **In-App Access**: Privacy policy must be easily accessible within the app
- **Content Requirements**: Must clearly identify what data is collected, how it's collected, and all uses

#### Audio/Microphone-Specific Requirements (Relevant for BookBridge)
- **Info.plist Key**: `NSMicrophoneUsageDescription` required if app or frameworks contain microphone access code
- **User Explanation**: Clear description of how microphone data will be used
- **Framework Impact**: Required even if microphone access is in unused framework code (e.g., audio processing libraries)
- **User Experience**: Permission prompt only appears when microphone is actually accessed

#### 2024 Privacy Manifest Requirements
- **Enforcement Date**: May 1, 2024 - new apps without proper privacy manifests rejected
- **File Type**: `.plist` file documenting data collection and API usage
- **Required Reasons API**: Must justify usage of privacy-sensitive APIs
- **Third-party SDKs**: Document data collection by all included frameworks

### 3.5 Export Compliance Requirements

#### Encryption Declaration
- **Most Apps**: Add `ITSAppUsesNonExemptEncryption` key set to `false` in Info.plist
- **Standard Encryption**: HTTPS, standard iOS encryption typically qualify for exemption
- **App Store Connect**: Answer export compliance questions during submission
- **Documentation**: Provide encryption details if using custom/non-standard encryption

### 3.6 Apple Review Guidelines Compliance

#### Core Requirements
- **Intended for Distribution**: Beta apps must be intended for eventual public release
- **Functionality**: App must function properly - non-working apps are "not ready for distribution"
- **External Testers**: First build requires App Review approval for external testing groups
- **Review Scope**: Only first build of each version requires full review; subsequent builds may skip review

#### Age Restrictions
- **TestFlight Minimum**: Users must be 13+ (or equivalent minimum age in jurisdiction)
- **Parental Consent**: Users 13-17 should have parental review of TestFlight terms

### 3.7 Common TestFlight Rejection Reasons & Prevention

#### Technical Failures (Most Common)
- **App Crashes on Launch**: Most frequent rejection reason
- **Prevention**: Thorough testing on multiple devices and iOS versions before submission
- **Testing Scope**: Test all primary user flows and edge cases

#### Metadata Issues
- **Missing Privacy Keys**: Failure to include required `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, etc.
- **Prevention**: Audit all frameworks and APIs for privacy-sensitive access
- **UI/UX Problems**: Complex or confusing interfaces (6% of rejections under Guideline 10.6)

#### Content Policy Violations
- **Beta/Demo Language**: Using "beta," "test," or "demo" in production builds
- **Prevention**: Use proper versioning and remove development terminology
- **Age Rating Mismatch**: Metadata not appropriate for declared age rating

#### Purchase/Functionality Issues
- **In-App Purchases**: Products may work in TestFlight but fail App Store review if not properly submitted
- **Prevention**: Submit all in-app purchases with the app for review
- **Missing Features**: Core functionality not working or accessible

### 3.8 BookBridge-Specific Considerations

#### Audio Features Compliance
- **Microphone Usage**: Include `NSMicrophoneUsageDescription` for TTS/audio recording features
- **Background Audio**: Ensure background modes are properly configured for audio playback
- **Privacy Disclosure**: Clearly explain audio data usage in privacy policy

#### File Storage Compliance  
- **Document Storage**: If storing user files, document data retention and access policies
- **iCloud Integration**: Properly configure entitlements if using iCloud document storage
- **Local Storage**: Explain local data storage practices in privacy policy

#### Network Features
- **API Access**: Document server communication and data transmission
- **Offline Functionality**: Ensure app functions appropriately without network access
- **Content Policies**: Ensure AI-generated content complies with Apple's content guidelines

### 3.9 Pre-Submission Checklist for Avoiding Rejection

#### Technical Verification
- [ ] App launches successfully on multiple iOS devices and versions
- [ ] All primary user flows function without crashes
- [ ] Required privacy usage descriptions included in Info.plist
- [ ] Export compliance information configured (ITSAppUsesNonExemptEncryption)
- [ ] App Store icon (1024x1024) included in Asset Catalog

#### Metadata Compliance
- [ ] Privacy policy accessible within app and in App Store Connect
- [ ] Beta app description written for external testers
- [ ] Screenshots appropriate for 4+ age rating
- [ ] Feedback email configured and monitored
- [ ] No "beta," "test," or "demo" language in production builds

#### Legal & Policy Compliance
- [ ] Privacy manifest file included (required as of May 2024)
- [ ] All data collection practices documented and justified
- [ ] In-app purchases submitted with app (if applicable)
- [ ] Content appropriate for intended age rating
- [ ] Terms of service accessible within app (if applicable)

## 4. Implementation Plan

### Phase 1: Pre-Implementation Safety & Preparation ⚠️
**Goal**: Secure current working state before making changes

#### Step 1.1: Create Safety Branch
```bash
# Create and push a backup branch of current working state
git checkout -b ios-testflight-backup
git push origin ios-testflight-backup

# Return to main and create working branch
git checkout main
git checkout -b ios-testflight-deployment
```

#### Step 1.2: Verify Current State
- [ ] Confirm iOS app builds and runs in simulator
- [ ] Verify production URL connection works
- [ ] Test core functionality (reading, audio, navigation)
- [ ] Document current version numbers

#### Step 1.3: Apple Developer Account Verification
- [ ] Confirm Apple Developer Program active ($99/year)
- [ ] Verify account role (Account Holder or Admin)
- [ ] Access App Store Connect dashboard

### Phase 2: App Store Connect Setup (No Code Changes)
**Goal**: Set up TestFlight without touching the app code

#### Step 2.1: Create App Record in App Store Connect
- [ ] Log into App Store Connect
- [ ] Create new app with Bundle ID: `com.bookbridge.app`
- [ ] Set app name: "BookBridge ESL"
- [ ] Choose primary language and region
- [ ] Set age rating to appropriate level

#### Step 2.2: Configure Basic App Information
- [ ] Add app description (can be basic for now)
- [ ] Set category: Education or Productivity
- [ ] Configure privacy policy (if required)

**🔒 SAFETY CHECKPOINT**: No code changes yet - app still works perfectly

### Phase 3: App Icon & Metadata Preparation
**Goal**: Prepare required assets without breaking functionality

#### Step 3.1: Create App Store Icon (1024x1024px)
- [ ] Design or source 1024x1024px PNG icon
- [ ] Verify no transparency
- [ ] Add to Xcode Asset Catalog under App Icon

#### Step 3.2: Add Required Privacy Descriptions
- [ ] Add `NSMicrophoneUsageDescription` to Info.plist
- [ ] Add any other required usage descriptions
- [ ] Test app still functions after Info.plist changes

**🔒 SAFETY CHECKPOINT**: Test build in simulator - verify no regressions

### Phase 4: Certificate & Signing Setup
**Goal**: Configure distribution signing for TestFlight

#### Step 4.1: Distribution Certificate (if needed)
- [ ] Check existing certificates in Apple Developer
- [ ] Create Apple Distribution certificate if none exists
- [ ] Install certificate in Keychain

#### Step 4.2: App Store Provisioning Profile
- [ ] Create App Store provisioning profile for `com.bookbridge.app`
- [ ] Download and install profile
- [ ] Or enable "Automatically manage signing" in Xcode

#### Step 4.3: Update Xcode Signing Settings
- [ ] Set Release configuration to use Apple Distribution
- [ ] Verify Bundle ID matches App Store Connect
- [ ] Update version and build numbers

**⚠️ FIRST BUILD CHECKPOINT**: 
```bash
# Before first archive attempt:
npm run build
npx cap sync ios
```
**Test in Xcode simulator first - ensure no issues**

### Phase 5: First TestFlight Archive & Upload
**Goal**: Successfully upload first build

#### Step 5.1: Archive Preparation
- [ ] Clean build folder in Xcode (Cmd+Shift+K)
- [ ] Select "Any iOS Device" target
- [ ] Choose Release configuration
- [ ] Product → Archive

#### Step 5.2: Upload to TestFlight
- [ ] In Organizer, select archive
- [ ] Distribute App → App Store Connect
- [ ] Follow upload wizard
- [ ] Wait for processing (5-30 minutes)

#### Step 5.3: TestFlight Configuration
- [ ] Add Beta App Description in App Store Connect
- [ ] Set feedback email
- [ ] Add "What to Test" notes

**🎯 SUCCESS CHECKPOINT**: First build uploaded successfully

### Phase 6: Internal Testing Setup
**Goal**: Enable internal team testing

#### Step 6.1: Create Internal Testing Group
- [ ] Add internal testers (team members)
- [ ] Assign first build to group
- [ ] Send test invitations

#### Step 6.2: Verify Internal Testing
- [ ] Install TestFlight on test device
- [ ] Download and test app
- [ ] Verify all functionality works
- [ ] Confirm no regressions from production

**✅ COMMIT & PUSH POINT**: When internal testing successful
```bash
git add .
git commit -m "feat(ios): add TestFlight deployment support

- Add 1024x1024 App Store icon to Asset Catalog
- Add required privacy usage descriptions to Info.plist
- Configure distribution signing for TestFlight
- Successfully upload first build to TestFlight
- Internal testing confirmed working

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin ios-testflight-deployment
```

### Phase 7: External Testing (Optional)
**Goal**: Enable broader beta testing

#### Step 7.1: Beta App Review Preparation
- [ ] Complete all required metadata
- [ ] Submit first build for Beta App Review
- [ ] Wait for approval (24-48 hours)

#### Step 7.2: External Tester Groups
- [ ] Create external testing groups
- [ ] Add testers via email or public link
- [ ] Monitor feedback and crashes

### Phase 8: Merge to Main (Final Step)
**Goal**: Safely integrate changes to main branch

#### Step 8.1: Final Verification
- [ ] Confirm TestFlight working perfectly
- [ ] No issues reported by testers
- [ ] App functionality identical to before

#### Step 8.2: Merge Process
```bash
git checkout main
git merge ios-testflight-deployment
git push origin main
```

### Rollback Plan (If Issues Occur)
If anything goes wrong at any step:
```bash
# Restore from backup branch
git checkout ios-testflight-backup
git checkout -b main-restore
# Copy files from backup if needed
```

## 5. Pre-Deployment Checklist

### Essential Requirements ✅
- [ ] Apple Developer Program active ($99/year)
- [ ] Account role: Account Holder or Admin
- [ ] Xcode installed and up to date
- [ ] App currently builds and runs successfully

### App Store Connect Preparation
- [ ] Bundle ID `com.bookbridge.app` registered
- [ ] App record created in App Store Connect
- [ ] Basic app information completed

### Required Assets
- [ ] 1024x1024px App Store icon (PNG, no transparency)
- [ ] App icon added to Xcode Asset Catalog
- [ ] `NSMicrophoneUsageDescription` added to Info.plist
- [ ] Export compliance configured (ITSAppUsesNonExemptEncryption)

### Signing & Certificates
- [ ] Apple Distribution certificate installed
- [ ] App Store provisioning profile configured
- [ ] Automatic signing enabled in Xcode (recommended)
- [ ] Bundle ID matches App Store Connect

### Safety Measures
- [ ] Backup branch created and pushed
- [ ] Working on separate feature branch
- [ ] Current app functionality verified working
- [ ] Rollback plan understood

### Build Readiness
- [ ] Version and build numbers updated
- [ ] Release configuration selected
- [ ] All privacy descriptions completed
- [ ] App tested in simulator successfully

**Ready to start Phase 1 when all items checked ✅**