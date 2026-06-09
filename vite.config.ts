/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/bundle-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/rest/, /^\/storage/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.href.includes('/rest/v1/nomenclature_budgetaire'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'gcap-nomenclature',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.href.includes('/rest/v1/lignes_budgetaires') ||
              url.href.includes('/rest/v1/exercices_budgetaires'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gcap-budget',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.href.includes('/rest/v1/fournisseurs'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gcap-fournisseurs',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.href.includes('/rest/v1/engagements_depenses'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gcap-engagements',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.href.includes('/auth/v1/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) =>
              url.href.includes('/storage/v1/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'gcap-storage',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'GCAP-GN — Gestion Comptable Publique',
        short_name: 'GCAP-GN',
        description: 'Gestion Comptable Administrative Publique — République de Guinée',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/?source=pwa',
        lang: 'fr',
        icons: [
          { src: '/favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['finance', 'government', 'productivity'],
        shortcuts: [
          {
            name: 'Nouvel engagement',
            short_name: 'Engagement',
            url: '/engagements/nouveau?source=shortcut',
            icons: [{ src: '/favicon-96.png', sizes: '96x96' }],
          },
          {
            name: 'Tableau de bord',
            short_name: 'Dashboard',
            url: '/tableau-de-bord?source=shortcut',
            icons: [{ src: '/favicon-96.png', sizes: '96x96' }],
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.stories.tsx',
        'src/shared/lib/supabase.ts',
      ],
    },
  },
})
