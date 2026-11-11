import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Organization Pages sites are hosted at the domain root.
  base: '/',
  plugins: [react()],
})
