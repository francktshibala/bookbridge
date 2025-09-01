# Capacitor Build & Deployment Research - Agent Research Template

## Research Context
BookBridge needs to implement Capacitor to create native iOS and Android apps from the existing Next.js codebase. Focus on build processes, deployment pipelines, and app store submission requirements.

## Project Background
- **Current stack**: Next.js 15, React, TypeScript, Supabase
- **Deployment**: Currently using Render for web hosting
- **Target**: App store distribution for iOS and Android
- **Timeline**: 2-4 weeks implementation
- **Constraints**: Minimal budget, must maintain current features

*Save your research findings to the file path specified in your section.*

---

# BookBridge — Capacitor Build & Deployment Research (2025)

This document answers the seven research questions and provides concrete, copy-ready steps and CI/CD guidance for integrating Capacitor with our Next.js app, producing iOS/Android builds, and shipping to both app stores while keeping our Render-based web deployment intact.

Last updated: 2025-09-01

## Quick Summary (TL;DR)
- Use Capacitor 6+ with Next.js static export (`output: 'export'`) to bundle web assets into the app for true offline capability. For development, use `server.url` pointing to the dev server for live reload.
- Build pipeline: `next build` → `next export` to `out/` → `npx cap sync` → native builds via Xcode/Gradle.
- CI/CD: GitHub Actions is recommended. Use macOS runners for iOS, Ubuntu for Android. Artifacts: `.ipa` and `.aab`. Code signing with Xcode automatic signing or Fastlane Match (iOS) and Play App Signing with a keystore (Android).
- App store: Apple $99/year, Google Play $25 one-time. Expect 1–3 days typical review. Provide privacy policy, data usage, screenshots, and ATS/Encryption disclosures.
- OTA updates: Allowed for web assets only (no native binary changes). Options: Ionic Appflow Live Updates, Capgo Updater, or our own CDN strategy. Apple guidelines permit updating JS/HTML/CSS content that the app hosts via a web runtime; native changes still require app review.
- Local testing: `npx cap run ios/android`. For live reload use `server.url` with LAN IP during development.

---

## 1) Complete Build Pipeline: Next.js → iOS/Android (Capacitor)

There are two viable architectures:

1. Bundled static web assets (recommended for offline-first)
   - Next.js outputs a fully static site using `output: 'export'`.
   - Capacitor bundles the exported site from `out/` into the native app.
   - Pros: offline capability, predictable builds. Cons: dynamic SSR features must be adapted to SSG/CSR.

2. Remote URL (wrapper) for development or incremental rollout
   - Capacitor points `server.url` to our hosted web app (Render) in development or for staged pilots.
   - Pros: instant updates; minimal packaging. Cons: weaker offline support; Apple guideline 4.2 risks if the app is merely a wrapper with insufficient native value.

Recommended approach: use bundled static for production; use `server.url` only for development/live reload.

### Next.js configuration (static export)
In `next.config.js` set static output and handle images/PWA appropriately:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

module.exports = nextConfig;
```

Notes:
- If we rely on features incompatible with static export (e.g., server actions, SSR-only pages), convert them to SSG/ISR/CSR where possible, or provide an SPA shell for authenticated flows. Supabase client-side APIs fit CSR well.
- For PWA: ensure our existing `public/manifest.json` and `service worker` are compatible with exported paths.

### Capacitor setup
Core dependencies (one-time):

```
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

Initialize `capacitor.config.ts` (key fields):

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookbridge.app',
  appName: 'BookBridge',
  webDir: 'out', // Next.js export output
  bundledWebRuntime: false,
  server: {
    // Dev only (live reload): set url to LAN dev server and cleartext true
    // url: 'http://192.168.1.10:3000',
    // cleartext: true,
  },
};

export default config;
```

### Production build steps (manual/local)
1. Build and export web assets
   - `npm run build` (Next.js)
   - `npm run export` (or `next export` if not aliased) → outputs to `out/`
2. Sync assets to native platforms
   - `npx cap sync`
3. Open native projects to build/archive
   - iOS: `npx cap open ios` → build with Xcode (Archive → Distribute App)
   - Android: `npx cap open android` → build with Android Studio or Gradle (`assembleRelease`/`bundleRelease`)

### Platform-specific considerations
- iOS (WKWebView): Ensure ATS exceptions only for dev; production should use HTTPS. Configure `NSAppTransportSecurity` and `NSAllowsArbitraryLoads` for dev builds only.
- Android: Min SDK ~23+, target latest API. If using local dev server, set `android:usesCleartextTraffic="true"` for dev only via product flavors or debug manifest.
- Deep links/app links: Use Capacitor `App` plugin and platform-specific intent filters/associations.
- Permissions: Declare only required permissions; leverage Capacitor plugins selectively.

---

## 2) Automated Builds with Current Render Deployment

Render hosts our web app but does not provide macOS build runners needed for iOS. Keep Render unchanged for web, and add GitHub Actions for mobile:

- Android builds: Ubuntu runners (fast, inexpensive)
- iOS builds: macOS runners (required by Xcode). Alternatives: GitHub-hosted macOS, Bitrise, Codemagic, Ionic Appflow

### Recommended CI layout (GitHub Actions)

Two workflows triggered on tags (e.g., `mobile-v*`) or `main` with filters.

Android (Ubuntu):
```
jobs.android:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20' }
    - run: npm ci
    - run: npm run build && npm run export
    - run: npx cap sync android
    - name: Set up JDK
      uses: actions/setup-java@v4
      with: { distribution: 'temurin', java-version: '17' }
    - name: Build AAB
      run: cd android && ./gradlew bundleRelease
    - name: Sign (if not using Play App Signing)
      run: |
        # jarsigner or Gradle signingConfig using secrets
    - uses: actions/upload-artifact@v4
      with: { name: app-release.aab, path: android/app/build/outputs/bundle/release/*.aab }
```

iOS (macOS):
```
jobs.ios:
  runs-on: macos-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20' }
    - run: npm ci
    - run: npm run build && npm run export
    - run: npx cap sync ios
    - name: Xcode build & archive
      run: |
        xcodebuild -workspace ios/App/App.xcworkspace \
          -scheme App -configuration Release \
          -archivePath $PWD/build/App.xcarchive archive
        xcodebuild -exportArchive -archivePath $PWD/build/App.xcarchive \
          -exportOptionsPlist ios/exportOptions.plist \
          -exportPath $PWD/build
    - uses: actions/upload-artifact@v4
      with: { name: app-release.ipa, path: build/*.ipa }
```

Release to stores can be automated with Fastlane (`fastlane supply` for Play; `deliver`/`pilot` for App Store Connect), or with official upload actions.

---

## 3) App Store Requirements, Costs, Timelines

Apple App Store
- Account: Apple Developer Program, $99/year
- Deliverable: `.ipa` (via Xcode Organizer or Transporter, or Fastlane)
- Metadata: App name, subtitle, description, keywords, screenshots (6.7"/5.5" iPhone and iPad if universal), preview optional
- Privacy: App Privacy details (data collection types), Privacy Policy URL, ATT if tracking, Export Compliance
- Guidelines to watch: 2.5.6 (encryption), 4.2 (minimum functionality – avoid "webview-only"), 4.0 safety
- Review time: 1–3 days typical; first release may take longer. Expedited review possible with justification

Google Play Store
- Account: One-time $25 registration
- Deliverable: `.aab` (Android App Bundle)
- Metadata: Listing details, screenshots (phone/tablet), content rating, privacy policy
- Data safety: Declare data collection/sharing
- Review time: hours to a couple of days; first app can take longer

Common requirements
- Unique bundle/app IDs, versioning (SemVer aligned), changelogs
- Legal: Licenses for fonts/media, third-party SDK disclosures
- Country availability, pricing (even if free), age rating

---

## 4) Code Signing & Certificates Setup

iOS
- Certificates: Create Apple Distribution certificate in Apple Developer portal
- Identifiers: Register Bundle ID `com.bookbridge.app`
- Provisioning: App Store provisioning profile for the bundle ID
- Xcode: Enable automatic signing per target; or use Fastlane Match to sync certs/profiles via a private repo
- CI: Store signing certs, private keys, and provisioning profiles as encrypted secrets; or prefer Match to manage at scale

Android
- Keystore: Generate upload keystore (`.jks`) with strong password
- Signing configs: Reference keystore in Gradle, but inject secrets via CI env vars
- Play App Signing: Recommended. Upload the first `.aab` signed with the upload key; Play manages the app signing key thereafter

Security best practices
- Never commit keystores or certificates. Use secret storage (GitHub Actions secrets, 1Password, HashiCorp Vault)
- Rotate credentials when team changes occur

---

## 5) OTA / Live Updates for Capacitor

What’s allowed?
- Both Apple and Google allow updating JavaScript/HTML/CSS assets that a web runtime executes, as long as you do not change native code/behavior that should go through review. Native binary changes still require store updates.

Options
1. Ionic Appflow Live Updates (paid)
   - Integrates with Capacitor; secure channel; rollout controls; easy CI integration.
2. Capgo Updater (open-source/commercial tiers)
   - `@capgo/capacitor-updater` can download and swap web bundles with versioning and checksums.
3. Custom CDN + in-app updater
   - Roll your own: app checks a version manifest, downloads zipped web assets, verifies checksum/signature, swaps `webDir` at runtime. Higher effort, full control.

Trade-offs
- Appflow offers the smoothest path but has ongoing cost. Capgo is cost-effective with good DX. Custom is flexible but maintenance-heavy. For BookBridge, Capgo or Appflow are the pragmatic choices.

---

## 6) Local & Real-Device Testing Workflow

Development (live reload)
- Run web: `npm run dev`
- Set `server.url` in `capacitor.config.ts` to your LAN IP (e.g., `http://192.168.1.10:3000`) and `cleartext: true`.
- `npx cap run ios` or `npx cap run android` to launch on simulator/emulator or connected device.

Pre-release testing (bundled assets)
- `npm run build && npm run export`
- `npx cap sync`
- iOS: open in Xcode and run on TestFlight for external testers
- Android: generate `.aab`, upload internal testing track in Play Console

Debugging tips
- Use Safari Web Inspector (iOS) and Chrome DevTools (Android) to inspect the WebView
- Ensure service worker and cache strategies behave correctly in WebView contexts

---

## 7) CI/CD Changes to Support Mobile Builds Alongside Web

Keep Render deployment as-is for web. Add mobile workflows:

- Triggers: Tag or branch filters to control when mobile builds run (`mobile-v*` tags)
- Caching: Node modules cache for faster builds; Gradle caches on Android; DerivedData cache on iOS if stable
- Secrets: Store Apple API keys/App Store Connect key (Issuer ID, Key ID, `.p8`), Android keystore and passwords, and any Fastlane credentials
- Artifacts: Upload `*.aab` and `*.ipa` for QA; optionally auto-upload to TestFlight and Play Internal Testing
- Notifications: Post build status to Slack/Email

Example release flow
1. Merge to `main` → Render deploys web as usual
2. Create Git tag `mobile-vX.Y.Z`
3. GitHub Actions builds Android/iOS, signs, and publishes to internal testing (optional manual approval for production)

---

## Risks & Mitigations
- SSR features incompatible with static export → Convert to CSR/ISR; if unavoidable, consider hybrid: static bundle for core reading UX; open remote URL for admin-only screens.
- Apple rejection for "webview-only" apps → Add native integrations (push notifications, share sheet, file pickers, background audio, deep links). Ensure offline reading to demonstrate native value.
- Certificate/keystore sprawl → Use Fastlane Match or centralized secrets mgmt; document procedures.

## Next Actions for BookBridge
1. Audit Next.js routes for static export compatibility; plan CSR/ISR adaptations
2. Add Capacitor to the repo and create `capacitor.config.ts`
3. Produce a first Android `.aab` locally via Gradle; validate on a physical device
4. Create Apple and Google developer accounts; set up signing
5. Implement CI workflows (Android Ubuntu, iOS macOS) with artifacts
6. Choose OTA path (Capgo vs Appflow), prototype minimal rollout
