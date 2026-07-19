/**
 * <it-tooltip> — suggerimento accessibile, universale, guidato da @zag-js/tooltip.
 * Mostrato su hover E su focus da tastiera; role=tooltip e collegamenti ARIA da Zag.
 *   <it-tooltip content="Info aggiuntiva">Passa qui sopra</it-tooltip>
 */
import * as tooltip from "@zag-js/tooltip";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";

let uid = 0;

class ItTooltip extends HTMLElement {
  connectedCallback() {
    if (this.__init) return;
    this.__init = true;
    const id = "tip-" + ++uid;
    const content = this.getAttribute("content") || "";
    const label = this.textContent.trim() || "?";
    this.innerHTML = "";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "agid-btn agid-btn-outline";
    trigger.textContent = label;
    this.appendChild(trigger);

    const positioner = document.createElement("div");
    positioner.className = "agid-tip-positioner";
    const contentEl = document.createElement("div");
    contentEl.className = "agid-tip";
    contentEl.textContent = content;
    positioner.appendChild(contentEl);
    document.body.appendChild(positioner);
    this.__nodes = [positioner];

    let service;
    const render = () => {
      const api = tooltip.connect(service, normalizeProps);
      spreadProps(trigger, api.getTriggerProps());
      spreadProps(positioner, api.getPositionerProps());
      spreadProps(contentEl, api.getContentProps());
      positioner.hidden = !api.open;
    };
    const created = createService(tooltip.machine, { id }, render);
    service = created.service;
    this.__stop = created.stop;
    created.start();
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}
customElements.define("it-tooltip", ItTooltip);
