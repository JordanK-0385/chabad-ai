/* ─── gemini-api.js ─── Client wrapper pour /api/gemini (Vercel proxy) ─── */

import { getIdToken } from "../firebase";

/**
 * Appelle le proxy serveur qui relaie vers Gemini.
 * La clé Gemini ne quitte jamais le serveur.
 *
 * @param {string} prompt
 * @param {string[]} refImages — chemins relatifs (ex: "/hanukkiah-chabad-ref1.jpg")
 *                               restreints à une whitelist côté proxy.
 * @returns {Promise<string>} dataURL base64 (image/...)
 */
export async function generateAfficheImage(prompt, refImages = []) {
  const token = await getIdToken();
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, refImages: Array.isArray(refImages) ? refImages : [] }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(d?.error?.message || `Erreur Gemini (${res.status})`);
  }
  if (!d.dataUrl) {
    throw new Error("Aucune image retournée.");
  }
  return d.dataUrl;
}
