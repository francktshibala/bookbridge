## BookBridge Android Internal Testing Runbook (In-Progress)

Date: 2025-09-02

### Goal
Get a working internal testing build on Google Play that loads the production site and does not reference localhost/10.0.2.2.

### What We Changed Today
- Fixed web build failures (Capacitor stubs + ambient types) and documented in `docs/implementation/CAPACITOR_BUILD_FIX.md`.
- Set production Capacitor config to use the live domain:
  - `capacitor.config.production.ts` → `server.url = 'https://bookbridge.onrender.com'`, `cleartext=false`, `androidScheme='https'`.
- Verified local web build succeeds.
- Built Android release bundles with incremented version codes and uploaded to Play Console Internal Testing.

### Commands We Used
Dev server for local emulator (not for Play/internal testing):
```
npm run dev -- -H 0.0.0.0 -p 3000
```

Switch to production Capacitor config and sync native:
```
npm run cap:production
```

Build Android release bundle (requires JDK 21):
```
cd android
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home)
export PATH=$JAVA_HOME/bin:$PATH
./gradlew clean bundleRelease
```

Output to upload:
```
android/app/build/outputs/bundle/release/app-release.aab
```

Versioning (Play requires monotonic versionCode):
- In Android Studio: Project Structure → Modules → app → Default Config → set `Version Code` (integer) and `Version Name` (e.g., 2.0).
- Rebuild with `./gradlew clean bundleRelease` when you bump the version.

### Observed Results
- Earlier tester build showed: `https://localhost/server/app/page.html` → indicates a dev/old config.
- After switching to production config and rebuilding, local bundle built successfully.
- Latest tester screenshot shows `http://10.0.2.2:3000` timeout. This also indicates a dev-targeted build (emulator loopback) rather than the production `https://bookbridge.onrender.com` URL being baked into the app.

### Likely Causes
1) Device still had an older dev build installed (with `localhost` or `10.0.2.2`) and did not fully update.
2) Play Console release served a prior bundle (lower `versionCode`), or testers installed a previous version.
3) Production sync step wasn’t applied before the specific bundle (i.e., `npm run cap:production` not run immediately before building the uploaded AAB).

### Verification Checklist (Tomorrow)
1) Confirm production config baked into native assets:
   - Inspect `android/app/src/main/assets/capacitor.config.json` in the built project; it should contain `"url":"https://bookbridge.onrender.com"`.
2) Uninstall any existing app on device/emulator, then install the new version:
   - `adb uninstall com.bookbridge.app` (for local/emulator testing).
3) Ensure a new higher `versionCode` (e.g., increment +1) before each new upload.
4) Rebuild after switching to production:
   - `npm run cap:production`
   - `cd android && ./gradlew clean bundleRelease`
5) Upload the new AAB and start Internal Testing rollout.
6) Ask testers to update/reinstall the app.

### Internal Testing Flow (Production URL Mode)
1) Prepare config:
   - `capacitor.config.production.ts` must include:
     - `server.url: 'https://bookbridge.onrender.com'`
     - `cleartext: false`, `androidScheme: 'https'`.
2) Switch and sync:
   - `npm run cap:production` (copies production config and runs `npx cap sync`).
3) Bump version code (Android Studio → Project Structure → Modules → app → Default Config).
4) Build bundle:
   - `cd android && ./gradlew clean bundleRelease` (with JDK 21).
5) Upload:
   - `android/app/build/outputs/bundle/release/app-release.aab` to Play Console → Internal testing → Create new release.
6) Roll out to testers and verify.

### Notes
- The emulator loopback addresses (`localhost`, `10.0.2.2`) are only for local dev; they must never appear in Play builds.
- If you see a localhost/10.0.2.2 URL on a tester device, it’s almost always an old build or a dev bundle. Reinstall with the latest version (higher `versionCode`).

### Next Actions (Planned)
- Rebuild with `cap:production` immediately before the Gradle bundle, bump `versionCode`, and re-upload.
- Have testers uninstall and reinstall; verify initial WebView URL points to `https://bookbridge.onrender.com`.


