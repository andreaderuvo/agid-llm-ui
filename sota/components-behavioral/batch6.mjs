/**
 * batch6.mjs — it-datatable: tabella dati interattiva (ordinamento + ricerca + paginazione).
 * NON usa Zag: sort/filtro/paginazione sono logica sui dati, non una macchina a stati UI.
 * Accessibile: aria-sort sulle intestazioni, live region per i risultati, paginazione come <nav>.
 *   <it-datatable page-size="5" searchable><table>…</table></it-datatable>
 */
let uid = 0;
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

class ItDatatable extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const table = this.querySelector("table");
    if (!table) return;
    const caption = table.querySelector("caption")?.textContent || "";
    const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const rows = [...table.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map((td) => td.textContent.trim()));
    const pageSize = Math.max(1, parseInt(this.getAttribute("page-size") || "10", 10));
    const searchable = this.hasAttribute("searchable");
    this.innerHTML = "";

    let query = "", sortCol = -1, sortDir = "ascending", page = 1;
    const myId = "dt-" + ++uid;
    const root = el("div", "agid-dt");

    let searchInput;
    if (searchable) {
      const f = el("div", "agid-dt-search");
      const lab = el("label"); lab.textContent = "Cerca nella tabella"; lab.setAttribute("for", myId);
      searchInput = el("input", "agid-input"); searchInput.type = "search"; searchInput.id = myId;
      f.append(lab, searchInput); root.appendChild(f);
    }

    const wrap = el("div", "agid-table-wrap");
    const tbl = el("table");
    if (caption) { const cap = el("caption"); cap.textContent = caption; tbl.appendChild(cap); }
    const thead = el("thead"); const htr = el("tr");
    const ths = headers.map((h, i) => {
      const th = el("th"); th.scope = "col";
      const btn = el("button", "agid-dt-sort"); btn.type = "button";
      btn.append(document.createTextNode(h)); const ind = el("span", "agid-dt-ind"); ind.setAttribute("aria-hidden", "true"); btn.appendChild(ind);
      th.appendChild(btn);
      btn.addEventListener("click", () => { if (sortCol === i) sortDir = sortDir === "ascending" ? "descending" : "ascending"; else { sortCol = i; sortDir = "ascending"; } page = 1; render(); });
      htr.appendChild(th); return th;
    });
    thead.appendChild(htr); tbl.appendChild(thead);
    const tbody = el("tbody"); tbl.appendChild(tbody); wrap.appendChild(tbl); root.appendChild(wrap);

    const status = el("div", "visually-hidden"); status.setAttribute("aria-live", "polite"); root.appendChild(status);
    const pager = el("nav", "agid-dt-pager"); pager.setAttribute("aria-label", "Paginazione della tabella"); root.appendChild(pager);
    this.appendChild(root);
    if (searchable) searchInput.addEventListener("input", () => { query = searchInput.value.toLowerCase(); page = 1; render(); });

    const numify = (s) => { const n = parseFloat(String(s).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")); return isNaN(n) ? null : n; };

    function render() {
      let data = rows.filter((r) => !query || r.some((c) => c.toLowerCase().includes(query)));
      if (sortCol >= 0) {
        data = [...data].sort((a, b) => {
          const x = a[sortCol] ?? "", y = b[sortCol] ?? "";
          const nx = numify(x), ny = numify(y);
          const cmp = nx !== null && ny !== null ? nx - ny : x.localeCompare(y, "it");
          return sortDir === "ascending" ? cmp : -cmp;
        });
      }
      const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
      if (page > totalPages) page = totalPages;
      const pageRows = data.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
      ths.forEach((th, i) => th.setAttribute("aria-sort", i === sortCol ? sortDir : "none"));
      tbody.innerHTML = "";
      pageRows.forEach((r) => { const tr = el("tr"); r.forEach((c) => { const td = el("td"); td.textContent = c; tr.appendChild(td); }); tbody.appendChild(tr); });
      status.textContent = `${data.length} risultati, pagina ${page} di ${totalPages}`;
      pager.innerHTML = "";
      const mk = (label, p, disabled, current) => {
        const b = el("button", "agid-page-link"); b.type = "button"; b.textContent = label;
        if (disabled) b.disabled = true;
        if (current) { b.setAttribute("aria-current", "page"); b.classList.add("is-current"); }
        b.addEventListener("click", () => { page = p; render(); });
        return b;
      };
      pager.append(mk("‹", page - 1, page <= 1, false));
      for (let i = 1; i <= totalPages; i++) pager.append(mk(String(i), i, false, i === page));
      pager.append(mk("›", page + 1, page >= totalPages, false));
    }
    render();
  }
}
customElements.define("it-datatable", ItDatatable);
