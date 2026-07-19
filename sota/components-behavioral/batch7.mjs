/**
 * batch7.mjs — it-drawer: pannello off-canvas (menu laterale, filtri, ecc.).
 * Guidato dalla macchina @zag-js/dialog (focus-trap, ESC, backdrop, blocco scroll),
 * ancorato a un lato via `side="left|right"`.
 *   <it-drawer trigger="Menu" side="left" title="Menu">…contenuto…</it-drawer>
 */
import * as dialog from "@zag-js/dialog";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";

let uid = 0;
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

class ItDrawer extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const id = "drw-" + ++uid;
    const side = this.getAttribute("side") === "right" ? "right" : "left";
    const title = this.getAttribute("title") || "Pannello";
    const triggerLabel = this.getAttribute("trigger") || "Apri";
    const body = this.innerHTML.trim();
    this.innerHTML = "";

    const trigger = el("button", "agid-btn agid-btn-outline"); trigger.type = "button"; trigger.textContent = triggerLabel;
    this.appendChild(trigger);

    const holder = document.createElement("div");
    holder.innerHTML = `
      <div data-el="backdrop" class="zag-backdrop"></div>
      <div data-el="positioner" class="agid-drawer-positioner agid-drawer-${side}">
        <div data-el="content" class="agid-drawer">
          <div class="agid-drawer-head">
            <h2 data-el="title" class="agid-drawer-title"></h2>
            <button data-el="close" type="button" class="agid-drawer-close" aria-label="Chiudi il pannello">×</button>
          </div>
          <div data-el="body" class="agid-drawer-body"></div>
        </div>
      </div>`;
    const q = (n) => holder.querySelector(`[data-el="${n}"]`);
    const parts = { backdrop: q("backdrop"), positioner: q("positioner"), content: q("content"), title: q("title"), close: q("close"), body: q("body") };
    parts.title.textContent = title;
    parts.body.innerHTML = body;
    document.body.append(parts.backdrop, parts.positioner);
    this.__nodes = [parts.backdrop, parts.positioner];

    let service;
    const render = () => {
      const a = dialog.connect(service, normalizeProps);
      spreadProps(trigger, a.getTriggerProps());
      spreadProps(parts.backdrop, a.getBackdropProps());
      spreadProps(parts.positioner, a.getPositionerProps());
      spreadProps(parts.content, a.getContentProps());
      spreadProps(parts.title, a.getTitleProps());
      spreadProps(parts.close, a.getCloseTriggerProps());
      parts.backdrop.hidden = !a.open;
      parts.positioner.hidden = !a.open;
    };
    const created = createService(dialog.machine, { id }, render);
    service = created.service;
    this.__stop = created.stop;
    created.start();
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}
customElements.define("it-drawer", ItDrawer);
