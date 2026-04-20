/* ─── Cours.jsx ─── Torah course preparation module ─── */

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { T, SERIF, SANS, INP, Card, GBtn, StepLabel, ChabadLogo, BackButton, AppHeader } from "./shared";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";

const GH_OWNER  = "JordanK-0385";
const GH_REPO   = "chabad-ai";
const GH_BRANCH = "main";
const GH_PATH   = "public/pdfs";
const GH_TOKEN  = import.meta.env.VITE_GITHUB_TOKEN;

const OCCASIONS = [
  { v: "chabbat",    l: "Chabbat",     e: "\uD83D\uDD6F\uFE0F" },
  { v: "fete",       l: "Fête",        e: "\uD83C\uDF89" },
  { v: "bar-mitsva", l: "Bar Mitsva",  e: "\uD83D\uDCDC" },
  { v: "mariage",    l: "Mariage",     e: "\uD83D\uDC8D" },
  { v: "deuil",      l: "Deuil",       e: "\uD83D\uDD4E" },
  { v: "cours-femme",l: "Cours Femmes",e: "\uD83C\uDF3A" },
  { v: "brit-mila",  l: "Brit Mila",    e: "👶" },
  { v: "autre",      l: "Autre",       e: "\u2728" },
];

const DUREES = ["5 min", "10 min", "20 min", "30 min", "45 min"];
const LANGUES = ["Français", "Hébreu", "Français + Hébreu"];
const ENRICHISSEMENTS = ["Histoires hassidiques", "Tanya", "Halakha pratique", "Pensée du Rabbi", "Midrash", "Hassidout", "Actualité", "Humour et anecdotes légères"];

const COURS_LOAD_MSGS = ["Lecture des documents...", "Analyse des sources...", "Construction du plan...", "Rédaction du cours...", "Finalisation..."];
const COURS_LOAD_START = 45;

const CLAUDE_COURS_SYS = `Tu es un assistant rabbinique qui prépare des cours de Torah pour des Shluhim Chabad.

RÈGLE ABSOLUE — SOURCES UNIQUEMENT :
Tu travailles EXCLUSIVEMENT avec :
1. Les documents PDF fournis dans cette conversation
2. Les résultats de ta recherche web sur chabad.org et loubavitch.fr

ZÉRO invention. ZÉRO citation de mémoire. ZÉRO source extérieure.
Si une information nest pas dans les documents ou ta recherche web : tu lecris explicitement.

MÉTHODE DE TRAVAIL OBLIGATOIRE :
Avant de rédiger, lis entièrement chaque document PDF fourni.
Identifie les sources précises : auteur, oeuvre, chapitre, verset.
Construis le plan du cours à partir de ce que tu as trouvé dans les documents.
Chaque paragraphe du cours doit être ancré dans une source identifiée.

FORMAT DE SORTIE OBLIGATOIRE — RESPECTE EXACTEMENT CES RÈGLES :

TITRE : commence toujours par un # H1 avec le titre du cours

SOUS-TITRE : immédiatement après le H1, une ligne en italique entre parenthèses avec la source principale : *(Discours du Rabbi, Likouteï Si'hot tome X, page Y)*

SÉPARATEUR : après le sous-titre, une ligne avec ---

CORPS : numéroté obligatoirement. Chaque paragraphe commence OBLIGATOIREMENT par son numéro collé au texte sur la même ligne, sans retour à la ligne entre le numéro et le texte. Exemple exact : '1. Le verset central de notre Paracha...' — le numéro et le texte sont sur la même ligne, jamais séparés. Prose fluide sans bullet points.
INTERDIT : ne jamais mettre un retour à la ligne entre le numéro et le texte du paragraphe. INTERDIT : ne jamais laisser un numéro seul sur sa ligne.

CITATIONS : toute citation directe d'un texte source doit être en blockquote markdown avec > au début de la ligne, suivie de la référence entre parenthèses sur la ligne suivante dans le blockquote :
> "texte cité"
> *(Nom du livre, chapitre, verset)*

SECTIONS : si le cours a plusieurs parties, utilise ## H2 pour le titre de section. Avant chaque H2, ajoute une ligne vide.

NOTES DE BAS DE PAGE : si tu as des références complémentaires, ajoute à la fin une ligne --- suivie des notes numérotées : (1) référence complète. (2) etc.

LONGUEUR :
5 min = 600-700 mots
10 min = 1200-1400 mots
20 min = 2500-2800 mots
30 min = 3500-4000 mots
45 min = 5000-5500 mots

LANGUE DE SORTIE :
Français → cours entièrement en français, termes hébreux translittérés
Hébreu → cours entièrement en hébreu rabbinique
Français + Hébreu → alterne naturellement, citations en hébreu original`;

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const MAX_PDFS_SENT = 10;

function ghHeadersObj() {
  const h = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (GH_TOKEN) h.Authorization = `Bearer ${GH_TOKEN}`;
  return h;
}

// List PDFs with latest-commit date, sorted most-recent first.
async function listPdfsSorted() {
  const headers = ghHeadersObj();
  const listRes = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`,
    { headers }
  );
  if (listRes.status === 404) return [];
  if (!listRes.ok) throw new Error(`GitHub list failed (${listRes.status})`);
  const raw = await listRes.json();
  if (!Array.isArray(raw) || raw.length === 0) return [];

  // Keep only .pdf FILES directly in public/pdfs (no dirs, no non-pdf files),
  // and dedupe by filename (case-insensitive) as a safety net.
  const seen = new Set();
  const items = raw.filter(item => {
    if (!item || item.type !== "file") return false;
    if (typeof item.name !== "string") return false;
    if (!item.name.toLowerCase().endsWith(".pdf")) return false;
    if (item.path !== `${GH_PATH}/${item.name}`) return false;
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (items.length === 0) return [];

  const withDates = await Promise.all(items.map(async item => {
    let uploadDate = null;
    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/commits?path=${encodeURIComponent(item.path)}&per_page=1&sha=${GH_BRANCH}`,
        { headers }
      );
      if (commitRes.ok) {
        const commits = await commitRes.json();
        const dateStr = commits?.[0]?.commit?.committer?.date || commits?.[0]?.commit?.author?.date;
        if (dateStr) uploadDate = new Date(dateStr);
      }
    } catch (_) { /* silent per-file */ }
    return { name: item.name, path: item.path, sha: item.sha, uploadDate };
  }));

  withDates.sort((a, b) => {
    const ad = a.uploadDate?.getTime?.() || 0;
    const bd = b.uploadDate?.getTime?.() || 0;
    return bd - ad;
  });
  return withDates;
}

async function fetchPdfBlocksForItems(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const docs = await Promise.all(items.map(async item => {
    const resp = await fetch(`/pdfs/${encodeURIComponent(item.name)}`);
    if (!resp.ok) throw new Error(`PDF fetch failed for ${item.name} (${resp.status})`);
    const buf = await resp.arrayBuffer();
    return { data: arrayBufferToBase64(buf) };
  }));
  return docs.map((d, i) => ({
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: d.data },
    ...(i < 4 ? { cache_control: { type: "ephemeral" } } : {})
  }));
}

export default function Cours({ profil, onBack, headerProps }) {
  const [mobile, setMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const [occasion, setOccasion] = useState("");
  const [duree, setDuree] = useState("20 min");
  const [langue, setLangue] = useState("Français");
  const [sujet, setSujet] = useState("");
  const [enrichissements, setEnrichissements] = useState([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);
  const [loadTime, setLoadTime] = useState(COURS_LOAD_START);

  const [pdfList, setPdfList] = useState([]);
  const [pdfListLoading, setPdfListLoading] = useState(true);
  const [docsOpen, setDocsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await listPdfsSorted();
        if (!cancelled) setPdfList(items);
      } catch (e) {
        console.warn("PDF list failed:", e.message);
        if (!cancelled) setPdfList([]);
      } finally {
        if (!cancelled) setPdfListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loading) return;
    setLoadMsgIdx(0);
    setLoadTime(COURS_LOAD_START);
    const m = setInterval(() => setLoadMsgIdx(i => (i + 1) % COURS_LOAD_MSGS.length), 3000);
    const t = setInterval(() => setLoadTime(v => Math.max(0, v - 1)), 1000);
    return () => { clearInterval(m); clearInterval(t); };
  }, [loading]);

  function toggleEnrich(e) {
    setEnrichissements(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  }

  async function getCurrentParasha() {
    const today = new Date();
    const response = await fetch(`https://www.hebcal.com/shabbat?cfg=json&geonameid=2988507&M=on`);
    const data = await response.json();
    const parasha = data.items?.find(i => i.category === "parashat");
    return parasha?.title || null;
  }

  async function generate() {
    if (!occasion && !sujet.trim()) { setErr("Choisissez une occasion ou décrivez le sujet."); return; }
    setLoading(true); setErr(""); setResult("");
    try {
      const bc = profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "Beth Chabad";
      let parashaInfo = "";
      if (occasion === "chabbat") {
        const parasha = await getCurrentParasha();
        if (parasha) parashaInfo = `Paracha de cette semaine : ${parasha}. `;
      }
      const msg = parashaInfo + [
        `Prepare un cours de Torah pour : ${occasion || "occasion generale"}`,
        sujet.trim() ? `Sujet specifique : ${sujet.trim()}` : "",
        `Duree : ${duree}`,
        `Langue : ${langue}`,
        enrichissements.length ? `Enrichissements souhaites : ${enrichissements.join(", ")}` : "",
        `Institution : ${bc}`,
      ].filter(Boolean).join("\n");

      const selectedPdfs = pdfList.slice(0, MAX_PDFS_SENT);
      const pdfBlocks = await fetchPdfBlocksForItems(selectedPdfs).catch(e => {
        console.warn("PDF fetch failed:", e.message);
        return [];
      });
      const userContent = pdfBlocks.length > 0
        ? [...pdfBlocks, { type: "text", text: msg }]
        : msg;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, system: CLAUDE_COURS_SYS, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: [{ role: "user", content: userContent }] }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      const rawText = d.content?.filter(b => b.type === "text").map(b => b.text).join("\n\n") || "";
      const inputTokens = d.usage?.input_tokens || 0;
      const outputTokens = d.usage?.output_tokens || 0;
      const text = rawText
        .replace(/\n{3,}/g, '\n\n')
        .replace(/ {2,}/g, ' ')
        .trim();
      if (!text) throw new Error("Reponse vide de Claude.");
      setResult(text);

      /* Save to Firestore */
      if (profil?.onboardingComplete) {
        try {
          const searches = d.usage?.server_tool_use?.web_search_requests || 0;
          const coutEuros = ((inputTokens / 1000 * 0.003) + (outputTokens / 1000 * 0.015) + (searches * 0.01)) * 0.93;
          await addDoc(collection(db, "users", profil.uid || "anon", "cours"), {
            occasion, duree, langue, sujet: sujet.trim(), enrichissements, result: text, inputTokens: inputTokens, outputTokens: outputTokens, searches: searches, coutEuros: coutEuros, createdAt: serverTimestamp(),
            betChabad: profil?.betChabad || "",
            module: "cours",
            userName: profil?.displayName || profil?.nom || "",
          });
          await addDoc(collection(db, "generations"), {
            uid: profil?.uid || "",
            module: "cours",
            betChabad: profil?.betChabad || "",
            userName: profil?.displayName || profil?.nom || "",
            subType: occasion,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            coutEuros: coutEuros,
            createdAt: serverTimestamp(),
          });
          if (profil?.uid) {
            await updateDoc(doc(db, "users", profil.uid), { lastActiveAt: serverTimestamp() }).catch(_ => {});
          }
        } catch (_) { /* silent */ }
      }
    } catch (e) {
      setErr("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>

      {/* Header */}
      {headerProps && <AppHeader currentScreen="cours" {...headerProps} />}

      <div className="mfp-page" style={{ maxWidth: 860, margin: "0 auto", padding: mobile ? "20px 14px" : "36px 24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <style>{`@media (max-width:600px){.mfp-page button{min-height:44px!important;font-size:14px!important;width:100%!important;box-sizing:border-box!important}.mfp-page input,.mfp-page textarea{font-size:16px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}}`}</style>

        <h1 style={{ flex: "1 1 100%", fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 24px" }}>
          📖 Préparer un cours
        </h1>

        {/* LEFT - controls */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="1">Occasion</StepLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: mobile ? 10 : 8 }}>
              {OCCASIONS.map(o => (
                <div key={o.v} onClick={() => setOccasion(o.v)} style={{ padding: mobile ? "14px 12px" : "10px 12px", minHeight: mobile ? 44 : 'auto', borderRadius: 8, cursor: "pointer", border: `1px solid ${occasion === o.v ? T.gold : T.border}`, background: occasion === o.v ? T.goldFaint : T.surface, display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box" }}>
                  <span style={{ fontSize: 18 }}>{o.e}</span>
                  <span style={{ fontSize: mobile ? 14 : 12, fontWeight: 600, color: occasion === o.v ? T.gold : T.text }}>{o.l}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="2">Paramètres</StepLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 6, display: "block" }}>Durée</label>
                <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                  {DUREES.map(d => (
                    <span key={d} onClick={() => setDuree(d)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${duree === d ? T.gold : T.border}`, color: duree === d ? T.gold : T.muted, background: duree === d ? T.goldSoft : T.surface }}>{d}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 6, display: "block" }}>Langue</label>
                <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                  {LANGUES.map(l => (
                    <span key={l} onClick={() => setLangue(l)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${langue === l ? T.gold : T.border}`, color: langue === l ? T.gold : T.muted, background: langue === l ? T.goldSoft : T.surface }}>{l}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 4, display: "block" }}>Sujet (optionnel)</label>
                <textarea value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Ex: La joie dans le service divin, le sens de la Mezouza, lien avec l'actualité..." rows={3} style={{ ...INP, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="3">Enrichissements</StepLabel>
            <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
              {ENRICHISSEMENTS.map(e => {
                const sel = enrichissements.includes(e);
                return (
                  <span key={e} onClick={() => toggleEnrich(e)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${sel ? T.gold : T.border}`, color: sel ? T.gold : T.muted, background: sel ? T.goldSoft : T.surface }}>{e}</span>
                );
              })}
            </div>
          </Card>

          {(() => {
            const usedCount = Math.min(pdfList.length, MAX_PDFS_SENT);
            const isEmpty = !pdfListLoading && pdfList.length === 0;
            return (
              <div style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                marginBottom: 28,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}>
                <button
                  type="button"
                  onClick={() => !isEmpty && !pdfListLoading && setDocsOpen(v => !v)}
                  disabled={isEmpty || pdfListLoading}
                  aria-expanded={docsOpen}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: mobile ? "16px 18px" : "18px 22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    cursor: (isEmpty || pdfListLoading) ? "default" : "pointer",
                    color: T.text,
                    fontFamily: SANS,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: mobile ? 14 : 13, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: mobile ? 16 : 14 }}>📄</span>
                    {pdfListLoading ? (
                      <span style={{ color: T.muted }}>Chargement des documents…</span>
                    ) : isEmpty ? (
                      <span style={{ color: T.muted }}>Aucun document disponible.</span>
                    ) : (
                      <span>
                        <strong style={{ color: T.gold, fontWeight: 700 }}>{usedCount}</strong>
                        <span style={{ color: T.muted }}> document{usedCount > 1 ? "s" : ""} utilisé{usedCount > 1 ? "s" : ""} sur </span>
                        <strong style={{ color: T.text, fontWeight: 700 }}>{pdfList.length}</strong>
                        <span style={{ color: T.muted }}> disponible{pdfList.length > 1 ? "s" : ""}</span>
                      </span>
                    )}
                  </span>
                  {!isEmpty && !pdfListLoading && (
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        fontSize: 20,
                        color: T.muted,
                        transition: "transform 0.2s ease",
                        transform: docsOpen ? "rotate(90deg)" : "rotate(0deg)",
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      ›
                    </span>
                  )}
                </button>

                {docsOpen && !isEmpty && !pdfListLoading && (
                  <div style={{ padding: mobile ? "0 18px 18px" : "0 22px 22px", borderTop: `1px solid ${T.border}` }}>
                    <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                      {pdfList.map((f, i) => {
                        const used = i < MAX_PDFS_SENT;
                        return (
                          <li
                            key={f.path}
                            title={f.uploadDate ? `Uploadé le ${f.uploadDate.toLocaleDateString("fr-FR")}` : ""}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              padding: "7px 10px",
                              background: used ? T.goldFaint : T.surface,
                              border: `1px solid ${used ? T.goldSoft : T.border}`,
                              borderRadius: 7,
                              fontSize: mobile ? 13 : 12,
                              color: used ? T.text : T.muted,
                              opacity: used ? 1 : 0.65,
                            }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                              📄 {f.name}
                            </span>
                            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
                              {f.uploadDate ? f.uploadDate.toLocaleDateString("fr-FR") : "—"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {pdfList.length > MAX_PDFS_SENT && (
                      <div style={{ fontSize: 11, color: T.faint, marginTop: 8, textAlign: "center" }}>
                        (les {MAX_PDFS_SENT} plus récents sont utilisés)
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {err && <div style={{ color: T.red, fontSize: mobile ? 14 : 12, marginBottom: 12, background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: 7, padding: "8px 12px" }}>{err}</div>}

          <div style={mobile ? { minHeight: 48 } : {}}>
            <GBtn onClick={generate} disabled={loading} fullWidth>
              {loading ? "Génération en cours..." : "Générer le cours"}
            </GBtn>
          </div>
        </div>

        {/* RIGHT - result */}
        <div style={{ flex: "1 1 380px", minWidth: 0, width: mobile ? "100%" : "auto" }}>
          {!result && !loading && (
            <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28, minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <ChabadLogo size={48} color={T.faint} />
              <div style={{ fontSize: mobile ? 14 : 12, color: T.muted, textAlign: "center", lineHeight: 1.6 }}>
                Configurez les paramètres à gauche<br />puis cliquez sur <span style={{ color: T.gold }}>Générer le cours</span>
              </div>
            </Card>
          )}
          {loading && (
            <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28, minHeight: 300, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
              <style>{`@keyframes mfp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <div style={{ width: 56, height: 56, borderRadius: "50%", border: "3px solid var(--color-border)", borderTopColor: "var(--color-accent)", animation: "mfp-spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, color: "var(--color-accent)", fontFamily: SANS, textAlign: "center", fontWeight: 600 }}>{COURS_LOAD_MSGS[loadMsgIdx]}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontFamily: SANS }}>
                {loadTime > 0 ? `Temps estimé : ${loadTime} secondes` : "Presque terminé..."}
              </div>
            </Card>
          )}
          {result && (
            <div className="cours-result-card" style={{
              background: "var(--bg-surface)",
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: mobile ? "24px 18px" : "48px 44px",
              maxWidth: 680,
              marginBottom: 28,
              maxHeight: "75vh",
              overflowY: "auto",
            }}>
              <div style={{ fontSize: mobile ? 14 : 13.5, color: T.text, lineHeight: 1.9, fontFamily: SANS }}>
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 style={{ fontFamily: SERIF, color: T.gold, fontSize: mobile ? 22 : 26, fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em", margin: "0 0 8px", textAlign: "center" }} {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <>
                        <div style={{ textAlign: "center", color: T.gold, fontSize: 13, letterSpacing: 8, margin: "28px 0 12px", userSelect: "none" }}>· · ·</div>
                        <h2 style={{ fontFamily: SERIF, color: T.gold, fontSize: mobile ? 17 : 19, fontWeight: 700, lineHeight: 1.3, margin: "0 0 18px", textAlign: "center" }} {...props} />
                      </>
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 style={{ fontFamily: SERIF, color: T.text, fontSize: mobile ? 15 : 16, fontWeight: 700, lineHeight: 1.4, margin: "20px 0 10px" }} {...props} />
                    ),
                    p: ({ node, children, ...props }) => {
                      const text = typeof children === "string" ? children : (Array.isArray(children) ? children.map(c => typeof c === "string" ? c : (c?.props?.children || "")).join("") : "");
                      const m = text.match(/^(\d+)\.\s+([\s\S]+)/);
                      if (m) {
                        return (
                          <p style={{ color: T.text, fontFamily: SANS, fontSize: mobile ? 14 : 13.5, lineHeight: 1.9, margin: "0 0 16px", textAlign: "justify" }}>
                            <span style={{ color: T.gold, fontWeight: 700, fontSize: 15, marginRight: 6, fontFamily: SERIF }}>{m[1]}.</span>
                            {m[2]}
                          </p>
                        );
                      }
                      return <p style={{ color: T.text, fontFamily: SANS, fontSize: mobile ? 14 : 13.5, lineHeight: 1.9, margin: "0 0 16px", textAlign: "justify" }} {...props}>{children}</p>;
                    },
                    em: ({ node, ...props }) => (
                      <em style={{ fontStyle: "italic", color: T.muted, fontSize: "0.95em" }} {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong style={{ fontWeight: 700, color: T.text }} {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "24px 0" }} {...props} />
                    ),
                    blockquote: ({ node, children, ...props }) => (
                      <blockquote style={{ borderLeft: `3px solid ${T.gold}`, background: T.goldFaint, margin: "20px 0", padding: "14px 20px", borderRadius: "0 8px 8px 0" }}>
                        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: mobile ? 14 : 13.5, color: T.text, lineHeight: 1.75 }}>{children}</div>
                      </blockquote>
                    ),
                    ol: ({ node, ...props }) => <ol style={{ paddingLeft: 20, margin: "0 0 16px", color: T.text, fontSize: mobile ? 14 : 13.5, lineHeight: 1.9 }} {...props} />,
                    ul: ({ node, ...props }) => <ul style={{ paddingLeft: 20, margin: "0 0 16px", color: T.text, fontSize: mobile ? 14 : 13.5, lineHeight: 1.9 }} {...props} />,
                    li: ({ node, ...props }) => <li style={{ marginBottom: 6 }} {...props} />,
                    a: ({ node, ...props }) => <a style={{ color: T.gold, textDecoration: "underline" }} target="_blank" rel="noreferrer" {...props} />,
                  }}
                >
                  {result}
                </ReactMarkdown>
              </div>
              <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 8, marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <GBtn onClick={() => navigator.clipboard.writeText(result)} outline sm>Copier</GBtn>
                <GBtn onClick={() => window.print()} outline sm>Exporter PDF</GBtn>
                <GBtn onClick={generate} outline sm>Regénérer</GBtn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
