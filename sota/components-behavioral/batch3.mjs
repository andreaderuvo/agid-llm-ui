/**
 * batch3.mjs — componenti presentazionali con parsing dei figli (DOM puro, no Zag):
 * it-breadcrumb, it-pagination, it-linklist, it-timeline, it-navbar, it-sidebar.
 */
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
const readLinks = (host) => [...host.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() }));

class ItBreadcrumb extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const links = readLinks(this); this.innerHTML = "";
    const nav = el("nav", "agid-breadcrumb"); nav.setAttribute("aria-label", "Percorso di navigazione");
    const ol = el("ol", "agid-breadcrumb-list");
    links.forEach((l, i) => {
      const li = el("li", "agid-breadcrumb-item"); const last = i === links.length - 1;
      if (last || !l.href) { const s = el("span"); s.textContent = l.text; s.setAttribute("aria-current", "page"); li.appendChild(s); }
      else {
        const a = el("a"); a.href = l.href; a.textContent = l.text; li.appendChild(a);
        const sep = el("span", "agid-sep"); sep.textContent = "/"; sep.setAttribute("aria-hidden", "true"); li.appendChild(sep);
      }
      ol.appendChild(li);
    });
    nav.appendChild(ol); this.appendChild(nav);
  }
}

class ItPagination extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const total = Math.max(1, parseInt(this.getAttribute("total") || "1", 10));
    const current = Math.min(total, Math.max(1, parseInt(this.getAttribute("current") || "1", 10)));
    this.innerHTML = "";
    const nav = el("nav", "agid-pagination"); nav.setAttribute("aria-label", "Navigazione tra le pagine");
    const ul = el("ul", "agid-pagination-list");
    for (let i = 1; i <= total; i++) {
      const li = el("li", "agid-page-item"); const a = el("a", "agid-page-link"); a.href = "#"; a.textContent = String(i);
      if (i === current) { a.setAttribute("aria-current", "page"); a.classList.add("is-current"); }
      li.appendChild(a); ul.appendChild(li);
    }
    nav.appendChild(ul); this.appendChild(nav);
  }
}

class ItLinklist extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const links = readLinks(this); this.innerHTML = "";
    const ul = el("ul", "agid-linklist");
    links.forEach((l, i) => {
      const li = el("li"); const a = el("a", "agid-linklist-item"); a.href = l.href || "#"; a.textContent = l.text;
      if (i === 0) { a.classList.add("is-active"); a.setAttribute("aria-current", "true"); }
      li.appendChild(a); ul.appendChild(li);
    });
    this.appendChild(ul);
  }
}

class ItTimeline extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const items = [...this.querySelectorAll("[data-title]")].map((n) => ({ date: n.getAttribute("data-date") || "", title: n.getAttribute("data-title") || "", body: n.innerHTML }));
    this.innerHTML = "";
    const wrap = el("div", "agid-timeline");
    items.forEach((it) => {
      const row = el("div", "agid-timeline-item");
      const dot = el("span", "agid-timeline-dot"); dot.setAttribute("aria-hidden", "true");
      const card = el("div", "agid-timeline-card");
      const d = el("div", "agid-timeline-date"); d.textContent = it.date;
      const h = el("h3", "agid-timeline-title"); h.textContent = it.title;
      const p = el("div"); p.innerHTML = it.body;
      card.append(d, h, p); row.append(dot, card); wrap.appendChild(row);
    });
    this.appendChild(wrap);
  }
}

let __navUid = 0;
class ItNavbar extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const links = readLinks(this); this.innerHTML = "";
    const nav = el("nav", "agid-navbar"); nav.setAttribute("aria-label", "Navigazione principale");
    const inner = el("div", "agid-navbar-inner");
    const listId = "navlist-" + ++__navUid;
    const toggle = el("button", "agid-navbar-toggle"); toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-controls", listId);
    toggle.setAttribute("aria-label", "Apri o chiudi il menu di navigazione"); toggle.textContent = "☰";
    const ul = el("ul", "agid-navbar-list"); ul.id = listId;
    links.forEach((l, i) => {
      const li = el("li"); const a = el("a", "agid-navbar-link"); a.href = l.href || "#"; a.textContent = l.text;
      if (i === 0) { a.classList.add("is-active"); a.setAttribute("aria-current", "page"); }
      li.appendChild(a); ul.appendChild(li);
    });
    inner.append(toggle, ul); nav.appendChild(inner); this.appendChild(nav);
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      ul.classList.toggle("is-open", !open);
    });
  }
}

class ItSidebar extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const title = this.getAttribute("title") || "In questa sezione";
    const links = readLinks(this); this.innerHTML = "";
    const aside = el("aside", "agid-sidebar");
    const nav = el("nav"); nav.setAttribute("aria-label", title);
    const h = el("div", "agid-sidebar-title"); h.textContent = title;
    const ul = el("ul", "agid-linklist");
    links.forEach((l, i) => {
      const li = el("li"); const a = el("a", "agid-linklist-item"); a.href = l.href || "#"; a.textContent = l.text;
      if (i === 0) { a.classList.add("is-active"); a.setAttribute("aria-current", "true"); }
      li.appendChild(a); ul.appendChild(li);
    });
    nav.append(h, ul); aside.appendChild(nav); this.appendChild(aside);
  }
}

customElements.define("it-breadcrumb", ItBreadcrumb);
customElements.define("it-pagination", ItPagination);
customElements.define("it-linklist", ItLinklist);
customElements.define("it-timeline", ItTimeline);
customElements.define("it-navbar", ItNavbar);
customElements.define("it-sidebar", ItSidebar);
