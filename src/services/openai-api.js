/* ─── openai-api.js ─── Client wrapper pour /api/openai (Vercel proxy) ─── */

import { getIdToken } from "../firebase";

/**
 * Appelle le proxy serveur qui relaie vers DALL·E 3.
 * La clé OpenAI ne quitte jamais le serveur.
 *
 * @param {string} prompt
 * @returns {Promise<string>} dataURL base64 (image/png)
 */
export async function generateAfficheImage(prompt) {
  const token = await getIdToken();
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(d?.error?.message || `Erreur OpenAI (${res.status})`);
  }
  if (!d.dataUrl) {
    throw new Error("Aucune image retournée par OpenAI.");
  }
  return d.dataUrl;
}
