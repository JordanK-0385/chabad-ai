/* ─── Admin.jsx ─── Protected admin dashboard with user stats ─── */

import { useEffect, useState, Fragment } from "react";
import { collection, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { T, SERIF, SANS, INP, AppHeader } from "../shared";

const ADMIN_UID = "9B2EWANLCaMssqkdRjTy66bjhCE3";

export default function Admin({ user, profil, headerProps }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editingUid, setEditingUid] = useState(null);
  const [editData, setEditData] = useState({ betChabad: "", email: "", tailleCommunaute: "" });
  const [busyUid, setBusyUid] = useState(null);

  const isAdmin = user?.uid === ADMIN_UID;

  async function handleDelete(uid) {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    setBusyUid(uid);
    setErr("");
    try {
      for (const sub of ["cours", "affiches", "messages"]) {
        const snap = await getDocs(collection(db, "users", uid, sub));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, "users", uid));
      setRows(prev => prev.filter(r => r.uid !== uid));
      if (editingUid === uid) setEditingUid(null);
    } catch (e) {
      setErr(e.message || "Erreur de suppression.");
    } finally {
      setBusyUid(null);
    }
  }

  function handleEditStart(r) {
    setEditingUid(r.uid);
    setEditData({
      betChabad: r.betChabad === "—" ? "" : r.betChabad,
      email: r.email === "—" ? "" : r.email,
      tailleCommunaute: r.tailleCommunaute || "",
    });
  }

  function handleEditCancel() {
    setEditingUid(null);
    setEditData({ betChabad: "", email: "", tailleCommunaute: "" });
  }

  async function handleEditSave(uid) {
    setBusyUid(uid);
    setErr("");
    try {
      const updated = {
        betChabad: editData.betChabad.trim(),
        email: editData.email.trim(),
        tailleCommunaute: editData.tailleCommunaute,
      };
      await updateDoc(doc(db, "users", uid), updated);
      setRows(prev => prev.map(r => r.uid === uid ? {
        ...r,
        betChabad: updated.betChabad || "—",
        email: updated.email || "—",
        tailleCommunaute: updated.tailleCommunaute,
      } : r));
      setEditingUid(null);
    } catch (e) {
      setErr(e.message || "Erreur de sauvegarde.");
    } finally {
      setBusyUid(null);
    }
  }

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
              tailleCommunaute: d.tailleCommunaute || "",
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
  const actionBtn = {
    padding: "7px 14px",
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: SANS,
    border: "1px solid var(--color-border)",
    background: "var(--bg-surface-elevated)",
    color: "var(--color-text)",
    transition: "all 0.15s",
  };
  const actionBtnDanger = {
    color: "#D94F4F",
    borderColor: "rgba(217,79,79,0.35)",
    background: "rgba(217,79,79,0.06)",
  };
  const actionBtnPrimary = {
    background: "var(--color-accent)",
    color: "#1a0510",
    borderColor: "var(--color-accent)",
  };
  const editLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

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
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td style={{ ...td, color: "var(--color-text-muted)" }} colSpan={8}>
                      Aucun utilisateur.
                    </td>
                  </tr>
                )}
                {rows.map(r => {
                  const isEditing = editingUid === r.uid;
                  const isBusy = busyUid === r.uid;
                  return (
                    <Fragment key={r.uid}>
                      <tr>
                        <td style={td}>{r.nom}</td>
                        <td style={{ ...td, color: "var(--color-text-muted)" }}>{r.email}</td>
                        <td style={td}>{r.betChabad}</td>
                        <td style={{ ...td, color: "var(--color-text-muted)" }}>
                          {r.inscription ? r.inscription.toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={{ ...td, ...num }}>{r.cours}</td>
                        <td style={{ ...td, ...num }}>{r.affiches}</td>
                        <td style={{ ...td, ...num }}>{r.messages}</td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => (isEditing ? handleEditCancel() : handleEditStart(r))}
                            disabled={isBusy}
                            style={{ ...actionBtn, marginRight: 6, opacity: isBusy ? 0.5 : 1 }}
                          >
                            {isEditing ? "Fermer" : "Modifier"}
                          </button>
                          <button
                            onClick={() => handleDelete(r.uid)}
                            disabled={isBusy}
                            style={{ ...actionBtn, ...actionBtnDanger, opacity: isBusy ? 0.5 : 1 }}
                          >
                            {isBusy ? "…" : "Supprimer"}
                          </button>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr>
                          <td colSpan={8} style={{ padding: "18px 20px", background: "var(--bg-surface-elevated)", borderBottom: "1px solid var(--color-border)" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                              <div>
                                <label style={editLabel}>Beth Chabad</label>
                                <input
                                  value={editData.betChabad}
                                  onChange={e => setEditData(s => ({ ...s, betChabad: e.target.value }))}
                                  style={INP}
                                />
                              </div>
                              <div>
                                <label style={editLabel}>Email</label>
                                <input
                                  value={editData.email}
                                  onChange={e => setEditData(s => ({ ...s, email: e.target.value }))}
                                  style={INP}
                                />
                              </div>
                              <div>
                                <label style={editLabel}>Taille communauté</label>
                                <input
                                  value={editData.tailleCommunaute}
                                  onChange={e => setEditData(s => ({ ...s, tailleCommunaute: e.target.value }))}
                                  style={INP}
                                />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                              <button onClick={handleEditCancel} disabled={isBusy} style={actionBtn}>
                                Annuler
                              </button>
                              <button onClick={() => handleEditSave(r.uid)} disabled={isBusy} style={{ ...actionBtn, ...actionBtnPrimary, opacity: isBusy ? 0.5 : 1 }}>
                                {isBusy ? "Enregistrement…" : "Sauvegarder"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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
                    <td style={{ ...td, borderBottom: "none" }} />
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
