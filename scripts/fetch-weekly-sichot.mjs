#!/usr/bin/env node
/**
 * fetch-weekly-sichot.mjs
 * ------------------------------------------------------------------
 * Récupère les Si'hot (français) de la parasha de la semaine depuis la
 * bibliothèque Box publique "Si'ha BeIyoune" et les dépose dans
 * Firebase Storage `pdfs/sources/`, puis écrit un manifeste Firestore.
 *
 * Règles : TOUTES les années d'une parasha + LES DEUX si semaine combinée.
 * Calendrier : diaspora.
 *
 * Pré-requis :
 *   - Node 18+ (fetch global)
 *   - npm i firebase-admin
 *   - parasha-box-map.json dans le même dossier
 *   - Clé de compte de service Google (Firebase Admin) :
 *       export GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
 *   - (optionnel) BOX_TOKEN si l'accès anonyme au lien partagé est refusé.
 *
 * Usage :  node fetch-weekly-sichot.mjs            (semaine courante)
 *          node fetch-weekly-sichot.mjs 2026-06-27 (forcer une date de Chabbat)
 * ------------------------------------------------------------------ */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHARED_LINK = 'https://app.box.com/v/siha';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'shliach-ai-9ff9d.firebasestorage.app';
const TARGET_RE = /^si.?ha \(français\)\.pdf$/i; // tolère apostrophe droite/typo
const DEST_PREFIX = 'pdfs/sources/';

// ---------- utilitaires ----------
const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[’'`]/g, "'").trim();
const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

// Token Box : soit BOX_TOKEN (dev, 60 min), soit auto via Client Credentials Grant
let boxToken = process.env.BOX_TOKEN || null;

async function resolveBoxToken() {
  if (boxToken) return boxToken;
  const { BOX_CLIENT_ID, BOX_CLIENT_SECRET, BOX_ENTERPRISE_ID } = process.env;
  if (BOX_CLIENT_ID && BOX_CLIENT_SECRET && BOX_ENTERPRISE_ID) {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: BOX_CLIENT_ID,
      client_secret: BOX_CLIENT_SECRET,
      box_subject_type: 'enterprise',
      box_subject_id: BOX_ENTERPRISE_ID,
    });
    const r = await fetch('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!r.ok) throw new Error(`Box OAuth ${r.status} — ${await r.text().catch(() => '')}`);
    boxToken = (await r.json()).access_token;
    return boxToken;
  }
  throw new Error('Identifiants Box manquants : définis BOX_TOKEN, ou BOX_CLIENT_ID + BOX_CLIENT_SECRET + BOX_ENTERPRISE_ID.');
}

function boxHeaders() {
  const h = { BoxApi: `shared_link=${SHARED_LINK}` };
  if (boxToken) h.Authorization = `Bearer ${boxToken}`;
  return h;
}

async function boxJson(url) {
  const r = await fetch(url, { headers: boxHeaders() });
  if (!r.ok) throw new Error(`Box ${r.status} sur ${url} — ${await r.text().catch(() => '')}`);
  return r.json();
}

async function boxListFolder(folderId) {
  const items = [];
  let offset = 0;
  for (;;) {
    const data = await boxJson(
      `https://api.box.com/2.0/folders/${folderId}/items?fields=id,name,type&limit=1000&offset=${offset}`
    );
    items.push(...(data.entries || []));
    if (offset + (data.limit || 1000) >= (data.total_count || items.length)) break;
    offset += data.limit || 1000;
  }
  return items;
}

async function boxDownload(fileId) {
  const r = await fetch(`https://api.box.com/2.0/files/${fileId}/content`, {
    headers: boxHeaders(), redirect: 'follow',
  });
  if (!r.ok) throw new Error(`Téléchargement Box ${r.status} (file ${fileId})`);
  return Buffer.from(await r.arrayBuffer());
}

// ---------- parasha de la semaine (Hebcal, diaspora) ----------
// iso à partir des composantes LOCALES (évite tout décalage de fuseau via toISOString)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function monthParashot(y, m) {
  const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${y}&month=${m}&ss=off&mf=off&c=off&s=on&i=off`;
  const data = await (await fetch(url)).json();
  return (data.items || []).filter((i) => i.category === 'parashat');
}

// Parasha du prochain Chabbat à partir de `fromDate` (fenêtre 2 mois glissants)
async function getParasha(fromDate) {
  const y = fromDate.getFullYear(), m = fromDate.getMonth() + 1;
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  const items = [...await monthParashot(y, m), ...await monthParashot(ny, nm)];
  const want = iso(fromDate);
  const item = items.find((i) => i.date >= want) || items.at(-1);
  if (!item) throw new Error('Aucune parasha trouvée via Hebcal.');
  return { name: item.title_orig || item.title.replace(/^Parashat\s+/, ''), date: item.date };
}

// "Chukat-Balak" -> ["Chukat","Balak"] ; gère les noms simples avec tiret (Lech-Lecha)
function splitParasha(name, known) {
  const clean = name.replace(/^Parashat\s+/, '').trim();
  if (known[clean]) return [clean];
  const parts = clean.split('-').map((s) => s.trim());
  const rebuilt = [];
  for (let i = 0; i < parts.length; i++) {
    const two = parts[i] + '-' + (parts[i + 1] || '');
    if (known[two]) { rebuilt.push(two); i++; }      // ex. Lech-Lecha
    else if (known[parts[i]]) rebuilt.push(parts[i]); // ex. Chukat, Balak
    else throw new Error(`Parasha inconnue dans la map : "${parts[i]}" (de "${clean}")`);
  }
  return rebuilt;
}

// ---------- main ----------
async function main() {
  const map = JSON.parse(await readFile(join(__dirname, 'parasha-box-map.json'), 'utf8'));
  const forced = process.argv[2];
  const fromDate = forced ? new Date(forced + 'T00:00:00') : new Date();

  const { name: rawName, date: shabbatDate } = await getParasha(fromDate);
  const parashot = splitParasha(rawName, map.parashot);
  console.log(`Chabbat ${shabbatDate} — parasha : ${rawName} -> [${parashot.join(', ')}]`);

  await resolveBoxToken(); // BOX_TOKEN ou Client Credentials Grant

  // Rassembler les fichiers cibles depuis Box
  const toUpload = []; // { parasha, sub, fileId }
  for (const p of parashot) {
    const folderId = map.parashot[p];
    const years = (await boxListFolder(folderId)).filter((e) => e.type === 'folder');
    console.log(`  ${p} (dossier ${folderId}) : ${years.length} sous-dossiers d'année`);
    for (const sub of years) {
      const files = await boxListFolder(sub.id);
      const pdf = files.find((f) => f.type === 'file' && TARGET_RE.test(norm(f.name)));
      if (pdf) toUpload.push({ parasha: p, sub: sub.name, fileId: pdf.id });
      else console.warn(`    ⚠ pas de "Si'ha (français).pdf" dans : ${sub.name}`);
    }
  }
  if (!toUpload.length) throw new Error('Aucun PDF cible trouvé.');
  console.log(`  -> ${toUpload.length} PDF(s) à publier.`);

  // Firebase
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? admin.credential.applicationDefault()
        : admin.credential.cert(JSON.parse(await readFile(join(__dirname, 'service-account-key.json'), 'utf8'))),
      storageBucket: BUCKET,
    });
  }
  const bucket = admin.storage().bucket();
  const db = admin.firestore();

  // Vider la semaine précédente
  await bucket.deleteFiles({ prefix: DEST_PREFIX }).catch(() => {});

  const manifest = [];
  for (const item of toUpload) {
    const buf = await boxDownload(item.fileId);
    const dest = `${DEST_PREFIX}${slug(item.parasha)}__${slug(item.sub)}.pdf`;
    await bucket.file(dest).save(buf, {
      contentType: 'application/pdf',
      metadata: { metadata: { parasha: item.parasha, source: item.sub, boxFileId: item.fileId } },
    });
    manifest.push({ path: dest, parasha: item.parasha, source: item.sub });
    console.log(`    ✓ ${dest}`);
  }

  await db.collection('config').doc('currentSichot').set({
    parashot,
    shabbat: shabbatDate,
    files: manifest,
    count: manifest.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ ${manifest.length} Si'hot publiées dans ${DEST_PREFIX} + manifeste config/currentSichot.`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
