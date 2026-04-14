/* ─── LandingPage.jsx ─── Public home before auth ─── */

import { useEffect, useRef } from "react";
import { T, SERIF, SANS, ChabadLogo } from "../shared";
import { signInWithGoogle, firebaseReady } from "../firebase";

/* ── CSS animations (injected once) ──────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("lp-styles")) {
  const s = document.createElement("style");
  s.id = "lp-styles";
  s.textContent = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes lpFloat {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-8px); }
    }
    @keyframes lpPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.4; transform: scale(0.75); }
    }
    .lp-fade { opacity: 0; transform: translateY(24px); transition: opacity 0.55s ease, transform 0.55s ease; }
    .lp-fade.is-visible { opacity: 1; transform: translateY(0); }
    .lp-hero-badge { animation: fadeSlideUp 0.5s ease 0s    both; }
    .lp-hero-title { animation: fadeSlideUp 0.5s ease 0.10s both; }
    .lp-hero-sub   { animation: fadeSlideUp 0.5s ease 0.20s both; }
    .lp-hero-btns  { animation: fadeSlideUp 0.5s ease 0.35s both; }
    .lp-float      { animation: lpFloat 4s ease-in-out infinite; }
    .lp-pulse-dot  { animation: lpPulse 1.5s ease-in-out infinite; display: inline-block; }
    .lp-connect-btn { transition: background 0.2s, color 0.2s !important; }
    .lp-connect-btn:hover { background: var(--color-accent) !important; color: #fff !important; }
    .lp-nav-link { transition: color 0.15s !important; }
    .lp-nav-link:hover { color: var(--color-accent) !important; }
    .lp-cta-primary { transition: filter 0.15s, transform 0.15s !important; }
    .lp-cta-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .lp-cta-secondary { transition: border-color 0.15s, color 0.15s !important; }
    .lp-cta-secondary:hover { border-color: var(--color-accent) !important; color: var(--color-accent) !important; }
    .mock-item-sel { border-color: var(--color-accent) !important; color: var(--color-accent) !important; background: var(--color-accent-faint) !important; }
    @media (max-width: 768px) {
      .lp-feature-row { flex-direction: column !important; }
      .lp-feature-row.rev { flex-direction: column !important; }
      .lp-mockup-full { display: none !important; }
      .lp-btn-primary, .lp-btn-secondary { width: 100% !important; justify-content: center !important; }
      .lp-pourqui-grid { flex-direction: column !important; }
    }
  `;
  document.head.appendChild(s);
}

/* ── Helpers ─────────────────────────────────────────────────── */

function Tag({ children }) {
  return (
    <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "var(--bg-surface)", fontFamily: SANS, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function MockChip({ children, selected }) {
  return (
    <span className={selected ? "mock-item-sel" : ""} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "var(--bg-surface)", cursor: "default", display: "inline-block" }}>
      {children}
    </span>
  );
}

function MockTile({ icon, label, sub, selected }) {
  return (
    <div className={selected ? "mock-item-sel" : ""} style={{ padding: "8px 6px", borderRadius: 7, border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`, background: selected ? "var(--color-accent-faint)" : "var(--bg-surface-elevated)", textAlign: "center", cursor: "default" }}>
      <div style={{ fontSize: 16, marginBottom: 3 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: selected ? "var(--color-accent)" : "var(--color-text)" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function MockStepLabel({ n, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, marginTop: 14 }}>
      <span style={{ background: "var(--color-accent)", color: "#1a0510", borderRadius: "50%", width: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{n}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text)" }}>{children}</span>
    </div>
  );
}

function SectionTitle({ children, sub, light }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 56 }}>
      <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 700, color: light ? "#faebd7" : "var(--color-text)", margin: "0 0 14px", letterSpacing: "-0.02em" }}>
        {children}
      </h2>
      {sub && <p style={{ fontSize: 17, color: light ? "rgba(250,235,215,0.7)" : "var(--color-text-muted)", margin: 0, maxWidth: 520, marginInline: "auto", lineHeight: 1.6 }}>{sub}</p>}
    </div>
  );
}

/* ── Navbar ──────────────────────────────────────────────────── */
function LPNav({ onSignIn }) {
  return (
    <nav style={{ background: "var(--navbar-bg)", height: 60, display: "flex", alignItems: "center", padding: "0 32px", gap: 16, position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(242,119,48,0.12)" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <ChabadLogo size={34} />
        <span style={{ fontFamily: SERIF, fontSize: 17, color: "var(--navbar-text)", fontWeight: 700 }}>Habad.ai</span>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, display: "flex", gap: 4, justifyContent: "center" }}>
        {["Fonctionnalités", "Pour qui ?"].map((label, i) => (
          <a key={label} href={i === 0 ? "#features" : "#pourqui"} className="lp-nav-link"
            style={{ fontSize: 13, color: "var(--navbar-text-muted)", textDecoration: "none", padding: "6px 14px", borderRadius: 7, fontFamily: SANS }}>
            {label}
          </a>
        ))}
      </div>

      {/* CTA */}
      <button onClick={onSignIn} className="lp-connect-btn" style={{ padding: "8px 20px", borderRadius: "0.75rem", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--color-accent)", color: "var(--color-accent)", fontFamily: SANS, flexShrink: 0 }}>
        Se connecter →
      </button>
    </nav>
  );
}

/* ── Hero ────────────────────────────────────────────────────── */
function Hero({ onSignIn }) {
  return (
    <section style={{ minHeight: "88vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 60px" }}>
      {/* Badge */}
      <div className="lp-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 9999, background: "rgba(242,119,48,0.10)", border: "1px solid rgba(242,119,48,0.30)", marginBottom: 40 }}>
        <span className="lp-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
        <span style={{ fontSize: 13, color: "var(--color-accent)", fontFamily: SANS, fontWeight: 500 }}>Conçu pour les shluchim · Bêta ouverte</span>
      </div>

      {/* Headline */}
      <h1 className="lp-hero-title" style={{ fontFamily: SERIF, fontSize: "clamp(3rem,6vw,5.5rem)", fontWeight: 700, color: "var(--color-text)", margin: "0 0 20px", letterSpacing: "-0.03em", lineHeight: 1.1, maxWidth: 800 }}>
        L'assistant IA de votre{" "}
        <span style={{ color: "var(--color-accent)" }}>Beth Chabad.</span>
      </h1>

      {/* Sub */}
      <p className="lp-hero-sub" style={{ fontSize: 18, color: "var(--color-text-muted)", maxWidth: 520, lineHeight: 1.7, margin: "0 0 48px", fontFamily: SANS }}>
        Générez vos affiches, préparez vos cours de Torah et rédigez vos messages — en quelques clics.
      </p>

      {/* Buttons */}
      <div className="lp-hero-btns" style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onSignIn} className="lp-cta-primary lp-btn-primary" style={{ padding: "14px 32px", borderRadius: "0.75rem", fontSize: 15, fontWeight: 600, background: "var(--color-accent)", color: "#1a0510", border: "none", cursor: "pointer", fontFamily: SANS, display: "flex", alignItems: "center", gap: 8 }}>
          Commencer maintenant →
        </button>
        <a href="#features" className="lp-cta-secondary lp-btn-secondary" style={{ padding: "14px 32px", borderRadius: "0.75rem", fontSize: 15, fontWeight: 500, background: "transparent", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", cursor: "pointer", fontFamily: SANS, textDecoration: "none", display: "flex", alignItems: "center" }}>
          Voir les fonctionnalités ↓
        </a>
      </div>
    </section>
  );
}

/* ── Browser mockup (dashboard preview) ─────────────────────── */
function BrowserMockup() {
  const MOCK_MODULES = [
    { icon: "🎨", title: "Affiches",   desc: "Créez des affiches pour vos événements." },
    { icon: "📖", title: "Cours",      desc: "Préparez des cours de Torah adaptés." },
    { icon: "💬", title: "Messages",   desc: "Rédigez des messages personnalisés." },
    { icon: "📅", title: "Calendrier", desc: "Planifiez vos événements.", badge: "Bientôt" },
  ];

  return (
    <div className="lp-float lp-mockup-full" style={{ width: "100%", maxWidth: 900, margin: "0 auto", borderRadius: 12, overflow: "hidden", boxShadow: "0 40px 80px rgba(93,11,48,0.15)", border: "1px solid var(--color-border)" }}>
      {/* Browser chrome */}
      <div style={{ background: "#e8e0db", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f56","#ffbd2e","#27c93f"].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, background: "#fff", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#888", fontFamily: "monospace", maxWidth: 300, margin: "0 auto" }}>
          shliach.ai/dashboard
        </div>
      </div>

      {/* Mini app */}
      <div style={{ background: "var(--bg-primary)" }}>
        {/* Mini navbar */}
        <div style={{ background: "var(--navbar-bg)", height: 44, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
          <ChabadLogo size={24} />
          <span style={{ fontFamily: SERIF, fontSize: 13, color: "var(--navbar-text)", fontWeight: 700 }}>Habad.ai</span>
          <div style={{ flex: 1, display: "flex", gap: 4, justifyContent: "center" }}>
            {["🎨 Affiches","📖 Cours","💬 Messages"].map(l => (
              <span key={l} style={{ fontSize: 11, color: "var(--navbar-text-muted)", padding: "3px 8px", borderRadius: 5, fontFamily: SANS }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Dashboard content */}
        <div style={{ padding: "24px 28px" }}>
          {/* Greeting */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: "var(--color-text)" }}>
              שלום, <span style={{ color: "var(--color-accent)" }}>Rav Levi</span> !
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>Beth Chabad de Paris 16e</div>
          </div>

          {/* Paracha banner */}
          <div style={{ background: "var(--paracha-bg)", border: "1px solid var(--paracha-border)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent)", fontFamily: SANS }}>Paracha Vayikra</span>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Allumage 19:27 · Havdalah 20:37 · Paris</span>
          </div>

          {/* Module grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {MOCK_MODULES.map(m => (
              <div key={m.title} style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "16px 14px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: m.badge ? "var(--color-text-subtle)" : "var(--color-brand)" }} />
                {m.badge && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9, padding: "2px 6px", borderRadius: 9999, background: "var(--color-accent-faint)", border: "1px solid var(--color-accent-alpha)", color: "var(--color-accent-hover)", fontWeight: 600 }}>{m.badge}</span>}
                <div style={{ fontSize: 20, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 4, fontFamily: SANS }}>{m.title}</div>
                <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Affiches mockup ─────────────────────────────────────────── */
function AffichesMockup() {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px", fontFamily: SANS, width: "100%", maxWidth: 340 }}>
      <MockStepLabel n="1">Décrivez votre événement</MockStepLabel>
      <div style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, lineHeight: 1.5 }}>
        Ex : Atelier Pessah pour les enfants...
      </div>
      <div style={{ fontSize: 10, color: "var(--color-text-subtle)", marginBottom: 4 }}>Précisez le public pour adapter les illustrations.</div>

      <MockStepLabel n="2">Format</MockStepLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 }}>
        <MockTile icon="" label="Carré 1:1" sub="Instagram" selected />
        <MockTile icon="" label="Story 9:16" sub="Stories" />
        <MockTile icon="" label="A4" sub="Impression" />
        <MockTile icon="" label="Paysage 4:3" sub="Écran" />
      </div>

      <MockStepLabel n="3">Illustration</MockStepLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
        <MockTile icon="🏛" label="Décor" selected />
        <MockTile icon="👦" label="Garçons" />
        <MockTile icon="👧" label="Filles" />
        <MockTile icon="👨" label="Rav" />
        <MockTile icon="👩" label="Rabbanit" />
        <MockTile icon="👨‍👩" label="Mixte" />
      </div>

      <button style={{ width: "100%", padding: "10px", borderRadius: "0.75rem", background: "var(--color-accent)", color: "#1a0510", border: "none", fontSize: 12, fontWeight: 700, cursor: "default", fontFamily: SANS }}>
        Générer l'affiche
      </button>
    </div>
  );
}

/* ── Cours mockup ────────────────────────────────────────────── */
function CoursMockup() {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px", fontFamily: SANS, width: "100%", maxWidth: 340 }}>
      <MockStepLabel n="1">Occasion</MockStepLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 }}>
        <MockTile icon="🕯" label="Chabbat" selected />
        <MockTile icon="🎉" label="Fête" />
        <MockTile icon="📜" label="Bar Mitsva" />
        <MockTile icon="💍" label="Mariage" />
        <MockTile icon="🔎" label="Deuil" />
        <MockTile icon="🌺" label="Cours Femmes" />
        <MockTile icon="👶" label="Brit Mila" />
        <MockTile icon="✨" label="Autre" />
      </div>

      <MockStepLabel n="2">Paramètres</MockStepLabel>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 5 }}>Durée</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["5 min","10 min","20 min","30 min","45 min"].map(d => <MockChip key={d} selected={d === "20 min"}>{d}</MockChip>)}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 5 }}>Langue</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["Français","Hébreu","Fr+Hébreu"].map(l => <MockChip key={l} selected={l === "Français"}>{l}</MockChip>)}
        </div>
      </div>

      <button style={{ width: "100%", padding: "10px", borderRadius: "0.75rem", background: "var(--color-accent)", color: "#1a0510", border: "none", fontSize: 12, fontWeight: 700, cursor: "default", fontFamily: SANS }}>
        Générer le cours
      </button>
    </div>
  );
}

/* ── Messages mockup ─────────────────────────────────────────── */
function MessagesMockup() {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px", fontFamily: SANS, width: "100%", maxWidth: 340 }}>
      <MockStepLabel n="1">Type de message</MockStepLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 4 }}>
        <MockTile icon="📩" label="Invitation" selected />
        <MockTile icon="🌟" label="Voeux" />
        <MockTile icon="🙏" label="Remerciement" />
        <MockTile icon="📢" label="Annonce" />
        <MockTile icon="🕎" label="Condoléances" />
        <MockTile icon="💰" label="Collecte" />
        <MockTile icon="⏰" label="Rappel" />
        <MockTile icon="✏️" label="Autre" />
      </div>

      <MockStepLabel n="2">Personnalisation</MockStepLabel>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 4 }}>Destinataire(s)</div>
        <div style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 7, padding: "6px 10px", fontSize: 10, color: "var(--color-text-muted)" }}>
          Les fidèles, M. et Mme Cohen...
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 5 }}>Ton</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["Chaleureux","Formel","Joyeux","Solennel"].map(t => <MockChip key={t} selected={t === "Chaleureux"}>{t}</MockChip>)}
        </div>
      </div>

      <button style={{ width: "100%", padding: "10px", borderRadius: "0.75rem", background: "var(--color-accent)", color: "#1a0510", border: "none", fontSize: 12, fontWeight: 700, cursor: "default", fontFamily: SANS }}>
        Rédiger le message
      </button>
    </div>
  );
}

/* ── Feature block ───────────────────────────────────────────── */
function FeatureBlock({ title, desc, tags, mockup, reverse, addRef }) {
  return (
    <div ref={addRef} className={`lp-fade lp-feature-row${reverse ? " rev" : ""}`} style={{ display: "flex", gap: 60, alignItems: "center", flexDirection: reverse ? "row-reverse" : "row" }}>
      {/* Text side */}
      <div style={{ flex: "1 1 340px", minWidth: 0 }}>
        <h3 style={{ fontFamily: SERIF, fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "var(--color-text)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>{title}</h3>
        <p style={{ fontSize: 16, color: "var(--color-text-muted)", lineHeight: 1.75, margin: "0 0 24px", fontFamily: SANS }}>{desc}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map(t => <Tag key={t}>{t}</Tag>)}
        </div>
      </div>
      {/* Mockup side */}
      <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center" }}>
        {mockup}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function LandingPage() {
  const fadeRefs = useRef([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("is-visible"); }),
      { threshold: 0.12 }
    );
    fadeRefs.current.forEach(r => r && obs.observe(r));
    return () => obs.disconnect();
  }, []);

  const addRef = el => { if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el); };

  async function handleSignIn() {
    if (!firebaseReady) return;
    try { await signInWithGoogle(); } catch (e) { console.error("Auth:", e); }
  }

  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--color-text)", fontFamily: SANS, overflowX: "hidden" }}>

      {/* ── Navbar ── */}
      <LPNav onSignIn={handleSignIn} />

      {/* ── Hero ── */}
      <Hero onSignIn={handleSignIn} />

      {/* ── Mockup section ── */}
      <section style={{ padding: "60px 24px 100px", maxWidth: 960, margin: "0 auto" }}>
        <div ref={addRef} className="lp-fade" style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: "var(--color-text)", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Votre outil, en vrai.
          </h2>
          <p style={{ fontSize: 16, color: "var(--color-text-muted)", margin: 0 }}>
            Voici exactement ce que vous verrez en vous connectant.
          </p>
        </div>
        <div ref={addRef} className="lp-fade">
          <BrowserMockup />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div ref={addRef} className="lp-fade">
          <SectionTitle sub="Trois modules, un seul outil — taillé pour les rabbins de terrain.">
            3 outils. Zéro prise de tête.
          </SectionTitle>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          <FeatureBlock
            addRef={addRef}
            title="Affiches en 3 clics"
            desc="Décrivez votre événement en une phrase. Choisissez le format (carré Instagram, story, A4, paysage) et le type d'illustration. L'IA génère une affiche prête à partager."
            tags={["Carré 1:1", "Story 9:16", "A4 impression", "Paysage 4:3"]}
            mockup={<AffichesMockup />}
          />
          <FeatureBlock
            addRef={addRef}
            reverse
            title="Cours de Torah pour chaque occasion"
            desc="Chabbat, Bar Mitsva, Mariage, Deuil, Brit Mila, Cours Femmes... Sélectionnez l'occasion, la durée (5 à 45 min) et la langue. Obtenez un cours structuré avec histoires hassidiques, halakha et pensée du Rabbi."
            tags={["Histoires hassidiques", "Gematria", "Kabbalah", "Midrash"]}
            mockup={<CoursMockup />}
          />
          <FeatureBlock
            addRef={addRef}
            title="Le bon message, au bon ton"
            desc="Invitation, voeux, remerciement, condoléances, collecte, rappel... Précisez le destinataire, le sujet et le ton. Le message est rédigé pour votre communauté, en tutoiement ou vouvoiement."
            tags={["Chaleureux", "Solennel", "Joyeux", "Formel"]}
            mockup={<MessagesMockup />}
          />
        </div>
      </section>

      {/* ── Pour qui ── */}
      <section id="pourqui" style={{ background: "var(--color-primary)", padding: "100px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div ref={addRef} className="lp-fade">
            <SectionTitle light sub="">
              Fait pour les shluchim qui font tout eux-mêmes.
            </SectionTitle>
          </div>
          <div ref={addRef} className="lp-fade lp-pourqui-grid" style={{ display: "flex", gap: 20 }}>
            {[
              { icon: "🕯", title: "Le vendredi avant Chabbat", body: "Votre affiche Chabbat est prête en 2 minutes. Pas en 2 heures." },
              { icon: "📖", title: "Avant un cours improvisé", body: "L'occasion vient de se présenter ? Générez un cours structuré en 30 secondes." },
              { icon: "💌", title: "Pour chaque simha ou deuil", body: "Le bon message, à la bonne personne, sans passer une heure à le formuler." },
            ].map(c => (
              <div key={c.title} style={{ flex: "1 1 240px", background: "var(--color-brand)", borderRadius: 14, padding: "28px 24px", border: "1px solid rgba(250,235,215,0.08)" }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{c.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#faebd7", marginBottom: 10, fontFamily: SANS, lineHeight: 1.3 }}>{c.title}</div>
                <div style={{ fontSize: 14, color: "rgba(250,235,215,0.75)", lineHeight: 1.65, fontFamily: SANS }}>{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section style={{ background: "var(--bg-surface)", padding: "100px 24px" }}>
        <div ref={addRef} className="lp-fade" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: "var(--color-text)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            Prêt à commencer ?
          </h2>
          <p style={{ fontSize: 17, color: "var(--color-text-muted)", margin: "0 0 40px", lineHeight: 1.65 }}>
            Rejoignez les shluchim qui gagnent du temps chaque semaine.
          </p>
          <button onClick={handleSignIn} className="lp-cta-primary" style={{ padding: "15px 40px", borderRadius: "0.75rem", fontSize: 16, fontWeight: 700, background: "var(--color-accent)", color: "#1a0510", border: "none", cursor: "pointer", fontFamily: SANS }}>
            Accéder à l'app →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--navbar-bg)", padding: "40px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ChabadLogo size={28} />
            <span style={{ fontFamily: SERIF, fontSize: 16, color: "var(--navbar-text)", fontWeight: 700 }}>Habad.ai</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(250,235,215,0.6)", fontFamily: SANS }}>
            L'assistant IA des shluchim
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(250,235,215,0.4)", fontFamily: SANS }}>
            Réservé aux Shluchim · Offert par Mendy
          </p>
        </div>
      </footer>

    </div>
  );
}
