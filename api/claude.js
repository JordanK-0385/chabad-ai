/* ─── api/claude.js ────────────────────────────────────────────────────────
 * Proxy serveur pour l'API Anthropic.
 * - Vérifie le Firebase ID token du caller
 * - Forward la requête à api.anthropic.com avec la clé serveur
 * - Sanitize les messages d'erreur pour ne jamais exposer la clé
 *
 * Body attendu (JSON) :
 *   {
 *     model: "claude-sonnet-4-20250514",
 *     max_tokens: 1000,
 *     system: "...",
 *     messages: [...],
 *     tools?: [...]   // optionnel — pour le web_search côté Cours
 *   }
 *
 * Réponse : passthrough JSON d'Anthropic + status code original.
 * ──────────────────────────────────────────────────────────────────────── */

import { withAuth } from "./_lib/auth.js";

const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "claude-haiku-4-20250514",
]);
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB (PDFs encodés base64 dans Cours)

function sanitize(s) {
  if (!s) return "";
  return String(s)
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/x-api-key:\s*\S+/gi, "x-api-key: [REDACTED]");
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel parse JSON par défaut
  return await new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", c => {
      total += c.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Body too large"), { status: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    res.status(e.status || 400).json({ error: "Invalid request body" });
    return;
  }

  // Validation minimale
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  if (body.model && !ALLOWED_MODELS.has(body.model)) {
    res.status(400).json({ error: "Model not allowed" });
    return;
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "Missing messages" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    console.error("[api/claude] ANTHROPIC_KEY env var missing");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-20250514",
        max_tokens: body.max_tokens ?? 1000,
        system: body.system,
        messages: body.messages,
        ...(body.tools ? { tools: body.tools } : {}),
      }),
    });

    const text = await upstream.text();
    // Forward statut + body. On ne sanitize pas le body succès (pas de clé dedans),
    // mais en cas d'erreur Anthropic, on nettoie par sécurité.
    if (!upstream.ok) {
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = { error: { message: text } }; }
      const msg = sanitize(parsed?.error?.message || `Anthropic HTTP ${upstream.status}`);
      res.status(upstream.status).json({ error: { message: msg, type: parsed?.error?.type } });
      console.error("[api/claude] upstream error", upstream.status, msg);
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.status(upstream.status).send(text);
  } catch (e) {
    console.error("[api/claude] fetch failed:", sanitize(e?.message));
    res.status(502).json({ error: "Upstream request failed" });
  }
}

export default withAuth(handler);
