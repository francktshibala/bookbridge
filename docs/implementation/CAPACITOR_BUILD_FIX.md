## Capacitor Build Fix for Next.js 15 (Render Deployments)

### Summary
- Issue: Production builds on Render failed with "Module not found: Can't resolve '@capacitor/app'" and later TS type errors when Next’s type-checker analyzed Capacitor imports during server build.
- Root cause: Webpack/Next statically analyze dynamic `import('@capacitor/…')` strings in client components; server build environment on Render doesn’t have/shouldn’t require native Capacitor modules. Additionally, the type checker still resolves types even when runtime is stubbed.
- Fix: Introduced local runtime stubs for Capacitor, conditional webpack aliases toggled via `CAPACITOR_STUBS`, and ambient TypeScript declarations for Capacitor modules to satisfy server-side type-checking.

### Changes Implemented
1) Runtime stubs for Capacitor modules
   - Location: `stubs/capacitor/`
   - Files: `core.ts`, `app.ts`, `filesystem.ts`, `preferences.ts`, `network.ts`, `share.ts`
   - Purpose: Provide harmless web fallbacks at runtime during server/client builds where native Capacitor is unavailable.

2) Conditional webpack aliases in Next config
   - File: `next.config.js`
   - Env flag: `CAPACITOR_STUBS=true`
   - Behavior: When enabled, aliases map:
     - `@capacitor/core` → `stubs/capacitor/core.ts`
     - `@capacitor/app` → `stubs/capacitor/app.ts`
     - `@capacitor/filesystem` → `stubs/capacitor/filesystem.ts`
     - `@capacitor/preferences` → `stubs/capacitor/preferences.ts`
     - `@capacitor/network` → `stubs/capacitor/network.ts`
     - `@capacitor/share` → `stubs/capacitor/share.ts`
   - Result: Webpack resolves to local stubs during build on Render; no native dependencies required.

3) Ambient TypeScript declarations (type shims)
   - Files: `types/capacitor-cli.d.ts`, `types/capacitor-stubs.d.ts`
   - Purpose: Satisfy Next’s type checker for Capacitor modules during server builds.
   - Includes minimal typings for:
     - `@capacitor/cli` → `CapacitorConfig`
     - `@capacitor/app` → `App.addListener` overloads (`appUrlOpen`, `appStateChange`, `backButton`), `exitApp`, `removeAllListeners`
     - `@capacitor/core` → `Capacitor`
     - `@capacitor/network` → `Network.getStatus`, `Network.addListener('networkStatusChange', cb)` with `NetworkStatus`
     - `@capacitor/filesystem` → `Filesystem` methods (`writeFile`, `readFile`, `deleteFile`, `readdir`) with `Directory`, `Encoding`, and `ReaddirResult`
     - `@capacitor/preferences` → `Preferences`
     - `@capacitor/share` → `Share`

### How to Deploy on Render
- Set environment variable: `CAPACITOR_STUBS=true`
- Keep your existing PWA setting as desired: `ENABLE_PWA=true|false`
- Build logs should include:
  - `CAPACITOR_STUBS: 'true'`
  - `Capacitor stubs alias ENABLED`

### Local Verification
- Web/PWA build with stubs:
  - `CAPACITOR_STUBS=true ENABLE_PWA=true npm run build`
- Web-only build with stubs disabled (if desired):
  - `CAPACITOR_STUBS=false ENABLE_PWA=false npm run build`

### Mobile (Capacitor Native) Builds
- Do not set `CAPACITOR_STUBS=true` when producing native builds. Use your existing mobile scripts (e.g., `npm run build:mobile`, `npx cap sync`).
- The app will load real Capacitor modules on-device.

### Methodology
1) Reproduced and narrowed the failure from module resolution to type-checking by introducing runtime stubs and observing the subsequent TS errors.
2) Implemented a controlled build-time switch (`CAPACITOR_STUBS`) so web/server builds never require native modules.
3) Added ambient type shims to keep the TypeScript compiler satisfied without altering app logic or native behavior.
4) Verified locally with production builds; then deployed on Render with the env flag to confirm.

### Rationale
- Next.js 15 App Router has stricter SSR/dynamic import rules; server builds still traverse import graphs and type-check. Stubbing + aliasing prevents runtime resolution; ambient types prevent type-check failures.
- Keeps one codebase serving three modes: Web-only, PWA, and Capacitor native.

### Troubleshooting Checklist
- Build fails with `Can't resolve '@capacitor/...':`
  - Ensure `CAPACITOR_STUBS=true` in the environment.
  - Confirm `next.config.js` logs: `Capacitor stubs alias ENABLED`.
- Build fails with TypeScript errors about `@capacitor/...`:
  - Confirm `types/capacitor-stubs.d.ts` and `types/capacitor-cli.d.ts` exist and are included by `tsconfig.json` (the repo includes `**/*.ts` already).
- Runtime issues on device:
  - Make sure `CAPACITOR_STUBS` is NOT set for native builds; run `npx cap sync`.
- WebSocket monitoring warnings in logs:
  - Informational if the ws endpoint isn’t immediately available; optional to suppress or add backoff.

### Notes
- This approach preserves full functionality and avoids invasive code changes.
- If future dependencies behave similarly, replicate this pattern: local stubs + conditional alias + minimal ambient types.


