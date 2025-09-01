import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookbridge.app',
  appName: 'BookBridge',
  webDir: 'out', // Next.js static export directory
  server: {
    androidScheme: 'https',
    // Remove server URL for production - will use bundled assets
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
};

export default config;