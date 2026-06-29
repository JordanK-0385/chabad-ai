# CLAUDE.md

## Projet
HABAD.ai — plateforme SaaS gratuite qui aide les Shluchim (émissaires Chabad-Loubavitch) de France à générer des contenus communautaires : affiches d'événements, cours de Torah, messages. Prod : https://habad.ai

> Note : le repo s'appelle `chabad-ai` (et le code historique `shliach-ai`) — c'est bien le même projet que Habad.ai, non renommé après le pivot.

## Stack
- Frontend : React + Vite (mobile-first)
- Auth + DB : Firebase Auth (Google) + Firestore — projet `shliach-ai-9ff9d`
- Stockage : Firebase Storage (`pdfs/`)
- LLMs : Claude (claude-sonnet-4-6) · Gemini 2.5 Flash Image · DALL·E 3 (fallback)
- Hosting : Vercel (auto-deploy sur push `main`)
- Automation : n8n self-hosted

## Fichiers clés
- `src/main.jsx` — entrée · `src/App.jsx` — routing
- `src/firebase.js` — config Firebase
- `src/pages/` — pages routées (Landing, Onboarding, Dashboard, Affiches, Cours, Messages, Admin)
- `src/components/` — UI partagée (ex. ChabadLogo)
- `src/theme/` — design tokens
- `src/prompts/` — prompts LLM (affiche-claude.js, affiche-gemini.js…)
- `src/services/` — wrappers API (claude-api.js, gemini-api.js)
- `api/` — Vercel Functions : proxies LLM (`/api/claude`, `/api/gemini`, `/api/openai`)
- `firestore.rules` / `storage.rules` — règles de sécurité (versionnées)
- `scripts/` — utilitaires Admin SDK (ex. send-welcome-emails.mjs)

## Commandes
- `npm run dev` — dev local (port 5200)
- `npm run lint` — ESLint
- `npm run build` — build prod

## Conventions
- Composants en `PascalCase.jsx`, pages dans `src/pages/`
- Prompts à Claude Code : anglais, courts, atomiques ; audit avant de toucher au code
- Workflow git : commits courts à l'impératif ; éviter `git add .` (préférer ajout ciblé)

## Contraintes — sécurité (CRITIQUE)
- **Aucune clé API sensible (Anthropic/OpenAI/Gemini) ne doit JAMAIS atteindre le frontend.** Tout passe par les proxies `api/*` qui vérifient un Firebase ID token. Clés en env vars serveur Vercel uniquement (jamais de préfixe `VITE_` pour le sensible).
- **Tout fichier réinjecté dans un prompt (Sichos) doit être en lecture seule pour les users** → `pdfs/sources/` admin-only ; contenus users dans `pdfs/users/{uid}/`.
- Admin : UID Firebase `9B2EWANLCaMssqkdRjTy66bjhCE3` (gardé aussi par les règles, pas seulement le routing).

## Contraintes — génération visuelle (halakha)
Voir `docs/regles-visuelles.md`. En résumé : cheveux naturels visibles pour les filles (jamais voile), sheitel/tichel pour femmes mariées, kippot bleu marine/noir, tsniout, en-tête `ב״ה`, logo 3 chevrons (pas d'étoile de David).

## Branding
Bordeaux `#3D1414` · Orange CTA `#E8560A` · Crème `#F8F4EE` · Fonts Playfair Display + Inter.
