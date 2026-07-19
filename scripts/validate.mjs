/**
 * validate.mjs — Livello 1: test automatici sui DATI.
 * Verifica che ogni componente/ricetta sia ben formato e non contenga
 * errori di accessibilità evidenti nel markup. Pensato per girare in CI.
 *
 * Uso: node scripts/validate.mjs   (esce con codice 1 se trova errori)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const load = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));

const errors = [];
const err = (ctx, msg) => errors.push(`[${ctx}] ${msg}`);

// --- Regole di lint sul markup HTML (leggere, senza dipendenze) ---
function lintMarkup(ctx, code) {
  // 1) Ogni <img> deve avere alt=
  for (const m of code.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt\s*=/.test(m[0])) err(ctx, `<img> senza attributo alt: ${m[0].slice(0, 60)}`);
  }
  // 2) Niente handler inline (onclick, onload...)
  if (/\son[a-z]+\s*=/.test(code)) err(ctx, "presente un event handler inline (on*=) — non ammesso");
  // 3) Niente div/span cliccabili senza role
  //    (euristica: cerca href su elementi non-<a> è raro; controlliamo tabindex positivi)
  if (/tabindex\s*=\s*"[1-9]/.test(code)) err(ctx, "tabindex positivo (>0) — rompe l'ordine di focus");
  // 4) I bottoni devono avere type
  for (const m of code.matchAll(/<button\b[^>]*>/g)) {
    if (!/\btype\s*=/.test(m[0])) err(ctx, `<button> senza type: ${m[0].slice(0, 60)}`);
  }
  // 5) Bilanciamento grezzo dei tag principali
  const opens = (code.match(/<(?!\/)(?!!)[a-zA-Z]/g) || []).length;
  const closes = (code.match(/<\//g) || []).length;
  // elementi void (senza tag di chiusura). NB: <use> qui è scritto <use ...></use>, quindi NON è void.
  const selfClosing = (code.match(/<(img|input|br|hr|meta|link|source|track|area|col|embed|param|wbr)\b/g) || []).length;
  if (opens - selfClosing !== closes) {
    err(ctx, `tag potenzialmente sbilanciati (aperti non-void=${opens - selfClosing}, chiusi=${closes})`);
  }
}

// --- Componenti ---
const comps = load("components.json").components;
const ids = new Set();
const REQUIRED = ["id", "name", "category", "tags", "description", "code", "accessibilityNotes", "docsUrl"];
for (const c of comps) {
  const ctx = `component:${c.id ?? "?"}`;
  for (const f of REQUIRED) if (!c[f] || (Array.isArray(c[f]) && !c[f].length)) err(ctx, `campo mancante o vuoto: ${f}`);
  if (ids.has(c.id)) err(ctx, `id duplicato: ${c.id}`);
  ids.add(c.id);
  if (c.docsUrl && !/^https:\/\/italia\.github\.io\//.test(c.docsUrl)) err(ctx, `docsUrl non punta ai docs ufficiali`);
  if (c.code) lintMarkup(ctx, c.code);
}

// --- Ricette ---
const recipes = load("recipes.json").recipes;
const compIds = new Set(comps.map((c) => c.id));
for (const r of recipes) {
  const ctx = `recipe:${r.id ?? "?"}`;
  for (const f of ["id", "name", "model", "description", "code", "usesComponents", "accessibilityNotes"])
    if (!r[f] || (Array.isArray(r[f]) && !r[f].length)) err(ctx, `campo mancante o vuoto: ${f}`);
  for (const used of r.usesComponents || [])
    if (!compIds.has(used)) err(ctx, `usa un componente inesistente: ${used}`);
  // una ricetta di pagina deve avere un solo <h1> e i landmark base
  const h1 = (r.code.match(/<h1\b/g) || []).length;
  if (h1 !== 1) err(ctx, `deve avere esattamente un <h1> (trovati ${h1})`);
  for (const landmark of ["<main", "</main>"]) if (!r.code.includes(landmark)) err(ctx, `manca il landmark ${landmark}`);
  lintMarkup(ctx, r.code);
}

// --- Report ---
if (errors.length) {
  console.error(`\n❌ ${errors.length} problema/i trovati:\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`✅ OK — ${comps.length} componenti e ${recipes.length} ricette validati, nessun problema.`);
