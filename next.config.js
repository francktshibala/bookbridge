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

// PWA Feature Flag - Set ENABLE_PWA=true in .env.local to enable PWA features
// Default: false (PWA disabled) for safety
const isPWAEnabled = process.env.ENABLE_PWA === 'true';

console.log('🔧 PWA Status:', isPWAEnabled ? 'ENABLED' : 'DISABLED');

// Configure PWA only when explicitly enabled
const withPWA = isPWAEnabled
  ? require('next-pwa')({
      dest: 'public',
      disable: process.env.NODE_ENV === 'development',
      register: true,
      skipWaiting: true,
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
}

module.exports = withBundleAnalyzer(withPWA(nextConfig))