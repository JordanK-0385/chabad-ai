/* ─── api/gemini.js ────────────────────────────────────────────────────────
 * Proxy serveur pour Gemini 2.5 Flash Image (génération d'affiches).
 * - Vérifie le Firebase ID token du caller
 * - Récupère les images de référence (whitelist locale uniquement) côté serveur
 *   pour éviter SSRF
 * - Forward le prompt à Gemini avec la clé serveur
 *
 * Body attendu :
 *   { prompt: string, refImages?: string[] }
 *
 * refImages : liste d'URLs publiques sur ce domaine, restreintes par whitelist.
 *
 * Réponse : { dataUrl: "data:image/...;base64,..." } ou { error: { message } }.
 * ──────────────────────────────────────────────────────────────────────── */

import { withAuth } from "./_lib/auth.js";

const MAX_PROMPT_LEN = 50_000;
const MAX_REF_IMAGES = 4;
// Whitelist : seules les images servies par /public sont autorisées
// (évite que le proxy télécharge des URLs arbitraires choisies par le client = SSRF).
const ALLOWED_REF_PATHS = new Set([
  "/hanukkiah-chabad-ref1.jpg",
  "/hanukkiah-chabad-ref2.jpg",
]);

function sanitize(s) {
  if (!s) return "";
  return String(s)
    .replace(/([?&](?:key|api[_-]?key|token|access[_-]?token)=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]");
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

async function fetchRefAsInline(originHost, path) {
  if (!ALLOWED_REF_PATHS.has(path)) return null;
  const url = `https://${originHost}${path}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  const mimeType = r.headers.get("content-type") || "image/jpeg";
  return { mimeType, data: buf.toString("base64") };
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

  const refImages = Array.isArray(body?.refImages) ? body.refImages.slice(0, MAX_REF_IMAGES) : [];

  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) {
    console.error("[api/gemini] GEMINI_KEY env var missing");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  // Construit les parts
  const imageParts = [];
  const host = req.headers.host || "";
  for (const path of refImages) {
    if (typeof path !== "string") continue;
    try {
      const inlineData = await fetchRefAsInline(host, path);
      if (inlineData) imageParts.push({ inlineData });
    } catch (e) {
      console.warn("[api/gemini] ref fetch failed:", sanitize(e?.message));
    }
  }
  const parts = [...imageParts, { text: prompt }];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });

    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({}));
      const msg = sanitize(errBody?.error?.message) || `Gemini HTTP ${upstream.status}`;
      res.status(upstream.status).json({ error: { message: msg } });
      console.error("[api/gemini] upstream error", upstream.status, msg);
      return;
    }

    const data = await upstream.json();
    const cand = data.candidates?.[0];
    if (!cand || !cand.content) {
      const reason = cand?.finishReason || data.promptFeedback?.blockReason || "unknown";
      res.status(422).json({
        error: { message: `Gemini a refusé la génération (raison : ${reason}). Essayez avec "Décor uniquement" ou reformulez.` },
      });
      return;
    }
    const outParts = cand.content.parts || [];
    const img = outParts.find(p => p.inlineData);
    if (!img) {
      const txt = outParts.find(p => p.text)?.text || "";
      res.status(422).json({
        error: { message: txt ? `Gemini : ${txt.slice(0, 200)}` : "Aucune image retournée par Gemini. Essayez un autre style." },
      });
      return;
    }

    res.status(200).json({
      dataUrl: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`,
    });
  } catch (e) {
    console.error("[api/gemini] fetch failed:", sanitize(e?.message));
    res.status(502).json({ error: { message: "Upstream request failed" } });
  }
}

export default withAuth(handler);
