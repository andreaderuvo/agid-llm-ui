# Vision — An AI-native layer for the Italian PA design system

> **Community project, not affiliated with AgID or Designers Italia.**
> It does not fork Bootstrap Italia — it makes it consumable by AI and by any framework.

## The problem

Bootstrap Italia (the official design system for Italian public-sector websites) is **good design with 2016-era engineering**. From building 50+ components on top of it, three structural gaps stand out:

1. **Hand-written framework ports.** The React kit, Angular kit and Web Components kit are each **re-implemented by hand** from human-readable docs. There is no single machine-readable source of truth, so the ports inevitably lag and drift.
2. **No LLM-facing layer.** AI editors (Cursor, Copilot, Claude) don't know Bootstrap Italia. Ask for "an AgID-compliant service card" and you get generic Bootstrap or Tailwind — non-compliant, often inaccessible. There is no `llms.txt`, no MCP server, no rules pack.
3. **Accessibility is convention, not a constraint.** The correct ARIA/keyboard/focus wiring lives in examples, not in the components. It is easy to ship markup that is *valid but not conformant*.

## The thesis

Design systems for the public sector must become **machine-readable, universal, and self-verifying**.

- **One source → every artifact.** A single spec (design tokens in W3C DTCG format + component manifests) generates *everything*: web components, typed framework adapters, docs, `llms.txt`, an MCP dataset, validation contracts, and a browsable gallery.
- **Universal at the point of consumption.** Ship **Web Components** (work in React, Vue, Angular, Svelte, plain HTML — no per-framework port), powered by **Zag.js** state machines so the hard behavior (focus-trap, keyboard, ARIA) is *correct by construction*. The framework-agnostic binding is written **once** (a ~180-line vanilla runtime), then every Zag machine becomes a universal `<it-…>` element.
- **Closed-loop generation.** Reliability comes from the loop, not the prompt: generate → lint (a11y) → type-check → visual/DOM check → repair. The framework ships the validators.
- **AI distribution is a build output.** `llms.txt`, the MCP server, and editor rules packs are versioned artifacts, not community afterthoughts.

## What is already proven (this repo)

A working vertical slice, tested end-to-end:

- **`sota/spec/` → `sota/codegen.mjs` → 7 artifacts.** From one spec: web components, `it-tokens.css` (from DTCG tokens), typed React wrappers, `llms.txt`, `contracts.json`, a GitHub-Pages-ready gallery, and demo pages.
- **Zag-in-Web-Component runtime** (`sota/runtime/zag-runtime.mjs`): a vanilla port of `@zag-js`'s `useMachine`. Runs any Zag machine with no framework. Verified with Playwright:
  - `<it-dialog>` (@zag-js/dialog): `role=dialog`, `aria-modal`, `aria-labelledby`, **focus-trap**, **ESC to close**.
  - `<it-tabs>` (@zag-js/tabs): roving-tabindex, `aria-selected`, arrow-key navigation.
  - `<it-tooltip>` (@zag-js/tooltip): opens on focus, popper positioning, `role=tooltip`.
  - Three different interaction patterns, one runtime → the pattern **scales**.
- **MCP server, 9 tools.** Serves *both* layers: v1 raw Bootstrap Italia markup (53 components) **and** v2 AI-first universal web components (with a11y contracts), plus `validate_snippet` to close the generate→verify loop.

## Architecture

```
spec/  (single source of truth: DTCG tokens + component manifests)
   │
   ▼  codegen
   ├─ web-components/        universal, a11y encapsulated (Zag inside)
   ├─ react/ angular/ vue/   thin typed adapters (generated, never hand-written)
   ├─ css/                   from tokens (Bootstrap Italia compat)
   ├─ gallery (GitHub Pages) + docs
   ├─ llms.txt  +  MCP dataset  +  editor rules
   └─ validators (a11y lint + contracts)         ← the closed loop
```

## Positioning

- **Enabler, not competitor.** It sits on top of Bootstrap Italia + design-react-kit and makes them AI-native. This is also the only path by which AgID could eventually adopt it.
- **Free to transform.** Web Components + an open registry (shadcn-style) + an open license mean anyone can take a component and use it in any stack, at no cost.
- **Naming:** the `it-` prefix is a placeholder. We deliberately avoid `agid-` — it would imply an official endorsement this project does not have.

## Roadmap

- [ ] Grow the spec to the full catalog (~30 presentational, ~18 behavioral — most map 1:1 to a Zag machine).
- [ ] Generate Vue/Angular/Svelte adapters from the spec.
- [ ] Ship `llms.txt`, an editor rules pack (`.cursor/rules`, `AGENTS.md`), and a shadcn-compatible `registry.json`.
- [ ] Wire `render_check` (headless screenshot → VLM) into the MCP for a full visual verification loop.
- [ ] Publish the gallery to GitHub Pages and submit to the Developers Italia catalog.
