/* ─── AnnonceFlow.jsx ─── Formulaire + aperçu du gabarit Annonce ─── */
import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { T, SANS, INP, GBtn } from "./shared";
import AnnoncePoster from "./posters/AnnoncePoster";

const NAVY_COLORS   = [{ v: "#173B5E", l: "Navy" }, { v: "#3D1414", l: "Bordeaux" }, { v: "#1F4A3D", l: "Vert" }, { v: "#17171C", l: "Encre" }];
const ORANGE_COLORS = [{ v: "#F0801C", l: "Orange" }, { v: "#E8560A", l: "Flamme" }, { v: "#1D4E89", l: "Tekhelet" }, { v: "#C9A66B", l: "Or" }];

function Field({ label, value, onChange, ph, area }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>{label}</label>
      {area
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={ph} rows={2} style={{ ...INP, resize: "vertical" }} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={ph} style={INP} />}
    </div>
  );
}
function Row({ children }) { return <div style={{ display: "flex", gap: 8 }}>{children}</div>; }
function Section({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: T.faint, fontWeight: 700, margin: "16px 0 8px" }}>{children}</div>;
}
function ColorSwatches({ list, value, onChange, label }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {list.map(c => (
          <button key={c.v} onClick={() => onChange(c.v)} title={c.l}
            style={{ width: 28, height: 28, borderRadius: 8, background: c.v, cursor: "pointer",
              border: value === c.v ? `2px solid ${T.text}` : `1px solid ${T.border}` }} />
        ))}
      </div>
    </div>
  );
}

export default function AnnonceFlow({ profil, logEvent }) {
  const [f, setF] = useState({
    title1: "CANTINE CACHER", title2: "des Jeunes",
    org: profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "", orgSub: "",
    tagline: "Un repas équilibré, dans une ambiance conviviale et chaleureuse !",
    l1addr: "2 rue de Longchamp", l1area: "NEUILLY", l1detail: "Écoles",
    l2addr: "30 rue du Château", l2area: "NEUILLY", l2detail: "Communauté",
    jours: "Du lundi au vendredi", horaires: "12h à 14h", prix: "6 €",
    contactName: "", contactPhone: "", contactLabel: "Pour plus d'informations",
    slogan1: "Bon pour le corps,", slogan2: "Bon pour l'âme !",
  });
  const [navy, setNavy] = useState("#173B5E");
  const [orange, setOrange] = useState("#F0801C");
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");
  const [scale, setScale] = useState(0.6);
  const posterRef = useRef(null), scaleRef = useRef(null), wrapRef = useRef(null);
  const up = (k, v) => setF(s => ({ ...s, [k]: v }));

  useEffect(() => {
    const u = () => { if (wrapRef.current) setScale(Math.min(1, wrapRef.current.clientWidth / 560)); };
    u(); window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  async function download() {
    if (!posterRef.current || downloading) return;
    setDownloading(true); setErr("");
    const wrap = scaleRef.current;
    const prev = wrap ? wrap.style.transform : "";
    try {
      if (wrap) wrap.style.transform = "none";
      const canvas = await html2canvas(posterRef.current, { useCORS: true, scale: 2, width: 560, height: 840, backgroundColor: "#FBF9F5" });
      const link = document.createElement("a");
      link.download = `affiche-annonce-${(f.title1 || "annonce").toLowerCase().replace(/\s+/g, "-").slice(0, 24)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      logEvent && logEvent("telecharge");
    } catch (e) {
      console.error(e); setErr("Erreur lors du téléchargement du PNG.");
    } finally {
      if (wrap) wrap.style.transform = prev;
      setDownloading(false);
    }
  }

  const posterProps = {
    title1: f.title1, title2: f.title2, org: f.org, orgSub: f.orgSub, logo: profil?.logoBase64 || "",
    tagline: f.tagline,
    lieux: [{ addr: f.l1addr, area: f.l1area, detail: f.l1detail }, { addr: f.l2addr, area: f.l2area, detail: f.l2detail }],
    jours: f.jours, horaires: f.horaires, prix: f.prix,
    contactName: f.contactName, contactPhone: f.contactPhone, contactLabel: f.contactLabel,
    slogan1: f.slogan1, slogan2: f.slogan2, navy, orange,
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {/* Aperçu */}
      <div style={{ flex: "1 1 300px", minWidth: 0 }}>
        <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 560 * scale, height: 840 * scale, overflow: "hidden", flex: "0 0 auto", borderRadius: 6, boxShadow: "0 14px 44px -14px rgba(20,25,40,.45)" }}>
            <div ref={scaleRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <AnnoncePoster ref={posterRef} {...posterProps} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
          <GBtn onClick={download} disabled={downloading}>{downloading ? "Préparation…" : "Télécharger le PNG"}</GBtn>
        </div>
        {err && <div style={{ marginTop: 10, textAlign: "center", color: T.red, fontSize: 12.5 }}>{err}</div>}
      </div>

      {/* Formulaire */}
      <div style={{ flex: "1 1 300px", minWidth: 0 }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 18px", fontFamily: SANS }}>
          <Section>Titre</Section>
          <Field label="Ligne 1" value={f.title1} onChange={v => up("title1", v)} ph="CANTINE CACHER" />
          <Field label="Ligne 2 (script, optionnel)" value={f.title2} onChange={v => up("title2", v)} ph="des Jeunes" />

          <Section>Marque (optionnel)</Section>
          <Field label="Nom" value={f.org} onChange={v => up("org", v)} ph="Château des Jeunes" />
          <Field label="Sous-titre" value={f.orgSub} onChange={v => up("orgSub", v)} ph="Beth Loubavitch · Neuilly" />

          <Section>Accroche (optionnel)</Section>
          <Field area label="Tagline" value={f.tagline} onChange={v => up("tagline", v)} ph="Un repas équilibré…" />

          <Section>Lieu 1</Section>
          <Field label="Adresse" value={f.l1addr} onChange={v => up("l1addr", v)} ph="2 rue de Longchamp" />
          <Row>
            <Field label="Quartier" value={f.l1area} onChange={v => up("l1area", v)} ph="NEUILLY" />
            <Field label="Détail" value={f.l1detail} onChange={v => up("l1detail", v)} ph="Écoles…" />
          </Row>

          <Section>Lieu 2 (optionnel)</Section>
          <Field label="Adresse" value={f.l2addr} onChange={v => up("l2addr", v)} ph="30 rue du Château" />
          <Row>
            <Field label="Quartier" value={f.l2area} onChange={v => up("l2area", v)} ph="NEUILLY" />
            <Field label="Détail" value={f.l2detail} onChange={v => up("l2detail", v)} ph="Écoles…" />
          </Row>

          <Section>Infos pratiques</Section>
          <Field label="Jours" value={f.jours} onChange={v => up("jours", v)} ph="Du lundi au vendredi" />
          <Row>
            <Field label="Horaires" value={f.horaires} onChange={v => up("horaires", v)} ph="12h à 14h" />
            <Field label="Prix" value={f.prix} onChange={v => up("prix", v)} ph="6 €" />
          </Row>

          <Section>Contact</Section>
          <Field label="Nom" value={f.contactName} onChange={v => up("contactName", v)} ph="Mendi Azimov" />
          <Field label="Téléphone" value={f.contactPhone} onChange={v => up("contactPhone", v)} ph="07 49 92 72 16" />

          <Section>Slogan bas (optionnel)</Section>
          <Row>
            <Field label="Ligne 1" value={f.slogan1} onChange={v => up("slogan1", v)} ph="Bon pour le corps," />
            <Field label="Ligne 2" value={f.slogan2} onChange={v => up("slogan2", v)} ph="Bon pour l'âme !" />
          </Row>

          <Section>Couleurs</Section>
          <ColorSwatches list={NAVY_COLORS} value={navy} onChange={setNavy} label="Couleur principale" />
          <ColorSwatches list={ORANGE_COLORS} value={orange} onChange={setOrange} label="Couleur d'accent" />
        </div>
      </div>
    </div>
  );
}
