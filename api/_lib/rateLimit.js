/* ─── api/_lib/rateLimit.js ────────────────────────────────────────────────
 * Quota quotidien par utilisateur pour les proxies LLM (protection budget).
 * Compteur Firestore `usage/{uid}` incrémenté de façon atomique (transaction),
 * remis à zéro chaque jour (fuseau Europe/Paris).
 *
 * La collection `usage` n'est écrite QUE par le service account (admin SDK,
 * qui ignore firestore.rules). Le catch-all deny des règles bloque déjà tout
 * accès client → aucune règle Firestore supplémentaire nécessaire.
 * ──────────────────────────────────────────────────────────────────────── */

import admin from "firebase-admin";

export const DAILY_LIMIT = 80;

function parisDate() {
  // YYYY-MM-DD dans le fuseau de l'utilisateur (France)
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function secondsUntilParisMidnight() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = t => parseInt(parts.find(p => p.type === t)?.value || "0", 10);
  const secsIntoDay = get("hour") * 3600 + get("minute") * 60 + get("second");
  return Math.max(60, 86400 - secsIntoDay);
}

/**
 * Incrémente le compteur du jour pour `uid` et throw une Error(status=429)
 * si le plafond est atteint. Fail-open (autorise) sur toute erreur inattendue
 * afin de ne jamais bloquer l'app à cause d'un hoquet Firestore.
 * Retourne { count, limit, remaining }.
 */
export async function enforceDailyQuota(uid, limit = DAILY_LIMIT) {
  if (!uid) return { allowed: true };
  const db = admin.firestore();
  const ref = db.collection("usage").doc(uid);
  const today = parisDate();

  try {
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      let count = 0;
      if (snap.exists) {
        const d = snap.data();
        count = d.date === today ? (d.count || 0) : 0;
      }
      if (count >= limit) return { over: true, count };
      tx.set(
        ref,
        { date: today, count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      return { over: false, count: count + 1 };
    });

    if (result.over) {
      const err = new Error("Daily quota exceeded");
      err.status = 429;
      err.retryAfter = secondsUntilParisMidnight();
      err.limit = limit;
      throw err;
    }
    return { count: result.count, limit, remaining: Math.max(0, limit - result.count) };
  } catch (e) {
    if (e.status === 429) throw e;
    // Fail-open : on log mais on laisse passer (l'app prime sur le quota en cas d'incident)
    console.error("[rateLimit] fail-open:", e?.message || e);
    return { allowed: true, failOpen: true };
  }
}
