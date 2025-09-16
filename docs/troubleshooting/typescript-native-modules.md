# TypeScript Compilation Issues with Native Modules

## Problem
TypeScript compilation fails when importing native mobile modules (e.g., Capacitor plugins) because TypeScript tries to resolve modules during compilation before webpack aliases are applied.

## Root Cause
TypeScript static analysis runs before webpack bundling, causing "Can't resolve module" errors for iOS/Android-specific packages that shouldn't be available in server builds.

## Solution: eval('require') Pattern
Use dynamic require with eval to bypass TypeScript's static analysis:

```typescript
// lib/ios-subscription.ts
let Subscriptions: any;
try {
  Subscriptions = eval('require')('@squareetlabs/capacitor-subscriptions').Subscriptions;
} catch (error) {
  // Fallback stub for server builds
  Subscriptions = {
    async getProductDetails() {
      return { responseCode: -1, responseMessage: 'Not available', data: null };
    }
  };
}
```

## Alternative Approaches (Less Effective)
- Webpack aliases: Applied too late in build process
- Dynamic imports: Still subject to TypeScript analysis
- Conditional imports: TypeScript still tries to resolve

## When to Use
- Native mobile plugins (Capacitor/Cordova)
- Platform-specific libraries
- Node.js-only modules in universal builds

Implemented: December 2024
Issue: Render deployment failures with iOS IAP integration