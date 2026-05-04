#!/usr/bin/env node
/* ─── send-welcome-emails.mjs ─────────────────────────────────────────────
 *
 * Script one-shot : envoie l'email de bienvenue (via le webhook n8n)
 * aux utilisateurs Firestore qui ne l'ont pas encore reçu.
 *
 * ─── Setup (à faire une fois) ────────────────────────────────────────────
 *
 * 1. Installer les dépendances :
 *      npm install --save-dev firebase-admin
 *
 * 2. Récupérer une clé de service Firebase :
 *      Firebase Console > Project Settings > Service Accounts
 *      > "Generate new private key"
 *      Sauvegarder le JSON téléchargé, par exemple dans :
 *        scripts/service-account-key.json
 *      ⚠ NE PAS COMMIT ce fichier — ajouter au .gitignore.
 *
 * 3. Exporter le chemin dans l'env, puis lancer :
 *      export GOOGLE_APPLICATION_CREDENTIALS="./scripts/service-account-key.json"
 *      node scripts/send-welcome-emails.mjs
 *
 *      OU en une ligne :
 *      GOOGLE_APPLICATION_CREDENTIALS="./scripts/service-account-key.json" \
 *        node scripts/send-welcome-emails.mjs
 *
 *    Flags optionnels :
 *      --dry-run   → liste ce qui serait envoyé, sans rien envoyer ni écrire
 *      --limit N   → s'arrête après N envois (utile pour tester)
 * ───────────────────────────────────────────────────────────────────────*/

import admin from "firebase-admin";

const WEBHOOK_URL = "https://n8n.srv786690.hstgr.cloud/webhook/habad-new-user";
const DELAY_MS = 1000; // pause entre chaque envoi pour ne pas saturer n8n / Gmail

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const LIMIT_IDX = process.argv.indexOf("--limit");
const LIMIT = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function initAdmin() {
  if (admin.apps.length) return;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    console.error("❌ GOOGLE_APPLICATION_CREDENTIALS n'est pas défini.");
    console.error("   Voir en-tête du script pour les instructions de setup.");
    process.exit(1);
  }
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  console.log(`${DRY_RUN ? "🔍 DRY-RUN — " : ""}Scan de la collection users…`);
  const snap = await db.collection("users").get();
  console.log(`   Total utilisateurs : ${snap.size}`);

  // Filtre en mémoire : welcomeEmailSent absent ou false.
  // (Firestore ne supporte pas nativement "where field does not exist".)
  const todo = snap.docs.filter(d => {
    const v = d.data();
    return v.welcomeEmailSent !== true;
  });

  console.log(`   À notifier          : ${todo.length}`);
  if (todo.length === 0) {
    console.log("✓ Tout le monde a déjà reçu l'email. Rien à faire.");
    return;
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const d of todo) {
    if (sent >= LIMIT) {
      console.log(`\nLimite atteinte (--limit ${LIMIT}). Stop.`);
      break;
    }

    const v = d.data();
    const email = v.email;
    const name = v.displayName ?? v.nom ?? "";

    if (!email) {
      console.log(`⚠ Skip ${d.id} — aucun email dans le document.`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry] ${email} ${name ? "(" + name + ")" : ""}`);
      sent++;
      continue;
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await d.ref.update({
        welcomeEmailSent: true,
        welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      sent++;
      console.log(`✓ ${email}`);
    } catch (e) {
      failed++;
      console.log(`✗ ${email} — ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n──── Résumé ────`);
  console.log(`Envoyés  : ${sent}`);
  console.log(`Échecs   : ${failed}`);
  console.log(`Skippés  : ${skipped}`);
  if (DRY_RUN) console.log(`(dry-run — aucun envoi, aucune écriture Firestore)`);
}

main().catch(err => {
  console.error("💥 Erreur fatale :", err);
  process.exit(1);
});
