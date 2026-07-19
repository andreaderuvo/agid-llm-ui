/**
 * eval.mjs — Livello 3 (capability eval): dato un task tipico di uno sviluppatore PA,
 * il server MCP fornisce markup CONFORME a Bootstrap Italia e privo di pattern
 * non-conformi (Tailwind / Bootstrap generico)?
 *
 * È la condizione NECESSARIA perché un editor AI collegato al server generi UI conformi.
 * Gira senza LLM (usa i tool come oracolo) ed è adatto alla CI.
 *
 *   node scripts/eval.mjs          -> esce 1 se un caso fallisce
 *
 * Variante end-to-end (con LLM nel loop): collega il server a Claude/Cursor, dai gli
 * stessi prompt e applica gli stessi `required`/`forbidden` all'HTML generato dal modello.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Pattern che NON devono MAI comparire: firme tipiche di Tailwind o Bootstrap generico.
const GLOBAL_FORBIDDEN = [
  /\bbg-(?:blue|gray|red|green)-\d{2,3}\b/, // tailwind: bg-blue-500
  /\btext-(?:gray|blue|red)-\d{2,3}\b/, // tailwind: text-gray-700
  /\brounded-(?:md|lg|xl|full)\b/, // tailwind radius
  /\bnavbar-(?:light|dark)\b/, // bootstrap generico (BI non li usa)
  /\bbg-light\b/,
];

// Ogni caso simula un task: "prompt" (a scopo doc), il tool che l'AI userebbe,
// i marcatori conformi attesi (required) e quelli vietati (forbidden).
const CASES = [
  {
    prompt: "Fammi l'header istituzionale del sito del comune",
    tool: "get_component_code", args: { id: "header" },
    required: ["it-header-wrapper", "it-brand-title"],
  },
  {
    prompt: "Aggiungi il menu di navigazione principale",
    tool: "search_component", args: { query: "menu principale" },
    required: ["navbar-collapsable", "aria-current", "aria-label"],
    forbidden: [/\bnavbar-light\b/, /\bnavbar-dark\b/],
  },
  {
    prompt: "Un menu a tendina per scegliere il comune",
    tool: "get_component_code", args: { id: "select" },
    required: ["select-wrapper", "<label", "for="],
  },
  {
    prompt: "Una casella di consenso privacy",
    tool: "get_component_code", args: { id: "checkbox" },
    required: ["form-check", "<label", "for="],
  },
  {
    prompt: "Una procedura di domanda a più passi",
    tool: "get_component_code", args: { id: "steppers" },
    required: ["steppers-header", "aria-current", "progress-bar"],
  },
  {
    prompt: "Una tabella dei pagamenti per Amministrazione trasparente",
    tool: "get_component_code", args: { id: "table" },
    required: ["<caption", 'scope="col"'],
  },
  {
    prompt: "Il footer istituzionale con i link obbligatori",
    tool: "get_component_code", args: { id: "footer" },
    required: ["Dichiarazione di accessibilità", "Amministrazione trasparente"],
  },
  {
    prompt: "Crea la pagina completa di un servizio comunale",
    tool: "get_page_recipe", args: { id: "pagina-servizio-comune" },
    required: ["it-header-wrapper", "breadcrumb", "it-footer", "main-content", "Vai al contenuto principale"],
    exactlyOneH1: true,
  },
  {
    prompt: "Quali regole di accessibilità devo rispettare nei form?",
    tool: "get_accessibility_rules", args: { topic: "form" },
    required: ["label", "aria-describedby"],
  },
];

const transport = new StdioClientTransport({ command: "node", args: ["dist/index.js"] });
const client = new Client({ name: "eval", version: "0.0.0" });
await client.connect(transport);

let passed = 0;
const failures = [];

for (const c of CASES) {
  const res = await client.callTool({ name: c.tool, arguments: c.args });
  const text = (res.content || []).map((p) => p.text || "").join("\n");
  const problems = [];

  for (const marker of c.required || []) if (!text.includes(marker)) problems.push(`manca marcatore richiesto: "${marker}"`);
  for (const re of [...GLOBAL_FORBIDDEN, ...(c.forbidden || [])])
    if (re.test(text)) problems.push(`presente pattern non-conforme: ${re}`);
  if (c.exactlyOneH1) {
    // conta gli <h1> solo dentro i blocchi di codice ```html, non nella prosa
    const codeBlocks = [...text.matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
    const h1 = (codeBlocks.match(/<h1\b/g) || []).length;
    if (h1 !== 1) problems.push(`atteso esattamente un <h1> nel markup, trovati ${h1}`);
  }

  if (problems.length) {
    failures.push({ prompt: c.prompt, problems });
    console.log(`❌ ${c.prompt}`);
    for (const p of problems) console.log(`     - ${p}`);
  } else {
    passed++;
    console.log(`✅ ${c.prompt}`);
  }
}

await client.close();

console.log(`\n${passed}/${CASES.length} task conformi.`);
if (failures.length) process.exit(1);
console.log("Il server fornisce markup conforme per tutti i task di riferimento.");
