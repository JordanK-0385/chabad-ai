/* ─── api/_lib/auth.js ─────────────────────────────────────────────────────
 * Vérification du Firebase ID token côté serveur (Vercel Function).
 * Empêche que le proxy devienne une faille ouverte : seuls les utilisateurs
 * authentifiés sur HABAD.ai peuvent appeler /api/{claude,gemini,openai}.
 * ──────────────────────────────────────────────────────────────────────── */

import admin from "firebase-admin";

// Initialise une seule fois (les Vercel Functions sont réutilisées entre invocations à chaud).
function initAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var manquante");
  }

  let creds;
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT n'est pas du JSON valide");
  }

  // Vercel Dashboard remplace parfois \n par \\n dans les valeurs multilignes.
  if (creds.private_key && typeof creds.private_key === "string") {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({ credential: admin.credential.cert(creds) });
}

/**
 * Vérifie le header Authorization: Bearer <ID-token>.
 * Renvoie l'objet decoded token ou throw une Error avec .status = 401.
 */
export async function verifyAuth(req) {
  initAdmin();

  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    const err = new Error("Missing or malformed Authorization header");
    err.status = 401;
    throw err;
  }
  const idToken = match[1].trim();

  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    const err = new Error("Invalid or expired ID token");
    err.status = 401;
    throw err;
  }
}

/**
 * Wrapper pour les handlers Vercel : applique la vérification, gère le CORS basique
 * et formatte les erreurs de façon cohérente.
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      const decoded = await verifyAuth(req);
      req.user = decoded; // attache pour le handler (uid, email, etc.)
      return await handler(req, res);
    } catch (e) {
      const status = e.status || 500;
      // Ne JAMAIS exposer e.message côté client si status === 500.
      // Pour 401, le message générique suffit.
      res.status(status).json({
        error: status === 401 ? "Unauthorized" : "Internal server error",
      });
      // Détails techniques uniquement dans les logs Vercel.
      console.error("[api/withAuth]", status, e?.message || e);
    }
  };
}
