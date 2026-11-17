import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' lets the same build run from a domain root or a sub-path
// (e.g. GitHub Pages at /jeevo/). Routing uses HashRouter.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.png', 'logo-white.png'],
      manifest: {
        name: 'Radhakrishna Hospital – JeevO',
        short_name: 'Radhakrishna',
        description: 'Appointments, tokens, prescriptions, lab reports and bills for your hospital or clinic.',
        theme_color: '#1B1E4A',
        background_color: '#F6F9F9',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ]
})
