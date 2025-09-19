import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookbridge.app',
  appName: 'BookBridge ESL',
  webDir: 'out', // Next.js static export directory
  server: {
    androidScheme: 'https',
    // Use production server for release builds (Render domain)
    url: 'https://bookbridge-mkd7.onrender.com',
    cleartext: false,
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