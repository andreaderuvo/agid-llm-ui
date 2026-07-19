/**
 * batch5.mjs — nicchia:
 * it-toast (Zag store di gruppo), it-megamenu (Zag popover), it-navscroll (scroll-spy, IntersectionObserver).
 */
import * as toast from "@zag-js/toast";
import * as popover from "@zag-js/popover";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";

let uid = 0;
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

/* ---------------- it-toast (store di gruppo Zag) ---------------- */
const store = toast.createStore({ placement: "top-end", max: 5 });
let region = null;
function ensureRegion() {
  if (region) return;
  region = el("div", "agid-toast-region");
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", "Notifiche");
  document.body.appendChild(region);
  // lo store notifica i subscriber PRIMA di aggiornare l'array: differiamo la lettura a un microtask
  const paint = () => queueMicrotask(doPaint);
  const doPaint = () => {
    region.innerHTML = "";
    store.getVisibleToasts().forEach((t) => {
      const item = el("div", "agid-toast agid-toast-" + (t.type || "info"));
      item.setAttribute("role", t.type === "error" ? "alert" : "status");
      item.setAttribute("aria-atomic", "true");
      if (t.title) { const h = el("div", "agid-toast-title"); h.textContent = t.title; item.appendChild(h); }
      if (t.description) { const d = el("div"); d.textContent = t.description; item.appendChild(d); }
      const close = el("button", "agid-toast-close"); close.type = "button"; close.textContent = "×";
      close.setAttribute("aria-label", "Chiudi la notifica");
      close.addEventListener("click", () => store.dismiss(t.id));
      item.appendChild(close); region.appendChild(item);
    });
  };
  // la group machine di Zag gestisce visibilità, coda e timer di auto-dismiss
  const created = createService(toast.group.machine, { id: "toaster", store }, paint);
  created.start();
  store.subscribe(paint);
  paint();
}
class ItToast extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    ensureRegion();
    const label = this.getAttribute("trigger") || "Mostra notifica";
    const type = this.getAttribute("type") || "success";
    const title = this.getAttribute("title") || "Notifica";
    const msg = this.textContent.trim() || "Operazione completata.";
    this.innerHTML = "";
    const btn = el("button", "agid-btn"); btn.type = "button"; btn.textContent = label;
    btn.addEventListener("click", () => store.create({ title, description: msg, type }));
    this.appendChild(btn);
  }
}

/* ---------------- it-megamenu (Zag popover, colonne di link) ---------------- */
class ItMegamenu extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const triggerLabel = this.getAttribute("trigger") || "Argomenti";
    const cols = [...this.querySelectorAll("[data-col]")].map((c) => ({
      title: c.getAttribute("data-col") || "",
      links: [...c.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })),
    }));
    this.innerHTML = "";
    const trigger = el("button", "agid-btn"); trigger.type = "button"; trigger.textContent = triggerLabel;
    this.appendChild(trigger);
    const positioner = el("div", "agid-select-positioner");
    const content = el("div", "agid-megamenu");
    cols.forEach((col) => {
      const c = el("div", "agid-megamenu-col");
      const h = el("div", "agid-megamenu-title"); h.textContent = col.title; c.appendChild(h);
      const ul = el("ul", "agid-linklist");
      col.links.forEach((l) => { const li = el("li"); const a = el("a", "agid-linklist-item"); a.href = l.href || "#"; a.textContent = l.text; li.appendChild(a); ul.appendChild(li); });
      c.appendChild(ul); content.appendChild(c);
    });
    positioner.appendChild(content); document.body.appendChild(positioner); this.__nodes = [positioner];
    let service;
    const render = () => {
      const a = popover.connect(service, normalizeProps);
      spreadProps(trigger, a.getTriggerProps()); spreadProps(positioner, a.getPositionerProps()); spreadProps(content, a.getContentProps());
      positioner.hidden = !a.open;
    };
    const created = createService(popover.machine, { id: "mm-" + ++uid }, render);
    service = created.service; this.__stop = created.stop; created.start();
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}

/* ---------------- it-navscroll (scroll-spy: nessuna macchina Zag, IntersectionObserver) ---------------- */
class ItNavscroll extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const title = this.getAttribute("title") || "In questa pagina";
    const links = [...this.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() }));
    this.innerHTML = "";
    const nav = el("nav", "agid-navscroll"); nav.setAttribute("aria-label", title);
    const h = el("div", "agid-sidebar-title"); h.textContent = title;
    const ul = el("ul", "agid-linklist");
    const map = {};
    links.forEach((l, i) => {
      const li = el("li"); const a = el("a", "agid-linklist-item"); a.href = l.href || "#"; a.textContent = l.text;
      if (i === 0) { a.classList.add("is-active"); a.setAttribute("aria-current", "true"); }
      li.appendChild(a); ul.appendChild(li);
      if (l.href && l.href.startsWith("#")) map[l.href.slice(1)] = a;
    });
    nav.append(h, ul); this.appendChild(nav);
    const targets = Object.keys(map).map((id) => document.getElementById(id)).filter(Boolean);
    if (targets.length && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            ul.querySelectorAll(".is-active").forEach((x) => { x.classList.remove("is-active"); x.removeAttribute("aria-current"); });
            const a = map[e.target.id]; if (a) { a.classList.add("is-active"); a.setAttribute("aria-current", "true"); }
          }
        });
      }, { rootMargin: "0px 0px -70% 0px" });
      targets.forEach((t) => obs.observe(t));
      this.__obs = obs;
    }
  }
  disconnectedCallback() { this.__obs?.disconnect(); }
}

customElements.define("it-toast", ItToast);
customElements.define("it-megamenu", ItMegamenu);
customElements.define("it-navscroll", ItNavscroll);
