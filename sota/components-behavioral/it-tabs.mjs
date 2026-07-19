/**
 * <it-tabs> — schede accessibili, universale, guidato da @zag-js/tabs.
 * Roving tabindex + frecce + ARIA (tablist/tab/tabpanel) forniti da Zag.
 *   <it-tabs>
 *     <div data-tab="Descrizione">…</div>
 *     <div data-tab="Come fare">…</div>
 *   </it-tabs>
 */
import * as tabs from "@zag-js/tabs";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";

let uid = 0;

class ItTabs extends HTMLElement {
  connectedCallback() {
    if (this.__init) return;
    this.__init = true;
    const id = "tabs-" + ++uid;
    const items = [...this.querySelectorAll("[data-tab]")].map((el, i) => ({
      value: "t" + i,
      label: el.getAttribute("data-tab") || "Scheda " + (i + 1),
      body: el.innerHTML,
    }));
    this.innerHTML = "";

    const root = document.createElement("div");
    root.className = "agid-tabs";
    const list = document.createElement("div");
    list.className = "agid-tablist";
    root.appendChild(list);
    const triggers = {}, contents = {};
    for (const it of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "agid-tab";
      b.textContent = it.label;
      list.appendChild(b);
      triggers[it.value] = b;
      const c = document.createElement("div");
      c.className = "agid-tabpanel";
      c.innerHTML = it.body;
      root.appendChild(c);
      contents[it.value] = c;
    }
    this.appendChild(root);

    let service;
    const render = () => {
      const api = tabs.connect(service, normalizeProps);
      spreadProps(root, api.getRootProps());
      spreadProps(list, api.getListProps());
      for (const it of items) {
        spreadProps(triggers[it.value], api.getTriggerProps({ value: it.value }));
        spreadProps(contents[it.value], api.getContentProps({ value: it.value }));
        contents[it.value].hidden = api.value !== it.value;
      }
    };
    const created = createService(tabs.machine, { id, defaultValue: items[0]?.value }, render);
    service = created.service;
    this.__stop = created.stop;
    created.start();
  }
  disconnectedCallback() { this.__stop?.(); }
}
customElements.define("it-tabs", ItTabs);
