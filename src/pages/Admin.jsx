/* ─── Admin.jsx ─── Protected admin dashboard with user stats ─── */

import { useEffect, useState, Fragment } from "react";
import { collection, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { T, SERIF, SANS, INP, AppHeader } from "../shared";

const GH_OWNER  = "JordanK-0385";
const GH_REPO   = "chabad-ai";
const GH_BRANCH = "main";
const GH_PATH   = "public/pdfs";
const GH_TOKEN  = import.meta.env.VITE_GITHUB_TOKEN;
const GH_BASE   = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;
const ghHeaders = () => ({
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function ghList() {
  const res = await fetch(`${GH_BASE}?ref=${GH_BRANCH}`, { headers: ghHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data.map(f => ({ name: f.name, path: f.path, sha: f.sha })) : [];
}

async function ghGetSha(filename) {
  const res = await fetch(`${GH_BASE}/${encodeURIComponent(filename)}?ref=${GH_BRANCH}`, { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub get failed (${res.status})`);
  const data = await res.json();
  return data.sha;
}

async function ghUpload(filename, base64) {
  const sha = await ghGetSha(filename);
  const body = { message: `Add PDF: ${filename}`, content: base64, branch: GH_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`${GH_BASE}/${encodeURIComponent(filename)}`, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message || `GitHub upload failed (${res.status})`);
  }
}

async function ghDelete(filename) {
  const sha = await ghGetSha(filename);
  if (!sha) throw new Error("Fichier introuvable sur GitHub.");
  const res = await fetch(`${GH_BASE}/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message: `Remove PDF: ${filename}`, sha, branch: GH_BRANCH }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message || `GitHub delete failed (${res.status})`);
  }
}

const ADMIN_UID = "9B2EWANLCaMssqkdRjTy66bjhCE3";

export default function Admin({ user, profil, headerProps }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editingUid, setEditingUid] = useState(null);
  const [editData, setEditData] = useState({ betChabad: "", email: "", tailleCommunaute: "" });
  const [busyUid, setBusyUid] = useState(null);

  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState("");
  const [pdfSelection, setPdfSelection] = useState(null);

  const [adminTab, setAdminTab] = useState("dashboard");
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsBusy, setSuggestionsBusy] = useState(null);
  const [suggestionsErr, setSuggestionsErr] = useState("");

  const [mobile, setMobile] = useState(typeof window !== "undefined" && window.innerWidth <= 600);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const isAdmin = user?.uid === ADMIN_UID;

  async function refreshPdfList() {
    const items = await ghList();
    setPdfFiles(items);
  }

  async function handlePdfUpload() {
    if (!pdfSelection || pdfSelection.length === 0) return;
    setPdfBusy(true); setPdfErr("");
    try {
      for (const file of Array.from(pdfSelection)) {
        if (file.size > 30 * 1024 * 1024) {
          setPdfErr("Fichier trop lourd (max 30MB) : " + file.name);
          continue;
        }
        if (file.type !== "application/pdf") {
          setPdfErr("Format invalide (PDF uniquement) : " + file.name);
          continue;
        }
        const base64 = await fileToBase64(file);
        await ghUpload(file.name, base64);
      }
      await refreshPdfList();
      setPdfSelection(null);
      const input = document.getElementById("admin-pdf-input");
      if (input) input.value = "";
    } catch (e) {
      setPdfErr(e.message || "Erreur d'upload.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handlePdfDelete(name) {
    if (!window.confirm(`Supprimer ${name} ?`)) return;
    setPdfBusy(true); setPdfErr("");
    try {
      await ghDelete(name);
      setPdfFiles(prev => prev.filter(f => f.name !== name));
    } catch (e) {
      setPdfErr(e.message || "Erreur de suppression.");
    } finally {
      setPdfBusy(false);
    }
  }

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
            const sumCost = snap => snap.docs.reduce((acc, x) => acc + (x.data().coutEuros || 0), 0);
            const coursCost    = sumCost(cSnap);
            const affichesCost = sumCost(aSnap);
            const messagesCost = sumCost(mSnap);
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
              coursCost,
              affichesCost,
              messagesCost,
              totalCost: coursCost + affichesCost + messagesCost,
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

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await ghList();
        if (!cancelled) setPdfFiles(items);
      } catch (e) {
        if (!cancelled) setPdfErr(e.message || "Erreur de chargement PDF.");
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        let docs = [];
        try {
          const snap = await getDocs(query(collection(db, "suggestions"), orderBy("createdAt", "desc")));
          docs = snap.docs;
        } catch {
          const snap = await getDocs(collection(db, "suggestions"));
          docs = snap.docs;
        }
        const data = docs.map(d => {
          const v = d.data() || {};
          return {
            id: d.id,
            userId: v.userId || "",
            userEmail: v.userEmail || "",
            userName: v.userName || "",
            betChabad: v.betChabad || "—",
            type: v.type || "—",
            message: v.message || "",
            status: v.status || "nouvelle",
            createdAt: v.createdAt?.toDate?.() || null,
          };
        });
        data.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        if (!cancelled) setSuggestions(data);
      } catch (e) {
        if (!cancelled) setSuggestionsErr(e.message || "Erreur de chargement des suggestions.");
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "generations"));
        const docs = snap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate?.() || null }));

        const totalGenerations = docs.length;

        const byModule = { cours: 0, affiches: 0, messages: 0 };
        for (const dd of docs) {
          if (dd.module && byModule[dd.module] !== undefined) byModule[dd.module] += 1;
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const last7days = docs.filter(dd => dd.createdAt && dd.createdAt >= sevenDaysAgo).length;

        // last7daysByDay — 7 buckets ending today (today = last), labels "lun".."dim"
        const dayLabels = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"]; // JS getDay()
        const last7daysByDay = [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        for (let i = 6; i >= 0; i--) {
          const start = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
          const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
          const count = docs.filter(dd => dd.createdAt && dd.createdAt >= start && dd.createdAt < end).length;
          last7daysByDay.push({ label: dayLabels[start.getDay()], count });
        }

        // topUsers — aggregate by uid
        const userAgg = new Map();
        for (const dd of docs) {
          if (!dd.uid) continue;
          const prev = userAgg.get(dd.uid) || { uid: dd.uid, userName: dd.userName || "", betChabad: dd.betChabad || "", count: 0 };
          prev.count += 1;
          if (!prev.userName && dd.userName) prev.userName = dd.userName;
          if (!prev.betChabad && dd.betChabad) prev.betChabad = dd.betChabad;
          userAgg.set(dd.uid, prev);
        }
        const topUsers = Array.from(userAgg.values()).sort((a, b) => b.count - a.count).slice(0, 5);

        // byBetChabad — top 8 non-empty
        const bcAgg = new Map();
        for (const dd of docs) {
          const bc = (dd.betChabad || "").trim();
          if (!bc) continue;
          bcAgg.set(bc, (bcAgg.get(bc) || 0) + 1);
        }
        const byBetChabad = Array.from(bcAgg.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        const totalCost = docs.reduce((acc, dd) => acc + (Number(dd.coutEuros) || 0), 0);

        if (!cancelled) setDashStats({ totalGenerations, byModule, last7days, last7daysByDay, topUsers, byBetChabad, totalCost });
      } catch (e) {
        if (!cancelled) setDashStats({ totalGenerations: 0, byModule: { cours: 0, affiches: 0, messages: 0 }, last7days: 0, last7daysByDay: [], topUsers: [], byBetChabad: [], totalCost: 0 });
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  async function handleSuggestionStatus(id, newStatus) {
    setSuggestionsBusy(id);
    setSuggestionsErr("");
    try {
      await updateDoc(doc(db, "suggestions", id), { status: newStatus });
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch (e) {
      setSuggestionsErr(e.message || "Erreur de mise à jour.");
    } finally {
      setSuggestionsBusy(null);
    }
  }

  async function handleSuggestionDelete(id) {
    if (!window.confirm("Supprimer cette suggestion ?")) return;
    setSuggestionsBusy(id);
    setSuggestionsErr("");
    try {
      await deleteDoc(doc(db, "suggestions", id));
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      setSuggestionsErr(e.message || "Erreur de suppression.");
    } finally {
      setSuggestionsBusy(null);
    }
  }

  if (!isAdmin) {
    return <div style={{ padding: 40 }}>Accès refusé.</div>;
  }

  const unreadSuggestions = suggestions.filter(s => s.status === "nouvelle").length;

  const totals = rows.reduce(
    (acc, r) => ({
      cours:        acc.cours        + r.cours,
      affiches:     acc.affiches     + r.affiches,
      messages:     acc.messages     + r.messages,
      coursCost:    acc.coursCost    + (r.coursCost    || 0),
      affichesCost: acc.affichesCost + (r.affichesCost || 0),
      messagesCost: acc.messagesCost + (r.messagesCost || 0),
      totalCost:    acc.totalCost    + (r.totalCost    || 0),
    }),
    { cours: 0, affiches: 0, messages: 0, coursCost: 0, affichesCost: 0, messagesCost: 0, totalCost: 0 }
  );
  const fmtEUR = v => (v > 0 ? v.toFixed(3) + " €" : "—");
  const totalGenerations = totals.cours + totals.affiches + totals.messages;

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
    color: "var(--color-error)",
    borderColor: "var(--color-error-border-strong)",
    background: "var(--color-error-bg)",
  };
  const actionBtnPrimary = {
    background: "var(--color-accent)",
    color: "var(--color-text-on-accent)",
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

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: mobile ? "20px 14px" : "36px 24px" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: mobile ? 24 : 32, fontWeight: 700, margin: "0 0 16px", color: "var(--color-text)", letterSpacing: "-0.02em" }}>
          Admin
        </h1>
        <div style={{ display: "flex", gap: mobile ? 10 : 12, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: mobile ? "10px 14px" : "12px 18px",
            background: "var(--color-accent-faint)",
            border: "1px solid var(--color-accent-alpha)",
            borderRadius: 12,
            fontFamily: SANS,
          }}>
            <span style={{ fontSize: mobile ? 20 : 22 }}>👥</span>
            <span>
              <span style={{ fontSize: mobile ? 20 : 24, fontWeight: 800, color: "var(--color-accent)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
                {loading ? "…" : rows.length}
              </span>
              <span style={{ fontSize: mobile ? 12 : 13, color: "var(--color-text-muted)", marginLeft: 6, fontWeight: 600 }}>
                {rows.length > 1 ? "inscrits" : "inscrit"}
              </span>
            </span>
          </div>
        </div>

        {err && (
          <div style={{ color: "var(--color-error)", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: 8 }}>
            {err}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: "1px solid var(--color-border)" }}>
          {[
            { id: "dashboard", label: "Dashboard",    icon: "📊" },
            { id: "users",     label: "Utilisateurs", icon: "👥" },
            { id: "documents", label: "Documents",   icon: "📄" },
            { id: "ideas",     label: "Idées",       icon: "💡" },
          ].map(t => {
            const active = adminTab === t.id;
            const badge = t.id === "ideas" && unreadSuggestions > 0 ? unreadSuggestions : 0;
            return (
              <button
                key={t.id}
                onClick={() => setAdminTab(t.id)}
                style={{
                  padding: mobile ? "10px 12px" : "10px 18px",
                  fontSize: mobile ? 13 : 14,
                  fontWeight: 600,
                  fontFamily: SANS,
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? "var(--color-accent)" : "transparent"}`,
                  color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: -1,
                  transition: "all 0.15s",
                  position: "relative",
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {badge > 0 && (
                  <span style={{
                    background: "var(--color-error)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 999,
                    lineHeight: 1,
                    minWidth: 18,
                    textAlign: "center",
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {adminTab === "dashboard" && (() => {
          if (dashLoading) {
            return <div style={{ padding: 24, fontSize: 14, color: "var(--color-text-muted)", textAlign: "center" }}>Chargement du dashboard…</div>;
          }
          if (!dashStats || dashStats.totalGenerations === 0) {
            return <div style={{ padding: 24, fontSize: 14, color: "var(--color-text-muted)", textAlign: "center", background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14 }}>Aucune donnée.</div>;
          }
          const { totalGenerations, byModule, last7days, last7daysByDay, topUsers, byBetChabad, totalCost } = dashStats;
          const moduleEntries = Object.entries(byModule);
          const moduleTopEntry = moduleEntries.reduce((best, cur) => cur[1] > best[1] ? cur : best, ["—", 0]);
          const maxDayCount = Math.max(1, ...last7daysByDay.map(x => x.count));
          const maxModuleCount = Math.max(1, ...moduleEntries.map(x => x[1]));
          const maxBcCount = Math.max(1, ...byBetChabad.map(x => x.count));
          const moduleLabels = { cours: "Cours", affiches: "Affiches", messages: "Messages" };

          const kpiCard = { background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, fontFamily: SANS };
          const kpiLabel = { fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 };
          const kpiValue = { fontSize: mobile ? 24 : 28, fontWeight: 800, color: "var(--color-text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 };
          const kpiSub = { fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 };

          const sectionCard = { background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: mobile ? 16 : 20, fontFamily: SANS };
          const sectionTitle = { fontFamily: SERIF, fontSize: mobile ? 16 : 17, fontWeight: 700, margin: "0 0 16px", color: "var(--color-text)", letterSpacing: "-0.01em" };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* ROW 1 — KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
                <div style={kpiCard}>
                  <div style={kpiLabel}>📊 Générations totales</div>
                  <div style={kpiValue}>{totalGenerations}</div>
                </div>
                <div style={kpiCard}>
                  <div style={kpiLabel}>🗓 Cette semaine</div>
                  <div style={kpiValue}>{last7days}</div>
                  <div style={kpiSub}>7 derniers jours</div>
                </div>
                <div style={kpiCard}>
                  <div style={kpiLabel}>💰 Coût total API</div>
                  <div style={{ ...kpiValue, color: "var(--color-accent)" }}>{totalCost.toFixed(3)} €</div>
                </div>
                <div style={kpiCard}>
                  <div style={kpiLabel}>🏆 Module top</div>
                  <div style={kpiValue}>{moduleLabels[moduleTopEntry[0]] || moduleTopEntry[0]}</div>
                  <div style={kpiSub}>{moduleTopEntry[1]} génération{moduleTopEntry[1] > 1 ? "s" : ""}</div>
                </div>
              </div>

              {/* ROW 2 — Activité + Répartition */}
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={sectionCard}>
                  <h3 style={sectionTitle}>Activité 7 derniers jours</h3>
                  <div style={{ height: 120, display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 2 }}>
                    {last7daysByDay.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "stretch", height: "100%" }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", textAlign: "center", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{d.count || ""}</div>
                        <div style={{
                          flex: "none",
                          height: `${Math.max(4, (d.count / maxDayCount) * 100)}%`,
                          minHeight: 4,
                          background: "var(--color-accent)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.3s",
                        }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    {last7daysByDay.map((d, i) => (
                      <div key={i} style={{ flex: 1, fontSize: 11, color: "var(--color-text-muted)", textAlign: "center", textTransform: "capitalize" }}>
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={sectionCard}>
                  <h3 style={sectionTitle}>Répartition modules</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {moduleEntries.map(([key, count]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 80, fontSize: 13, color: "var(--color-text)", fontWeight: 600 }}>{moduleLabels[key] || key}</div>
                        <div style={{ flex: 1, height: 10, background: "var(--bg-surface-elevated)", borderRadius: 5, overflow: "hidden" }}>
                          <div style={{ width: `${(count / maxModuleCount) * 100}%`, height: "100%", background: "var(--color-accent)", borderRadius: 5, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ROW 3 — Villes actives + Top utilisateurs */}
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={sectionCard}>
                  <h3 style={sectionTitle}>Villes actives</h3>
                  {byBetChabad.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Aucune ville.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {byBetChabad.map(b => (
                        <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, fontSize: 13, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                          <div style={{ flex: 1, height: 8, background: "var(--bg-surface-elevated)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${(b.count / maxBcCount) * 100}%`, height: "100%", background: "var(--color-accent)", borderRadius: 4, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{b.count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={sectionCard}>
                  <h3 style={sectionTitle}>Top utilisateurs</h3>
                  {topUsers.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Aucun utilisateur actif.</div>
                  ) : (
                    <div style={{ overflowX: "auto", margin: mobile ? "0 -16px" : 0 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
                        <thead>
                          <tr>
                            <th style={th}>Utilisateur</th>
                            <th style={th}>Beth Chabad</th>
                            <th style={{ ...th, textAlign: "right" }}>Générations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topUsers.map(u => (
                            <tr key={u.uid}>
                              <td style={{ ...td, fontSize: 13 }}>{u.userName || <span style={{ color: "var(--color-text-muted)" }}>—</span>}</td>
                              <td style={{ ...td, fontSize: 13, color: "var(--color-text-muted)" }}>{u.betChabad || "—"}</td>
                              <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{u.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {adminTab === "documents" && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: mobile ? 16 : 24, marginBottom: 28 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: mobile ? 18 : 20, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text)", letterSpacing: "-0.01em" }}>
            Documents de la semaine
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 18px" }}>
            PDFs consultés par l'assistant pour la génération des cours de Torah.
          </p>

          <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: mobile ? "stretch" : "center" }}>
            <input
              id="admin-pdf-input"
              type="file"
              accept="application/pdf"
              multiple
              onChange={e => setPdfSelection(e.target.files)}
              style={{ flex: "1 1 240px", minWidth: 0, padding: "9px 12px", background: "var(--bg-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)", fontSize: mobile ? 14 : 13, fontFamily: SANS, cursor: "pointer" }}
            />
            <button
              onClick={handlePdfUpload}
              disabled={pdfBusy || !pdfSelection?.length}
              style={{ ...actionBtn, ...actionBtnPrimary, padding: mobile ? "12px 16px" : actionBtn.padding, opacity: (pdfBusy || !pdfSelection?.length) ? 0.5 : 1 }}
            >
              {pdfBusy ? "Envoi…" : "Uploader"}
            </button>
          </div>

          {pdfErr && (
            <div style={{ color: "var(--color-error)", fontSize: 13, marginBottom: 12, padding: "10px 14px", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: 8 }}>
              {pdfErr}
            </div>
          )}

          {pdfLoading ? (
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Chargement…</div>
          ) : pdfFiles.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Aucun document.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {pdfFiles.map(f => (
                <li key={f.path} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: "var(--bg-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8 }}>
                  <span style={{ fontSize: 14, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {f.name}</span>
                  <button
                    onClick={() => handlePdfDelete(f.name)}
                    disabled={pdfBusy}
                    style={{ ...actionBtn, ...actionBtnDanger, flexShrink: 0, opacity: pdfBusy ? 0.5 : 1 }}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        {adminTab === "users" && (
        <>
        {mobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!loading && rows.length === 0 && (
              <div style={{ padding: "16px 18px", background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, color: "var(--color-text-muted)", fontSize: 14 }}>
                Aucun utilisateur.
              </div>
            )}
            {rows.map(r => {
              const isEditing = editingUid === r.uid;
              const isBusy = busyUid === r.uid;
              return (
                <div key={r.uid} style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 2 }}>{r.nom}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 4, wordBreak: "break-all" }}>{r.email}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 10 }}>{r.betChabad}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-subtle)", marginBottom: 12 }}>
                    Inscrit le {r.inscription ? r.inscription.toLocaleDateString("fr-FR") : "—"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 0", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", marginBottom: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Cours</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", ...num }}>{r.cours}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Affiches</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", ...num }}>{r.affiches}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Messages</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", ...num }}>{r.messages}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Coût</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)", ...num }}>{fmtEUR(r.totalCost)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => (isEditing ? handleEditCancel() : handleEditStart(r))}
                      disabled={isBusy}
                      style={{ ...actionBtn, flex: 1, padding: "10px 12px", opacity: isBusy ? 0.5 : 1 }}
                    >
                      {isEditing ? "Fermer" : "Modifier"}
                    </button>
                    <button
                      onClick={() => handleDelete(r.uid)}
                      disabled={isBusy}
                      style={{ ...actionBtn, ...actionBtnDanger, flex: 1, padding: "10px 12px", opacity: isBusy ? 0.5 : 1 }}
                    >
                      {isBusy ? "…" : "Supprimer"}
                    </button>
                  </div>
                  {isEditing && (
                    <div style={{ marginTop: 14, padding: "14px 0 0", borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <label style={editLabel}>Beth Chabad</label>
                        <input value={editData.betChabad} onChange={e => setEditData(s => ({ ...s, betChabad: e.target.value }))} style={INP} />
                      </div>
                      <div>
                        <label style={editLabel}>Email</label>
                        <input value={editData.email} onChange={e => setEditData(s => ({ ...s, email: e.target.value }))} style={INP} />
                      </div>
                      <div>
                        <label style={editLabel}>Taille communauté</label>
                        <input value={editData.tailleCommunaute} onChange={e => setEditData(s => ({ ...s, tailleCommunaute: e.target.value }))} style={INP} />
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        <button onClick={handleEditCancel} disabled={isBusy} style={{ ...actionBtn, flex: 1, padding: "10px 12px" }}>Annuler</button>
                        <button onClick={() => handleEditSave(r.uid)} disabled={isBusy} style={{ ...actionBtn, ...actionBtnPrimary, flex: 1, padding: "10px 12px", opacity: isBusy ? 0.5 : 1 }}>
                          {isBusy ? "…" : "Sauvegarder"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {rows.length > 0 && (
              <div style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 }}>Total</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Cours</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)", ...num }}>{totals.cours}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Affiches</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)", ...num }}>{totals.affiches}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Messages</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)", ...num }}>{totals.messages}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Coût total</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)", ...num }}>{fmtEUR(totals.totalCost)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden", marginBottom: 0 }}>
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
                  <th style={{ ...th, ...num }}>Coût €</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td style={{ ...td, color: "var(--color-text-muted)" }} colSpan={9}>
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
                        <td style={{ ...td, ...num }}>{fmtEUR(r.totalCost)}</td>
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
                          <td colSpan={9} style={{ padding: "18px 20px", background: "var(--bg-surface-elevated)", borderBottom: "1px solid var(--color-border)" }}>
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
                    <td style={{ ...td, ...num, fontWeight: 700, color: "var(--color-accent)", borderBottom: "none" }}>
                      {fmtEUR(totals.totalCost)}
                    </td>
                    <td style={{ ...td, borderBottom: "none" }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden", marginTop: 32 }}>
          <div style={{ padding: mobile ? "14px 16px" : "18px 20px", borderBottom: "1px solid var(--color-border)" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: mobile ? 18 : 20, fontWeight: 700, margin: 0, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
              Coûts de génération
            </h2>
          </div>
          {mobile ? (
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Cours",    count: totals.cours,    cost: totals.coursCost },
                { label: "Affiches", count: totals.affiches, cost: totals.affichesCost },
                { label: "Messages", count: totals.messages, cost: totals.messagesCost },
              ].map(m => (
                <div key={m.label} style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{m.label}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{m.count} génération{m.count > 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Coût total</span>
                    <span style={{ color: "var(--color-accent)", fontWeight: 600, ...num }}>{fmtEUR(m.cost)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Coût moyen</span>
                    <span style={{ color: "var(--color-text)", ...num }}>{m.count > 0 && m.cost > 0 ? (m.cost / m.count).toFixed(3) + " €" : "—"}</span>
                  </div>
                </div>
              ))}
              <div style={{ background: "var(--color-accent-faint)", border: "1px solid var(--color-accent-alpha)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--color-accent)", marginBottom: 8 }}>Total</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Générations</span>
                  <span style={{ color: "var(--color-text)", fontWeight: 700, ...num }}>{totalGenerations}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Coût total</span>
                  <span style={{ color: "var(--color-accent)", fontWeight: 700, ...num }}>{fmtEUR(totals.totalCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Coût moyen</span>
                  <span style={{ color: "var(--color-text)", fontWeight: 700, ...num }}>{totalGenerations > 0 && totals.totalCost > 0 ? (totals.totalCost / totalGenerations).toFixed(3) + " €" : "—"}</span>
                </div>
              </div>
            </div>
          ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
              <thead>
                <tr>
                  <th style={th}>Module</th>
                  <th style={{ ...th, ...num }}>Générations</th>
                  <th style={{ ...th, ...num }}>Coût total</th>
                  <th style={{ ...th, ...num }}>Coût moyen</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Cours",    count: totals.cours,    cost: totals.coursCost },
                  { label: "Affiches", count: totals.affiches, cost: totals.affichesCost },
                  { label: "Messages", count: totals.messages, cost: totals.messagesCost },
                ].map(m => (
                  <tr key={m.label}>
                    <td style={td}>{m.label}</td>
                    <td style={{ ...td, ...num }}>{m.count}</td>
                    <td style={{ ...td, ...num }}>{fmtEUR(m.cost)}</td>
                    <td style={{ ...td, ...num }}>{m.count > 0 && m.cost > 0 ? (m.cost / m.count).toFixed(3) + " €" : "—"}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--bg-surface-elevated)" }}>
                  <td style={{ ...td, fontWeight: 700, borderBottom: "none" }}>TOTAL</td>
                  <td style={{ ...td, ...num, fontWeight: 700, borderBottom: "none" }}>{totalGenerations}</td>
                  <td style={{ ...td, ...num, fontWeight: 700, color: "var(--color-accent)", borderBottom: "none" }}>{fmtEUR(totals.totalCost)}</td>
                  <td style={{ ...td, ...num, fontWeight: 700, borderBottom: "none" }}>
                    {totalGenerations > 0 && totals.totalCost > 0 ? (totals.totalCost / totalGenerations).toFixed(3) + " €" : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          )}
        </div>
        </>
        )}

        {adminTab === "ideas" && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: mobile ? "14px 16px" : "18px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: mobile ? 18 : 20, fontWeight: 700, margin: 0, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
                Boîte à idées
              </h2>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {suggestionsLoading ? "Chargement…" : `${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""}`}
                {unreadSuggestions > 0 && (
                  <span style={{ marginLeft: 10, padding: "2px 9px", background: "var(--color-error)", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    {unreadSuggestions} nouvelle{unreadSuggestions > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {suggestionsErr && (
              <div style={{ color: "var(--color-error)", fontSize: 13, margin: 16, padding: "10px 14px", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: 8 }}>
                {suggestionsErr}
              </div>
            )}

            {suggestionsLoading ? (
              <div style={{ padding: 24, fontSize: 13, color: "var(--color-text-muted)" }}>Chargement…</div>
            ) : suggestions.length === 0 ? (
              <div style={{ padding: 24, fontSize: 14, color: "var(--color-text-muted)", textAlign: "center" }}>
                Aucune suggestion pour le moment.
              </div>
            ) : mobile ? (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {suggestions.map(s => {
                  const isBusy = suggestionsBusy === s.id;
                  const statusColor =
                    s.status === "nouvelle" ? "var(--color-error)" :
                    s.status === "en cours" ? "var(--color-accent)" :
                    "var(--color-success)";
                  const statusBg =
                    s.status === "nouvelle" ? "var(--color-error-bg)" :
                    s.status === "en cours" ? "var(--color-accent-faint)" :
                    "var(--color-accent-faint)";
                  const nextStatus =
                    s.status === "nouvelle" ? "en cours" :
                    s.status === "en cours" ? "réalisée" :
                    "nouvelle";
                  const authorFromRows = rows.find(r => r.uid === s.userId);
                  const authorName = s.userName || (authorFromRows?.nom !== "—" ? authorFromRows?.nom : "") || "";
                  return (
                    <div key={s.id} style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {s.createdAt ? s.createdAt.toLocaleDateString("fr-FR") + " · " + s.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </div>
                        <span style={{ padding: "3px 10px", background: statusBg, color: statusColor, borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize", flexShrink: 0 }}>
                          {s.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 2 }}>{s.betChabad}</div>
                      <div style={{ fontSize: 12, color: "var(--color-accent)", marginBottom: 10 }}>{s.type}</div>
                      {(authorName || s.userEmail) && (
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 10, display: "flex", flexDirection: "column", gap: 2 }}>
                          {authorName && <span style={{ color: "var(--color-text)", fontWeight: 600 }}>👤 {authorName}</span>}
                          {s.userEmail && (
                            <a href={`mailto:${s.userEmail}`} style={{ color: "var(--color-accent)", textDecoration: "none", wordBreak: "break-all" }}>
                              ✉️ {s.userEmail}
                            </a>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: 13.5, color: "var(--color-text)", lineHeight: 1.5, marginBottom: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {s.message}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleSuggestionStatus(s.id, nextStatus)}
                          disabled={isBusy}
                          style={{ ...actionBtn, ...actionBtnPrimary, flex: "1 1 100%", padding: "9px 10px", opacity: isBusy ? 0.5 : 1 }}
                        >
                          → {nextStatus}
                        </button>
                        {s.userEmail && (
                          <a
                            href={`mailto:${s.userEmail}?subject=${encodeURIComponent("Re: Votre suggestion — Habad.ai")}&body=${encodeURIComponent(`Bonjour${authorName ? " " + authorName : ""},\n\nMerci pour votre suggestion :\n\n> ${s.message.split("\n").join("\n> ")}\n\n`)}`}
                            style={{ ...actionBtn, flex: 1, padding: "9px 10px", textAlign: "center", textDecoration: "none" }}
                          >
                            ✉️ Répondre
                          </a>
                        )}
                        <button
                          onClick={() => handleSuggestionDelete(s.id)}
                          disabled={isBusy}
                          style={{ ...actionBtn, ...actionBtnDanger, flex: 1, padding: "9px 10px", opacity: isBusy ? 0.5 : 1 }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS }}>
                  <thead>
                    <tr>
                      <th style={th}>Date</th>
                      <th style={th}>Auteur</th>
                      <th style={th}>Beth Chabad</th>
                      <th style={th}>Type</th>
                      <th style={th}>Message</th>
                      <th style={th}>Statut</th>
                      <th style={{ ...th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map(s => {
                      const isBusy = suggestionsBusy === s.id;
                      const statusColor =
                        s.status === "nouvelle" ? "var(--color-error)" :
                        s.status === "en cours" ? "var(--color-accent)" :
                        "var(--color-success)";
                      const statusBg =
                        s.status === "nouvelle" ? "var(--color-error-bg)" :
                        s.status === "en cours" ? "var(--color-accent-faint)" :
                        "var(--color-accent-faint)";
                      const nextStatus =
                        s.status === "nouvelle" ? "en cours" :
                        s.status === "en cours" ? "réalisée" :
                        "nouvelle";
                      const authorFromRows = rows.find(r => r.uid === s.userId);
                      const authorName = s.userName || (authorFromRows?.nom !== "—" ? authorFromRows?.nom : "") || "";
                      const mailtoHref = s.userEmail
                        ? `mailto:${s.userEmail}?subject=${encodeURIComponent("Re: Votre suggestion — Habad.ai")}&body=${encodeURIComponent(`Bonjour${authorName ? " " + authorName : ""},\n\nMerci pour votre suggestion :\n\n> ${s.message.split("\n").join("\n> ")}\n\n`)}`
                        : null;
                      return (
                        <tr key={s.id}>
                          <td style={{ ...td, color: "var(--color-text-muted)", whiteSpace: "nowrap", fontSize: 13 }}>
                            {s.createdAt ? s.createdAt.toLocaleDateString("fr-FR") : "—"}
                            {s.createdAt && (
                              <div style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>
                                {s.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </td>
                          <td style={{ ...td, fontSize: 13 }}>
                            {authorName && <div style={{ color: "var(--color-text)", fontWeight: 600 }}>{authorName}</div>}
                            {s.userEmail ? (
                              <a href={`mailto:${s.userEmail}`} style={{ color: "var(--color-accent)", textDecoration: "none", fontSize: 12, wordBreak: "break-all" }}>
                                {s.userEmail}
                              </a>
                            ) : (
                              !authorName && <span style={{ color: "var(--color-text-muted)" }}>—</span>
                            )}
                          </td>
                          <td style={td}>{s.betChabad}</td>
                          <td style={{ ...td, color: "var(--color-accent)", fontWeight: 600, fontSize: 13 }}>{s.type}</td>
                          <td style={{ ...td, maxWidth: 340, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13.5, lineHeight: 1.5 }}>
                            {s.message}
                          </td>
                          <td style={td}>
                            <span style={{ padding: "3px 10px", background: statusBg, color: statusColor, borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize", display: "inline-block", whiteSpace: "nowrap" }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              onClick={() => handleSuggestionStatus(s.id, nextStatus)}
                              disabled={isBusy}
                              title={`Passer à : ${nextStatus}`}
                              style={{ ...actionBtn, ...actionBtnPrimary, marginRight: 6, opacity: isBusy ? 0.5 : 1 }}
                            >
                              → {nextStatus}
                            </button>
                            {mailtoHref && (
                              <a
                                href={mailtoHref}
                                title={`Répondre à ${s.userEmail}`}
                                style={{ ...actionBtn, marginRight: 6, textDecoration: "none", display: "inline-block" }}
                              >
                                ✉️ Répondre
                              </a>
                            )}
                            <button
                              onClick={() => handleSuggestionDelete(s.id)}
                              disabled={isBusy}
                              style={{ ...actionBtn, ...actionBtnDanger, opacity: isBusy ? 0.5 : 1 }}
                            >
                              {isBusy ? "…" : "Supprimer"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
