/**
 * codegen.mjs — proof of concept "AI-first": UNA fonte (spec/) -> N artefatti.
 * Da spec/tokens.json + spec/components/*.json genera:
 *   dist/it-tokens.css       (CSS custom properties dai design token DTCG)
 *   dist/it-components.js     (Web Components vanilla, a11y incapsulata)
 *   dist/react/*.tsx          (wrapper React tipizzati)
 *   dist/llms.txt             (documentazione per LLM)
 *   dist/contracts.json       (contratto di validazione per l'MCP)
 *   dist/demo.html            (pagina dimostrativa)
 *
 * Uso: node sota/codegen.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SPEC = join(ROOT, "spec");
const DIST = join(ROOT, "dist");
mkdirSync(join(DIST, "react"), { recursive: true });

const tokens = JSON.parse(readFileSync(join(SPEC, "tokens.json"), "utf8"));
const components = readdirSync(join(SPEC, "components"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(SPEC, "components", f), "utf8")));

// ---------------------------------------------------------------- 1) TOKENS -> CSS
function flattenTokens(obj, prefix = "--it") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    if (v && typeof v === "object" && "$value" in v) out.push(`  ${prefix}-${k}: ${v.$value};`);
    else if (v && typeof v === "object") out.push(...flattenTokens(v, `${prefix}-${k}`));
  }
  return out;
}
const tokenCss = `:root {\n${flattenTokens(tokens).join("\n")}\n}\n:root { font-family: var(--it-font-base); color: var(--it-color-text); }\n`;

// CSS strutturale dei componenti (usa SOLO i token: nessun colore hard-coded)
const COMPONENT_CSS = `
/* button */
it-button { display: inline-block; }
it-button button { font: inherit; cursor: pointer; border-radius: var(--it-radius-md); padding: .5em 1.25em; border: 2px solid var(--it-color-primary); background: var(--it-color-primary); color: var(--it-color-on-primary); font-weight: 600; line-height: 1.4; }
it-button button:hover { background: var(--it-color-primary-hover); border-color: var(--it-color-primary-hover); }
it-button button:focus-visible { outline: 3px solid var(--it-color-focus); outline-offset: 2px; }
it-button button[disabled] { opacity: .5; cursor: not-allowed; }
it-button[variant="outline"] button { background: transparent; color: var(--it-color-primary); }
it-button[variant="outline"] button:hover { background: var(--it-color-primary); color: var(--it-color-on-primary); }
it-button[variant="secondary"] button { background: var(--it-color-muted); border-color: var(--it-color-muted); }
it-button[variant="success"] button { background: var(--it-color-success-accent); border-color: var(--it-color-success-accent); }
it-button[variant="danger"] button { background: #b3261e; border-color: #b3261e; }
it-button[variant="warning"] button { background: var(--it-color-warning-accent); border-color: var(--it-color-warning-accent); }
it-button[size="sm"] button { padding: .25em .75em; font-size: .875rem; }
it-button[size="lg"] button { padding: .75em 1.75em; font-size: 1.125rem; }

/* callout */
it-callout { display: block; border-left: 4px solid var(--it-color-info-accent); background: var(--it-color-info-bg); padding: var(--it-space-md); border-radius: var(--it-radius-sm); margin: var(--it-space-md) 0; }
it-callout .it-callout-title { font-weight: 700; color: var(--it-color-info-accent); display: flex; align-items: center; gap: .5em; margin-bottom: .25em; }
it-callout .it-callout-ico { width: 1.3em; height: 1.3em; flex: 0 0 auto; border-radius: 50%; border: 2px solid currentColor; display: inline-flex; align-items: center; justify-content: center; font-size: .8em; font-weight: 700; }
it-callout .it-callout-ico::before { content: "i"; font-style: italic; }
it-callout[variant="warning"] { border-left-color: var(--it-color-warning-accent); background: var(--it-color-warning-bg); }
it-callout[variant="warning"] .it-callout-title { color: var(--it-color-warning-accent); }
it-callout[variant="warning"] .it-callout-ico::before { content: "!"; font-style: normal; }
it-callout[variant="success"] { border-left-color: var(--it-color-success-accent); background: var(--it-color-success-bg); }
it-callout[variant="success"] .it-callout-title { color: var(--it-color-success-accent); }
it-callout[variant="success"] .it-callout-ico::before { content: "✓"; font-style: normal; }

/* accordion */
it-accordion { display: block; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-sm); overflow: hidden; }
it-accordion .it-accordion-item + .it-accordion-item { border-top: 1px solid var(--it-color-border); }
it-accordion .it-accordion-header { margin: 0; }
it-accordion .it-accordion-btn { width: 100%; text-align: left; background: #fff; border: 0; padding: var(--it-space-md); font: inherit; font-weight: 600; color: var(--it-color-primary); cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: var(--it-space-md); }
it-accordion .it-accordion-btn:hover { background: var(--it-color-info-bg); }
it-accordion .it-accordion-btn:focus-visible { outline: 3px solid var(--it-color-focus); outline-offset: -3px; }
it-accordion .it-accordion-chev { width: .55em; height: .55em; flex: 0 0 auto; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); transition: transform .2s; }
it-accordion .it-accordion-btn[aria-expanded="true"] .it-accordion-chev { transform: rotate(-135deg); }
it-accordion .it-accordion-panel { padding: var(--it-space-md); color: var(--it-color-text); }
`;
// CSS aggiuntivo portato DALLA spec (ogni componente può definire il proprio `style`)
const specStyles = components.map((s) => s.style || "").filter(Boolean).join("\n");
writeFileSync(join(DIST, "it-tokens.css"), tokenCss + COMPONENT_CSS + "\n" + specStyles);

// ---------------------------------------------------------------- 2) WEB COMPONENTS
// generatore generico (componenti presentazionali) guidato dal campo "render"
function genGeneric(spec) {
  const names = Object.keys(spec.props || {});
  const def = (n) => (spec.props[n] || {}).default ?? "";
  const filled = spec.render
    .replace(/\{\{slot\}\}/g, "${S}")
    .replace(/\{\{attr (\w+)\}\}/g, (_, n) => `\${A(${JSON.stringify(n)}, ${JSON.stringify(def(n))})}`)
    .replace(/\{\{flag (\w+)\}\}/g, (_, n) => `\${F(${JSON.stringify(n)})}`);
  const hostAttrs = Object.entries(spec.hostAttrs || {})
    .map(([k, v]) => `if(!this.hasAttribute(${JSON.stringify(k)})) this.setAttribute(${JSON.stringify(k)}, ${JSON.stringify(v)});`)
    .join(" ");
  const guard =
    spec.a11yGuard === "requires-label-if-empty"
      ? `if(!S && !this.getAttribute("aria-label")) console.warn("[a11y] "+this.tagName.toLowerCase()+": manca testo o aria-label");`
      : "";
  return `
class ${spec.class} extends HTMLElement {
  static get observedAttributes(){ return ${JSON.stringify(names)}; }
  connectedCallback(){ if(!this.__i){ this.__slot=this.innerHTML.trim(); this.__i=true; ${hostAttrs} } this.__r(); }
  attributeChangedCallback(){ if(this.__i) this.__r(); }
  __r(){
    const A=(n,d)=>this.getAttribute(n)??d, F=(n)=>this.hasAttribute(n)?" "+n:"", S=this.__slot;
    ${guard}
    this.innerHTML = \`${filled}\`;
  }
}
customElements.define(${JSON.stringify(spec.tag)}, ${spec.class});`;
}

// generatore per il comportamento "disclosure" (accordion): stato + tastiera + ARIA
function genDisclosure(spec) {
  return `
let __accUid = 0;
class ${spec.class} extends HTMLElement {
  connectedCallback(){
    if(this.__i) return; this.__i = true;
    const multiple = this.hasAttribute("multiple");
    const uid = "acc" + (++__accUid);
    const items = [...this.querySelectorAll(${JSON.stringify(spec.childSelector)})]
      .map(el => ({ header: el.getAttribute("data-header") || "", body: el.innerHTML }));
    this.innerHTML = items.map((it, i) => {
      const hid = uid+"-h"+i, pid = uid+"-p"+i, open = i === 0;
      return \`<div class="it-accordion-item">
        <h3 class="it-accordion-header">
          <button type="button" id="\${hid}" class="it-accordion-btn" aria-expanded="\${open}" aria-controls="\${pid}">
            <span>\${it.header}</span><span class="it-accordion-chev" aria-hidden="true"></span>
          </button>
        </h3>
        <div id="\${pid}" role="region" aria-labelledby="\${hid}" class="it-accordion-panel"\${open ? "" : " hidden"}>\${it.body}</div>
      </div>\`;
    }).join("");
    const btns = [...this.querySelectorAll(".it-accordion-btn")];
    const panelOf = (b) => this.querySelector("#" + CSS.escape(b.getAttribute("aria-controls")));
    btns.forEach((b) => {
      b.addEventListener("click", () => {
        const wasOpen = b.getAttribute("aria-expanded") === "true";
        if(!multiple) btns.forEach(o => { o.setAttribute("aria-expanded","false"); panelOf(o).hidden = true; });
        b.setAttribute("aria-expanded", String(!wasOpen));
        panelOf(b).hidden = wasOpen;
      });
      b.addEventListener("keydown", (e) => {
        const i = btns.indexOf(b); let n = null;
        if(e.key === "ArrowDown") n = (i+1) % btns.length;
        else if(e.key === "ArrowUp") n = (i-1+btns.length) % btns.length;
        else if(e.key === "Home") n = 0;
        else if(e.key === "End") n = btns.length-1;
        if(n !== null){ e.preventDefault(); btns[n].focus(); }
      });
    });
  }
}
customElements.define(${JSON.stringify(spec.tag)}, ${spec.class});`;
}

const jsBody = components
  .filter((s) => !s.runtime) // i componenti con runtime dedicato (es. Zag) sono scritti a mano
  .map((s) => (s.behavior === "disclosure" ? genDisclosure(s) : genGeneric(s)))
  .join("\n");
writeFileSync(
  join(DIST, "it-components.js"),
  `/* GENERATO da sota/codegen.mjs — non modificare a mano */\n(() => {${jsBody}\n})();\n`
);

// ---------------------------------------------------------------- 3) REACT WRAPPER TIPIZZATO
const tsType = (p) => (p.type === "enum" ? p.values.map((v) => JSON.stringify(v)).join(" | ") : p.type === "boolean" ? "boolean" : "string");
for (const s of components) {
  if (s.behavior || s.runtime) continue; // per la POC generiamo i wrapper dei presentazionali
  const props = Object.entries(s.props || {});
  const iface = props.map(([n, p]) => `  ${n}?: ${tsType(p)};`).join("\n");
  const attrs = props.map(([n]) => `${n}={${n}}`).join(" ");
  writeFileSync(
    join(DIST, "react", `${s.class}.tsx`),
    `// GENERATO da sota/codegen.mjs — wrapper React tipizzato per <${s.tag}>
import React from "react";
export interface ${s.class}Props {
${iface}
  "aria-label"?: string;
  children?: React.ReactNode;
}
export const ${s.class} = ({ children, ...props }: ${s.class}Props) =>
  React.createElement(${JSON.stringify(s.tag)}, props, children);
`
  );
}

// ---------------------------------------------------------------- 4) llms.txt
const llms = [
  "# Design System PA — componenti (AI-first)",
  "",
  "> Web components conformi. Usa SEMPRE questi tag: l'accessibilità è già incapsulata. Non usare Bootstrap generico o Tailwind.",
  "",
  ...components.flatMap((s) => {
    const props = Object.entries(s.props || {})
      .map(([n, p]) => `  - \`${n}\`: ${p.type === "enum" ? p.values.join(" | ") : p.type} (default: ${JSON.stringify(p.default)})`)
      .join("\n");
    return [
      `## <${s.tag}> — ${s.intent}`,
      "Props:",
      props || "  (nessuna)",
      "Accessibilità (garantita dal componente):",
      ...s.a11y.map((a) => `  - ${a}`),
      "Esempio:",
      "```html",
      s.example,
      "```",
      "",
    ];
  }),
].join("\n");
writeFileSync(join(DIST, "llms.txt"), llms);

// ---------------------------------------------------------------- 5) contracts.json (per l'MCP validate_snippet)
const contracts = components.map((s) => ({
  tag: s.tag,
  requiredProps: Object.entries(s.props || {}).filter(([, p]) => p.required).map(([n]) => n),
  enums: Object.fromEntries(Object.entries(s.props || {}).filter(([, p]) => p.type === "enum").map(([n, p]) => [n, p.values])),
  a11y: s.a11y,
  forbidden: s.forbidden || [],
}));
writeFileSync(join(DIST, "contracts.json"), JSON.stringify({ generatedFrom: "spec/", contracts }, null, 2));

// -------- 5b) webcomponents.json PER L'MCP (integrazione: l'MCP serve i componenti AI-first)
const webcomponents = components.map((s) => ({
  tag: s.tag,
  intent: s.intent,
  runtime: s.runtime || "generated",
  poweredBy: s.poweredBy || null,
  props: s.props || {},
  a11y: s.a11y || [],
  forbidden: s.forbidden || [],
  example: s.example,
}));
writeFileSync(
  join(ROOT, "..", "data", "webcomponents.json"),
  JSON.stringify(
    {
      generatedFrom: "sota/spec/",
      note: "Componenti AI-first: Web Components universali (funzionano in React, Vue, Angular, HTML puro). L'accessibilità è incapsulata: preferisci SEMPRE questi tag ai markup grezzi quando il progetto può caricarli.",
      components: webcomponents,
    },
    null,
    2
  )
);

// ---------------------------------------------------------------- 6) demo.html
const demo = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Componenti AI-first — proof of concept</title>
  <link href="https://cdn.jsdelivr.net/npm/@fontsource/titillium-web@5/index.min.css" rel="stylesheet">
  <link rel="stylesheet" href="it-tokens.css">
  <style> body{max-width:820px;margin:0 auto;padding:2rem 1.5rem;} h1{color:var(--it-color-text)} h2{margin-top:2rem;color:var(--it-color-text)} .row>*{margin-right:.5rem} code{background:#eef;padding:.1em .3em;border-radius:3px} </style>
</head>
<body>
  <h1>Componenti AI-first — proof of concept</h1>
  <p>Tutto qui sotto è generato da <code>spec/</code> via <code>codegen.mjs</code>: web components con accessibilità <strong>incapsulata</strong>. L'autore (umano o AI) scrive solo attributi semantici.</p>

  <h2>Bottoni</h2>
  <div class="row">
    <it-button>Azione primaria</it-button>
    <it-button variant="outline">Annulla</it-button>
    <it-button variant="secondary" size="sm">Piccolo</it-button>
    <it-button size="lg">Grande</it-button>
    <it-button disabled>Disabilitato</it-button>
  </div>

  <h2>Callout</h2>
  <it-callout title="Informazione">Testo informativo per l'utente.</it-callout>
  <it-callout variant="warning" title="Attenzione">Controlla i dati inseriti prima di procedere.</it-callout>
  <it-callout variant="success" title="Operazione riuscita">La domanda è stata inviata correttamente.</it-callout>

  <h2>Accordion <small style="font-weight:400;color:var(--it-color-muted)">(stato + tastiera + ARIA, gestiti dal componente)</small></h2>
  <it-accordion>
    <div data-header="Chi può presentare domanda">Tutti i cittadini residenti nel comune.</div>
    <div data-header="Documenti necessari">Documento d'identità in corso di validità e attestazione ISEE.</div>
    <div data-header="Tempi di risposta">L'esito viene comunicato entro 30 giorni dalla presentazione.</div>
  </it-accordion>

  <script defer src="it-components.js"></script>
</body>
</html>
`;
writeFileSync(join(DIST, "demo.html"), demo);

// ---------------------------------------------------------------- 7) index.html — GALLERIA (GitHub Pages)
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const propsTable = (s) => {
  const entries = Object.entries(s.props || {});
  if (!entries.length) return `<p class="muted">Nessuna prop.</p>`;
  return (
    `<table class="props"><thead><tr><th>Prop</th><th>Valori</th><th>Default</th></tr></thead><tbody>` +
    entries
      .map(
        ([n, p]) =>
          `<tr><td><code>${n}</code></td><td>${p.type === "enum" ? p.values.map((v) => `<code>${v}</code>`).join(" ") : p.type}</td><td><code>${esc(JSON.stringify(p.default))}</code></td></tr>`
      )
      .join("") +
    `</tbody></table>`
  );
};
const section = (s) => `
<section id="${s.tag}" class="cmp">
  <h2>&lt;${s.tag}&gt;${s.poweredBy ? ` <span class="badge">${s.poweredBy}</span>` : ""}</h2>
  <p class="intent">${esc(s.intent)}</p>
  <div class="preview">${s.example}</div>
  ${propsTable(s)}
  <h3>Accessibilità <span class="muted">(incapsulata nel componente)</span></h3>
  <ul class="a11y">${(s.a11y || []).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
  <div class="code"><button class="copy" type="button">Copia</button><pre><code>${esc(s.example)}</code></pre></div>
</section>`;

const gallery = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Design System PA — galleria componenti AI-first</title>
  <link href="https://cdn.jsdelivr.net/npm/@fontsource/titillium-web@5/index.min.css" rel="stylesheet">
  <link rel="stylesheet" href="it-tokens.css">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--it-color-text); }
    header.top { background: var(--it-color-primary); color: #fff; padding: 1.25rem 1.5rem; }
    header.top h1 { margin: 0; font-size: 1.4rem; }
    header.top p { margin: .25rem 0 0; opacity: .9; font-size: .95rem; }
    .layout { display: grid; grid-template-columns: 220px 1fr; gap: 2rem; max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
    nav.toc { position: sticky; top: 1rem; align-self: start; }
    nav.toc a { display: block; padding: .35rem .5rem; border-radius: var(--it-radius-sm); color: var(--it-color-primary); text-decoration: none; font-weight: 600; }
    nav.toc a:hover { background: var(--it-color-info-bg); }
    .cmp { border-top: 1px solid var(--it-color-border); padding: 2rem 0; }
    .cmp:first-child { border-top: 0; }
    .cmp h2 { margin: 0 0 .25rem; }
    .badge { font-size: .7rem; font-weight: 600; background: var(--it-color-info-bg); color: var(--it-color-info-accent); padding: .2em .5em; border-radius: 999px; vertical-align: middle; }
    .intent { color: var(--it-color-muted); margin-top: 0; }
    .preview { border: 1px dashed var(--it-color-border); border-radius: var(--it-radius-md); padding: var(--it-space-lg); margin: 1rem 0; background: #fbfcfe; display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
    .preview > * { margin: 0; }
    table.props { border-collapse: collapse; width: 100%; font-size: .9rem; margin: .5rem 0 1rem; }
    table.props th, table.props td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid var(--it-color-border); }
    ul.a11y { margin: .25rem 0 1rem; padding-left: 1.2rem; color: var(--it-color-text); }
    .muted { color: var(--it-color-muted); font-weight: 400; font-size: .85em; }
    .code { position: relative; }
    .code pre { background: #0d1b2a; color: #e6edf3; padding: 1rem; border-radius: var(--it-radius-md); overflow-x: auto; margin: 0; }
    .code .copy { position: absolute; top: .5rem; right: .5rem; font: inherit; font-size: .8rem; cursor: pointer; border: 1px solid #fff3; background: #ffffff1a; color: #fff; border-radius: var(--it-radius-sm); padding: .2em .6em; }
    code { font-family: 'Roboto Mono', ui-monospace, monospace; }
    /* stili minimi per gli esempi live */
    .agid-btn { font: inherit; font-weight: 600; cursor: pointer; border-radius: var(--it-radius-md); padding: .5em 1.25em; border: 2px solid var(--it-color-primary); background: var(--it-color-primary); color: #fff; }
    .agid-btn-outline { background: transparent; color: var(--it-color-primary); }
    .zag-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); }
    .zag-positioner { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .zag-content { background: #fff; border-radius: var(--it-radius-md); padding: var(--it-space-lg); max-width: 440px; box-shadow: 0 12px 48px rgba(0,0,0,.25); }
    .zag-content .zag-title { margin: 0 0 .5rem; } .zag-actions { margin-top: var(--it-space-lg); text-align: right; }
    /* tabs */
    .agid-tabs { width: 100%; } .agid-tablist { display: flex; gap: .25rem; border-bottom: 2px solid var(--it-color-border); }
    .agid-tab { font: inherit; font-weight: 600; cursor: pointer; border: 0; background: transparent; color: var(--it-color-muted); padding: .6em 1em; border-bottom: 3px solid transparent; margin-bottom: -2px; }
    .agid-tab[data-selected] { color: var(--it-color-primary); border-bottom-color: var(--it-color-primary); }
    .agid-tab:focus-visible { outline: 3px solid var(--it-color-focus); outline-offset: -3px; }
    .agid-tabpanel { padding: var(--it-space-md) 0; }
    /* tooltip */
    .agid-tip-positioner { position: absolute; }
    .agid-tip { background: var(--it-color-text); color: #fff; padding: .35em .6em; border-radius: var(--it-radius-sm); font-size: .85rem; max-width: 240px; }
    /* popover */
    .agid-pop-positioner { position: absolute; }
    .agid-pop { background: #fff; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-md); padding: var(--it-space-md); box-shadow: 0 8px 24px rgba(0,0,0,.15); max-width: 280px; }
    .agid-pop-title { font-weight: 700; margin-bottom: .25rem; }
    /* switch */
    .agid-switch { display: inline-flex; align-items: center; gap: .5em; cursor: pointer; }
    .agid-switch-control { width: 2.4em; height: 1.3em; border-radius: 999px; background: var(--it-color-muted); position: relative; transition: background .2s; flex: 0 0 auto; }
    .agid-switch-control[data-state="checked"] { background: var(--it-color-primary); }
    .agid-switch-thumb { position: absolute; top: 2px; left: 2px; width: calc(1.3em - 4px); height: calc(1.3em - 4px); border-radius: 50%; background: #fff; transition: transform .2s; }
    .agid-switch-control[data-state="checked"] .agid-switch-thumb { transform: translateX(1.1em); }
    .agid-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
    /* collapsible */
    .agid-collapsible-content { padding-top: var(--it-space-sm); }
    /* number */
    .agid-number-control { display: inline-flex; align-items: stretch; }
    .agid-number-btn { font: inherit; width: 2.2em; border: 1px solid var(--it-color-border); background: #fff; cursor: pointer; }
    .agid-number-control .agid-input { width: 4em; text-align: center; border-radius: 0; }
    /* menu */
    .agid-menu-positioner { position: absolute; }
    .agid-menu { background: #fff; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,.15); padding: .25rem; min-width: 160px; }
    .agid-menu-item { padding: .5em .75em; border-radius: var(--it-radius-sm); cursor: pointer; }
    .agid-menu-item[data-highlighted] { background: var(--it-color-info-bg); color: var(--it-color-primary); }
    /* steps */
    .agid-steps-list { display: flex; gap: .5rem; align-items: center; }
    .agid-step { display: flex; align-items: center; gap: .4em; background: transparent; border: 0; font: inherit; cursor: pointer; color: var(--it-color-muted); }
    .agid-step-num { display: inline-flex; align-items: center; justify-content: center; width: 1.8em; height: 1.8em; border-radius: 50%; background: var(--it-color-border); color: var(--it-color-text); font-weight: 700; }
    .agid-step[data-current] { color: var(--it-color-primary); } .agid-step[data-current] .agid-step-num { background: var(--it-color-primary); color: #fff; }
    .agid-step[data-complete] .agid-step-num { background: var(--it-color-success-accent); color: #fff; }
    .agid-step-content { padding: var(--it-space-md) 0; } .agid-steps-nav { display: flex; gap: .5rem; }
    /* rating */
    .agid-rating-control { display: inline-flex; gap: .1em; font-size: 1.6rem; }
    .agid-rating-item { color: var(--it-color-border); cursor: pointer; }
    .agid-rating-item[data-highlighted], .agid-rating-item[data-checked] { color: var(--it-color-warning-accent); }
    .agid-rating input { position: absolute; opacity: 0; }
    /* select / combobox */
    .agid-select-trigger, .agid-combobox-control { display: inline-flex; align-items: center; justify-content: space-between; gap: .5em; min-width: 200px; font: inherit; padding: .5em .75em; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-sm); background: #fff; cursor: pointer; }
    .agid-combobox-control .agid-input { border: 0; outline: 0; width: 100%; }
    .agid-select-positioner { position: absolute; }
    .agid-select-content { background: #fff; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,.15); padding: .25rem; min-width: 200px; max-height: 240px; overflow: auto; }
    .agid-select-item { padding: .5em .75em; border-radius: var(--it-radius-sm); cursor: pointer; }
    .agid-select-item[data-highlighted] { background: var(--it-color-info-bg); color: var(--it-color-primary); }
    .agid-select-item[data-state="checked"] { font-weight: 700; }
    /* slider */
    .agid-slider-control { position: relative; height: 1.5rem; display: flex; align-items: center; }
    .agid-slider-track { height: 4px; background: var(--it-color-border); border-radius: 999px; flex: 1; position: relative; }
    .agid-slider-range { position: absolute; height: 100%; background: var(--it-color-primary); border-radius: 999px; }
    .agid-slider-thumb { width: 1.1rem; height: 1.1rem; background: var(--it-color-primary); border-radius: 50%; outline: none; }
    .agid-slider-thumb:focus-visible { box-shadow: 0 0 0 3px var(--it-color-focus); }
    /* pin */
    .agid-pin-control { display: inline-flex; gap: .4rem; } .agid-pin-input { width: 2.5em; text-align: center; font: inherit; padding: .4em; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-sm); }
    /* tags */
    .agid-tags-control { display: flex; flex-wrap: wrap; gap: .3rem; align-items: center; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-sm); padding: .3rem; }
    .agid-tags-control .agid-input { border: 0; outline: 0; flex: 1; min-width: 6em; }
    .agid-tag { display: inline-flex; align-items: center; gap: .25em; background: var(--it-color-info-bg); color: var(--it-color-primary); border-radius: 999px; padding: .15em .6em; font-size: .9rem; }
    .agid-tag-del { border: 0; background: transparent; cursor: pointer; color: inherit; font-size: 1.1em; line-height: 1; }
    /* upload */
    .agid-upload-drop { border: 2px dashed var(--it-color-border); border-radius: var(--it-radius-md); padding: var(--it-space-md); text-align: center; }
    .agid-upload-drop[data-dragging] { border-color: var(--it-color-primary); background: var(--it-color-info-bg); }
    .agid-upload-list { list-style: none; padding: 0; margin: .5rem 0 0; }
    /* carousel */
    .agid-carousel-track { display: flex; overflow: hidden; gap: 1rem; } .agid-carousel-slide { min-width: 100%; padding: var(--it-space-lg); background: var(--it-color-info-bg); border-radius: var(--it-radius-md); }
    .agid-carousel-controls { display: flex; gap: .5rem; margin-top: .5rem; }
    /* datepicker */
    .agid-datepicker-control { display: inline-flex; gap: .3rem; }
    .agid-datepicker-content { background: #fff; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-md); box-shadow: 0 8px 24px rgba(0,0,0,.15); padding: var(--it-space-md); }
    .agid-dp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
    .agid-dp-nav, .agid-dp-view { border: 0; background: transparent; font: inherit; cursor: pointer; }
    .agid-dp-table { border-collapse: collapse; } .agid-dp-table th { font-size: .75rem; color: var(--it-color-muted); padding: .2rem; }
    .agid-dp-day { width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; }
    .agid-dp-day[data-highlighted] { background: var(--it-color-info-bg); } .agid-dp-day[data-selected] { background: var(--it-color-primary); color: #fff; }
    /* toast */
    .agid-toast-region { position: fixed; top: 1rem; right: 1rem; display: flex; flex-direction: column; gap: .5rem; z-index: 2000; max-width: 320px; }
    .agid-toast { position: relative; background: #fff; border-left: 4px solid var(--it-color-info-accent); border-radius: var(--it-radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,.2); padding: .75rem 2rem .75rem .75rem; }
    .agid-toast-success { border-left-color: var(--it-color-success-accent); }
    .agid-toast-error { border-left-color: #b3261e; } .agid-toast-warning { border-left-color: var(--it-color-warning-accent); }
    .agid-toast-title { font-weight: 700; }
    .agid-toast-close { position: absolute; top: .3rem; right: .4rem; border: 0; background: transparent; cursor: pointer; font-size: 1.2rem; line-height: 1; }
    /* megamenu */
    .agid-megamenu { display: flex; gap: 1.5rem; background: #fff; border: 1px solid var(--it-color-border); border-radius: var(--it-radius-md); box-shadow: 0 8px 24px rgba(0,0,0,.15); padding: var(--it-space-md); }
    .agid-megamenu-title { font-weight: 700; color: var(--it-color-muted); margin-bottom: .25rem; }
    /* navscroll */
    .agid-navscroll { border-left: 2px solid var(--it-color-border); padding-left: 1rem; }
    /* datatable */
    .agid-dt-search { margin-bottom: .5rem; } .agid-dt-search label { display: block; font-weight: 600; margin-bottom: .25rem; }
    .agid-dt-sort { font: inherit; font-weight: 700; background: transparent; border: 0; cursor: pointer; color: var(--it-color-text); display: inline-flex; align-items: center; gap: .3em; }
    .agid-dt-sort:focus-visible { outline: 3px solid var(--it-color-focus); }
    th[aria-sort="ascending"] .agid-dt-ind::after { content: "▲"; font-size: .7em; color: var(--it-color-primary); }
    th[aria-sort="descending"] .agid-dt-ind::after { content: "▼"; font-size: .7em; color: var(--it-color-primary); }
    th[aria-sort="none"] .agid-dt-ind::after { content: "⇅"; font-size: .7em; color: var(--it-color-muted); }
    .agid-dt-pager { display: flex; gap: .25rem; margin-top: .5rem; flex-wrap: wrap; }
    .agid-dt-pager .agid-page-link { border: 1px solid var(--it-color-border); background: #fff; padding: .4em .7em; border-radius: var(--it-radius-sm); cursor: pointer; font: inherit; color: var(--it-color-primary); }
    .agid-dt-pager .agid-page-link.is-current { background: var(--it-color-primary); color: #fff; border-color: var(--it-color-primary); }
    .agid-dt-pager .agid-page-link[disabled] { opacity: .4; cursor: not-allowed; }
    [hidden] { display: none !important; }
    @media (max-width: 720px) { .layout { grid-template-columns: 1fr; } nav.toc { position: static; } }
  </style>
</head>
<body>
  <header class="top">
    <h1>Design System PA — <strong>LLM-first</strong></h1>
    <p>Pensato perché siano gli assistenti AI a costruire UI della PA conformi ad AgID. Web Components universali (React, Vue, Angular, HTML puro) con accessibilità incapsulata, generati da <code style="color:#fff">spec/</code>. Progetto community, non ufficiale.</p>
  </header>
  <div class="layout">
    <nav class="toc">
      <strong>Componenti</strong>
      ${components.map((s) => `<a href="#${s.tag}">&lt;${s.tag}&gt;</a>`).join("\n      ")}
    </nav>
    <main>
      ${components.map(section).join("\n")}
    </main>
  </div>
  <footer style="border-top:1px solid var(--it-color-border);margin-top:2rem;padding:1.5rem;text-align:center;color:var(--it-color-muted);font-size:.85rem">
    <strong>Progetto community, non ufficiale.</strong> Non affiliato né approvato da AgID o Designers Italia.
    Costruito sopra <a href="https://github.com/italia/bootstrap-italia">Bootstrap Italia</a> (licenza BSD-3-Clause) nel rispetto della relativa attribuzione.
    Il nome "AgID" è usato solo in senso descrittivo. Il prefisso <code>it-</code> è provvisorio.
  </footer>
  <script src="it-components.js"></script>
  <script src="it-behavioral.bundle.js"></script>
  <script>
    document.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", () => {
      const code = b.parentElement.querySelector("code").innerText;
      navigator.clipboard?.writeText(code);
      b.textContent = "Copiato!"; setTimeout(() => (b.textContent = "Copia"), 1200);
    }));
  </script>
</body>
</html>
`;
writeFileSync(join(DIST, "index.html"), gallery);

console.log("✅ Generati da spec/ ->");
console.log("   - dist/index.html            (GALLERIA componenti, pronta per GitHub Pages)");
console.log("   - dist/it-tokens.css        (token DTCG -> CSS custom properties)");
console.log("   - dist/it-components.js      (" + components.length + " web components, a11y incapsulata)");
console.log("   - dist/react/*.tsx           (wrapper React tipizzati)");
console.log("   - dist/llms.txt              (doc per LLM)");
console.log("   - dist/contracts.json        (contratto validazione per MCP)");
console.log("   - dist/demo.html             (pagina dimostrativa)");
