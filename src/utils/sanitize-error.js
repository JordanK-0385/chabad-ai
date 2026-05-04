/* ─── sanitize-error.js ────────────────────────────────────────────────────
 * Nettoie les messages d'erreur avant affichage à l'utilisateur.
 * Strip toute chaîne ressemblant à une clé API (Google, Anthropic, OpenAI,
 * GitHub, Bearer token, query string ?key=…), même si elle est publique
 * (cas de la clé Firebase Web : non secrète mais alarmante en UI).
 * ──────────────────────────────────────────────────────────────────────── */

export function sanitizeError(input) {
  const msg = typeof input === "string" ? input : (input?.message || String(input || ""));
  return msg
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[clé masquée]")
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[clé masquée]")
    .replace(/sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, "[clé masquée]")
    .replace(/ghp_[A-Za-z0-9]{20,}/g, "[clé masquée]")
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[clé masquée]")
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [clé masquée]")
    .replace(/x-api-key:\s*\S+/gi, "x-api-key: [clé masquée]")
    .replace(/([?&](?:key|api[_-]?key|token|access[_-]?token)=)[^&\s"']+/gi, "$1[clé masquée]");
}
