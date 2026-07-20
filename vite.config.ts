import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Restock',
        short_name: 'Restock',
        description: 'Inventory & restock tracker',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'fortune_supermarket_192.png', sizes: '192x192', type: 'image/png' },
          { src: 'fortune_supermarket_512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
})
