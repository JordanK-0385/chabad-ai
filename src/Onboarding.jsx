/* ─── Onboarding.jsx ─── Two-step onboarding after first sign-in ─── */

import { useState } from "react";
import { T, SERIF, SANS, INP, Card, GBtn, StepLabel, ChabadLogo } from "./shared";
import { db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function logoToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);

  /* Step 1 fields */
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [siteWeb, setSiteWeb] = useState("");

  /* Step 2 fields */
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [tailleCommunaute, setTailleCommunaute] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const TAILLES = ["< 50 familles", "50-150 familles", "150-400 familles", "400+ familles"];

  function handleLogo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  function canProceedStep1() {
    return nom.trim() && ville.trim();
  }

  async function handleFinish() {
    setSaving(true);
    setErr("");
    try {
      let logoBase64 = "";
      if (logoFile) {
        if (logoFile.size > 500 * 1024) { setErr("Logo trop volumineux (max 500 KB)"); setSaving(false); return; }
        logoBase64 = await logoToBase64(logoFile);
      }

      const profil = {
        betChabad: nom.trim(),
        adresse: adresse.trim(),
        ville: ville.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        siteWeb: siteWeb.trim(),
        logoBase64,
        tailleCommunaute,
        onboardingComplete: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", user.uid), profil);
      onComplete(profil);
    } catch (e) {
      setErr("Erreur : " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const progress = step === 1 ? "50%" : "100%";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>

      {/* Header */}
      <ChabadLogo size={40} color={T.gold} style={{ marginBottom: 16 }} />
      <h2 style={{ fontFamily: SERIF, fontSize: 22, color: T.gold, margin: "0 0 6px" }}>Configuration de votre Beth Chabad</h2>
      <p style={{ fontSize: 13, color: T.muted, margin: "0 0 24px" }}>Étape {step} sur 2</p>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 480, height: 4, background: T.border, borderRadius: 2, marginBottom: 28 }}>
        <div style={{ width: progress, height: "100%", background: T.gold, borderRadius: 2, transition: "width 0.3s" }} />
      </div>

      <div style={{ width: "100%", maxWidth: 480 }}>
        {step === 1 && (
          <>
            <Card>
              <StepLabel n="1">Informations du Beth Chabad</StepLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Nom du Beth Chabad *</label>
                  <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Neuilly-sur-Seine" style={INP} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Adresse</label>
                  <input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="12 rue de la Paix" style={INP} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Ville *</label>
                  <input value={ville} onChange={e => setVille(e.target.value)} placeholder="Paris" style={INP} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Téléphone</label>
                  <input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="01 23 45 67 89" style={INP} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@bethchabad.fr" style={INP} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Site web</label>
                  <input value={siteWeb} onChange={e => setSiteWeb(e.target.value)} placeholder="https://www.bethchabad.fr" style={INP} />
                </div>
              </div>
            </Card>
            <GBtn onClick={() => setStep(2)} disabled={!canProceedStep1()} fullWidth>
              Suivant &rarr;
            </GBtn>
          </>
        )}

        {step === 2 && (
          <>
            <Card>
              <StepLabel n="2">Logo et preferences</StepLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Logo upload */}
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 8, display: "block" }}>Logo du Beth Chabad (optionnel)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "contain", background: T.surface, border: `1px solid ${T.border}` }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 8, background: T.surface, border: `1px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: T.faint }}>+</div>
                    )}
                    <label style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${T.gold}`, color: T.gold }}>
                      Choisir un fichier
                      <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                {/* Community size */}
                <div>
                  <label style={{ fontSize: 11, color: T.muted, marginBottom: 8, display: "block" }}>Taille de la communauté</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {TAILLES.map(t => (
                      <span key={t} onClick={() => setTailleCommunaute(t)} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 20, cursor: "pointer", border: `1px solid ${tailleCommunaute === t ? T.gold : T.border}`, color: tailleCommunaute === t ? T.gold : T.muted, background: tailleCommunaute === t ? T.goldSoft : T.surface }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </Card>

            {err && <div style={{ color: T.red, fontSize: 12, marginBottom: 12, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 7, padding: "8px 12px" }}>{err}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <GBtn onClick={() => setStep(1)} outline>
                &larr; Retour
              </GBtn>
              <GBtn onClick={handleFinish} disabled={saving} fullWidth>
                {saving ? "Enregistrement..." : "Terminer la configuration"}
              </GBtn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
