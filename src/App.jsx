import { useState, useCallback } from "react";

const T = {
  bg:      "#06101C",
  surface: "#0B1827",
  card:    "#101F35",
  border:  "#1C3258",
  gold:    "#C9971A",
  goldBr:  "#E8B030",
  text:    "#EDE8DC",
  muted:   "#6A8AAA",
  faint:   "#283F5A",
  red:     "#D94F4F",
  green:   "#2DCF90",
};
const SERIF = "Georgia, 'Palatino Linotype', serif";
const SANS  = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const CLAUDE_SYS = `Tu es expert en communication visuelle pour institutions Chabad-Loubavitch France.

RÈGLES ABSOLUES :
- BSD (בס"ד) haut à droite sur toute affiche
- Étoile de David : 6 branches classiques, jamais carré ni hexagone
- Kippah TOUJOURS sombre : marine, noir ou bordeaux — JAMAIS blanche (blanc = taqiyah islamique)
- Filles/femmes : cheveux NATURELS visibles (tresse, queue de cheval) — JAMAIS hijab, voile ou foulard islamique
- Tsniout : jupe longue sous genou, manches longues
- Jamais croix, hamsa, symboles d'autres religions

COULEURS : Pessah→blanc,or,bleu clair | Hanoukka→bleu,argent,or | Pourim→violet,or | Lag BaOmer→orange,brun | Solennelle/Yahrzeit→bordeaux,gris | Défaut→#003087+or

Réponds UNIQUEMENT JSON valide sans backtick :
{"titre":"...","sous_titre":"...","date":"...","heure":"...","lieu":"...","adresse":"...","public":"...","accroche":"...","texte_hebreu":"...","ambiance":"festive","emoji":"...","contact":"...","kashrout":"...","personnages":["garcon","fille"],"couleur_dominante":"#003087","couleur_accent":"#C9971A"}`;

function buildPrompt(data, bc, fmt) {
  const ratios = { carre: "1:1", story: "9:16", a4: "3:4", paysage: "4:3" };
  const ar     = ratios[fmt] || "1:1";
  const boys   = (data.personnages || []).filter(p => p === "garcon").length;
  const girls  = (data.personnages || []).filter(p => p === "fille").length;
  let chars = "";
  if (boys)  chars += `${boys} Jewish Chabad boy${boys > 1 ? "s" : ""}: dark navy or black suede kippah (NEVER white), white shirt, visible white tzitzit strings at waist, long dark trousers. `;
  if (girls) chars += `${girls} Jewish Chabad girl${girls > 1 ? "s" : ""}: natural visible hair in braids or ponytail (absolutely NO hijab, NO headscarf, NO veil of any kind), modest long dress below knee, long sleeves. `;
  const isSol = data.ambiance === "solennelle";
  const pal   = isSol ? "dark burgundy and charcoal, dignified" : "deep Chabad blue and warm gold, festive";
  return {
    ar,
    text: `Warm illustrated storybook-style poster for a Chabad-Lubavitch Jewish community event in France.
Event: ${data.titre}${data.sous_titre ? " — " + data.sous_titre : ""}. ${[data.date, data.heure, data.lieu].filter(Boolean).join(", ")}.
Institution: ${bc}.
${chars ? "Characters: " + chars : ""}
MANDATORY RULES — ALL REQUIRED:
1. Kippah: dark navy blue or black, NEVER white (white = Islamic taqiyah — forbidden)
2. Girls/women: natural visible hair, NO hijab, NO veil, NO headscarf covering face or neck
3. Tzitzit: white strings hanging from undergarment corners
4. Modest dress: long skirts, long sleeves for all women/girls
5. No crosses, crescents, hamsa or non-Jewish symbols
6. Star of David: classic 6-pointed shape only
7. Hebrew "בס״ד" top-right corner
8. Colors: ${pal}
9. Style: warm storybook illustration, NOT photorealistic
10. Aspect ratio: ${ar}
${data.texte_hebreu ? '11. Hebrew text: "' + data.texte_hebreu + '"' : ""}
High quality, suitable for WhatsApp and print.`,
  };
}

function Star({ size = 40, color = T.gold, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0, ...style }}>
      <polygon points="50,6 95,79 5,79"  fill="none" stroke={color} strokeWidth="5" strokeLinejoin="round" />
      <polygon points="50,94 5,21 95,21" fill="none" stroke={color} strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

function Boy({ cx, sc = 1, kc = "#003087" }) {
  return (
    <g transform={`translate(${cx - 30 * sc}, 0) scale(${sc})`}>
      <ellipse cx="19" cy="126" rx="13" ry="6" fill="#221408" />
      <ellipse cx="41" cy="126" rx="13" ry="6" fill="#221408" />
      <rect x="12" y="85" width="16" height="43" rx="5" fill="#1C2D50" />
      <rect x="32" y="85" width="16" height="43" rx="5" fill="#1C2D50" />
      <line x1="13" y1="84" x2="8"  y2="110" stroke="#F5F0DC" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="85" x2="12" y2="111" stroke="#F5F0DC" strokeWidth="2" strokeLinecap="round" />
      <line x1="43" y1="84" x2="48" y2="110" stroke="#F5F0DC" strokeWidth="2" strokeLinecap="round" />
      <line x1="47" y1="85" x2="52" y2="111" stroke="#F5F0DC" strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="50" width="40" height="38" rx="7" fill="#FAFCF8" stroke="#DDD6C8" strokeWidth="0.8" />
      <rect x="0"  y="52" width="13" height="24" rx="5" fill="#FAFCF8" stroke="#DDD6C8" strokeWidth="0.8" />
      <rect x="47" y="52" width="13" height="24" rx="5" fill="#FAFCF8" stroke="#DDD6C8" strokeWidth="0.8" />
      <ellipse cx="6"  cy="78" rx="7" ry="6" fill="#F5D5A4" />
      <ellipse cx="54" cy="78" rx="7" ry="6" fill="#F5D5A4" />
      <rect x="24" y="44" width="12" height="10" rx="4" fill="#F5D5A4" />
      <circle cx="30" cy="28" r="22" fill="#F5D5A4" />
      <ellipse cx="8"  cy="30" rx="5" ry="6" fill="#EDCA94" />
      <ellipse cx="52" cy="30" rx="5" ry="6" fill="#EDCA94" />
      <path d="M10,25 Q10,9 30,8 Q50,9 50,25" fill="#4A2808" />
      <ellipse cx="30" cy="12" rx="20" ry="12" fill={kc} />
      <path d="M10,15 Q10,5 30,4 Q50,5 50,15" fill={kc} />
      <path d="M15,11 Q22,7 30,6" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="22" cy="27" r="3.2" fill="#3A1F08" />
      <circle cx="38" cy="27" r="3.2" fill="#3A1F08" />
      <circle cx="23" cy="26" r="1.1" fill="rgba(255,255,255,0.5)" />
      <circle cx="39" cy="26" r="1.1" fill="rgba(255,255,255,0.5)" />
      <path d="M18,21 Q22,19 26,21" stroke="#4A2808" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M34,21 Q38,19 42,21" stroke="#4A2808" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M22,38 Q30,45 38,38" fill="none" stroke="#A06830" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="17" cy="35" r="5" fill="rgba(240,140,100,0.22)" />
      <circle cx="43" cy="35" r="5" fill="rgba(240,140,100,0.22)" />
    </g>
  );
}

function Girl({ cx, sc = 1, rc = T.gold }) {
  return (
    <g transform={`translate(${cx - 30 * sc}, 0) scale(${sc})`}>
      <ellipse cx="20" cy="134" rx="12" ry="5" fill="#221408" />
      <ellipse cx="40" cy="134" rx="12" ry="5" fill="#221408" />
      <path d="M11,78 Q9,132 20,136 L40,136 Q51,132 49,78 Z" fill={rc + "CC"} />
      <path d="M16,95 Q30,101 44,95" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" fill="none" />
      <rect x="10" y="50" width="40" height="32" rx="7" fill={rc} />
      <rect x="0"  y="52" width="13" height="28" rx="5" fill={rc} />
      <rect x="47" y="52" width="13" height="28" rx="5" fill={rc} />
      <ellipse cx="6"  cy="82" rx="7" ry="6" fill="#F5D5A4" />
      <ellipse cx="54" cy="82" rx="7" ry="6" fill="#F5D5A4" />
      <ellipse cx="30" cy="52" rx="11" ry="5" fill={rc} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <rect x="24" y="44" width="12" height="10" rx="4" fill="#F5D5A4" />
      <circle cx="30" cy="28" r="22" fill="#F5D5A4" />
      <ellipse cx="8"  cy="30" rx="5" ry="6" fill="#EDCA94" />
      <ellipse cx="52" cy="30" rx="5" ry="6" fill="#EDCA94" />
      <path d="M9,26 Q9,6 30,5 Q51,6 51,26" fill="#5C3010" />
      <path d="M9,26 Q7,42 10,54 Q15,60 20,56 Q14,48 12,38 Z" fill="#5C3010" />
      <path d="M51,26 Q53,42 50,54 Q45,60 40,56 Q46,48 48,38 Z" fill="#5C3010" />
      <ellipse cx="30" cy="29" rx="17" ry="21" fill="#F5D5A4" />
      <path d="M50,28 Q56,38 54,52 Q52,62 50,68" stroke="#4A2808" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M48,34 Q54,37 52,41" stroke="#6B3810" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M48,43 Q54,46 52,50" stroke="#6B3810" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="51" cy="27" rx="5" ry="3" fill={rc} opacity="0.95" />
      <circle cx="22" cy="26" r="3.2" fill="#3A1F08" />
      <circle cx="38" cy="26" r="3.2" fill="#3A1F08" />
      <circle cx="23" cy="25" r="1.1" fill="rgba(255,255,255,0.5)" />
      <circle cx="39" cy="25" r="1.1" fill="rgba(255,255,255,0.5)" />
      <path d="M19,22 Q22,20 25,22" stroke="#4A2808" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M35,22 Q38,20 41,22" stroke="#4A2808" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M22,38 Q30,46 38,38" fill="none" stroke="#A06830" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="35" r="5.5" fill="rgba(240,130,120,0.28)" />
      <circle cx="44" cy="35" r="5.5" fill="rgba(240,130,120,0.28)" />
    </g>
  );
}

function Characters({ list = [], accent = T.gold, dom = "#003087" }) {
  if (!list.length) return null;
  const chars = list.slice(0, 3);
  const n  = chars.length;
  const sc = n === 1 ? 0.82 : n === 2 ? 0.72 : 0.60;
  const cw = 65 * sc;
  const W  = 320;
  const sx = (W - n * cw * 1.4) / 2 + cw * 0.7;
  const h  = Math.round(140 * sc + 8);
  const lightHex = ["#fff","#ffffff","#f5f5f5","#fafafa","#e8f0fa"];
  const kc = lightHex.includes(dom.toLowerCase()) ? "#003087" : dom;
  return (
    <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} style={{ overflow: "visible" }}>
      {chars.map((type, i) => {
        const cx = sx + i * cw * 1.4;
        if (type === "garcon") return <Boy  key={i} cx={cx} sc={sc} kc={kc} />;
        if (type === "fille")  return <Girl key={i} cx={cx} sc={sc} rc={accent} />;
        return null;
      })}
    </svg>
  );
}

function AfficheSVG({ data, bc, fmt }) {
  if (!data) return null;
  const sol   = data.ambiance === "solennelle";
  const story = fmt === "story";
  const dom   = data.couleur_dominante || (sol ? "#1A0820" : "#002060");
  const acc   = data.couleur_accent    || (sol ? "#991828" : T.gold);
  const aBr   = sol ? "#D04050" : T.goldBr;
  const w     = story ? 270 : 370;
  return (
    <div style={{ width: w, flexShrink: 0, background: `linear-gradient(155deg, ${sol ? "#0C040E" : dom}, ${sol ? "#1A0A20" : dom + "CC"})`, borderRadius: 12, padding: "18px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden", fontFamily: SERIF, color: T.text, border: `1px solid ${acc}50`, boxShadow: `0 0 60px ${acc}20` }}>
      <div style={{ position: "absolute", bottom: -50, right: -50, opacity: 0.05, pointerEvents: "none" }}><Star size={260} color={acc} /></div>
      <div style={{ position: "absolute", top: 10, right: 14, fontSize: 10, color: acc, letterSpacing: 1, zIndex: 2, fontFamily: SERIF }}>בס״ד</div>
      <div style={{ width: "50%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}, transparent)`, marginBottom: 10, marginTop: 12, zIndex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, zIndex: 1 }}>
        <Star size={17} color={acc} /><span style={{ fontSize: 19, lineHeight: 1 }}>{data.emoji || "✡"}</span><Star size={17} color={acc} />
      </div>
      {data.texte_hebreu && <div style={{ fontSize: 17, color: aBr, marginBottom: 6, zIndex: 1, direction: "rtl", textAlign: "center", fontFamily: SERIF }}>{data.texte_hebreu}</div>}
      <div style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", lineHeight: 1.25, color: "#FFF", marginBottom: 5, zIndex: 1 }}>{data.titre}</div>
      {data.sous_titre && <div style={{ fontSize: 11.5, textAlign: "center", color: "#EDE8DCAA", marginBottom: 7, zIndex: 1, lineHeight: 1.4, fontFamily: SANS }}>{data.sous_titre}</div>}
      {data.accroche && <div style={{ fontSize: 10.5, textAlign: "center", color: aBr, fontStyle: "italic", marginBottom: 9, zIndex: 1, lineHeight: 1.5, padding: "0 4px" }}>« {data.accroche} »</div>}
      {data.personnages && data.personnages.length > 0 && <div style={{ marginBottom: 7, zIndex: 1 }}><Characters list={data.personnages} accent={acc} dom={dom} /></div>}
      <div style={{ width: "70%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}70, transparent)`, marginBottom: 9, zIndex: 1 }} />
      <div style={{ background: `${acc}18`, border: `1px solid ${acc}40`, borderRadius: 7, padding: "8px 12px", width: "92%", boxSizing: "border-box", zIndex: 1, marginBottom: 7 }}>
        {data.date   && <div style={{ fontSize: 12.5, fontWeight: "bold", color: aBr, textAlign: "center", marginBottom: 2, fontFamily: SANS }}>{data.date}</div>}
        {data.heure  && <div style={{ fontSize: 11.5, color: T.text, textAlign: "center", fontFamily: SANS }}>{data.heure}</div>}
        {data.public && <div style={{ fontSize: 10, color: T.muted, textAlign: "center", marginTop: 3, fontFamily: SANS }}>{data.public}</div>}
      </div>
      {data.lieu     && <div style={{ fontSize: 11, color: T.text, textAlign: "center", marginBottom: 2, zIndex: 1, fontFamily: SANS }}>{data.lieu}</div>}
      {data.adresse  && <div style={{ fontSize: 10, color: T.muted, textAlign: "center", marginBottom: 3, zIndex: 1, fontFamily: SANS }}>{data.adresse}</div>}
      {data.kashrout && <div style={{ fontSize: 9.5, color: acc, textAlign: "center", marginBottom: 3, zIndex: 1, fontFamily: SANS, border: `1px solid ${acc}40`, borderRadius: 4, padding: "2px 7px" }}>{data.kashrout}</div>}
      {data.contact  && <div style={{ fontSize: 10, color: T.muted, textAlign: "center", marginBottom: 3, zIndex: 1, fontFamily: SANS }}>{data.contact}</div>}
      <div style={{ flex: 1 }} />
      <div style={{ width: "50%", height: 1, background: `linear-gradient(90deg, transparent, ${acc}, transparent)`, marginBottom: 6, zIndex: 1 }} />
      <div style={{ fontSize: 10, color: acc, textAlign: "center", letterSpacing: 1, zIndex: 1, fontFamily: SERIF }}>{bc}</div>
    </div>
  );
}

const INP = { width: "100%", padding: "9px 12px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 7, color: T.text, fontSize: 13.5, outline: "none", boxSizing: "border-box", fontFamily: SANS };

function StepLabel({ n, children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ background: T.gold, color: "#05100C", borderRadius: 20, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{n}</span>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 14, ...style }}>{children}</div>;
}

function GBtn({ onClick, children, disabled = false, outline = false, sm = false, fullWidth = false }) {
  const base = { padding: sm ? "7px 14px" : "11px 22px", borderRadius: 7, fontSize: sm ? 12 : 13.5, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: SANS, width: fullWidth ? "100%" : "auto" };
  if (outline) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: "transparent", border: `1px solid ${T.gold}`, color: T.gold, opacity: disabled ? 0.5 : 1 }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{ ...base, background: disabled ? "#7A5F0A" : T.gold, color: "#05100C", border: "none", opacity: disabled ? 0.6 : 1 }}>{children}</button>;
}

export default function App() {
  const [betChabad, setBetChabad] = useState("");
  const [geminiKey, setGeminiKey] = useState(import.meta.env.VITE_GEMINI_KEY || "");
  const [showKey,   setShowKey]   = useState(false);
  const [desc,      setDesc]      = useState("");
  const [fmt,       setFmt]       = useState("carre");

  const [claudeLoading, setClaudeLoading] = useState(false);
  const [aData,         setAData]         = useState(null);
  const [claudeErr,     setClaudeErr]     = useState("");

  const [imgLoading, setImgLoading] = useState(false);
  const [imgSrc,     setImgSrc]     = useState(null);
  const [imgErr,     setImgErr]     = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const bc = betChabad.trim() ? `Beth Chabad de ${betChabad.trim()}` : "Beth Chabad";

  const generateContent = useCallback(async (note = "") => {
    if (!desc.trim()) { setClaudeErr("Décrivez l'événement d'abord."); return; }
    setClaudeLoading(true); setClaudeErr(""); setAData(null); setImgSrc(null); setImgErr("");
    try {
      const msg = [`Affiche pour : ${desc.trim()}`, note ? `Ajustement : ${note}` : "", bc ? `Institution : ${bc}` : "", `Format : ${fmt}`].filter(Boolean).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: CLAUDE_SYS, messages: [{ role: "user", content: msg }] }),
      });
      const d   = await res.json();
      const raw = d.content?.find(b => b.type === "text")?.text || "";
      setAData(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (e) {
      setClaudeErr("Erreur : " + e.message);
    } finally {
      setClaudeLoading(false);
    }
  }, [desc, fmt, bc]);

  const generateImage = useCallback(async () => {
    if (!aData)            { setImgErr("Générez d'abord le contenu."); return; }
    if (!geminiKey.trim()) { setImgErr("Entrez votre clé API Google AI Studio."); return; }
    setImgLoading(true); setImgErr(""); setImgSrc(null);
    const { text: prompt } = buildPrompt(aData, bc, fmt);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiKey.trim()}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || `HTTP ${res.status}`);
      }
      const data  = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const img   = parts.find(p => p.inlineData);
      if (!img) {
        const txt = parts.find(p => p.text);
        throw new Error(txt?.text || "Aucune image retournée.");
      }
      setImgSrc(`data:${img.inlineData.mimeType};base64,${img.inlineData.data}`);
    } catch (e) {
      setImgErr(`Erreur Gemini : ${e.message}`);
    } finally {
      setImgLoading(false);
    }
  }, [aData, geminiKey, fmt, bc]);

  function copyPrompt() {
    if (!aData) return;
    const { text } = buildPrompt(aData, bc, fmt);
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const FMTS   = [{ v: "carre", l: "Carré", s: "1:1" }, { v: "story", l: "Story", s: "9:16" }, { v: "a4", l: "A4", s: "Impression" }, { v: "paysage", l: "Paysage", s: "4:3" }];
  const TWEAKS = ["Plus chaleureux", "Plus solennel", "Sans personnages", "Ajoute un verset", "Plus festif", "Simplifie"];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>

      {/* Header */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "13px 24px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Star size={24} color={T.gold} />
          <span style={{ fontFamily: SERIF, fontSize: 19, color: T.gold, letterSpacing: 0.5 }}>Shliach.ai</span>
          <span style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginLeft: 4 }}>אצלחה בזמן</span>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input value={betChabad} onChange={e => setBetChabad(e.target.value)} placeholder="Nom de votre Beth Chabad (ex: Neuilly-sur-Seine)" style={{ ...INP, background: T.bg, fontSize: 12.5 }} />
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 18px", display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* LEFT */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Card>
            <StepLabel n="1">Décrivez votre événement</StepLabel>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={`Ex : Atelier Pessah pour les enfants, dimanche 20 avril, 16h à 18h, ${bc}. Garçons et filles de 4 à 12 ans. Kiddouch offert.`} rows={5} style={{ ...INP, resize: "vertical", lineHeight: 1.6, fontSize: 13 }} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 7, lineHeight: 1.5 }}>💡 Précisez le public pour adapter les illustrations automatiquement.</div>
          </Card>

          <Card>
            <StepLabel n="2">Format</StepLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {FMTS.map(f => (
                <div key={f.v} onClick={() => setFmt(f.v)} style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${fmt === f.v ? T.gold : T.border}`, background: fmt === f.v ? T.gold + "12" : T.surface }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: fmt === f.v ? T.gold : T.text }}>{f.l}</div>
                  <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{f.s}</div>
                </div>
              ))}
            </div>
          </Card>

          {claudeErr && <div style={{ color: T.red, fontSize: 12, marginBottom: 12, background: T.red + "15", border: `1px solid ${T.red}40`, borderRadius: 7, padding: "8px 12px", lineHeight: 1.5 }}>{claudeErr}</div>}

          <GBtn onClick={() => generateContent()} disabled={claudeLoading} fullWidth>
            {claudeLoading ? "✨ Génération…" : "✨ Générer l'affiche"}
          </GBtn>

          {aData && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 9 }}>Ajuster :</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {TWEAKS.map(tw => (
                  <span key={tw} onClick={() => generateContent(tw)} style={{ fontSize: 11, padding: "5px 11px", border: `1px solid ${T.border}`, borderRadius: 20, color: T.muted, cursor: "pointer", background: T.surface }}>{tw}</span>
                ))}
              </div>
            </div>
          )}

          <Card style={{ marginTop: aData ? 0 : 14 }}>
            <StepLabel n="3">Clé API Google AI Studio</StepLabel>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 10, lineHeight: 1.5 }}>Obtenez votre clé sur <span style={{ color: T.gold }}>aistudio.google.com</span> — gratuit avec quota · $0.03/image ensuite</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type={showKey ? "text" : "password"} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..." style={{ ...INP, fontFamily: "monospace", fontSize: 12 }} />
              <button onClick={() => setShowKey(v => !v)} style={{ padding: "0 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, cursor: "pointer", fontSize: 11, flexShrink: 0 }}>
                {showKey ? "Cacher" : "Voir"}
              </button>
            </div>
            {geminiKey && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} /><span style={{ fontSize: 11, color: T.green }}>Clé configurée</span></div>}
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minWidth: 280 }}>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>{aData ? "Aperçu vectoriel" : "L'aperçu apparaît ici"}</div>
            {!aData && !claudeLoading && (
              <div style={{ width: 280, height: 280, background: T.card, border: `1px dashed ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Star size={48} color={T.faint} />
                <div style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "0 20px", lineHeight: 1.5 }}>Décrivez votre événement<br />et cliquez sur Générer</div>
              </div>
            )}
            {claudeLoading && (
              <div style={{ width: 280, height: 280, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <div style={{ fontSize: 32 }}>✨</div>
                <div style={{ color: T.gold, fontSize: 13 }}>Création du contenu…</div>
              </div>
            )}
            {aData && (
              <>
                <AfficheSVG data={aData} bc={bc} fmt={fmt} />
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <GBtn onClick={() => generateContent()} outline sm>↺ Regénérer</GBtn>
                  <button onClick={() => { setAData(null); setDesc(""); setImgSrc(null); }} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, fontSize: 12, cursor: "pointer" }}>Effacer</button>
                </div>
              </>
            )}
          </div>

          {aData && (
            <div style={{ width: "100%", maxWidth: 390 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>Image IA réaliste</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>

              <GBtn onClick={generateImage} disabled={imgLoading || !geminiKey} fullWidth>
                {imgLoading ? "🖼 Génération…" : geminiKey ? "🖼 Générer l'image IA" : "🔑 Clé API requise (étape 3)"}
              </GBtn>

              <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 10 }}>
                <button onClick={copyPrompt} style={{ flex: 1, padding: "7px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, color: copied ? T.green : T.muted, fontSize: 11, cursor: "pointer", fontFamily: SANS }}>
                  {copied ? "✓ Copié !" : "📋 Copier le prompt (Gemini / Midjourney)"}
                </button>
                <button onClick={() => setShowPrompt(v => !v)} style={{ padding: "7px 10px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, fontSize: 11, cursor: "pointer" }}>
                  {showPrompt ? "▲" : "▼"}
                </button>
              </div>

              {showPrompt && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 10.5, color: T.muted, fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", marginBottom: 10 }}>
                  {buildPrompt(aData, bc, fmt).text}
                </div>
              )}

              {imgErr && <div style={{ color: T.red, fontSize: 11.5, marginBottom: 10, background: T.red + "15", border: `1px solid ${T.red}40`, borderRadius: 7, padding: "8px 12px", lineHeight: 1.5 }}>{imgErr}</div>}

              {imgLoading && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>🖼</div>
                  <div style={{ color: T.gold, fontSize: 13, marginBottom: 6 }}>Imagen génère votre affiche…</div>
                  <div style={{ color: T.muted, fontSize: 11 }}>~15 secondes</div>
                </div>
              )}

              {imgSrc && (
                <div>
                  <img src={imgSrc} alt="Affiche générée" style={{ width: "100%", borderRadius: 10, border: `1px solid ${T.border}`, display: "block", marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <a href={imgSrc} download="affiche-chabad.png" style={{ textDecoration: "none" }}><GBtn outline sm>⬇ Télécharger</GBtn></a>
                    <GBtn onClick={generateImage} outline sm>↺ Regénérer</GBtn>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
