/* ─── Affiches.jsx ─── Générateur d'affiches par gabarits ─── */

import { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import { T, SERIF, SANS, GBtn, Icon, ScreenHeader, TabBar } from "./shared";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { generateMessage } from "./services/claude-api";
import ChabbatPoster from "./posters/ChabbatPoster";
import AnnonceFlow from "./AnnonceFlow";

const TYPES = [
  { id: "chabbat", icon: "book",   title: "Chabbat",              desc: "Horaires + pensée de la paracha", ready: true },
  { id: "annonce", icon: "poster", title: "Annonce communautaire", desc: "Événement, cours, cantine…",       ready: true },
  { id: "gan",     icon: "cal",    title: "Gan Israel",            desc: "Centre aéré, ateliers",            ready: false },
];

const TITLE_COLORS   = [{ v: "#1A5FD0", l: "Bleu" }, { v: "#871A39", l: "Bordeaux" }, { v: "#1F4A3D", l: "Vert" }, { v: "#2A2622", l: "Encre" }];
const SIDEBAR_COLORS = [{ v: "#9B9384", l: "Taupe" }, { v: "#17263A", l: "Nuit" }, { v: "#1F4A3D", l: "Vert" }, { v: "#5C1A1A", l: "Bordeaux" }];

const HEB_MONTHS = { Nisan: "Nissan", Iyyar: "Iyar", Iyar: "Iyar", Sivan: "Sivan", Tamuz: "Tamouz", Tammuz: "Tamouz", Av: "Av", Elul: "Éloul", Tishrei: "Tichri", Cheshvan: "Hechvan", Kislev: "Kislev", Tevet: "Tévet", "Sh'vat": "Chevat", Shevat: "Chevat", Adar: "Adar", "Adar I": "Adar I", "Adar II": "Adar II", "Adar 1": "Adar I", "Adar 2": "Adar II" };

const CHABBAT_REFLECT_SYS = `Tu écris un court texte d'introduction spirituelle pour une affiche d'horaires de Chabbat d'un Beth Chabad.
À partir du nom de la paracha de la semaine, écris une réflexion SIMPLE, chaleureuse et accessible (pas savante), inspirée du thème central de la paracha selon l'enseignement Habad.
FORMAT — STRICT :
- 10 à 14 lignes courtes, chacune sur SA PROPRE LIGNE (retour à la ligne réel).
- Chaque ligne = une phrase courte ou un fragment ; ton méditatif, comme un petit poème en prose.
- Français simple. Écris "D.ieu" (jamais le mot complet).
- AUCUN titre, AUCUNE introduction, AUCUN commentaire, AUCUN décompte de mots. Uniquement le texte.
- Ne mentionne ni les horaires ni "Chabbat Chalom".
Ta réponse commence directement par la première ligne du texte.`;

/* ─── Flux Chabbat ─── */
function ChabbatFlow({ profil, logEvent }) {
  const [shab, setShab] = useState(null);           // { parasha, candle, havdalah, dateISO }
  const [hebDate, setHebDate] = useState("");
  const [gregDate, setGregDate] = useState("");
  const [edition, setEdition] = useState("");
  const [reflection, setReflection] = useState("");
  const [loadingShab, setLoadingShab] = useState(true);
  const [loadingText, setLoadingText] = useState(false);
  const [err, setErr] = useState("");
  const [titleColor, setTitleColor] = useState("#1A5FD0");
  const [sidebarColor, setSidebarColor] = useState("#9B9384");
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(0.6);

  const posterRef = useRef(null);
  const scaleRef = useRef(null);
  const wrapRef = useRef(null);

  // Aperçu responsive
  useEffect(() => {
    const upd = () => { if (wrapRef.current) setScale(Math.min(1, wrapRef.current.clientWidth / 560)); };
    upd(); window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const genText = useCallback(async (parasha) => {
    setLoadingText(true);
    try {
      const { text } = await generateMessage(`Paracha : ${parasha}`, CHABBAT_REFLECT_SYS);
      setReflection((text || "").trim());
    } catch (e) {
      console.warn("reflection failed", e?.message);
    } finally {
      setLoadingText(false);
    }
  }, []);

  // Chargement Hebcal (paracha, horaires, dates) + texte
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingShab(true); setErr("");
      try {
        const data = await fetch("https://www.hebcal.com/shabbat?cfg=json&geonameid=2988507&m=50").then(r => r.json());
        const candle = data.items?.find(i => i.category === "candles");
        const havdalah = data.items?.find(i => i.category === "havdalah");
        const parashaItem = data.items?.find(i => i.category === "parashat");
        const toHHMM = it => it?.date ? new Date(it.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h") : "—";
        const rawParasha = (parashaItem?.title || "Chabbat").replace(/^Parash?at\s+/i, "").replace(/^Parachat\s+/i, "");
        const parasha = rawParasha.toUpperCase();
        const dISO = candle?.date || havdalah?.date || null;
        if (cancelled) return;
        setShab({ parasha, candle: toHHMM(candle), havdalah: toHHMM(havdalah), dateISO: dISO });

        if (dISO) {
          const d = new Date(dISO);
          setGregDate(d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }));
          try {
            const c = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${d.getFullYear()}&gm=${d.getMonth() + 1}&gd=${d.getDate()}&g2h=1&strict=1`).then(r => r.json());
            if (!cancelled && c?.hy) {
              setHebDate(`${c.hd} ${HEB_MONTHS[c.hm] || c.hm} ${c.hy}`);
              setEdition(`Édition ${c.hy}`);
            }
          } catch { /* date héb. optionnelle */ }
        }
        genText(parasha);
      } catch (e) {
        if (!cancelled) setErr("Impossible de charger les horaires. Réessaie.");
        console.warn(e?.message);
      } finally {
        if (!cancelled) setLoadingShab(false);
      }
    })();
    return () => { cancelled = true; };
  }, [genText]);

  async function download() {
    if (!posterRef.current || downloading) return;
    setDownloading(true); setErr("");
    const wrap = scaleRef.current;
    const prev = wrap ? wrap.style.transform : "";
    try {
      if (wrap) wrap.style.transform = "none";           // capture à taille réelle
      const canvas = await html2canvas(posterRef.current, { useCORS: true, scale: 2, width: 560, height: 840, backgroundColor: "#FAF7F1" });
      const link = document.createElement("a");
      link.download = `affiche-chabbat-${(shab?.parasha || "chabbat").toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      logEvent("telecharge");
    } catch (e) {
      console.error(e);
      setErr("Erreur lors du téléchargement du PNG.");
    } finally {
      if (wrap) wrap.style.transform = prev;
      setDownloading(false);
    }
  }

  const Swatches = ({ list, value, onChange, label }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: T.faint, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {list.map(c => (
          <button key={c.v} onClick={() => onChange(c.v)} title={c.l}
            style={{ width: 30, height: 30, borderRadius: 8, background: c.v, cursor: "pointer",
              border: value === c.v ? `2px solid ${T.text}` : `1px solid ${T.border}`,
              boxShadow: value === c.v ? "0 0 0 2px var(--bg-surface), 0 0 0 3px var(--color-accent-soft)" : "none" }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {/* Aperçu */}
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 560 * scale, height: 840 * scale, overflow: "hidden", flex: "0 0 auto", borderRadius: 6, boxShadow: "0 14px 44px -14px rgba(20,25,40,.45)" }}>
            <div ref={scaleRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <ChabbatPoster ref={posterRef} parasha={shab?.parasha || "…"} hebDate={hebDate} gregDate={gregDate}
                reflection={reflection || (loadingText ? "Rédaction de la pensée…" : "")}
                candle={shab?.candle || "—"} havdalah={shab?.havdalah || "—"} edition={edition}
                titleColor={titleColor} sidebarColor={sidebarColor} />
            </div>
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 18px 16px" }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 4 }}>
            {loadingShab ? "Chargement…" : (shab?.parasha ? shab.parasha : "Chabbat")}
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
            {loadingShab ? "Récupération de la paracha et des horaires…" : [hebDate, gregDate].filter(Boolean).join(" • ")}
          </div>

          <Swatches list={TITLE_COLORS} value={titleColor} onChange={setTitleColor} label="Couleur du titre" />
          <Swatches list={SIDEBAR_COLORS} value={sidebarColor} onChange={setSidebarColor} label="Couleur de la languette" />

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <GBtn outline sm onClick={() => shab && genText(shab.parasha)} disabled={loadingText || !shab}>
              {loadingText ? "…" : "Regénérer le texte"}
            </GBtn>
            <GBtn sm fullWidth onClick={download} disabled={downloading || loadingShab}>
              {downloading ? "Préparation…" : "Télécharger le PNG"}
            </GBtn>
          </div>

          {err && <div style={{ marginTop: 12, padding: "8px 12px", background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 8, color: T.red, fontSize: 12.5 }}>{err}</div>}
          <div style={{ marginTop: 14, fontSize: 12, color: T.faint, lineHeight: 1.5 }}>
            Paracha, dates et horaires remplis automatiquement (Hebcal). Le texte est écrit par l'IA — tu peux le regénérer.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Module Affiches ─── */
export default function Affiches({ profil, headerProps }) {
  const [type, setType] = useState(null);

  async function logEvent(action) {
    if (!profil?.uid) return;
    try {
      await addDoc(collection(db, "events"), { uid: profil.uid, module: "affiches", action, subType: type || "", betChabad: profil?.betChabad || "", createdAt: serverTimestamp() });
    } catch { /* non bloquant */ }
  }

  const current = TYPES.find(t => t.id === type);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS, paddingBottom: 80 }}>
      {headerProps && <ScreenHeader title="Affiches" onBack={() => (type ? setType(null) : headerProps.onNavigate("dashboard"))} />}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 18px 0" }}>
        {!type && (
          <>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: T.text, marginBottom: 2 }}>Créer une affiche</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 18 }}>Choisis un modèle.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TYPES.map(t => (
                <div key={t.id} onClick={() => t.ready && setType(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 13, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 15px", cursor: t.ready ? "pointer" : "default", opacity: t.ready ? 1 : 0.6 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: T.text, flexShrink: 0 }}>
                    <Icon name={t.icon} size={22} stroke="currentColor" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{t.title}</div>
                    <div style={{ fontSize: 12.5, color: T.muted }}>{t.desc}</div>
                  </div>
                  {t.ready
                    ? <span style={{ display: "flex", color: T.faint }}><Icon name="chev" size={18} stroke="currentColor" /></span>
                    : <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".04em", color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 20, padding: "2px 8px" }}>Bientôt</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {current?.id === "chabbat" && (
          <>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: T.text, marginBottom: 16 }}>Affiche Chabbat</div>
            <ChabbatFlow profil={profil} logEvent={logEvent} />
          </>
        )}

        {current?.id === "annonce" && (
          <>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: T.text, marginBottom: 16 }}>Annonce communautaire</div>
            <AnnonceFlow profil={profil} logEvent={logEvent} />
          </>
        )}
      </div>

      {headerProps && <TabBar active="affiches" onNavigate={headerProps.onNavigate} />}
    </div>
  );
}
