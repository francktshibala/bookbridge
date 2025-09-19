import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookbridge.app',
  appName: 'BookBridge ESL',
  webDir: 'out', // Will use static export for production
  server: {
    androidScheme: 'https',
    // For development: point to local server
    url: 'http://10.0.2.2:3000',
    cleartext: true,
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
