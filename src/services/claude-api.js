/* ─── claude-api.js ─── Claude API call for affiche content generation ─── */

export async function generateAfficheContent(userMessage, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: userMessage }] }),
  });
  const d   = await res.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  const raw = d.content?.find(b => b.type === "text")?.text || "";
  const inputTokens = d.usage?.input_tokens || 0;
  const outputTokens = d.usage?.output_tokens || 0;
  if (!raw) throw new Error("Reponse vide de Claude.");
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return { parsed, inputTokens, outputTokens };
}
