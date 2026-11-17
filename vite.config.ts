import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' lets the user choose when to reload into a new version,
      // so an update never interrupts someone mid-edit.
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'BeatFoundry',
        short_name: 'BeatFoundry',
        description: 'Your all-in-one tempo detection and metronome companion for musicians.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#111b22',
        theme_color: '#7fd1c7',
        categories: ['music', 'productivity'],
        screenshots: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', form_factor: 'narrow' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide' }
        ],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Precache the whole app shell so every tab works with no network.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Deep links like /items load the cached shell when offline.
        navigateFallback: '/index.html',
        // Never let the service worker answer API calls with the shell.
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  server: {
    host: '0.0.0.0',  // Allow external connections
    port: 5173
  }
});
