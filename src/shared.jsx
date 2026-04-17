/* ─── shared.jsx ─── Design tokens, fonts, and reusable components ─── */

/* ── Design tokens — all values are CSS custom properties ── */
export const T = {
  bg:           "var(--bg-primary)",
  surface:      "var(--bg-surface)",
  card:         "var(--bg-surface)",
  elevated:     "var(--bg-surface-elevated)",
  surfaceHover: "var(--bg-surface-hover)",
  border:       "var(--color-border)",
  borderHover:  "var(--color-border-active)",
  gold:         "var(--color-accent)",
  goldBr:       "var(--color-accent-hover)",
  /* Alpha tints — use these instead of T.gold + "hex" string concat */
  goldFaint:    "var(--color-accent-faint)",   /* ~8% alpha  */
  goldSoft:     "var(--color-accent-soft)",    /* ~12% alpha */
  goldAlpha:    "var(--color-accent-alpha)",   /* ~25% alpha */
  text:         "var(--color-text)",
  muted:        "var(--color-text-muted)",
  faint:        "var(--color-text-subtle)",
  red:                "var(--color-error)",
  redBg:              "var(--color-error-bg)",
  redBorder:          "var(--color-error-border)",
  redBorderStrong:    "var(--color-error-border-strong)",
  green:              "var(--color-success)",
  textOnAccent:       "var(--color-text-on-accent)",
  iconCircleBg:       "var(--color-icon-circle-bg)",
  modalBackdrop:      "var(--color-modal-backdrop)",
  shadowDropdown:     "var(--shadow-dropdown)",
  shadowCardHover:    "var(--shadow-card-hover)",
  /* Semantic */
  brand:        "var(--color-brand)",
  navbarBg:     "var(--navbar-bg)",
  navbarText:   "var(--navbar-text)",
  navbarMuted:  "var(--navbar-text-muted)",
  parachaBg:    "var(--paracha-bg)",
  parachaBorder:"var(--paracha-border)",
};

export const SERIF = "'Playfair Display', Georgia, serif";
export const SANS  = "'DM Sans', 'Segoe UI', sans-serif";

export const INP = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--bg-surface-elevated)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-text)",
  fontSize: 13.5,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: SANS,
  transition: "border-color 0.2s",
};

export function ChabadLogo({ size = 40, color = "#C9971A", flameColor = "#E8A020", style = {} }) {
  const w = size * (60 / 56);
  return (
    <svg width={w} height={size} viewBox="0 0 60 56" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, ...style }}>
      <path d="M30 2 C30 2 26 7 27.5 10.5 C28.5 12.5 30 13 30 13 C30 13 31.5 12.5 32.5 10.5 C34 7 30 2 30 2 Z" fill={flameColor} />
      <polyline points="6,16 30,42 54,16" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="13,16 30,34 47,16" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <polyline points="20,16 30,26 40,16" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 14, transition: "border-color 0.2s", ...style }}>
      {children}
    </div>
  );
}

export function GBtn({ onClick, children, disabled = false, outline = false, sm = false, fullWidth = false }) {
  const base = {
    padding: sm ? "8px 16px" : "12px 24px",
    borderRadius: "0.75rem",
    fontSize: sm ? 12 : 14,
    fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: SANS,
    width: fullWidth ? "100%" : "auto",
    transition: "all 0.15s",
  };
  if (outline)
    return (
      <button onClick={onClick} disabled={disabled} style={{ ...base, background: "transparent", border: `1px solid ${T.gold}`, color: T.gold, opacity: disabled ? 0.5 : 1 }}>
        {children}
      </button>
    );
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, background: disabled ? "var(--color-primary)" : T.gold, color: "var(--color-text-on-accent)", border: "none", opacity: disabled ? 0.6 : 1, boxShadow: disabled ? "none" : "0 4px 20px var(--color-accent-soft)" }}>
      {children}
    </button>
  );
}

export function StepLabel({ n, children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ background: T.gold, color: "var(--color-text-on-accent)", borderRadius: 20, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {n}
      </span>
      {children}
    </div>
  );
}

export function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: T.muted,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: SANS,
        padding: "8px 0",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 16 }}>&larr;</span> Dashboard
    </button>
  );
}

import { useState, useEffect } from "react";

// Inject global focus-visible style once
if (typeof document !== "undefined" && !document.getElementById("shliach-focus-style")) {
  const style = document.createElement("style");
  style.id = "shliach-focus-style";
  style.textContent = `*:focus-visible { outline: 2px solid var(--color-accent) !important; outline-offset: 2px !important; }`;
  document.head.appendChild(style);
}

const NAV_ITEMS = [
  { id: "affiches", label: "Affiches", icon: "🎨" },
  { id: "cours",    label: "Cours",    icon: "📖" },
  { id: "messages", label: "Messages", icon: "💬" },
];

export function AppHeader({ currentScreen, onNavigate, user, onSignOut }) {
  const [mobile, setMobile] = useState(window.innerWidth <= 600);
  const [showMenu, setShowMenu] = useState(false);
  const [theme, setTheme] = useState(() =>
    typeof document !== "undefined"
      ? (document.documentElement.getAttribute("data-theme") || "dark")
      : "dark"
  );

  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("shliach-theme", next);
    setTheme(next);
  }

  const prenom = user?.displayName?.split(" ")[0] || "Rav";

  return (
    <div style={{ background: T.navbarBg, borderBottom: `1px solid ${T.goldFaint}`, padding: "0 20px", height: 60, display: "flex", alignItems: "center", gap: mobile ? 8 : 14, fontFamily: SANS }}>
      {/* LEFT */}
      <div onClick={() => onNavigate("dashboard")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
        <ChabadLogo size={36} />
        {!mobile && <span style={{ fontFamily: SERIF, fontSize: 17, color: T.navbarText, fontWeight: 700 }}>Habad.ai</span>}
      </div>

      {/* CENTER — Nav */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: mobile ? 4 : 6 }}>
        {NAV_ITEMS.map(n => {
          const active = currentScreen === n.id;
          return (
            <div
              key={n.id}
              onClick={() => onNavigate(n.id)}
              style={{
                padding: mobile ? "5px 10px" : "6px 14px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
                color: active ? T.gold : T.navbarMuted,
                background: active ? T.goldFaint : "transparent",
                border: active ? `1px solid ${T.goldSoft}` : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: mobile ? 0 : 6,
              }}
            >
              <span style={{ fontSize: mobile ? 16 : 14 }}>{n.icon}</span>
              {!mobile && <span>{n.label}</span>}
            </div>
          );
        })}
      </div>

      {/* RIGHT — Theme toggle + User */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 6,
            color: T.navbarMuted,
            fontSize: 17,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--color-accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--navbar-text-muted)"; }}
        >
          {theme === "dark" ? "☀" : "☽"}
        </button>

        {/* User menu */}
        <div style={{ position: "relative" }}>
          <div onClick={() => setShowMenu(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 8, border: `1px solid ${T.border}` }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${T.gold}` }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--color-text-on-accent)", fontWeight: 700 }}>
                {prenom[0]}
              </div>
            )}
            {!mobile && <span style={{ fontSize: 13, color: T.navbarText }}>{prenom}</span>}
            <span style={{ fontSize: 10, color: T.navbarMuted }}>▼</span>
          </div>
          {showMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", zIndex: 100, minWidth: 160, boxShadow: "var(--shadow-dropdown)" }}>
              <div onClick={() => { setShowMenu(false); onNavigate("profile"); }} style={{ padding: "10px 16px", fontSize: 13, color: T.text, cursor: "pointer", borderBottom: `1px solid ${T.border}` }}>
                Mon profil
              </div>
              <div onClick={() => { setShowMenu(false); onSignOut(); }} style={{ padding: "10px 16px", fontSize: 13, color: T.red, cursor: "pointer" }}>
                Déconnexion
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
