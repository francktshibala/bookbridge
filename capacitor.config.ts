import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookbridge.app',
  appName: 'BookBridge',
  webDir: 'out', // Will use static export for production
  server: {
    androidScheme: 'https',
    // For production: point to live server
    url: 'https://bookbridge-mkd7.onrender.com',
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
