import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// NOTE — Vercel Functions :
// Les routes /api/{claude,gemini,openai} sont des Vercel Functions situées
// dans le dossier `api/` à la racine. Elles ne sont PAS servies par `vite dev`.
// Pour le développement local complet (front + proxies), lancer :
//     npx vercel dev
// Vite seul fonctionne pour itérer sur l'UI mais les générations échoueront
// (404 sur les routes /api/*).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200,
  },
})
