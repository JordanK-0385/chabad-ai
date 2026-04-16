/* ─── Admin.jsx ─── Protected admin dashboard with user stats ─── */

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { T, SERIF, SANS, AppHeader } from "../shared";

const ADMIN_UID = "9B2EWANLCaMssqkdRjTy66bjhCE3";

export default function Admin({ user, profil, headerProps }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const data = await Promise.all(
          usersSnap.docs.map(async (u) => {
            const uid = u.id;
            const d = u.data() || {};
            const [cSnap, aSnap, mSnap] = await Promise.all([
              getDocs(collection(db, "users", uid, "cours")),
              getDocs(collection(db, "users", uid, "affiches")),
              getDocs(collection(db, "users", uid, "messages")),
            ]);
            return {
              uid,
              nom: d.displayName || d.nom || "—",
              email: d.email || "—",
              betChabad: d.betChabad || "—",
              inscription: d.updatedAt?.toDate?.() || null,
              cours: cSnap.size,
              affiches: aSnap.size,
              messages: mSnap.size,
            };
          })
        );
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) {
    return <div style={{ padding: 40 }}>Accès refusé.</div>;
  }

  const totals = rows.reduce(
    (acc, r) => ({
      cours:    acc.cours    + r.cours,
      affiches: acc.affiches + r.affiches,
      messages: acc.messages + r.messages,
    }),
    { cours: 0, affiches: 0, messages: 0 }
  );

  const th = {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    borderBottom: "1px solid var(--color-border)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    background: "var(--bg-surface-elevated)",
  };
  const td = {
    padding: "14px 16px",
    fontSize: 14,
    color: "var(--color-text)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "middle",
  };
  const num = { textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--color-text)", fontFamily: SANS }}>
      {headerProps && <AppHeader currentScreen="admin" {...headerProps} />}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text)", letterSpacing: "-0.02em" }}>
          Admin
        </h1>
        <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 28 }}>
          {loading ? "Chargement…" : `${rows.length} utilisateur${rows.length > 1 ? "s" : ""}`}
        </div>

        {err && (
          <div style={{ color: "#D94F4F", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 8 }}>
            {err}
          </div>
        )}

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
              <thead>
                <tr>
                  <th style={th}>Nom</th>
                  <th style={th}>Email</th>
                  <th style={th}>Beth Chabad</th>
                  <th style={th}>Inscription</th>
                  <th style={{ ...th, ...num }}>Cours</th>
                  <th style={{ ...th, ...num }}>Affiches</th>
                  <th style={{ ...th, ...num }}>Messages</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td style={{ ...td, color: "var(--color-text-muted)" }} colSpan={7}>
                      Aucun utilisateur.
                    </td>
                  </tr>
                )}
                {rows.map(r => (
                  <tr key={r.uid}>
                    <td style={td}>{r.nom}</td>
                    <td style={{ ...td, color: "var(--color-text-muted)" }}>{r.email}</td>
                    <td style={td}>{r.betChabad}</td>
                    <td style={{ ...td, color: "var(--color-text-muted)" }}>
                      {r.inscription ? r.inscription.toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td style={{ ...td, ...num }}>{r.cours}</td>
                    <td style={{ ...td, ...num }}>{r.affiches}</td>
                    <td style={{ ...td, ...num }}>{r.messages}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr style={{ background: "var(--bg-surface-elevated)" }}>
                    <td style={{ ...td, fontWeight: 700, borderBottom: "none" }} colSpan={4}>
                      Total
                    </td>
                    <td style={{ ...td, ...num, fontWeight: 700, color: "var(--color-accent)", borderBottom: "none" }}>
                      {totals.cours}
                    </td>
                    <td style={{ ...td, ...num, fontWeight: 700, color: "var(--color-accent)", borderBottom: "none" }}>
                      {totals.affiches}
                    </td>
                    <td style={{ ...td, ...num, fontWeight: 700, color: "var(--color-accent)", borderBottom: "none" }}>
                      {totals.messages}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
