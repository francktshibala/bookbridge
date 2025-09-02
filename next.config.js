// Make bundle analyzer optional for production builds
let withBundleAnalyzer;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
} catch (error) {
  console.log('Bundle analyzer not available, skipping...');
  withBundleAnalyzer = (config) => config;
}

// PWA Feature Flag - Set ENABLE_PWA=true in .env.local or platform env to enable PWA features
// Default: false (PWA disabled) for safety
const parseBoolean = (value) => {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
};

const isPWAEnabled = parseBoolean(process.env.ENABLE_PWA);
const useCapacitorStubs = parseBoolean(process.env.CAPACITOR_STUBS);

console.log('🔧 PWA Status:', isPWAEnabled ? 'ENABLED' : 'DISABLED');
console.log('🔧 ENV SUMMARY:', {
  NODE_ENV: process.env.NODE_ENV,
  ENABLE_PWA: process.env.ENABLE_PWA,
  CAPACITOR_STUBS: process.env.CAPACITOR_STUBS,
});

// Configure PWA only when explicitly enabled
const withPWA = isPWAEnabled
  ? require('next-pwa')({
      dest: 'public',
      disable: process.env.NODE_ENV === 'development',
      register: true,
      skipWaiting: true,
      // Ensure App Router compatibility
      // next-pwa will emit sw.js/workbox files into public/
      // We exclude API routes to prevent interference
      runtimeCaching: [
        {
          // CRITICAL: Never cache API routes to prevent database access issues
          urlPattern: /^https?.*\/api\/.*/i,
          handler: 'NetworkOnly',
          options: {
            cacheName: 'api-cache',
          },
        },
        {
          // Cache static assets
          urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'static-image-cache',
            expiration: {
              maxEntries: 64,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
          },
        },
        {
          // Cache Google Fonts
          urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 4,
              maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
            },
          },
        },
      ],
    })
  : (config) => config; // No-op function if PWA disabled

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Static export disabled due to API routes - use .next build
  
  // Capacitor-compatible image settings
  images: {
    unoptimized: true,
  },
  
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ],
  
  // Conditionally alias Capacitor packages to local stubs to avoid build-time resolution
  // issues in non-Capacitor environments (e.g., server builds on Render)
  webpack: (config) => {
    if (useCapacitorStubs) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@capacitor/core': path.resolve(__dirname, 'stubs/capacitor/core.ts'),
        '@capacitor/app': path.resolve(__dirname, 'stubs/capacitor/app.ts'),
        '@capacitor/filesystem': path.resolve(__dirname, 'stubs/capacitor/filesystem.ts'),
        '@capacitor/preferences': path.resolve(__dirname, 'stubs/capacitor/preferences.ts'),
        '@capacitor/network': path.resolve(__dirname, 'stubs/capacitor/network.ts'),
        '@capacitor/share': path.resolve(__dirname, 'stubs/capacitor/share.ts'),
      };
      console.log('🔧 Capacitor stubs alias ENABLED');
    }
    return config;
  },
}

module.exports = withBundleAnalyzer(withPWA(nextConfig))