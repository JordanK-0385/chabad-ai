/* ─── Messages.jsx ─── Community message drafting module ─── */

import { useState, useEffect } from "react";
import { T, SERIF, SANS, INP, Card, GBtn, StepLabel, ChabadLogo, BackButton, AppHeader } from "./shared";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const TYPES = [
  { v: "invitation",  l: "Invitation",    e: "\uD83D\uDCE9" },
  { v: "voeux",       l: "Voeux",         e: "\uD83C\uDF1F" },
  { v: "remerciement",l: "Remerciement",  e: "\uD83D\uDE4F" },
  { v: "annonce",     l: "Annonce",       e: "\uD83D\uDCE2" },
  { v: "condoleances",l: "Condoléances",  e: "\uD83D\uDD4E" },
  { v: "collecte",    l: "Collecte",      e: "\uD83D\uDCB0" },
  { v: "rappel",      l: "Rappel",        e: "\u23F0" },
  { v: "autre",       l: "Autre",         e: "\u270F\uFE0F" },
];

const TONS = ["Chaleureux", "Formel", "Joyeux", "Solennel", "Amical", "Urgent"];

const TAILLES = [
  { v: "tres-court", l: "Très court" },
  { v: "court",      l: "Court" },
  { v: "moyen",      l: "Moyen" },
  { v: "long",       l: "Long" },
];
const FORMULATIONS = ["Tutoiement", "Vouvoiement"];

const MSG_LOAD_MSGS = ["Analyse de votre demande...", "Rédaction du message...", "Finalisation..."];
const MSG_LOAD_START = 15;

const CLAUDE_MSG_SYS = `Tu es expert en communication communautaire pour les institutions Chabad-Loubavitch en France.
Tu rediges des messages clairs, chaleureux et adaptes au contexte juif orthodoxe.
Inclus des formules hebraiques appropriees (Bezrat Hachem, Bli Neder, etc).
Reponds en francais.

LONGUEUR :
- Tres court : 2-3 lignes maximum, WhatsApp one-liner
- Court : 4-5 lignes, essentiel uniquement
- Moyen : 6-8 lignes, avec une pensee developpee
- Long : 10-12 lignes, message elabore avec benediction complete

FORMULATION :
Applique strictement le tutoiement (tu, toi, ton, ta) ou le vouvoiement (vous, votre, vos) dans tout le message y compris dans les formules d'ouverture et de cloture.`;

export default function Messages({ profil, onBack, headerProps }) {
  const [mobile, setMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const [type, setType] = useState("");
  const [destinataire, setDestinataire] = useState("");
  const [sujet, setSujet] = useState("");
  const [ton, setTon] = useState("Chaleureux");
  const [taille, setTaille] = useState("court");
  const [formulation, setFormulation] = useState("Vouvoiement");
  const [details, setDetails] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);
  const [loadTime, setLoadTime] = useState(MSG_LOAD_START);

  useEffect(() => {
    if (!loading) return;
    setLoadMsgIdx(0);
    setLoadTime(MSG_LOAD_START);
    const m = setInterval(() => setLoadMsgIdx(i => (i + 1) % MSG_LOAD_MSGS.length), 3000);
    const t = setInterval(() => setLoadTime(v => Math.max(0, v - 1)), 1000);
    return () => { clearInterval(m); clearInterval(t); };
  }, [loading]);

  async function generate() {
    if (!type && !sujet.trim()) { setErr("Choisissez un type ou décrivez le message."); return; }
    setLoading(true); setErr(""); setResult("");
    try {
      const bc = profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "Beth Chabad";
      const msg = [
        `Redige un message de type : ${type || "general"}`,
        destinataire.trim() ? `Destinataire(s) : ${destinataire.trim()}` : "",
        sujet.trim() ? `Sujet : ${sujet.trim()}` : "",
        `Ton : ${ton}`,
        `Longueur : ${taille}`,
        `Formulation : ${formulation}`,
        details.trim() ? `Details : ${details.trim()}` : "",
        `Institution : ${bc}`,
        profil?.telephone ? `Contact : ${profil.telephone}` : "",
        profil?.email ? `Email : ${profil.email}` : "",
        profil?.siteWeb ? `Site web : ${profil.siteWeb}` : "",
      ].filter(Boolean).join("\n");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: CLAUDE_MSG_SYS, messages: [{ role: "user", content: msg }] }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      const text = d.content?.find(b => b.type === "text")?.text || "";
      const inputTokens = d.usage?.input_tokens || 0;
      const outputTokens = d.usage?.output_tokens || 0;
      if (!text) throw new Error("Reponse vide de Claude.");
      setResult(text);

      try {
        if (profil?.onboardingComplete) {
          const coutEuros = ((inputTokens / 1000 * 0.003) + (outputTokens / 1000 * 0.015)) * 0.93;
          await addDoc(collection(db, "users", profil.uid, "messages"), {
            type: type,
            ton: ton,
            longueur: taille,
            sujet: sujet.trim(),
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            coutEuros: coutEuros,
            createdAt: serverTimestamp()
          });
        }
      } catch (_) {}
    } catch (e) {
      setErr("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>

      {/* Header */}
      {headerProps && <AppHeader currentScreen="messages" {...headerProps} />}

      <div className="mfp-page" style={{ maxWidth: 860, margin: "0 auto", padding: mobile ? "20px 14px" : "36px 24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <style>{`@media (max-width:600px){.mfp-page button{min-height:44px!important;font-size:14px!important;width:100%!important;box-sizing:border-box!important}.mfp-page input,.mfp-page textarea{font-size:16px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}}`}</style>

        <h1 style={{ flex: "1 1 100%", fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 24px" }}>
          💬 Rédiger un message
        </h1>

        {/* LEFT - controls */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="1">Type de message</StepLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: mobile ? 10 : 8 }}>
              {TYPES.map(t => (
                <div key={t.v} onClick={() => setType(t.v)} style={{ padding: mobile ? "14px 12px" : "10px 12px", minHeight: mobile ? 44 : 'auto', borderRadius: 8, cursor: "pointer", border: `1px solid ${type === t.v ? T.gold : T.border}`, background: type === t.v ? T.goldFaint : T.surface, display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box" }}>
                  <span style={{ fontSize: 18 }}>{t.e}</span>
                  <span style={{ fontSize: mobile ? 14 : 12, fontWeight: 600, color: type === t.v ? T.gold : T.text }}>{t.l}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="2">Personnalisation</StepLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 4, display: "block" }}>Destinataire(s)</label>
                <input value={destinataire} onChange={e => setDestinataire(e.target.value)} placeholder="Ex: Les fidèles, M. et Mme Cohen, La communauté..." style={INP} />
              </div>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 4, display: "block" }}>Sujet</label>
                <input value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Ex: Invitation au Seder communautaire" style={INP} />
              </div>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 6, display: "block" }}>Ton</label>
                <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                  {TONS.map(t => (
                    <span key={t} onClick={() => setTon(t)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${ton === t ? T.gold : T.border}`, color: ton === t ? T.gold : T.muted, background: ton === t ? T.goldSoft : T.surface }}>{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 6, display: "block" }}>Formulation</label>
                <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                  {FORMULATIONS.map(f => (
                    <span key={f} onClick={() => setFormulation(f)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${formulation === f ? T.gold : T.border}`, color: formulation === f ? T.gold : T.muted, background: formulation === f ? T.goldSoft : T.surface }}>{f}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 6, display: "block" }}>Longueur</label>
                <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                  {TAILLES.map(t => (
                    <span key={t.v} onClick={() => setTaille(t.v)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${taille === t.v ? T.gold : T.border}`, color: taille === t.v ? T.gold : T.muted, background: taille === t.v ? T.goldSoft : T.surface }}>{t.l}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 4, display: "block" }}>Détails supplémentaires (optionnel)</label>
                <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Ajoutez des informations spécifiques..." rows={3} style={{ ...INP, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            </div>
          </Card>

          {err && <div style={{ color: T.red, fontSize: mobile ? 14 : 12, marginBottom: 12, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 7, padding: "8px 12px" }}>{err}</div>}

          <div style={mobile ? { minHeight: 48 } : {}}>
            <GBtn onClick={generate} disabled={loading} fullWidth>
              {loading ? "Rédaction en cours..." : "Rédiger le message"}
            </GBtn>
          </div>
        </div>

        {/* RIGHT - result */}
        <div style={{ flex: "1 1 380px", minWidth: 0, width: mobile ? "100%" : "auto" }}>
          {!result && !loading && (
            <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28, minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <ChabadLogo size={48} color={T.faint} />
              <div style={{ fontSize: mobile ? 14 : 12, color: T.muted, textAlign: "center", lineHeight: 1.6 }}>
                Configurez les paramètres à gauche<br />puis cliquez sur <span style={{ color: T.gold }}>Rédiger le message</span>
              </div>
            </Card>
          )}
          {loading && (
            <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28, minHeight: 300, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
              <style>{`@keyframes mfp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <div style={{ width: 56, height: 56, borderRadius: "50%", border: "3px solid var(--color-border)", borderTopColor: "var(--color-accent)", animation: "mfp-spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, color: "var(--color-accent)", fontFamily: SANS, textAlign: "center", fontWeight: 600 }}>{MSG_LOAD_MSGS[loadMsgIdx]}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontFamily: SANS }}>
                {loadTime > 0 ? `Temps estimé : ${loadTime} secondes` : "Presque terminé..."}
              </div>
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
