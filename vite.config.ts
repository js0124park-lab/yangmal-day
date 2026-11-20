import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// '/' locally; GitHub Pages serves the site from '/<repo>/' (set by the deploy workflow via VITE_BASE).
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    // Installable app + offline start. The service worker precaches the app shell, images and fonts.
    // Supabase (auth/saves) is never cached: it is another origin and always goes to the network.
    VitePWA({
      registerType: 'prompt', // a new version waits until the player taps "새로고침" (never reloads mid-game)
      injectRegister: false, // registered in src/components/Pwa.tsx
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: '양말이의 하루',
        short_name: '양말이',
        description: '오늘도, 양말이와 함께하는 소소하고 특별한 하루! 반려견 힐링 육성 어드벤처',
        lang: 'ko',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF7EC',
        theme_color: '#E89B3C',
        categories: ['games', 'entertainment'],
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Gaegu stylesheet from Google Fonts
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // libraries change rarely: separate chunks stay cached across app updates
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
