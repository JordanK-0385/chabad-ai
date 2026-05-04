/* ─── api/openai.js ────────────────────────────────────────────────────────
 * Proxy serveur pour OpenAI DALL·E 3 (génération d'affiches).
 * - Vérifie le Firebase ID token du caller
 * - Forward le prompt à api.openai.com avec la clé serveur
 *
 * Body attendu : { prompt: string }
 * Réponse      : { dataUrl: "data:image/png;base64,..." }
 * ──────────────────────────────────────────────────────────────────────── */

import { withAuth } from "./_lib/auth.js";

const MAX_PROMPT_LEN = 4000; // limite OpenAI

function sanitize(s) {
  if (!s) return "";
  return String(s)
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [REDACTED]");
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(Object.assign(new Error("Invalid JSON"), { status: 400 })); }
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
  try { body = await readBody(req); }
  catch (e) {
    res.status(e.status || 400).json({ error: "Invalid request body" });
    return;
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  if (!prompt || prompt.length > MAX_PROMPT_LEN) {
    res.status(400).json({ error: "Invalid prompt" });
    return;
  }

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    console.error("[api/openai] OPENAI_KEY env var missing");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: "1792x1024",
        quality: "hd",
        style: "natural",
        response_format: "b64_json",
        n: 1,
      }),
    });

    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({}));
      const msg = sanitize(errBody?.error?.message) || `OpenAI HTTP ${upstream.status}`;
      res.status(upstream.status).json({ error: { message: msg } });
      console.error("[api/openai] upstream error", upstream.status, msg);
      return;
    }

    const data = await upstream.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      res.status(422).json({ error: { message: "Aucune image retournée par OpenAI." } });
      return;
    }
    res.status(200).json({ dataUrl: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error("[api/openai] fetch failed:", sanitize(e?.message));
    res.status(502).json({ error: { message: "Upstream request failed" } });
  }
}

export default withAuth(handler);
