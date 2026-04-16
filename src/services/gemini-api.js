/* ─── gemini-api.js ─── Gemini API call for affiche image generation ─── */

export async function generateAfficheImage(prompt, geminiKey) {
  const key = geminiKey?.trim();
  if (!key) return;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const data  = await res.json();
  const cand = data.candidates?.[0];
  if (!cand || !cand.content) {
    const reason = cand?.finishReason || data.promptFeedback?.blockReason || "unknown";
    throw new Error(`Gemini a refuse la generation (raison: ${reason}). Essayez avec "Decor uniquement" ou reformulez.`);
  }
  const parts = cand.content.parts || [];
  const img   = parts.find(p => p.inlineData);
  if (!img) {
    const txt = parts.find(p => p.text)?.text || "";
    console.warn("Gemini text response (no image):", txt);
    throw new Error(txt ? `Gemini: ${txt.slice(0, 200)}` : "Aucune image retournee par Gemini. Essayez un autre style.");
  }
  return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
}
