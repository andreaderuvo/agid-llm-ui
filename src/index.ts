#!/usr/bin/env node
/**
 * bootstrap-italia-mcp
 * MCP server che espone la conoscenza del design system Bootstrap Italia (AgID)
 * agli editor AI (Claude, Cursor, Copilot...), così generano markup conforme e accessibile.
 *
 * MCP server exposing the Bootstrap Italia (AgID) design system knowledge to AI editors,
 * so they generate compliant, accessible markup.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// --- Caricamento dei dati (data/ sta nella root del progetto, accanto a dist/ e src/) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

interface Component {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description: string;
  code: string;
  accessibilityNotes: string;
  docsUrl: string;
}

interface Recipe {
  id: string;
  name: string;
  model: string;
  description: string;
  usesComponents: string[];
  code: string;
  accessibilityNotes: string;
}

interface AccessibilityRule {
  topic: string;
  rule: string;
}

interface WebComponent {
  tag: string;
  intent: string;
  runtime: string;
  poweredBy: string | null;
  props: Record<string, { type: string; values?: string[]; default?: unknown }>;
  a11y: string[];
  forbidden: string[];
  example: string;
}

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8")) as T;
}

const componentsData = loadJson<{ meta: Record<string, unknown>; components: Component[] }>("components.json");
const recipesData = loadJson<{ meta: Record<string, unknown>; recipes: Recipe[] }>("recipes.json");
const accessibilityData = loadJson<{ meta: Record<string, unknown>; rules: AccessibilityRule[] }>("accessibility.json");

const components = componentsData.components;
const recipes = recipesData.recipes;
const accessibilityRules = accessibilityData.rules;

// Componenti AI-first (Web Components universali) generati da sota/spec — opzionali.
let webcomponents: WebComponent[] = [];
let webcomponentsNote = "";
try {
  const wc = loadJson<{ note: string; components: WebComponent[] }>("webcomponents.json");
  webcomponents = wc.components;
  webcomponentsNote = wc.note;
} catch {
  // file assente: i tool sui web components restano vuoti ma il server parte comunque
}

// --- Server ---
const server = new McpServer({
  name: "agid-llm-ui",
  version: "0.1.0",
});

const DESIGN_SYSTEM_HINT =
  `Design system: Bootstrap Italia (${componentsData.meta.bootstrapItaliaVersion ?? "2.x"}). ` +
  `Genera SEMPRE markup con le classi di Bootstrap Italia e rispetta le note di accessibilità. ` +
  `Non sostituire con Bootstrap generico, Tailwind o markup non conforme.`;

function fmtComponent(c: Component): string {
  return [
    `## ${c.name}  (id: ${c.id})`,
    `Categoria: ${c.category} — Tag: ${c.tags.join(", ")}`,
    "",
    c.description,
    "",
    "### Markup conforme",
    "```html",
    c.code,
    "```",
    "",
    `### Accessibilità`,
    c.accessibilityNotes,
    "",
    `Docs: ${c.docsUrl}`,
  ].join("\n");
}

function fmtWebComponent(w: WebComponent): string {
  const props = Object.entries(w.props || {})
    .map(([n, p]) => `  - ${n}: ${p.type === "enum" ? (p.values ?? []).join(" | ") : p.type} (default: ${JSON.stringify(p.default)})`)
    .join("\n");
  return [
    `## <${w.tag}> — ${w.intent}${w.poweredBy ? `  (powered by ${w.poweredBy})` : ""}`,
    "Props:",
    props || "  (nessuna)",
    "### Accessibilità (incapsulata nel componente)",
    ...w.a11y.map((a) => `  - ${a}`),
    "### Esempio",
    "```html",
    w.example,
    "```",
  ].join("\n");
}

const WEBCOMPONENT_HINT =
  "Componenti AI-first: Web Components universali (funzionano in React, Vue, Angular, HTML puro). " +
  "L'accessibilità è già incapsulata: preferisci SEMPRE questi tag ai markup grezzi quando il progetto può caricarli.";

// 1) list_components ---------------------------------------------------------
server.registerTool(
  "list_components",
  {
    title: "Elenca i componenti disponibili",
    description:
      "Elenca i componenti Bootstrap Italia disponibili (id, nome, categoria). " +
      "Usa questo tool per scoprire cosa esiste prima di generare una UI PA. " +
      DESIGN_SYSTEM_HINT,
    inputSchema: {
      category: z
        .string()
        .optional()
        .describe("Filtra per categoria, es. 'form', 'navigazione', 'layout', 'contenuti', 'azioni', 'feedback'."),
    },
  },
  async ({ category }) => {
    const list = category
      ? components.filter((c) => c.category.toLowerCase() === category.toLowerCase())
      : components;
    const text = list.length
      ? list.map((c) => `- ${c.id} — ${c.name} [${c.category}]`).join("\n")
      : `Nessun componente per la categoria '${category}'. Categorie disponibili: ${[...new Set(components.map((c) => c.category))].join(", ")}.`;
    return { content: [{ type: "text", text: `${DESIGN_SYSTEM_HINT}\n\n${text}` }] };
  }
);

// 2) search_component --------------------------------------------------------
server.registerTool(
  "search_component",
  {
    title: "Cerca un componente",
    description:
      "Cerca un componente Bootstrap Italia per parola chiave (nome, descrizione, tag). " +
      "Usa questo tool quando devi realizzare un elemento di UI e non conosci l'id esatto. " +
      DESIGN_SYSTEM_HINT,
    inputSchema: {
      query: z.string().describe("Parola chiave, es. 'bottone', 'menu', 'form', 'avviso', 'card servizio'."),
    },
  },
  async ({ query }) => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = (c: Component) =>
      `${c.id} ${c.name} ${c.description} ${c.tags.join(" ")}`.toLowerCase();
    // prima prova AND (tutti i termini presenti), poi ripiega su OR (almeno un termine)
    let matches = components.filter((c) => tokens.every((t) => haystack(c).includes(t)));
    if (!matches.length) matches = components.filter((c) => tokens.some((t) => haystack(c).includes(t)));
    if (!matches.length) {
      return {
        content: [
          {
            type: "text",
            text: `Nessun componente trovato per "${query}". Prova list_components per vedere tutto ciò che è disponibile.`,
          },
        ],
      };
    }
    return {
      content: [{ type: "text", text: `${DESIGN_SYSTEM_HINT}\n\n${matches.map(fmtComponent).join("\n\n---\n\n")}` }],
    };
  }
);

// 3) get_component_code ------------------------------------------------------
server.registerTool(
  "get_component_code",
  {
    title: "Ottieni il codice di un componente",
    description:
      "Restituisce il markup conforme e le note di accessibilità di un componente Bootstrap Italia dato il suo id. " +
      DESIGN_SYSTEM_HINT,
    inputSchema: {
      id: z.string().describe("L'id del componente, es. 'card', 'breadcrumb', 'form-input'. Usa list_components per gli id."),
    },
  },
  async ({ id }) => {
    const c = components.find((x) => x.id === id.toLowerCase());
    if (!c) {
      return {
        content: [
          {
            type: "text",
            text: `Nessun componente con id "${id}". Id disponibili: ${components.map((x) => x.id).join(", ")}.`,
          },
        ],
      };
    }
    return { content: [{ type: "text", text: `${DESIGN_SYSTEM_HINT}\n\n${fmtComponent(c)}` }] };
  }
);

// 4) list_recipes ------------------------------------------------------------
server.registerTool(
  "list_recipes",
  {
    title: "Elenca le ricette di pagina",
    description:
      "Elenca le ricette di pagina conformi ai modelli di sito PA (Comuni, Scuole, Sanità). " +
      "Una ricetta compone più componenti in una pagina intera. " +
      DESIGN_SYSTEM_HINT,
    inputSchema: {},
  },
  async () => {
    const text = recipes.map((r) => `- ${r.id} — ${r.name} [${r.model}]`).join("\n");
    return { content: [{ type: "text", text: `${DESIGN_SYSTEM_HINT}\n\n${text}` }] };
  }
);

// 5) get_page_recipe ---------------------------------------------------------
server.registerTool(
  "get_page_recipe",
  {
    title: "Ottieni una ricetta di pagina",
    description:
      "Restituisce lo scheletro completo e conforme di una pagina PA (es. pagina di un servizio comunale), " +
      "componendo header, breadcrumb, contenuto e footer con i link obbligatori. " +
      DESIGN_SYSTEM_HINT,
    inputSchema: {
      id: z.string().describe("L'id della ricetta, es. 'pagina-servizio-comune'. Usa list_recipes per gli id."),
    },
  },
  async ({ id }) => {
    const r = recipes.find((x) => x.id === id.toLowerCase());
    if (!r) {
      return {
        content: [
          { type: "text", text: `Nessuna ricetta con id "${id}". Id disponibili: ${recipes.map((x) => x.id).join(", ")}.` },
        ],
      };
    }
    const text = [
      `# ${r.name}  (modello: ${r.model})`,
      "",
      r.description,
      "",
      `Componenti usati: ${r.usesComponents.join(", ")}`,
      "",
      "```html",
      r.code,
      "```",
      "",
      "## Accessibilità",
      r.accessibilityNotes,
    ].join("\n");
    return { content: [{ type: "text", text: `${DESIGN_SYSTEM_HINT}\n\n${text}` }] };
  }
);

// 6) get_accessibility_rules -------------------------------------------------
server.registerTool(
  "get_accessibility_rules",
  {
    title: "Regole di accessibilità (WCAG 2.1 AA / AgID)",
    description:
      "Restituisce le regole di accessibilità trasversali da rispettare in ogni interfaccia PA. " +
      "Consulta questo tool prima di consegnare una UI. " +
      DESIGN_SYSTEM_HINT,
    inputSchema: {
      topic: z
        .string()
        .optional()
        .describe("Filtra per argomento, es. 'form', 'colore', 'heading', 'landmark', 'focus', 'immagini'."),
    },
  },
  async ({ topic }) => {
    const list = topic
      ? accessibilityRules.filter((r) => r.topic.toLowerCase() === topic.toLowerCase())
      : accessibilityRules;
    const body = list.length
      ? list.map((r) => `- [${r.topic}] ${r.rule}`).join("\n")
      : `Nessuna regola per l'argomento '${topic}'. Argomenti: ${accessibilityRules.map((r) => r.topic).join(", ")}.`;
    return {
      content: [{ type: "text", text: `Riferimento: ${accessibilityData.meta.reference}\n\n${body}` }],
    };
  }
);

// 7) list_webcomponents ------------------------------------------------------
server.registerTool(
  "list_webcomponents",
  {
    title: "Elenca i componenti AI-first (Web Components)",
    description:
      "Elenca i Web Components universali disponibili (tag e scopo). " +
      "Sono la forma consigliata: un solo tag, accessibilità incapsulata, nessun lock-in di framework. " +
      WEBCOMPONENT_HINT,
    inputSchema: {},
  },
  async () => {
    if (!webcomponents.length)
      return { content: [{ type: "text", text: "Nessun web component generato. Esegui `node sota/codegen.mjs`." }] };
    const text = webcomponents.map((w) => `- <${w.tag}> — ${w.intent}${w.poweredBy ? ` [${w.poweredBy}]` : ""}`).join("\n");
    return { content: [{ type: "text", text: `${WEBCOMPONENT_HINT}\n\n${text}` }] };
  }
);

// 8) get_webcomponent --------------------------------------------------------
server.registerTool(
  "get_webcomponent",
  {
    title: "Ottieni un componente AI-first (Web Component)",
    description:
      "Restituisce l'uso e il contratto di accessibilità di un Web Component universale dato il suo tag. " +
      WEBCOMPONENT_HINT,
    inputSchema: {
      tag: z.string().describe("Il tag del componente, es. 'it-dialog', 'it-button'. Usa list_webcomponents per l'elenco."),
    },
  },
  async ({ tag }) => {
    const norm = tag.toLowerCase().replace(/[<>]/g, "").trim();
    const w = webcomponents.find((x) => x.tag === norm);
    if (!w) {
      return {
        content: [
          { type: "text", text: `Nessun web component "${tag}". Tag disponibili: ${webcomponents.map((x) => x.tag).join(", ")}.` },
        ],
      };
    }
    return { content: [{ type: "text", text: `${WEBCOMPONENT_HINT}\n\n${fmtWebComponent(w)}` }] };
  }
);

// 9) validate_snippet --------------------------------------------------------
server.registerTool(
  "validate_snippet",
  {
    title: "Valida uno snippet HTML (loop di conformità)",
    description:
      "Controlla uno snippet HTML: pattern non-conformi (Tailwind / Bootstrap generico / handler inline), " +
      "regole di accessibilità di base, e suggerisce i Web Components AI-first equivalenti. " +
      "Chiama questo tool DOPO aver generato markup, per autocorreggerti.",
    inputSchema: {
      snippet: z.string().describe("Lo snippet HTML da validare."),
    },
  },
  async ({ snippet }) => {
    const issues: string[] = [];
    const suggestions: string[] = [];

    const forbidden: Array<{ re: RegExp; msg: string }> = [
      { re: /\bbg-(?:blue|gray|red|green)-\d{2,3}\b/, msg: "classe Tailwind (bg-*-NNN) — non conforme" },
      { re: /\btext-(?:gray|blue|red)-\d{2,3}\b/, msg: "classe Tailwind (text-*-NNN) — non conforme" },
      { re: /\brounded-(?:md|lg|xl|full)\b/, msg: "classe Tailwind (rounded-*) — non conforme" },
      { re: /\bnavbar-(?:light|dark)\b/, msg: "Bootstrap generico (navbar-light/dark) — non è Bootstrap Italia" },
      { re: /\bbg-light\b/, msg: "Bootstrap generico (bg-light) — non è Bootstrap Italia" },
      { re: /\son[a-z]+\s*=/, msg: "event handler inline (on*=) — non ammesso" },
      { re: /tabindex\s*=\s*["']?[1-9]/, msg: "tabindex positivo — rompe l'ordine di focus" },
    ];
    for (const f of forbidden) if (f.re.test(snippet)) issues.push(f.msg);

    for (const m of snippet.matchAll(/<img\b[^>]*>/gi))
      if (!/\balt\s*=/.test(m[0])) issues.push(`<img> senza attributo alt: ${m[0].slice(0, 50)}`);
    if (/<div[^>]*\bclass=["'][^"']*\bbtn\b/.test(snippet))
      issues.push("un <div> sembra usato come bottone — usa <button> o <it-button>");

    const sugg: Array<{ re: RegExp; tag: string }> = [
      { re: /class=["'][^"']*\bcallout\b/, tag: "it-callout" },
      { re: /class=["'][^"']*\baccordion\b/, tag: "it-accordion" },
      { re: /class=["'][^"']*\bmodal\b/, tag: "it-dialog" },
      { re: /class=["'][^"']*\bnav-tabs\b/, tag: "it-tabs" },
      { re: /\bdata-bs-toggle=["']tooltip["']/, tag: "it-tooltip" },
      { re: /class=["'][^"']*\bbtn\b/, tag: "it-button" },
    ];
    for (const s of sugg)
      if (s.re.test(snippet) && webcomponents.some((w) => w.tag === s.tag))
        suggestions.push(`valuta <${s.tag}> (Web Component AI-first, accessibilità inclusa) invece del markup grezzo`);

    const ok = issues.length === 0;
    const out = [ok ? "✅ Nessun problema di conformità rilevato." : `❌ ${issues.length} problema/i:`, ...issues.map((i) => "  - " + i)];
    if (suggestions.length) {
      out.push("", "💡 Suggerimenti:");
      out.push(...suggestions.map((s) => "  - " + s));
    }
    return { content: [{ type: "text", text: out.join("\n") }] };
  }
);

// --- Avvio ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // NB: log su stderr, mai su stdout (stdout è riservato al protocollo MCP).
  console.error(
    "agid-llm-ui attivo (stdio). Componenti:", components.length,
    "| Ricette:", recipes.length,
    "| Web Components AI-first:", webcomponents.length
  );
}

main().catch((err) => {
  console.error("Errore fatale in bootstrap-italia-mcp:", err);
  process.exit(1);
});
