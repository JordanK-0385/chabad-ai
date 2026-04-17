/* ─── Affiches.jsx ─── Poster generator module (extracted from App.jsx) ─── */

import { useState, useCallback, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { T, SERIF, SANS, INP, ChabadLogo, Card, GBtn, StepLabel, BackButton, AppHeader } from "./shared";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { CLAUDE_SYS } from "./prompts/affiche-claude";
import { CRITICAL_RULE, buildPrompt, buildLogoLine } from "./prompts/affiche-gemini";
import { generateAfficheContent } from "./services/claude-api";
import { generateAfficheImage as generateAfficheImageGemini } from "./services/gemini-api";
import { generateAfficheImage as generateAfficheImageOpenAI } from "./services/openai-api";
import { cropImageToRatio, aspectRatioForFormat } from "./utils/crop-image";

/* ─── Poster sizes ─── */
const SIZES = { carre: { w: 400, ar: "1/1" }, story: { w: 320, ar: "9/16" }, a4: { w: 370, ar: "3/4" }, paysage: { w: 480, ar: "4/3" } };

const AFF_LOAD_MSGS = ["Analyse de votre événement...", "Création du contenu...", "Génération de l'illustration...", "Finalisation de l'affiche..."];
const AFF_LOAD_START = 30;

/* ─── AfficheFinale ─── */
function AfficheFinale({ data, bc, fmt, imgSrc, loading, afficheRef, logoUrl, loadingMsg, loadingTime }) {
  const { w, ar } = SIZES[fmt] || SIZES.carre;
  const logo = logoUrl || "/logo-beth-loubavitch.png";

  if (loading) {
    return (
      <div style={{ width: w, aspectRatio: ar, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16, boxSizing: "border-box" }}>
        <style>{`@keyframes mfp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "3px solid var(--color-border)", borderTopColor: "var(--color-accent)", animation: "mfp-spin 1s linear infinite" }} />
        <div style={{ color: "var(--color-accent)", fontSize: 15, fontFamily: SANS, fontWeight: 600, textAlign: "center" }}>{loadingMsg}</div>
        <div style={{ color: "var(--color-text-muted)", fontSize: 13, fontFamily: SANS }}>
          {loadingTime > 0 ? `Temps estimé : ${loadingTime} secondes` : "Presque terminé..."}
        </div>
      </div>
    );
  }

  if (!imgSrc && !data) {
    return (
      <div style={{ width: w, aspectRatio: ar, background: T.card, border: `1px dashed ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <ChabadLogo size={56} color={T.faint} />
        <div style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "0 24px", lineHeight: 1.6 }}>
          Décrivez votre événement et cliquez sur Générer l'affiche
        </div>
      </div>
    );
  }

  if (!imgSrc && data) {
    return (
      <div style={{ width: w, aspectRatio: ar, background: T.card, border: `1px solid ${T.gold}30`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 20, boxSizing: "border-box" }}>
        <ChabadLogo size={40} color={T.gold} />
        <div style={{ fontSize: 13, color: T.gold, textAlign: "center", fontFamily: SANS }}>Contenu prêt !</div>
        <div style={{ fontSize: 11, color: T.muted, textAlign: "center", lineHeight: 1.5 }}>
          Ajoutez votre clé Google AI Studio<br />pour générer l'image illustrée
        </div>
      </div>
    );
  }

  const SH  = "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)";
  const SH2 = "0 2px 10px rgba(0,0,0,0.9)";
  const SH3 = "0 2px 12px rgba(0,0,0,0.9)";
  return (
    <div ref={afficheRef} style={{ width: w, aspectRatio: ar, containerType: "inline-size", borderRadius: 12, overflow: "hidden", position: "relative", boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 60px var(--color-accent-faint)`, border: `1px solid var(--color-accent-alpha)` }}>
      <img src={imgSrc} alt="Affiche" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <img src={logo} alt="" style={{ position: "absolute", top: "2%", left: "2.5%", width: "clamp(28px, 7%, 44px)", height: "auto", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.7))", opacity: 0.9 }} />
        <div style={{ position: "absolute", top: "2%", right: "2.5%", fontSize: "clamp(12px, 3.75cqw, 30px)", color: "#E8B030", fontFamily: SERIF, textShadow: SH2, fontWeight: 600 }}>{"\u05D1\u05E1\u05F4\u05D3"}</div>
        {data.texte_hebreu && <div style={{ position: "absolute", top: "3%", left: 0, right: 0, fontSize: "clamp(20px, 8cqw, 80px)", color: "#E8B030", fontFamily: SERIF, textAlign: "center", direction: "rtl", textShadow: "0 2px 15px rgba(0,0,0,0.95)", fontWeight: 700 }}>{data.texte_hebreu}</div>}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)", padding: "8% 0 4%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ maxWidth: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            {data.titre && <div style={{ fontSize: "clamp(26px, 9.5cqw, 90px)", fontWeight: 900, color: "#FFF", textAlign: "center", lineHeight: 1.1, fontFamily: SERIF, textShadow: SH, letterSpacing: -0.5, maxWidth: "90%" }}>{data.titre}</div>}
            {data.sous_titre && <div style={{ fontSize: "clamp(14px, 4.5cqw, 45px)", fontWeight: 400, color: "rgba(255,255,255,0.9)", textAlign: "center", fontFamily: SANS, textShadow: SH2, marginTop: "1.5%" }}>{data.sous_titre}</div>}
            <div style={{ display: "flex", gap: "2%", alignItems: "center", marginTop: "2.5%" }}>
              {data.date  && <span style={{ fontSize: "clamp(18px, 6cqw, 60px)", fontWeight: 800, color: "#E8B030", fontFamily: SANS, textShadow: SH3 }}>{data.date}</span>}
              {data.heure && <span style={{ fontSize: "clamp(16px, 5cqw, 50px)", fontWeight: 400, color: "rgba(255,255,255,0.95)", fontFamily: SANS, textShadow: SH3 }}>&middot; {data.heure}</span>}
            </div>
            {data.contact && <div style={{ fontSize: "clamp(12px, 3.75cqw, 30px)", color: "rgba(255,255,255,0.8)", textAlign: "center", fontFamily: SANS, textShadow: SH2 }}>{data.contact}</div>}
            <div style={{ fontSize: fmt === "story" ? "clamp(8px, 3.44cqw, 22px)" : (fmt === "a4" || fmt === "paysage") ? "clamp(10px, 3cqw, 28px)" : "clamp(10px, 3.25cqw, 30px)", color: "#E8B030", textAlign: "center", letterSpacing: 3, fontFamily: SERIF, marginTop: "2%", textShadow: SH2, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{bc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Affiches component ─── */
export default function Affiches({ profil, onBack, headerProps }) {
  const [mobile, setMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const [geminiKey] = useState(import.meta.env.VITE_GEMINI_KEY || "");
  const [openaiKey] = useState(import.meta.env.VITE_OPENAI_KEY || "");
  const [imageProvider, setImageProvider] = useState("gemini"); // "gemini" | "openai"
  const [desc,      setDesc]      = useState("");
  const [fmt,       setFmt]       = useState("carre");
  const [illustSelection, setIllustSelection] = useState([]);

  const [loading,   setLoading]   = useState(false);
  const [aData,     setAData]     = useState(null);
  const [errMsg,    setErrMsg]    = useState("");

  const [imgSrc,     setImgSrc]     = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [preview,    setPreview]    = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);
  const [loadTime,   setLoadTime]   = useState(AFF_LOAD_START);

  useEffect(() => {
    if (!loading) return;
    setLoadMsgIdx(0);
    setLoadTime(AFF_LOAD_START);
    const m = setInterval(() => setLoadMsgIdx(i => (i + 1) % AFF_LOAD_MSGS.length), 3000);
    const t = setInterval(() => setLoadTime(v => Math.max(0, v - 1)), 1000);
    return () => { clearInterval(m); clearInterval(t); };
  }, [loading]);
  const afficheRef = useRef(null);

  const bc = profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "Beth Chabad";
  const logoUrl = profil?.logoBase64 || "/logo-beth-loubavitch.png";
  const contactDefault = profil?.telephone || "";

  const geminiKeyRef = useRef(geminiKey);
  geminiKeyRef.current = geminiKey;
  const openaiKeyRef = useRef(openaiKey);
  openaiKeyRef.current = openaiKey;
  const imageProviderRef = useRef(imageProvider);
  imageProviderRef.current = imageProvider;

  const illustSelRef = useRef(illustSelection);
  illustSelRef.current = illustSelection;

  const getActiveImageKey = () => (imageProviderRef.current === "openai" ? openaiKeyRef.current : geminiKeyRef.current).trim();

  const callGemini = useCallback(async (contentData, bcName, format, sel) => {
    const provider = imageProviderRef.current;
    const key = (provider === "openai" ? openaiKeyRef.current : geminiKeyRef.current).trim();
    if (!key) return;
    const prompt = buildPrompt(contentData, bcName, format, sel);
    const logoLine = buildLogoLine(!!profil?.logoBase64);
    const fullPrompt = CRITICAL_RULE + "\n\n" + prompt + "\n\n" + logoLine;
    const rawSrc = provider === "openai"
      ? await generateAfficheImageOpenAI(fullPrompt, key, format)
      : await generateAfficheImageGemini(fullPrompt, key);
    if (!rawSrc) return;
    // Post-crop to exact target aspect ratio (center crop, no distortion)
    try {
      return await cropImageToRatio(rawSrc, aspectRatioForFormat(format));
    } catch {
      return rawSrc; // fallback to uncropped if crop fails
    }
  }, [profil?.logoBase64]);

  const generate = useCallback(async (note = "") => {
    if (!desc.trim()) { setErrMsg("Décrivez l'événement d'abord."); return; }
    setLoading(true); setErrMsg(""); setAData(null); setImgSrc(null);
    try {
      const msg = [
        `Affiche pour : ${desc.trim()}`,
        note ? `Ajustement : ${note}` : "",
        bc ? `Institution : ${bc}` : "",
        `Format : ${fmt}`,
        contactDefault ? `Contact par defaut : ${contactDefault}` : "",
        profil?.logoBase64 ? "Logo personnalisé disponible : utilise-le sur l'affiche." : "Utilise le logo par défaut Habad.ai (double vav doré).",
      ].filter(Boolean).join("\n");
      const { parsed, inputTokens, outputTokens } = await generateAfficheContent(msg, CLAUDE_SYS);
      setAData(parsed);

      try {
        if (profil?.onboardingComplete) {
          const coutEuros = ((inputTokens / 1000 * 0.003) + (outputTokens / 1000 * 0.015)) * 0.93;
          console.log("FIRESTORE LOG:", { inputTokens, outputTokens, coutEuros });
          await addDoc(collection(db, "users", profil.uid, "affiches"), {
            format: fmt,
            illustration: illustSelRef.current,
            betChabad: bc,
            titre: parsed.titre || "",
            logo: profil?.logoBase64 ? "utilisateur" : "defaut",
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            coutEuros: coutEuros,
            createdAt: serverTimestamp()
          });
        }
      } catch (_) {}

      if (getActiveImageKey()) {
        const src = await callGemini(parsed, bc, fmt, illustSelRef.current);
        if (src) setImgSrc(src);
      }
    } catch (e) {
      setErrMsg("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  }, [desc, fmt, bc, contactDefault, callGemini]);

  const regenImage = useCallback(async () => {
    if (!aData || !getActiveImageKey()) return;
    setLoading(true); setErrMsg(""); setImgSrc(null);
    try {
      const src = await callGemini(aData, bc, fmt, illustSelection);
      if (src) setImgSrc(src);
    } catch (e) {
      setErrMsg("Erreur Gemini : " + e.message);
    } finally {
      setLoading(false);
    }
  }, [aData, geminiKey, bc, fmt, illustSelection, callGemini]);

  async function downloadAffiche() {
    if (!afficheRef.current || downloading) return;
    setDownloading(true);
    const dimensions = {
      carre: { w: 1080, h: 1080 },
      story: { w: 1080, h: 1920 },
      a4: { w: 794, h: 1123 },
      paysage: { w: 1920, h: 1080 }
    };
    const { w, h } = dimensions[fmt] || dimensions.carre;
    const el = afficheRef.current;
    const originalWidth = el.style.width;
    const originalHeight = el.style.height;

    // Temporarily resize to exact target dimensions
    el.style.width = `${w/2}px`;
    el.style.height = `${h/2}px`;

    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        width: w/2,
        height: h/2,
        backgroundColor: null
      });
      const link = document.createElement("a");
      link.download = `affiche-${(aData?.titre || "chabad").slice(0,20).replace(/\s+/g,"-")}-${fmt}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      // Always restore size, even on error
      el.style.width = originalWidth;
      el.style.height = originalHeight;
      setDownloading(false);
    }
  }

  function copyPrompt() {
    if (!aData) return;
    const text = buildPrompt(aData, bc, fmt, illustSelection);
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const FMTS   = [{ v: "carre", l: "Carré", s: "1:1" }, { v: "story", l: "Story", s: "9:16" }, { v: "a4", l: "A4", s: "Impression" }, { v: "paysage", l: "Paysage", s: "4:3" }];
  const TWEAKS = ["Plus chaleureux", "Plus solennel", "Sans personnages", "Ajoute un verset", "Plus festif", "Simplifie"];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>

      {headerProps && <AppHeader currentScreen="affiches" {...headerProps} />}

      {/* Main */}
      <div className="mfp-page" style={{ maxWidth: 860, margin: "0 auto", padding: mobile ? "20px 14px" : "36px 24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <style>{`@media (max-width:600px){.mfp-page button{min-height:44px!important;font-size:14px!important;width:100%!important;box-sizing:border-box!important}.mfp-page input,.mfp-page textarea{font-size:16px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}.mfp-page .poster-wrap,.mfp-page .poster-wrap *{max-width:100%!important;box-sizing:border-box!important}}`}</style>

        <h1 style={{ flex: "1 1 100%", fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 24px" }}>
          🎨 Créer une affiche
        </h1>

        {/* LEFT */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="1">Décrivez votre événement</StepLabel>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={`Ex : Atelier Pessah pour les enfants, dimanche 20 avril, 16h à 18h, ${bc}. Garçons et filles de 4 à 12 ans. Kiddouch offert.`} rows={5} style={{ ...INP, resize: "vertical", lineHeight: 1.6, fontSize: mobile ? 16 : 13 }} />
            <div style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginTop: 7, lineHeight: 1.5 }}>Précisez le public pour adapter les illustrations automatiquement.</div>
          </Card>

          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="2">Format</StepLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: mobile ? 10 : 8 }}>
              {FMTS.map(f => (
                <div key={f.v} onClick={() => setFmt(f.v)} style={{ padding: mobile ? "14px 14px" : "10px 14px", minHeight: mobile ? 60 : 'auto', borderRadius: 8, cursor: "pointer", border: `1px solid ${fmt === f.v ? T.gold : T.border}`, background: fmt === f.v ? T.goldFaint : T.surface, boxSizing: "border-box" }}>
                  <div style={{ fontSize: mobile ? 14 : 12, fontWeight: 600, color: fmt === f.v ? T.gold : T.text }}>{f.l}</div>
                  <div style={{ fontSize: mobile ? 14 : 10.5, color: T.muted, marginTop: 2 }}>{f.s}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="3">Illustration</StepLabel>
            {(() => {
              const TILES = [
                { v: "decor",    e: "\uD83C\uDFDB", l: "Décor",     s: "Sans personnage" },
                { v: "garcons",  e: "\uD83D\uDC66", l: "Garçons",   s: "Masculin uniquement" },
                { v: "filles",   e: "\uD83D\uDC67", l: "Filles",    s: "Féminin uniquement" },
                { v: "rav",      e: "\uD83E\uDDD4", l: "Rav",       s: "Masculin uniquement" },
                { v: "rabbanit", e: "\uD83D\uDC69", l: "Rabbanit",  s: "Féminin uniquement" },
              ];
              const MALE_T = ["garcons", "rav"];
              const FEMALE_T = ["filles", "rabbanit"];
              const CHIPS = { garcons: ["Enfants","Adolescents","Adultes","Seniors"], filles: ["Enfants","Adolescentes","Adultes","Seniors"], rav: ["Adulte","\u00C2g\u00E9"], rabbanit: ["Adulte","\u00C2g\u00E9e"] };
              const LABELS = { garcons: "Garçons", filles: "Filles", rav: "Rav", rabbanit: "Rabbanit" };

              function toggleTile(tid) {
                if (tid === "decor") { setIllustSelection([]); return; }
                const exists = illustSelection.find(s => s.tile === tid);
                if (exists) { setIllustSelection(illustSelection.filter(s => s.tile !== tid)); }
                else if (illustSelection.length >= 2) { setIllustSelection([illustSelection[1], { tile: tid, age: null, qty: null }]); }
                else { setIllustSelection([...illustSelection, { tile: tid, age: null, qty: null }]); }
              }
              function setAge(tid, age) { setIllustSelection(illustSelection.map(s => s.tile === tid ? { ...s, age: s.age === age ? null : age } : s)); }
              function setQty(tid, q) { setIllustSelection(illustSelection.map(s => s.tile === tid ? { ...s, qty: s.qty === q ? null : q } : s)); }
              const HAS_QTY = ["garcons", "filles"];

              const isDecor = !illustSelection.length;
              const selTiles = illustSelection.map(s => s.tile);
              const hasMixed = illustSelection.length === 2 && ((MALE_T.includes(selTiles[0]) && FEMALE_T.includes(selTiles[1])) || (FEMALE_T.includes(selTiles[0]) && MALE_T.includes(selTiles[1])));

              let summary = "Décor uniquement \u2014 aucun personnage";
              if (illustSelection.length === 1) {
                const s = illustSelection[0];
                summary = s.age ? `${LABELS[s.tile]} \u00B7 ${s.age}` : `Choisissez une tranche d'âge`;
              } else if (illustSelection.length === 2) {
                const noAge = illustSelection.find(s => !s.age);
                if (noAge) summary = `Complétez la tranche d'âge pour ${LABELS[noAge.tile]}`;
                else summary = illustSelection.map(s => `${LABELS[s.tile]} ${s.age}`).join(" \u00B7 ");
              }

              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: mobile ? 10 : 8 }}>
                    {TILES.map(o => {
                      const sel = selTiles.includes(o.v);
                      const isDecorSel = o.v === "decor" && isDecor;
                      const active = sel || isDecorSel;
                      const idx = selTiles.indexOf(o.v);
                      return (
                        <div key={o.v} onClick={() => toggleTile(o.v)} style={{ padding: mobile ? "16px 8px" : "12px 8px", minHeight: mobile ? 88 : 'auto', borderRadius: 8, cursor: "pointer", textAlign: "center", position: "relative", border: `1px solid ${active ? T.gold : T.border}`, background: active ? T.goldFaint : T.surface, boxSizing: "border-box" }}>
                          {sel && illustSelection.length === 2 && <div style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", background: T.gold, color: "#05100C", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</div>}
                          <div style={{ fontSize: 24, marginBottom: 6 }}>{o.e}</div>
                          <div style={{ fontSize: mobile ? 14 : 13, fontWeight: 600, color: active ? T.gold : T.text }}>{o.l}</div>
                          <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{o.s}</div>
                        </div>
                      );
                    })}
                  </div>
                  {illustSelection.map(s => {
                    const opts = CHIPS[s.tile] || [];
                    if (!opts.length) return null;
                    const showQty = HAS_QTY.includes(s.tile);
                    return (
                      <div key={s.tile} style={{ marginTop: 14 }}>
                        <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, letterSpacing: mobile ? 0.5 : 1.5, textTransform: "uppercase", marginBottom: 6 }}>{LABELS[s.tile]} · Tranche d'âge</div>
                        <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                          {opts.map(a => (
                            <span key={a} onClick={() => setAge(s.tile, a)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${s.age === a ? T.gold : T.border}`, color: s.age === a ? T.gold : T.muted, background: s.age === a ? T.goldSoft : T.surface }}>{a}</span>
                          ))}
                        </div>
                        {showQty && (
                          <>
                            <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, letterSpacing: mobile ? 0.5 : 1.5, textTransform: "uppercase", marginBottom: 6, marginTop: 10 }}>{LABELS[s.tile]} · Nombre</div>
                            <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                              {[{ v: "1", l: "Seul(e)" }, { v: "groupe", l: "Groupe" }].map(q => (
                                <span key={q.v} onClick={() => setQty(s.tile, q.v)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${s.qty === q.v ? T.gold : T.border}`, color: s.qty === q.v ? T.gold : T.muted, background: s.qty === q.v ? T.goldSoft : T.surface }}>{q.l}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {hasMixed && <div style={{ fontSize: mobile ? 14 : 10, color: T.gold, marginTop: 6 }}>Scène mixte — séparation visuelle appliquée automatiquement</div>}
                  <div style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginTop: 10 }}>{summary}</div>
                </>
              );
            })()}
          </Card>

          {errMsg && <div style={{ color: T.red, fontSize: mobile ? 14 : 12, marginBottom: 12, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 7, padding: "8px 12px", lineHeight: 1.5 }}>{errMsg}</div>}
          {((imageProvider === "gemini" && !geminiKey) || (imageProvider === "openai" && !openaiKey)) && <div style={{ color: T.red, fontSize: mobile ? 14 : 11, marginBottom: 10 }}>Configuration requise — clé API {imageProvider === "openai" ? "OpenAI" : "Gemini"} manquante</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: mobile ? 14 : 12, fontFamily: SANS }}>
            <span style={{ color: T.muted, flexShrink: 0 }}>Modèle image :</span>
            {[
              { id: "gemini", label: "Gemini", available: !!geminiKey },
              { id: "openai", label: "DALL·E 3", available: !!openaiKey },
            ].map(p => {
              const active = imageProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setImageProvider(p.id)}
                  style={{
                    padding: mobile ? "8px 14px" : "5px 12px",
                    borderRadius: 7,
                    fontSize: mobile ? 14 : 12,
                    fontWeight: active ? 700 : 500,
                    background: active ? T.gold : "transparent",
                    color: active ? "#1a0510" : (p.available ? T.muted : T.faint),
                    border: `1px solid ${active ? T.gold : T.border}`,
                    cursor: "pointer",
                    fontFamily: SANS,
                    opacity: p.available ? 1 : 0.55,
                  }}
                  title={p.available ? `Utiliser ${p.label}` : `Clé API ${p.label} non configurée`}
                >
                  {p.label}{!p.available ? " ⚠" : ""}
                </button>
              );
            })}
          </div>

          <div style={{ position: aData ? "static" : "sticky", bottom: 16, zIndex: 10, background: T.bg, paddingTop: 8, paddingBottom: 8, ...(mobile ? { minHeight: 52 } : {}) }}>
            <GBtn onClick={() => generate()} disabled={loading} fullWidth>
              {loading ? "Génération en cours..." : "Générer l'affiche"}
            </GBtn>
          </div>

          {aData && !loading && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 12 }}>
              <div style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 9 }}>Ajuster :</div>
              <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                {TWEAKS.map(tw => (
                  <span key={tw} onClick={() => generate(tw)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 11px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 20, color: T.muted, cursor: "pointer", background: T.surface }}>{tw}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: mobile ? "stretch" : "center", gap: 14, minWidth: mobile ? "100%" : 280, width: mobile ? "100%" : "auto" }}>
          <div className="poster-wrap" onClick={() => imgSrc && setPreview(true)} style={{ cursor: imgSrc ? "pointer" : "default", maxWidth: "100%" }}>
            <AfficheFinale data={aData} bc={bc} fmt={fmt} imgSrc={imgSrc} loading={loading} afficheRef={afficheRef} logoUrl={logoUrl} loadingMsg={AFF_LOAD_MSGS[loadMsgIdx]} loadingTime={loadTime} />
          </div>
          {imgSrc && !loading && <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, marginTop: -8 }}>Cliquez sur l'affiche pour l'aperçu plein écran</div>}

          {imgSrc && !loading && (
            <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 8, flexWrap: "wrap", justifyContent: "center" }}>
              <GBtn onClick={() => setPreview(true)} outline sm>Aperçu</GBtn>
              <GBtn onClick={downloadAffiche} outline sm disabled={downloading}>{downloading ? "Préparation…" : "Télécharger"}</GBtn>
              <GBtn onClick={regenImage} outline sm>Nouvelle image</GBtn>
              <GBtn onClick={() => generate()} outline sm>Tout regénérer</GBtn>
              <button onClick={() => { setAData(null); setDesc(""); setImgSrc(null); }} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, fontSize: mobile ? 14 : 12, cursor: "pointer" }}>Effacer</button>
            </div>
          )}

          {aData && !loading && (
            <div style={{ width: "100%", maxWidth: 420 }}>
              <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 8, marginTop: 4 }}>
                <button onClick={copyPrompt} style={{ flex: 1, padding: "7px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, color: copied ? T.green : T.muted, fontSize: mobile ? 14 : 11, cursor: "pointer", fontFamily: SANS }}>
                  {copied ? "Copie !" : "Copier le prompt"}
                </button>
                <button onClick={() => setShowPrompt(v => !v)} style={{ padding: "7px 10px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, fontSize: mobile ? 14 : 11, cursor: "pointer" }}>
                  {showPrompt ? "\u25B2" : "\u25BC"}
                </button>
              </div>
              {showPrompt && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: mobile ? 14 : 10.5, color: T.muted, fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", marginTop: 8 }}>
                  {buildPrompt(aData, bc, fmt, illustSelection)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview overlay */}
      {preview && imgSrc && aData && (
        <div onClick={() => setPreview(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? 12 : 24, cursor: "zoom-out", boxSizing: "border-box" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "min(90vw, 700px)", maxHeight: "90vh", cursor: "default" }}>
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: `0 20px 80px rgba(0,0,0,0.7), 0 0 100px var(--color-accent-faint)`, border: `1px solid var(--color-accent-soft)` }}>
              <img src={imgSrc} alt="Affiche" style={{ width: "100%", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <img src={logoUrl} alt="" style={{ position: "absolute", top: 14, left: 16, width: "clamp(36px, 8%, 56px)", height: "auto", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))", opacity: 0.9 }} />
                <div style={{ position: "absolute", top: 16, right: 20, fontSize: "clamp(14px, 2vw, 18px)", color: "#E8B030", fontFamily: SERIF, textShadow: "0 2px 10px rgba(0,0,0,0.9)", fontWeight: 600 }}>{"\u05D1\u05E1\u05F4\u05D3"}</div>
                {aData.texte_hebreu && <div style={{ position: "absolute", top: 22, left: 0, right: 0, fontSize: "clamp(24px, 5vw, 38px)", color: "#E8B030", fontFamily: SERIF, textAlign: "center", direction: "rtl", textShadow: "0 2px 15px rgba(0,0,0,0.95)", fontWeight: 700 }}>{aData.texte_hebreu}</div>}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)", padding: "50px 0 28px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ maxWidth: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    {aData.titre && <div style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 900, color: "#FFF", textAlign: "center", lineHeight: 1.1, fontFamily: SERIF, textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)", letterSpacing: -0.5, maxWidth: "90%" }}>{aData.titre}</div>}
                    {aData.sous_titre && <div style={{ fontSize: "clamp(15px, 2.5vw, 20px)", fontWeight: 400, color: "rgba(255,255,255,0.9)", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)", marginTop: 6 }}>{aData.sous_titre}</div>}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                      {aData.date  && <span style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 800, color: "#E8B030", fontFamily: SANS, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>{aData.date}</span>}
                      {aData.heure && <span style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 400, color: "rgba(255,255,255,0.95)", fontFamily: SANS, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>&middot; {aData.heure}</span>}
                    </div>
                    {aData.lieu    && <div style={{ fontSize: "clamp(15px, 2.2vw, 20px)", fontWeight: 600, color: "#FFF", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)", marginTop: 6 }}>{aData.lieu}</div>}
                    {aData.adresse && <div style={{ fontSize: "clamp(13px, 2vw, 17px)", color: "rgba(255,255,255,0.8)", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{aData.adresse}</div>}
                    {aData.contact && <div style={{ fontSize: "clamp(13px, 2vw, 17px)", color: "rgba(255,255,255,0.8)", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{aData.contact}</div>}
                    <div style={{ fontSize: "clamp(12px, 1.8vw, 16px)", color: "#E8B030", textAlign: "center", letterSpacing: 3, fontFamily: SERIF, marginTop: 10, textShadow: "0 2px 10px rgba(0,0,0,0.9)", textTransform: "uppercase" }}>{bc}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 10, justifyContent: "center", marginTop: 16 }}>
              <GBtn onClick={downloadAffiche} sm disabled={downloading}>{downloading ? "Préparation…" : "Télécharger"}</GBtn>
              <GBtn onClick={() => setPreview(false)} outline sm>Fermer</GBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
