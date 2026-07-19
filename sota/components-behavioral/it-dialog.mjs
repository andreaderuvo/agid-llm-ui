/**
 * <it-dialog> — modale accessibile, universale (Web Component), guidato dalla
 * macchina a stati @zag-js/dialog tramite il runtime vanilla (zag-runtime).
 * Focus-trap, ESC, click-fuori, blocco scroll e ARIA sono forniti da Zag.
 *
 * Uso (funziona in React, Vue, Angular, HTML puro — è un Web Component):
 *   <it-dialog trigger="Apri" title="Conferma">Contenuto…</it-dialog>
 */
import * as dialog from "@zag-js/dialog";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";

let uid = 0;

class ItDialog extends HTMLElement {
  connectedCallback() {
    if (this.__init) return;
    this.__init = true;

    const id = "dlg-" + ++uid;
    const title = this.getAttribute("title") || "Finestra di dialogo";
    const triggerLabel = this.getAttribute("trigger") || "Apri";
    const body = this.innerHTML.trim();
    this.innerHTML = "";

    // Trigger (resta dentro l'elemento)
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "agid-btn";
    trigger.textContent = triggerLabel;
    this.appendChild(trigger);

    // Struttura del dialog, montata a livello <body>
    const holder = document.createElement("div");
    holder.innerHTML = `
      <div data-el="backdrop" class="zag-backdrop"></div>
      <div data-el="positioner" class="zag-positioner">
        <div data-el="content" class="zag-content">
          <h2 data-el="title" class="zag-title"></h2>
          <div data-el="desc" class="zag-desc"></div>
          <div class="zag-actions">
            <button data-el="close" type="button" class="agid-btn agid-btn-outline">Chiudi</button>
          </div>
        </div>
      </div>`;
    const q = (n) => holder.querySelector(`[data-el="${n}"]`);
    const parts = { backdrop: q("backdrop"), positioner: q("positioner"), content: q("content"), title: q("title"), desc: q("desc"), close: q("close") };
    parts.title.textContent = title;
    parts.desc.innerHTML = body;
    document.body.append(parts.backdrop, parts.positioner);
    this.__nodes = [parts.backdrop, parts.positioner];

    // Runtime Zag -> render sincrono a ogni cambiamento di stato
    let service;
    const render = () => {
      const api = dialog.connect(service, normalizeProps);
      spreadProps(trigger, api.getTriggerProps());
      spreadProps(parts.backdrop, api.getBackdropProps());
      spreadProps(parts.positioner, api.getPositionerProps());
      spreadProps(parts.content, api.getContentProps());
      spreadProps(parts.title, api.getTitleProps());
      spreadProps(parts.desc, api.getDescriptionProps());
      spreadProps(parts.close, api.getCloseTriggerProps());
      parts.backdrop.hidden = !api.open;
      parts.positioner.hidden = !api.open;
    };

    const created = createService(dialog.machine, { id }, render);
    service = created.service;
    this.__stop = created.stop;
    created.start();
  }

  disconnectedCallback() {
    this.__stop?.();
    this.__nodes?.forEach((n) => n.remove());
  }
}

customElements.define("it-dialog", ItDialog);
