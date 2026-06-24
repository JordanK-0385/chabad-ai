# HABAD.ai — הצלחה בזמן

Plateforme SaaS **gratuite** qui aide les Shluchim (émissaires Chabad-Loubavitch) de France à générer rapidement des contenus communautaires : **affiches d'événements**, **cours de Torah** et **messages** communautaires.

Production : **https://habad.ai**

> Le repo s'appelle `chabad-ai` pour des raisons historiques (le code s'appelait `shliach-ai` avant le pivot). C'est le même produit que Habad.ai.

## Stack

| Domaine | Techno |
|---|---|
| Frontend | React + Vite (mobile-first) |
| Auth + DB | Firebase Auth (Google) + Firestore (`shliach-ai-9ff9d`) |
| Stockage | Firebase Storage (`pdfs/`) |
| LLMs | Claude (sonnet-4), Gemini 2.5 Flash Image, DALL·E 3 (fallback) |
| Hosting | Vercel (auto-deploy sur push `main`) |
| Automation | n8n self-hosted |

## Architecture

Le frontend n'appelle **jamais** les LLMs directement. Tous les appels passent par des **Vercel Functions** (`api/`) qui vérifient un Firebase ID token avant de forwarder, avec les clés stockées côté serveur uniquement :

```
React (Vite)  ──►  /api/claude   ──►  Anthropic
              ──►  /api/gemini   ──►  Google Gemini
              ──►  /api/openai   ──►  OpenAI (DALL·E fallback)
```

## Modules

1. **Affiches** — formulaire événement → Claude (JSON) → Gemini/DALL·E (image) → overlay final.
2. **Cours** — occasion + durée → Claude (web_search chabad.org/loubavitch.fr + Sichos en document blocks) → rendu style Likouteï Si'hot.
3. **Messages** — type + ton → Claude.
4. **Coach Habad** *(en cours)*.

## Démarrage local

Pré-requis : Node 18+.

```bash
npm install
npm run dev      # http://localhost:5200
```

Variables d'environnement requises (voir `.env.example`) — **ne jamais commit le `.env`**.

| Variable | Usage |
|---|---|
| `ANTHROPIC_API_KEY` | proxy `/api/claude` (serveur) |
| `GEMINI_API_KEY` | proxy `/api/gemini` (serveur) |
| `OPENAI_API_KEY` | proxy `/api/openai` (serveur) |
| `VITE_FIREBASE_*` | config Firebase (publique, frontend) |

## Scripts

```bash
npm run dev       # serveur de dev (port 5200)
npm run build     # build de production
npm run preview   # prévisualiser le build
npm run lint      # ESLint
```

## Sécurité

- Aucune clé sensible côté frontend (proxies uniquement).
- Règles de sécurité versionnées : `firestore.rules`, `storage.rules`.
- Déploiement des règles : `firebase deploy --only firestore:rules,storage`.

## Déploiement

Push sur `main` → Vercel rebuild & deploy automatiquement. La CI (`.github/workflows/ci.yml`) lance `lint` + `build` à chaque push/PR.
