/* ─── openai-api.js ─── OpenAI DALL·E 3 API for affiche image generation ─── */

// DALL·E 3 always generates horizontal (1792x1024). The output is then cropped
// to the user-selected format by the caller (see src/utils/crop-image.js).
export async function generateAfficheImage(prompt, openaiKey, _fmt) {
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
      size: "1792x1024",
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
