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

const CLAUDE_COURS_SYS = `Tu es un assistant rabbinique expert en Torah, Talmud, Halakha, Hassidout et enseignements du Rabbi de Loubavitch.
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

  async function generate() {
    if (!occasion && !sujet.trim()) { setErr("Choisissez une occasion ou décrivez le sujet."); return; }
    setLoading(true); setErr(""); setResult("");
    try {
      const bc = profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "Beth Chabad";
      const msg = [
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
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system: CLAUDE_COURS_SYS, messages: [{ role: "user", content: msg }] }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      const text = d.content?.find(b => b.type === "text")?.text || "";
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

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: mobile ? "16px 12px" : "24px 18px", display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>

        {/* LEFT - controls */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Card>
            <StepLabel n="1">Occasion</StepLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {OCCASIONS.map(o => (
                <div key={o.v} onClick={() => setOccasion(o.v)} style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${occasion === o.v ? T.gold : T.border}`, background: occasion === o.v ? T.goldFaint : T.surface, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{o.e}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: occasion === o.v ? T.gold : T.text }}>{o.l}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <StepLabel n="2">Paramètres</StepLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: "block" }}>Durée</label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {DUREES.map(d => (
                    <span key={d} onClick={() => setDuree(d)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: `1px solid ${duree === d ? T.gold : T.border}`, color: duree === d ? T.gold : T.muted, background: duree === d ? T.goldSoft : T.surface }}>{d}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: "block" }}>Langue</label>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {LANGUES.map(l => (
                    <span key={l} onClick={() => setLangue(l)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: `1px solid ${langue === l ? T.gold : T.border}`, color: langue === l ? T.gold : T.muted, background: langue === l ? T.goldSoft : T.surface }}>{l}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Sujet (optionnel)</label>
                <textarea value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Ex: La joie dans le service divin, le sens de la Mezouza, lien avec l'actualité..." rows={3} style={{ ...INP, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            </div>
          </Card>

          <Card>
            <StepLabel n="3">Enrichissements</StepLabel>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {ENRICHISSEMENTS.map(e => {
                const sel = enrichissements.includes(e);
                return (
                  <span key={e} onClick={() => toggleEnrich(e)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: `1px solid ${sel ? T.gold : T.border}`, color: sel ? T.gold : T.muted, background: sel ? T.goldSoft : T.surface }}>{e}</span>
                );
              })}
            </div>
          </Card>

          {err && <div style={{ color: T.red, fontSize: 12, marginBottom: 12, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 7, padding: "8px 12px" }}>{err}</div>}

          <div style={mobile ? { minHeight: 48 } : {}}>
            <GBtn onClick={generate} disabled={loading} fullWidth>
              {loading ? "Génération en cours..." : "Générer le cours"}
            </GBtn>
          </div>
        </div>

        {/* RIGHT - result */}
        <div style={{ flex: "1 1 380px", minWidth: 0, width: mobile ? "100%" : "auto" }}>
          {!result && !loading && (
            <Card style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <ChabadLogo size={48} color={T.faint} />
              <div style={{ fontSize: 12, color: T.muted, textAlign: "center", lineHeight: 1.6 }}>
                Configurez les paramètres à gauche<br />puis cliquez sur <span style={{ color: T.gold }}>Générer le cours</span>
              </div>
            </Card>
          )}
          {loading && (
            <Card style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ fontSize: 32, animation: "pulse 1.5s ease-in-out infinite" }}>{"\uD83D\uDCDA"}</div>
              <div style={{ fontSize: 14, color: T.gold }}>Préparation du cours...</div>
            </Card>
          )}
          {result && (
            <Card style={{ maxHeight: "75vh", overflowY: "auto" }}>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: SANS }}>
                {result}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
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
