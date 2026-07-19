/**
 * build-demo.mjs — Livello 2: prova che il markup RENDERIZZA davvero.
 * Assembla i componenti del seed in una pagina HTML completa, caricando
 * Bootstrap Italia dalla CDN e inlinando la sprite delle icone (così i
 * riferimenti <use href="#..."> renderizzano anche in locale).
 *
 * Uso: node scripts/build-demo.mjs  ->  genera demo/servizio.html
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const comps = JSON.parse(readFileSync(join(ROOT, "data", "components.json"), "utf8")).components;

const BI = "https://cdn.jsdelivr.net/npm/bootstrap-italia@2";
const SPRITE_PLACEHOLDER = "/bootstrap-italia/dist/svg/sprites.svg";

// Scarica la sprite e la inlina: i <use href="#id"> (same-document) sono robusti,
// mentre un <use> verso una sprite cross-origin (CDN) NON viene reso dai browser.
let spriteInline = "";
let spriteRef = SPRITE_PLACEHOLDER; // fallback: se offline, lascia il path CDN
try {
  const svg = await fetch(`${BI}/dist/svg/sprites.svg`).then((r) => r.text());
  spriteInline = `<div hidden aria-hidden="true">${svg}</div>`;
  spriteRef = ""; // -> href="#it-..."
  console.log("Sprite icone inlinata (", svg.length, "byte )");
} catch {
  console.warn("Impossibile scaricare la sprite: le icone useranno il path CDN (potrebbero non rendere in locale).");
}

// prende il codice di un componente e sistema i riferimenti alle icone
const get = (id) => {
  const c = comps.find((x) => x.id === id);
  if (!c) throw new Error(`componente '${id}' non trovato`);
  return c.code.replaceAll(SPRITE_PLACEHOLDER, spriteRef);
};

const card = (titolo, testo) =>
  `<div class="col-12 col-md-4">${get("card")
    .replace("Titolo della card", titolo)
    .replace("Descrizione sintetica del contenuto o del servizio.", testo)}</div>`;

const page = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Demo — Pagina servizio comunale (Bootstrap Italia)</title>
  <link rel="stylesheet" href="${BI}/dist/css/bootstrap-italia.min.css">
</head>
<body>
  ${spriteInline}
  <a class="visually-hidden-focusable" href="#main-content">Vai al contenuto principale</a>

  ${get("header")}

  <div class="container">${get("navbar")}</div>

  <main id="main-content">
    <div class="container my-4">
      ${get("breadcrumb")}

      <h1>Iscrizione alla mensa scolastica</h1>
      <p class="lead">Servizio per iscrivere il proprio figlio al servizio di refezione scolastica del Comune.</p>

      <div class="row">
        <aside class="col-12 col-lg-3">
          ${get("sidebar")}
        </aside>
        <div class="col-12 col-lg-9">
      ${get("callout")}

      <h2 class="mt-4">Servizi correlati</h2>
      <div class="row mt-3">
        ${card("Rette e pagamenti", "Consulta e paga le rette del servizio mensa.")}
        ${card("Diete speciali", "Richiedi una dieta speciale per motivi di salute o religiosi.")}
        ${card("Calendario", "Scarica il calendario scolastico e i menù del mese.")}
      </div>

      <h2 class="mt-5">Compila la domanda</h2>
      ${get("steppers")}

      <form class="mt-4">
        <div class="row">
          <div class="col-12 col-md-6">${get("form-input")}</div>
          <div class="col-12 col-md-6">${get("input-date")}</div>
        </div>
        ${get("select")}
        ${get("radio")}
        ${get("checkbox")}
        ${get("toggle")}
        ${get("upload")}
        <button type="submit" class="btn btn-primary mt-3">Invia la domanda</button>
      </form>

      <h2 class="mt-5">I tuoi pagamenti</h2>
      ${get("table")}

      <h2 class="mt-5">Domande frequenti</h2>
      ${get("accordion")}

      <div class="mt-4">
        <a href="/accedi" class="btn btn-primary" role="button">Accedi al servizio</a>
      </div>
        </div>
      </div>
    </div>
  </main>

  ${get("footer")}

  <script src="${BI}/dist/js/bootstrap-italia.bundle.min.js"></script>
</body>
</html>
`;

mkdirSync(join(ROOT, "demo"), { recursive: true });
const out = join(ROOT, "demo", "servizio.html");
writeFileSync(out, page, "utf8");
console.log("✅ Demo generata:", out);
console.log("   Aprila nel browser (o via `npm run demo` + web server) per la verifica visiva.");
