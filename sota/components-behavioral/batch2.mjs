/**
 * batch2.mjs — altri componenti comportamentali (Zag) via runtime vanilla:
 * it-switch, it-collapsible, it-number, it-menu, it-steps, it-rating.
 */
import * as zswitch from "@zag-js/switch";
import * as collapsible from "@zag-js/collapsible";
import * as numberInput from "@zag-js/number-input";
import * as menu from "@zag-js/menu";
import * as steps from "@zag-js/steps";
import * as rating from "@zag-js/rating-group";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";

let uid = 0;
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
const boot = (host, machine, mkProps, render) => {
  let service;
  const wrapped = () => render(service);
  const created = createService(machine, mkProps(), wrapped);
  service = created.service;
  host.__stop = created.stop;
  created.start();
};

/* ---------------- it-switch ---------------- */
class ItSwitch extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.innerHTML.trim(); this.innerHTML = "";
    const root = el("label", "agid-switch");
    const control = el("span", "agid-switch-control");
    const thumb = el("span", "agid-switch-thumb"); control.appendChild(thumb);
    const label = el("span", "agid-switch-label"); label.innerHTML = labelText;
    const input = el("input");
    root.append(control, label, input); this.appendChild(root);
    boot(this, zswitch.machine, () => ({ id: "sw-" + ++uid }), (s) => {
      const a = zswitch.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(control, a.getControlProps());
      spreadProps(thumb, a.getThumbProps()); spreadProps(label, a.getLabelProps());
      spreadProps(input, a.getHiddenInputProps());
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-collapsible ---------------- */
class ItCollapsible extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const triggerLabel = this.getAttribute("trigger") || "Mostra";
    const body = this.innerHTML.trim(); this.innerHTML = "";
    const root = el("div", "agid-collapsible");
    const trigger = el("button", "agid-btn agid-btn-outline"); trigger.type = "button"; trigger.textContent = triggerLabel;
    const content = el("div", "agid-collapsible-content"); content.innerHTML = body;
    root.append(trigger, content); this.appendChild(root);
    boot(this, collapsible.machine, () => ({ id: "col-" + ++uid }), (s) => {
      const a = collapsible.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(trigger, a.getTriggerProps()); spreadProps(content, a.getContentProps());
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-number ---------------- */
class ItNumber extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Valore"; this.innerHTML = "";
    const root = el("div", "agid-number");
    const label = el("label", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-number-control");
    const dec = el("button", "agid-number-btn"); dec.type = "button"; dec.textContent = "−";
    const input = el("input", "agid-input");
    const inc = el("button", "agid-number-btn"); inc.type = "button"; inc.textContent = "+";
    control.append(dec, input, inc); root.append(label, control); this.appendChild(root);
    boot(this, numberInput.machine, () => ({ id: "num-" + ++uid }), (s) => {
      const a = numberInput.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(input, a.getInputProps());
      spreadProps(dec, a.getDecrementTriggerProps()); spreadProps(inc, a.getIncrementTriggerProps());
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-menu ---------------- */
class ItMenu extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const triggerLabel = this.getAttribute("trigger") || "Menu";
    const items = [...this.querySelectorAll("[data-item]")].map((n, i) => ({ value: "i" + i, label: n.getAttribute("data-item") || "Voce" }));
    this.innerHTML = "";
    const trigger = el("button", "agid-btn"); trigger.type = "button"; trigger.textContent = triggerLabel;
    this.appendChild(trigger);
    const positioner = el("div", "agid-menu-positioner");
    const content = el("div", "agid-menu"); positioner.appendChild(content);
    const itemEls = {};
    for (const it of items) { const b = el("div", "agid-menu-item"); b.textContent = it.label; content.appendChild(b); itemEls[it.value] = b; }
    document.body.appendChild(positioner); this.__nodes = [positioner];
    boot(this, menu.machine, () => ({ id: "menu-" + ++uid }), (s) => {
      const a = menu.connect(s, normalizeProps);
      spreadProps(trigger, a.getTriggerProps()); spreadProps(positioner, a.getPositionerProps()); spreadProps(content, a.getContentProps());
      for (const it of items) spreadProps(itemEls[it.value], a.getItemProps({ value: it.value }));
      positioner.hidden = !a.open;
    });
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}

/* ---------------- it-steps ---------------- */
class ItSteps extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const items = [...this.querySelectorAll("[data-step]")].map((n) => ({ label: n.getAttribute("data-step") || "Passo", body: n.innerHTML }));
    this.innerHTML = "";
    const root = el("div", "agid-steps");
    const list = el("div", "agid-steps-list"); root.appendChild(list);
    const triggers = [], contents = [];
    items.forEach((it, i) => {
      const t = el("button", "agid-step"); t.type = "button";
      const num = el("span", "agid-step-num"); num.textContent = String(i + 1);
      const lbl = el("span", "agid-step-label"); lbl.textContent = it.label;
      t.append(num, lbl); list.appendChild(t); triggers.push(t);
    });
    items.forEach((it, i) => { const c = el("div", "agid-step-content"); c.innerHTML = it.body; root.appendChild(c); contents.push(c); });
    const nav = el("div", "agid-steps-nav");
    const prev = el("button", "agid-btn agid-btn-outline"); prev.type = "button"; prev.textContent = "Indietro";
    const next = el("button", "agid-btn"); next.type = "button"; next.textContent = "Avanti";
    nav.append(prev, next); root.appendChild(nav); this.appendChild(root);
    boot(this, steps.machine, () => ({ id: "steps-" + ++uid, count: items.length }), (s) => {
      const a = steps.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(list, a.getListProps());
      triggers.forEach((t, i) => spreadProps(t, a.getTriggerProps({ index: i })));
      contents.forEach((c, i) => spreadProps(c, a.getContentProps({ index: i })));
      spreadProps(prev, a.getPrevTriggerProps()); spreadProps(next, a.getNextTriggerProps());
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-rating ---------------- */
class ItRating extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Valutazione";
    const count = parseInt(this.getAttribute("count") || "5", 10);
    this.innerHTML = "";
    const root = el("div", "agid-rating");
    const label = el("span", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-rating-control");
    const input = el("input");
    const itemEls = [];
    for (let i = 1; i <= count; i++) { const it = el("span", "agid-rating-item"); it.textContent = "★"; control.appendChild(it); itemEls.push(it); }
    root.append(label, control, input); this.appendChild(root);
    boot(this, rating.machine, () => ({ id: "rate-" + ++uid, count }), (s) => {
      const a = rating.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(control, a.getControlProps()); spreadProps(input, a.getHiddenInputProps());
      itemEls.forEach((it, i) => spreadProps(it, a.getItemProps({ index: i + 1 })));
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

customElements.define("it-switch", ItSwitch);
customElements.define("it-collapsible", ItCollapsible);
customElements.define("it-number", ItNumber);
customElements.define("it-menu", ItMenu);
customElements.define("it-steps", ItSteps);
customElements.define("it-rating", ItRating);
