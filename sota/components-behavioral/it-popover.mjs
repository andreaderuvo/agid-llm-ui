/**
 * <it-popover> — popover accessibile, universale, guidato da @zag-js/popover.
 * Posizionamento (popper), gestione focus, ESC e ARIA forniti da Zag.
 *   <it-popover trigger="Info" title="Dettagli">Contenuto…</it-popover>
 */
import * as popover from "@zag-js/popover";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";

let uid = 0;

class ItPopover extends HTMLElement {
  connectedCallback() {
    if (this.__init) return;
    this.__init = true;
    const id = "pop-" + ++uid;
    const title = this.getAttribute("title") || "";
    const triggerLabel = this.getAttribute("trigger") || "Apri";
    const body = this.innerHTML.trim();
    this.innerHTML = "";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "agid-btn agid-btn-outline";
    trigger.textContent = triggerLabel;
    this.appendChild(trigger);

    const positioner = document.createElement("div");
    positioner.className = "agid-pop-positioner";
    positioner.innerHTML = `
      <div data-el="content" class="agid-pop">
        ${title ? `<div data-el="title" class="agid-pop-title"></div>` : ""}
        <div data-el="desc" class="agid-pop-body"></div>
      </div>`;
    const content = positioner.querySelector('[data-el="content"]');
    const titleEl = positioner.querySelector('[data-el="title"]');
    const descEl = positioner.querySelector('[data-el="desc"]');
    if (titleEl) titleEl.textContent = title;
    descEl.innerHTML = body;
    document.body.appendChild(positioner);
    this.__nodes = [positioner];

    let service;
    const render = () => {
      const api = popover.connect(service, normalizeProps);
      spreadProps(trigger, api.getTriggerProps());
      spreadProps(positioner, api.getPositionerProps());
      spreadProps(content, api.getContentProps());
      if (titleEl) spreadProps(titleEl, api.getTitleProps());
      spreadProps(descEl, api.getDescriptionProps());
      positioner.hidden = !api.open;
    };
    const created = createService(popover.machine, { id }, render);
    service = created.service;
    this.__stop = created.stop;
    created.start();
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}
customElements.define("it-popover", ItPopover);
