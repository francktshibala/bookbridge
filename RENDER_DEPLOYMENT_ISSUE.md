# Render Deployment Issue - Complete Problem Description

## Background Context
BookBridge ESL is a Next.js application with iOS In-App Purchase (IAP) functionality that has been successfully submitted to Apple App Store. The app works perfectly in development and iOS native environments, but Render deployments are failing during the build process.

## Problem Summary
Render deployments fail with webpack module resolution errors, specifically:
1. `Can't resolve '@squareetlabs/capacitor-subscriptions'`
2. `Can't resolve 'jsonwebtoken'`

## Recent Failed Deployment
**Latest commit**: `2dc7701` - "fix: add Capacitor subscriptions stub for Render deployment"
**Build command**: `ENABLE_PWA=true npm run build`
**Status**: Failed with "Exited with status 1 while building your code"

## Technical Details

### Architecture
- **Framework**: Next.js 15.4.4 with App Router
- **Mobile**: Capacitor 7.4.3 for iOS native functionality
- **Deployment**: Render web service
- **Database**: PostgreSQL via Supabase
- **IAP**: @squareetlabs/capacitor-subscriptions for iOS purchases

### Current Configuration

#### Environment Variables (Render)
```bash
NODE_ENV=production
ENABLE_PWA=true
CAPACITOR_STUBS=true  # Should enable Capacitor stubs for server builds
```

#### Package.json Dependencies
Both problematic packages are properly listed:
```json
{
  "dependencies": {
    "@squareetlabs/capacitor-subscriptions": "^1.0.19",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.10"
  }
}
```

#### Next.js Configuration (next.config.js)
Webpack aliases configured for Capacitor stubs when `CAPACITOR_STUBS=true`:
```javascript
webpack: (config) => {
  if (useCapacitorStubs) {
    config.resolve.alias = {
      '@capacitor/core': path.resolve(__dirname, 'stubs/capacitor/core.ts'),
      '@capacitor/app': path.resolve(__dirname, 'stubs/capacitor/app.ts'),
      // ... other Capacitor packages
      '@squareetlabs/capacitor-subscriptions': path.resolve(__dirname, 'stubs/capacitor/subscriptions.ts'),
    };
  }
}
```

#### Stub Implementation
Created `stubs/capacitor/subscriptions.ts` with proper TypeScript interface matching the real package:
```typescript
export const Subscriptions = {
  async getProductDetails(options: { productIdentifier: string }) {
    return { responseCode: -1, responseMessage: 'Not available in web environment', data: null };
  },
  // ... other methods
};
```

### File Structure
```
bookbridge/
├── lib/ios-subscription.ts          # Uses @squareetlabs/capacitor-subscriptions
├── lib/apple-server-api.ts          # Uses jsonwebtoken
├── app/test-iap/page.tsx           # Imports ios-subscription.ts
├── app/api/apple/link/route.ts     # Imports apple-server-api.ts
├── stubs/capacitor/
│   ├── subscriptions.ts            # Stub for @squareetlabs/capacitor-subscriptions
│   └── [other-stubs].ts
├── next.config.js                  # Webpack aliases configuration
└── package.json                    # Dependencies properly listed
```

### Build Process Analysis

#### What Should Happen
1. Render sets `CAPACITOR_STUBS=true` environment variable
2. Next.js webpack config detects this and enables aliases
3. `@squareetlabs/capacitor-subscriptions` resolves to local stub
4. `jsonwebtoken` resolves from node_modules (already installed)
5. Build completes successfully

#### What's Actually Happening
1. Build starts with correct environment variables
2. Prisma generates successfully
3. Next.js compilation begins with PWA enabled
4. Webpack fails to resolve both packages despite configuration

### Previous Attempted Solutions

#### Solution 1: Direct Package Installation
```bash
npm install @squareetlabs/capacitor-subscriptions jsonwebtoken
```
**Result**: Packages already installed, no change

#### Solution 2: Capacitor Stub Creation
- Created stub implementation for subscriptions package
- Added webpack alias in next.config.js
- Verified environment variable `CAPACITOR_STUBS=true`
**Result**: Still failing

#### Solution 3: Repository Cleanup
- Removed large iOS build files causing deployment size issues
- Added `ios/build/` to .gitignore
**Result**: Build size fixed, but module resolution still failing

### Key Questions for Investigation

1. **Environment Variable Propagation**: Is `CAPACITOR_STUBS=true` actually reaching the webpack configuration during Render builds?

2. **Webpack Alias Execution**: Are the webpack aliases being applied? The console should show "🔧 Capacitor stubs alias ENABLED" if working.

3. **Module Resolution Order**: Could webpack be trying to resolve modules before applying aliases?

4. **Build Context**: Are there differences between local builds and Render's build environment that affect module resolution?

5. **TypeScript Compilation**: Could TypeScript be checking imports before webpack aliases are applied?

### Debugging Steps Needed

1. **Verify Environment Variables**: Add console logging to confirm `CAPACITOR_STUBS` value during build
2. **Verify Webpack Config**: Add logging to confirm aliases are being applied
3. **Module Resolution**: Check if stub files exist and are accessible during build
4. **Build Order**: Investigate if TypeScript compilation happens before webpack aliasing

### Expected Solution Approach

The solution likely involves one of these areas:
- **Environment Configuration**: Ensuring `CAPACITOR_STUBS=true` properly propagates
- **Build Order**: Adjusting when aliases are applied vs when modules are resolved
- **Alternative Stubbing**: Using different approaches like conditional imports or build-time replacement
- **Render-Specific Configuration**: Render-specific build settings or limitations

### Test Commands for Local Debugging
```bash
# Test local build with same environment
CAPACITOR_STUBS=true ENABLE_PWA=true npm run build

# Verify stub resolution
node -e "console.log(require.resolve('./stubs/capacitor/subscriptions.ts'))"

# Check environment propagation
NODE_ENV=production CAPACITOR_STUBS=true ENABLE_PWA=true npm run build
```

### Success Criteria
- Render deployment completes without module resolution errors
- Application functions correctly in production environment
- iOS IAP functionality remains intact for native app builds
- No impact on existing development workflow

---

**Priority**: High - Blocking production deployment
**Impact**: App Store submission complete but production environment unavailable
**Timeline**: Needs immediate resolution for post-submission support