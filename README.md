# agid-llm-ui — un design system **LLM-first** per la PA italiana

> **LLM-first**: un esperimento per aiutare gli **assistenti AI** (Claude, Cursor, Copilot…) a generare interfacce della PA più vicine alle linee guida AgID, cercando di tenere conto dell'accessibilità. I componenti e i materiali per gli LLM sono generati da **un'unica fonte machine-readable**.

> **LLM-first** — an experiment to help **AI assistants** generate Italian-PA UIs closer to the AgID guidelines. Components and LLM-facing materials are generated from a single machine-readable spec.

[![License: EUPL 1.2](https://img.shields.io/badge/license-EUPL--1.2-blue)](LICENSE)
![status](https://img.shields.io/badge/status-sperimentale-orange)
![non ufficiale](https://img.shields.io/badge/progetto-community%20non%20ufficiale-lightgrey)
![componenti](https://img.shields.io/badge/componenti-49-blue)
<!-- Dopo il primo push, abilita anche il badge CI:
![CI](https://github.com/<tuo-username>/agid-llm-ui/actions/workflows/ci.yml/badge.svg) -->


---

## Da dove nasce

Lavorando con **Bootstrap Italia** (il design system ufficiale della PA) abbiamo notato alcune cose, dette senza pretese:

- il design e l'accessibilità sono ottimi, ma il markup è verboso e molte regole stanno nella documentazione, non nei componenti;
- i vari kit di framework (React, Angular, web components) sono mantenuti a mano, senza un'unica fonte machine-readable, quindi tendono a rincorrere;
- gli assistenti AI non conoscono Bootstrap Italia e spesso generano markup generico e non conforme.

Questo è un **esperimento** per provare un approccio diverso: descrivere i componenti in una **spec machine-readable** e generare da lì gli artefatti — inclusi quelli che aiutano un LLM a produrre UI più conformi. Non pretende di essere completo né una soluzione definitiva: è un punto di partenza aperto ai contributi.

Come funziona, in breve: da `sota/spec/` un piccolo codegen produce i **Web Components** (con l'accessibilità e il comportamento — focus, tastiera, stato — gestiti da macchine a stati **[Zag.js](https://zagjs.dev)**), i wrapper tipizzati, il CSS dai token, la documentazione, i contratti di validazione, la galleria e i dati per il **server [MCP](https://modelcontextprotocol.io)**. Cambiando la spec, gli artefatti si riallineano.

Note più estese: **[VISION.md](VISION.md)**.

> ⚠️ **Progetto community, non ufficiale.** Non affiliato né approvato da AgID o Designers Italia. Costruito sopra Bootstrap Italia (licenza BSD-3-Clause) nel rispetto della relativa attribuzione. "AgID" è usato solo in senso descrittivo; il prefisso `it-` è provvisorio.

## Cosa contiene

- **49 componenti** verificati (render + accessibilità), ~20 interattivi su Zag (dialog, menu, select, combobox, datepicker, tabs, toast, steps, slider, datatable…) + presentazionali (card, table, header, footer, breadcrumb…).
- **Server MCP con 9 tool** — serve *sia* il markup Bootstrap Italia grezzo (v1) *sia* i Web Components AI-first (v2):

| Tool | A cosa serve |
|------|--------------|
| `list_components` / `search_component` / `get_component_code` | Componenti Bootstrap Italia (markup + a11y) |
| `list_recipes` / `get_page_recipe` | Ricette di pagina dei modelli PA |
| `get_accessibility_rules` | Regole WCAG 2.1 AA / AgID |
| `list_webcomponents` / `get_webcomponent` | **Componenti AI-first** universali (consigliati) |
| `validate_snippet` | **Valida** uno snippet e suggerisce i tag conformi (loop di autocorrezione) |

## Architettura: una fonte → tutti gli artefatti

```
sota/spec/  (design token DTCG + manifest dei componenti = fonte unica)
   │  node sota/codegen.mjs
   ├─ Web Components (a11y incapsulata, Zag dentro)
   ├─ wrapper React tipizzati
   ├─ CSS dai token
   ├─ llms.txt            (doc per LLM)
   ├─ contracts.json      (validazione → MCP)
   ├─ galleria (GitHub Pages)
   └─ dati per il server MCP
```

Vedi **[VISION.md](VISION.md)** per il manifesto completo.

## Uso rapido

```bash
git clone https://github.com/<org>/bootstrap-italia-mcp.git
cd bootstrap-italia-mcp && npm install && npm run build
node sota/codegen.mjs      # genera componenti, gallery, llms.txt, contratti

npm run inspect            # prova i tool MCP nell'Inspector
```

Collega l'MCP a Claude Code:
```bash
claude mcp add bootstrap-italia -- node /percorso/assoluto/bootstrap-italia-mcp/dist/index.js
```
Poi nell'editor: *«Crea la pagina di un servizio comunale conforme ad AgID con accesso SPID»* → l'AI usa i tool e genera markup conforme, preferendo i Web Components.

Galleria in locale: apri `sota/dist/index.html` (o servila con un web server statico).

## Contribuire

Aggiungere un componente **presentazionale** = **un file spec** (`sota/spec/components/*.json`). Uno **interattivo** = una macchina Zag + un piccolo Web Component. Vedi [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

- [x] Coprire il catalogo Bootstrap Italia (49 componenti)
- [x] `validate_snippet` (loop di conformità)
- [ ] Generare adapter Vue / Angular / Svelte dalla spec
- [ ] `llms.txt` + rules pack (`.cursor/rules`, `AGENTS.md`) + `registry.json` (shadcn)
- [ ] `render_check` (screenshot headless → verifica visiva) nel loop MCP
- [ ] Pubblicare la galleria su GitHub Pages + catalogo Developers Italia

## Riferimenti

[Bootstrap Italia](https://italia.github.io/bootstrap-italia/) · [Designers Italia](https://designers.italia.it/) · [Zag.js](https://zagjs.dev) · [Model Context Protocol](https://modelcontextprotocol.io)

## Licenza

[EUPL-1.2](LICENSE) — la licenza raccomandata per il software della PA europea.
