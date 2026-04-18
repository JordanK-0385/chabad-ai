/* ─── gemini-api.js ─── Gemini API call for affiche image generation ─── */

// Load a public URL into { mimeType, base64 data } via fetch + FileReader.
async function fetchImageAsInlineData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reference image not found: ${url} (HTTP ${res.status})`);
  const blob = await res.blob();
  const mimeType = blob.type || "image/jpeg";
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const data = result.includes(",") ? result.split(",")[1] : result;
      resolve(data);
    };
    reader.onerror = () => reject(new Error(`Failed to read image blob: ${url}`));
    reader.readAsDataURL(blob);
  });
  return { mimeType, data: base64 };
}

export async function generateAfficheImage(prompt, geminiKey, refImages = []) {
  const key = geminiKey?.trim();
  if (!key) return;

  // Build the content parts: reference images first (if any), then the text prompt.
  const imageParts = [];
  if (Array.isArray(refImages) && refImages.length > 0) {
    for (const path of refImages) {
      try {
        const inlineData = await fetchImageAsInlineData(path);
        imageParts.push({ inlineData });
      } catch (e) {
        console.warn(e.message);
      }
    }
  }
  const parts = [...imageParts, { text: prompt }];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }),
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
  const outParts = cand.content.parts || [];
  const img   = outParts.find(p => p.inlineData);
  if (!img) {
    const txt = outParts.find(p => p.text)?.text || "";
    console.warn("Gemini text response (no image):", txt);
    throw new Error(txt ? `Gemini: ${txt.slice(0, 200)}` : "Aucune image retournee par Gemini. Essayez un autre style.");
  }
  return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
}
