import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          'pdf-core-vendor': [
            '@react-pdf/renderer',
            '@react-pdf/layout',
            '@react-pdf/render',
            '@react-pdf/reconciler',
            '@react-pdf/primitives',
          ],
          'pdf-engine-vendor': ['@react-pdf/pdfkit', 'yoga-layout', '@react-pdf/font'],
          'pdf-assets-vendor': ['@react-pdf/image', '@react-pdf/textkit', '@react-pdf/png-js', 'fontkit'],
          'html-pdf-vendor': ['html2pdf.js'],
          'data-vendor': ['axios', 'zustand'],
          'qr-vendor': ['react-qrcode-logo'],
        },
      },
    },
  },
})
