import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import k8sContentPlugin from './vite-plugin-k8s-content'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    k8sContentPlugin(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
