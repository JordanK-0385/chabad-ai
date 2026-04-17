/* ─── openai-api.js ─── OpenAI DALL·E 3 API for affiche image generation ─── */

function sizeForFormat(fmt) {
  // DALL·E 3 only supports: "1024x1024" | "1024x1792" | "1792x1024"
  if (fmt === "story" || fmt === "a4") return "1024x1792";   // closest tall
  if (fmt === "paysage") return "1792x1024";                  // closest wide
  return "1024x1024";                                         // carre
}

export async function generateAfficheImage(prompt, openaiKey, fmt = "carre") {
  const key = openaiKey?.trim();
  if (!key) return;
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      size: sizeForFormat(fmt),
      quality: "hd",
      style: "natural",
      response_format: "b64_json",
      n: 1,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `OpenAI HTTP ${res.status}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Aucune image retournée par OpenAI.");
  }
  return `data:image/png;base64,${b64}`;
}
