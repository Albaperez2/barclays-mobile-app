import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: ./ // Indique que les chemins des assets doivent partir de la racine du domaine
})