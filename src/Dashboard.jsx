/* ─── Dashboard.jsx ─── Accueil — Talit & Tekhelet ─── */

import { useState, useEffect } from "react";
import { T, SERIF, SANS, HEB, INP, ChabadLogo, GBtn, Icon, TalitStripe, TabBar } from "./shared";
import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { sanitizeError } from "./utils/sanitize-error";

function logoToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MODULES = [
  { key: "affiches",  icon: "poster", title: "Affiches",   desc: "Un événement → une affiche" },
  { key: "cours",     icon: "book",   title: "Cours",      desc: "Torah, prêt en 30 secondes" },
  { key: "messages",  icon: "msg",    title: "Messages",   desc: "Le bon mot, le bon ton" },
  { key: null,        icon: "cal",    title: "Calendrier", desc: "Coach Habad", badge: "Bientôt" },
];

export default function Dashboard({ user, profil, setProfil, onNavigate, onLogout, showProfileModal, onCloseProfile }) {
  const [shabbat, setShabbat] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [theme, setTheme] = useState(() =>
    typeof document !== "undefined" ? (document.documentElement.getAttribute("data-theme") || "light") : "light"
  );

  useEffect(() => {
    if (showProfileModal) setShowProfile(true);
  }, [showProfileModal]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("shliach-theme", next);
    setTheme(next);
    setShowMenu(false);
  }

  useEffect(() => {
    let timeoutId;
    const fetchShabbatFrom = (date) => {
      const params = date ? `&gy=${date.getFullYear()}&gm=${date.getMonth() + 1}&gd=${date.getDate()}` : "";
      return fetch(`https://www.hebcal.com/shabbat?cfg=json&geonameid=2988507&m=50${params}`)
        .then(r => r.json())
        .catch(() => null);
    };
    const parse = (data) => {
      if (!data?.items) return null;
      const candle   = data.items.find(i => i.category === "candles");
      const havdalah = data.items.find(i => i.category === "havdalah");
      const parasha  = data.items.find(i => i.category === "parashat");
      const toHHMM = item => {
        if (!item?.date) return null;
        return new Date(item.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      };
      return {
        candle:       toHHMM(candle),
        havdalah:     toHHMM(havdalah),
        parasha:      parasha?.title,
        havdalahDate: havdalah?.date || null,
      };
    };

    (async () => {
      const data = await fetchShabbatFrom();
      let parsed = parse(data);

      if (parsed?.havdalahDate && new Date(parsed.havdalahDate).getTime() < Date.now()) {
        const nextDay = new Date(parsed.havdalahDate);
        nextDay.setDate(nextDay.getDate() + 2);
        const nextData = await fetchShabbatFrom(nextDay);
        const nextParsed = parse(nextData);
        if (nextParsed) parsed = nextParsed;
      }

      if (!parsed) return;
      setShabbat({ candle: parsed.candle, havdalah: parsed.havdalah, parasha: parsed.parasha });

      if (parsed.havdalahDate) {
        const delay = new Date(parsed.havdalahDate).getTime() - Date.now() + 60_000;
        if (delay > 0 && delay < 7 * 24 * 3600 * 1000) {
          timeoutId = setTimeout(async () => {
            const nextDay = new Date(parsed.havdalahDate);
            nextDay.setDate(nextDay.getDate() + 2);
            const nextData = await fetchShabbatFrom(nextDay);
            const nextParsed = parse(nextData);
            if (nextParsed) {
              setShabbat({ candle: nextParsed.candle, havdalah: nextParsed.havdalah, parasha: nextParsed.parasha });
            }
          }, delay);
        }
      }
    })();

    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, []);

  const prenom = user?.displayName?.split(" ")[0] || "Rav";
  const lab = { fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: T.faint, fontWeight: 600 };
  const val = { fontSize: 17, fontWeight: 800, color: T.text, fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS, paddingBottom: 80 }}>

      {/* ── Barre haute minimale ── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChabadLogo size={28} />
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17, color: T.text }}>Habad</span>
        </div>
        <div style={{ position: "relative" }}>
          <div onClick={() => setShowMenu(v => !v)} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${T.border}` }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.gold, color: "var(--color-text-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                {prenom[0]}
              </div>
            )}
          </div>
          {showMenu && (
            <div style={{ position: "absolute", top: "110%", right: 0, marginTop: 4, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", zIndex: 100, minWidth: 170, boxShadow: T.shadowDropdown }}>
              <div onClick={() => { setShowMenu(false); setShowProfile(true); }} style={{ padding: "11px 16px", fontSize: 13.5, color: T.text, cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>Mon profil</div>
              <div onClick={toggleTheme} style={{ padding: "11px 16px", fontSize: 13.5, color: T.text, cursor: "pointer", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{theme === "dark" ? "☀" : "☽"}</span> {theme === "dark" ? "Mode clair" : "Mode sombre"}
              </div>
              <div onClick={() => { setShowMenu(false); onLogout(); }} style={{ padding: "11px 16px", fontSize: 13.5, color: T.red, cursor: "pointer" }}>Déconnexion</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Signature : bande de talit ── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 18px" }}>
        <TalitStripe />
      </div>

      {/* ── Contenu ── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 18px 0" }}>

        {/* Salutation */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: HEB, fontSize: "clamp(1.9rem,6vw,2.5rem)", fontWeight: 700, color: T.text, lineHeight: 1.1 }}>שלום,</span>
          <span style={{ fontFamily: SERIF, fontSize: "clamp(1.9rem,6vw,2.5rem)", fontWeight: 700, color: T.gold, lineHeight: 1.1 }}>{prenom}</span>
        </div>
        <div style={{ fontSize: 13.5, color: T.muted, marginTop: 3, marginBottom: 20 }}>
          {profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "Beth Chabad"}
        </div>

        {/* Carte Chabbat */}
        {shabbat && (
          <div style={{ position: "relative", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 16px 14px 20px", marginBottom: 24, overflow: "hidden", boxShadow: "0 10px 24px -18px rgba(20,25,40,0.35)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: T.gold }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, boxShadow: `0 0 0 3px ${T.goldSoft}`, flexShrink: 0 }} />
              {shabbat.parasha && <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, color: T.text }}>{shabbat.parasha.replace(/^Parashat\s+/, "")}</span>}
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ flex: 1 }}><div style={lab}>Allumage</div><div style={val}>{shabbat.candle || "—"}</div></div>
              <div style={{ flex: 1, borderLeft: `1px solid ${T.border}`, paddingLeft: 14 }}><div style={lab}>Havdalah</div><div style={val}>{shabbat.havdalah || "—"}</div></div>
              <div style={{ flex: 1, borderLeft: `1px solid ${T.border}`, paddingLeft: 14 }}><div style={lab}>Paris</div><div style={{ ...val, fontSize: 14, color: T.muted }}>☾</div></div>
            </div>
          </div>
        )}

        {/* Modules */}
        <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.faint, fontWeight: 700, margin: "0 2px 10px" }}>Créer</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MODULES.map(m => (
            <div
              key={m.title}
              onClick={() => m.key && onNavigate(m.key)}
              style={{ display: "flex", alignItems: "center", gap: 13, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "13px 14px", cursor: m.key ? "pointer" : "default", opacity: m.key ? 1 : 0.6, transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { if (m.key) { e.currentTarget.style.borderColor = "var(--color-border-active)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: T.text, flexShrink: 0 }}>
                <Icon name={m.icon} size={22} stroke="currentColor" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{m.title}</div>
                <div style={{ fontSize: 12.5, color: T.muted }}>{m.desc}</div>
              </div>
              {m.badge ? (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>{m.badge}</span>
              ) : (
                <span style={{ display: "flex", color: T.faint, flexShrink: 0 }}><Icon name="chev" size={18} stroke="currentColor" /></span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Barre d'onglets */}
      <TabBar active="dashboard" onNavigate={onNavigate} />

      {/* Modale profil */}
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
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", user.uid), updated);
      onSave(updated);
    } catch (e) {
      setErr("Erreur : " + sanitizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--color-modal-backdrop)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
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
