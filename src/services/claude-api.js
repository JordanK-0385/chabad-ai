/* ─── claude-api.js ─── Client wrapper pour /api/claude (Vercel proxy) ─── */

import { getIdToken } from "../firebase";

// Détecte les erreurs transient qui méritent un retry.
function isTransient(err, status) {
  if (status === 429 || status === 503 || status === 529) return true;
  const msg = (err?.message || err?.type || "").toLowerCase();
  return /overloaded|rate[_ ]?limit|timeout|temporar|try again/.test(msg);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Appelle le proxy /api/claude avec un body Anthropic-shaped.
 * Le proxy injecte la clé serveur et vérifie l'auth Firebase.
 */
export async function callClaudeProxy(payload) {
  const token = await getIdToken();
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/**
 * Génération de contenu d'affiche (utilisée par Affiches.jsx).
 * Renvoie { parsed, inputTokens, outputTokens } ou throw.
 */
export async function generateAfficheContent(userMessage, systemPrompt) {
  const MAX_ATTEMPTS = 3;
  const delays = [1500, 3500, 7000];

  let lastErr = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const { status, data: d } = await callClaudeProxy({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      if (d.error) {
        lastErr = d.error;
        if (isTransient(d.error, status) && attempt < MAX_ATTEMPTS - 1) {
          await sleep(delays[attempt]);
          continue;
        }
        const msg = (d.error.message || "").toLowerCase();
        if (/overloaded/.test(msg) || status === 529) {
          throw new Error("Le service Claude est temporairement saturé. Réessayez dans 30 secondes.");
        }
        if (status === 429 || /rate/.test(msg)) {
          throw new Error("Trop de requêtes en peu de temps. Attendez un instant et réessayez.");
        }
        throw new Error(d.error.message || "Erreur API");
      }

      if (status >= 400) {
        lastErr = { message: `HTTP ${status}` };
        if ((status === 429 || status === 503 || status === 529) && attempt < MAX_ATTEMPTS - 1) {
          await sleep(delays[attempt]);
          continue;
        }
        throw new Error(`Erreur réseau (${status}). Réessayez dans un instant.`);
      }

      const raw = d.content?.find(b => b.type === "text")?.text || "";
      const inputTokens = d.usage?.input_tokens || 0;
      const outputTokens = d.usage?.output_tokens || 0;
      if (!raw) throw new Error("Réponse vide de Claude.");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      return { parsed, inputTokens, outputTokens };

    } catch (e) {
      lastErr = e;
      if (isTransient(e, null) && attempt < MAX_ATTEMPTS - 1) {
        await sleep(delays[attempt]);
        continue;
      }
      throw e;
    }
  }
  throw new Error(lastErr?.message || "Échec après plusieurs tentatives.");
}

/**
 * Appel Claude pour génération de cours (avec web_search tool + PDFs).
 * userContent : string ou array de blocs (text + document/pdf).
 * Renvoie { rawText, inputTokens, outputTokens, searches } ou throw.
 */
export async function generateCours(userContent, systemPrompt) {
  const { status, data: d } = await callClaudeProxy({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userContent }],
  });

  if (d.error) throw new Error(d.error.message || "Erreur API");
  if (status >= 400) throw new Error(`Erreur réseau (${status}).`);

  const rawText = d.content?.filter(b => b.type === "text").map(b => b.text).join("\n\n") || "";
  const inputTokens = d.usage?.input_tokens || 0;
  const outputTokens = d.usage?.output_tokens || 0;
  const searches = d.usage?.server_tool_use?.web_search_requests || 0;
  if (!rawText) throw new Error("Réponse vide de Claude.");
  return { rawText, inputTokens, outputTokens, searches };
}

/**
 * Appel Claude pour génération de message court.
 * Renvoie { text, inputTokens, outputTokens } ou throw.
 */
export async function generateMessage(userMessage, systemPrompt) {
  const { status, data: d } = await callClaudeProxy({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  if (d.error) throw new Error(d.error.message || "Erreur API");
  if (status >= 400) throw new Error(`Erreur réseau (${status}).`);

  const text = d.content?.find(b => b.type === "text")?.text || "";
  const inputTokens = d.usage?.input_tokens || 0;
  const outputTokens = d.usage?.output_tokens || 0;
  if (!text) throw new Error("Réponse vide de Claude.");
  return { text, inputTokens, outputTokens };
}
