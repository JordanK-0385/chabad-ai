/* Landing.jsx — Public landing page with Google sign-in */

import { T, SERIF, SANS, ChabadLogo, GBtn } from "./shared";
import { signInWithGoogle } from "./firebase";

const MODULES = [
  { icon: "🎨", title: "Affiches", desc: "Affiches professionnelles conformes aux règles Chabad, en 30 secondes" },
  { icon: "📖", title: "Cours", desc: "Shiourim préparés depuis Sirat Beyond et Chabad.org" },
  { icon: "💬", title: "Messages", desc: "Messages personnalisés pour chaque membre de votre communauté" },
];

export default function Landing({ firebaseReady = false }) {
  async function handleAuth() {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Auth error:", e);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS, display: "flex", flexDirection: "column" }}>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 40px", textAlign: "center" }}>
        <ChabadLogo size={48} style={{ marginBottom: 16 }} />
        <h1 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 5vw, 42px)", color: T.text, margin: "0 0 6px", letterSpacing: "-0.03em", fontWeight: 700 }}>
          Habad.ai
        </h1>
        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: T.text, margin: "0 0 8px", maxWidth: 520, lineHeight: 1.6, fontFamily: SERIF }}>
          L'assistant IA des Shluchim de France
        </p>
        <p style={{ fontSize: "clamp(12px, 1.8vw, 15px)", color: T.muted, margin: "0 0 6px", maxWidth: 460, lineHeight: 1.6 }}>
          Créez vos affiches, préparez vos cours, rédigez vos messages — en quelques secondes.
        </p>
        <p dir="rtl" style={{ fontSize: 12, color: T.muted, letterSpacing: 2, margin: "0 0 40px", direction: "rtl" }}>
          הצלחה בזמן
        </p>

        {/* Module cards */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", maxWidth: 800, marginBottom: 40 }}>
          {MODULES.map(m => (
            <div key={m.title} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "28px 20px", width: 220, textAlign: "center", transition: "all 0.2s" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-icon-circle-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>{m.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8, fontFamily: SERIF }}>{m.title}</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {firebaseReady ? (
          <GBtn onClick={handleAuth}>
            Continuer avec Google →
          </GBtn>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <GBtn disabled>Configuration Firebase requise</GBtn>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, textAlign: "center" }}>
              Remplissez les variables Firebase dans .env.local
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px 24px 28px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, color: T.faint }}>
          Réservé aux Shluchim · Offert par Mendy
        </div>
      </div>
    </div>
  );
}
