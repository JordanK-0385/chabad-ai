/* ─── Dashboard.jsx ─── Main hub with module cards and profile ─── */

import { useState, useEffect } from "react";
import { T, SERIF, SANS, INP, ChabadLogo, Card, GBtn, AppHeader } from "./shared";
import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

function logoToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MODULES = [
  { key: "affiches",  icon: "🎨", title: "Affiches",    desc: "Créez des affiches pour vos événements communautaires.", color: "var(--color-brand)" },
  { key: "cours",     icon: "📖", title: "Cours",       desc: "Préparez des cours de Torah adaptés à votre public.", color: "var(--color-brand)" },
  { key: "messages",  icon: "💬", title: "Messages",    desc: "Rédigez des messages personnalisés pour votre communauté.", color: "var(--color-brand)" },
  { key: null,        icon: "📅", title: "Calendrier",  desc: "Planifiez et gérez vos événements.", badge: "Bientôt", color: "var(--color-text-subtle)" },
];

export default function Dashboard({ user, profil, setProfil, headerProps, onNavigate, onLogout, showProfileModal, onCloseProfile }) {
  const [shabbat, setShabbat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    if (showProfileModal) setShowProfile(true);
  }, [showProfileModal]);

  useEffect(() => {
    fetch("https://www.hebcal.com/shabbat?cfg=json&geonameid=2988507&m=50")
      .then(r => r.json())
      .then(data => {
        const candle   = data.items?.find(i => i.category === "candles");
        const havdalah = data.items?.find(i => i.category === "havdalah");
        const parasha  = data.items?.find(i => i.category === "parashat");
        const toHHMM = item => {
          if (!item?.date) return null;
          const d = new Date(item.date);
          return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        };
        setShabbat({
          candle:   toHHMM(candle),
          havdalah: toHHMM(havdalah),
          parasha:  parasha?.title,
        });
      })
      .catch(() => {});
  }, []);

  const prenom = user?.displayName?.split(" ")[0] || "Rav";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>

      <AppHeader currentScreen="dashboard" {...headerProps} />

      {/* Main */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: mobile ? "20px 14px" : "36px 24px" }}>

        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: SERIF, fontSize: "clamp(2.2rem,5vw,3.5rem)", color: T.text, letterSpacing: "-0.03em", fontWeight: 700 }}>
            שלום, <span style={{ color: T.gold }}>{prenom}</span> !
          </div>
          <div style={{ fontSize: 16, color: T.muted, marginTop: 6 }}>
            {profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "Beth Chabad"}
          </div>
        </div>

        {/* Shabbat banner */}
        {shabbat && (
          <div style={{ background: T.parachaBg, border: `1px solid ${T.parachaBorder}`, borderRadius: 12, padding: "18px 22px", marginBottom: 28, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {shabbat.parasha && <span style={{ fontSize: 18, fontWeight: 700, color: T.gold, fontFamily: SANS }}>{shabbat.parasha.replace(/^Parashat\s+/, "Paracha ")}</span>}
              <span style={{ fontSize: 15, color: T.muted, marginLeft: 14 }}>
                {[
                  shabbat.candle   && `Allumage ${shabbat.candle}`,
                  shabbat.havdalah && `Havdalah ${shabbat.havdalah}`,
                ].filter(Boolean).join(" · ")} · Paris
              </span>
            </div>
          </div>
        )}

        {/* Module grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {MODULES.map(m => (
            <div
              key={m.title}
              onClick={() => m.key && onNavigate(m.key)}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: mobile ? "22px 18px" : "34px 28px",
                cursor: m.key ? "pointer" : "not-allowed",
                opacity: m.key ? 1 : 0.5,
                position: "relative",
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => { if (m.key) { e.currentTarget.style.borderColor = "var(--color-border-active)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Top color bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: m.color }} />
              {m.badge && (
                <span style={{ position: "absolute", top: 14, right: 14, fontSize: 12, padding: "3px 10px", borderRadius: 9999, background: "var(--color-accent-faint)", border: `1px solid ${T.goldAlpha}`, color: T.goldBr, fontWeight: 600 }}>
                  {m.badge}
                </span>
              )}
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16 }}>
                {m.icon}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: SANS }}>{m.title}</div>
              {!mobile && <div style={{ fontSize: 15, color: T.muted, lineHeight: 1.5 }}>{m.desc}</div>}
              {m.key && <div style={{ position: "absolute", bottom: 16, right: 18, fontSize: 22, color: T.goldAlpha }}>→</div>}
            </div>
          ))}
        </div>

      </div>

      {/* Profile edit modal */}
      {showProfile && (
        <ProfileModal
          user={user}
          profil={profil}
          onClose={() => { setShowProfile(false); if (onCloseProfile) onCloseProfile(); }}
          onSave={(updated) => { setProfil(updated); setShowProfile(false); if (onCloseProfile) onCloseProfile(); }}
        />
      )}
    </div>
  );
}

/* ─── Profile edit modal ─── */
function ProfileModal({ user, profil, onClose, onSave }) {
  const [nom, setNom] = useState(profil?.betChabad || "");
  const [adresse, setAdresse] = useState(profil?.adresse || "");
  const [ville, setVille] = useState(profil?.ville || "");
  const [telephone, setTelephone] = useState(profil?.telephone || "");
  const [email, setEmail] = useState(profil?.email || "");
  const [siteWeb, setSiteWeb] = useState(profil?.siteWeb || "");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(profil?.logoBase64 || null);
  const [tailleCommunaute, setTailleCommunaute] = useState(profil?.tailleCommunaute || "");
  const [kashroutDefaut, setKashroutDefaut] = useState(profil?.kashroutDefaut || "");
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

  async function handleSave() {
    setSaving(true);
    setErr("");
    try {
      let logoBase64 = profil?.logoBase64 || "";
      if (logoFile) {
        if (logoFile.size > 500 * 1024) { setErr("Logo trop volumineux (max 500 KB)"); setSaving(false); return; }
        logoBase64 = await logoToBase64(logoFile);
      }

      const updated = {
        ...profil,
        betChabad: nom.trim(),
        adresse: adresse.trim(),
        ville: ville.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        siteWeb: siteWeb.trim(),
        logoBase64,
        tailleCommunaute,
        kashroutDefaut: kashroutDefaut.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", user.uid), updated);
      onSave(updated);
    } catch (e) {
      setErr("Erreur : " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: "28px 24px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontFamily: SERIF, fontSize: 18, color: T.gold, margin: 0 }}>Modifier le profil</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>&times;</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Nom du Beth Chabad</label>
            <input value={nom} onChange={e => setNom(e.target.value)} style={INP} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Adresse</label>
            <input value={adresse} onChange={e => setAdresse(e.target.value)} style={INP} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Ville</label>
            <input value={ville} onChange={e => setVille(e.target.value)} style={INP} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Téléphone</label>
            <input value={telephone} onChange={e => setTelephone(e.target.value)} style={INP} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} style={INP} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Site web</label>
            <input value={siteWeb} onChange={e => setSiteWeb(e.target.value)} style={INP} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 8, display: "block" }}>Logo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "contain", background: T.surface, border: `1px solid ${T.border}` }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: T.surface, border: `1px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: T.faint }}>+</div>
              )}
              <label style={{ padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${T.gold}`, color: T.gold }}>
                Modifier
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
              </label>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 8, display: "block" }}>Taille de la communauté</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {TAILLES.map(t => (
                <span key={t} onClick={() => setTailleCommunaute(t)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, cursor: "pointer", border: `1px solid ${tailleCommunaute === t ? T.gold : T.border}`, color: tailleCommunaute === t ? T.gold : T.muted, background: tailleCommunaute === t ? T.goldSoft : T.surface }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, marginBottom: 4, display: "block" }}>Kashrout par défaut (affiches)</label>
            <input value={kashroutDefaut} onChange={e => setKashroutDefaut(e.target.value)} style={INP} />
          </div>
        </div>

        {err && <div style={{ color: T.red, fontSize: 12, marginTop: 12 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <GBtn onClick={onClose} outline>Annuler</GBtn>
          <GBtn onClick={handleSave} disabled={saving} fullWidth>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </GBtn>
        </div>
      </div>
    </div>
  );
}
