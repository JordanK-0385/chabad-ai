/* ─── Cours.jsx ─── Torah course preparation module ─── */

import { useState, useEffect } from "react";
import { T, SERIF, SANS, INP, Card, GBtn, StepLabel, ChabadLogo, BackButton, AppHeader } from "./shared";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
const ENRICHISSEMENTS = ["Histoires hassidiques", "Gematria", "Halakha pratique", "Pensée du Rabbi", "Midrash", "Kabbalah", "Actualité", "Humour et anecdotes légères"];

const CLAUDE_COURS_SYS = `RECHERCHE WEB — INSTRUCTIONS :
Avant de generer le cours, effectue une recherche web pour trouver des sources precises sur le sujet demande.
Priorite absolue a ces sites : fr.chabad.org, loubavitch.fr
Cite uniquement ce que tu as trouve via recherche — jamais de memoire sans verification.

LONGUEUR — REGLES STRICTES :
- 5 min = 600-700 mots
- 10 min = 1200-1400 mots
- 20 min = 2500-2800 mots
- 30 min = 3500-4000 mots
- 45 min = 5000-5500 mots
Tu dois imperativement respecter ces fourchettes. Si la duree demandee est 20 min, le cours doit faire entre 2500 et 2800 mots. Compte tes mots avant de repondre.

Tu es un assistant rabbinique expert en Torah, Talmud, Halakha, Hassidout et enseignements du Rabbi de Loubavitch.
Tu prepares des cours structures, clairs, avec sources precises.
Reponds en francais. Structure le cours avec: introduction, developpement (2-3 points), conclusion et message pratique.
Inclus les references (Paracha, Talmud, Rambam, Tanya, Sichos du Rabbi, etc).
Adapte le niveau au public cible.

STRUCTURE ET TRANSITIONS :
Le cours doit se lire comme un discours oral fluide, pas comme une liste de points.
Entre chaque idee, utilise des phrases de transition naturelles qui relient les concepts :
'Cela nous amene a...', 'Ce qui nous rappelle...', 'Fort de cette idee, on comprend mieux pourquoi...', 'Le Rabbi nous enseigne a ce sujet que...'
Chaque paragraphe doit decouler naturellement du precedent.
Pas de tirets, pas de bullet points — uniquement de la prose.`;

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

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, system: CLAUDE_COURS_SYS, tools: [{ type: "web_search_20250305", name: "web_search" }], messages: [{ role: "user", content: msg }] }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      const rawText = d.content?.filter(b => b.type === "text").map(b => b.text).join("\n\n") || "";
      const text = rawText
        .replace(/\n{3,}/g, '\n\n')
        .replace(/ {2,}/g, ' ')
        .trim();
      if (!text) throw new Error("Reponse vide de Claude.");
      setResult(text);

      /* Save to Firestore */
      if (profil?.onboardingComplete) {
        try {
          await addDoc(collection(db, "users", profil.uid || "anon", "cours"), {
            occasion, duree, langue, sujet: sujet.trim(), enrichissements, result: text, createdAt: serverTimestamp(),
          });
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

          {err && <div style={{ color: T.red, fontSize: mobile ? 14 : 12, marginBottom: 12, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 7, padding: "8px 12px" }}>{err}</div>}

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
            <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28, minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ fontSize: 32, animation: "pulse 1.5s ease-in-out infinite" }}>{"\uD83D\uDCDA"}</div>
              <div style={{ fontSize: 14, color: T.gold }}>Préparation du cours...</div>
            </Card>
          )}
          {result && (
            <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28, maxHeight: "75vh", overflowY: "auto" }}>
              <div style={{ fontSize: mobile ? 14 : 13, color: T.text, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: SANS }}>
                {result}
              </div>
              <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 8, marginTop: 16 }}>
                <GBtn onClick={() => { navigator.clipboard.writeText(result); }} outline sm>Copier</GBtn>
                <GBtn onClick={generate} outline sm>Regénérer</GBtn>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
