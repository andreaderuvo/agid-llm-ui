/**
 * batch4.mjs — componenti interattivi "pesanti" (Zag) via runtime vanilla:
 * it-select, it-combobox, it-slider, it-pin, it-tags, it-upload, it-carousel, it-datepicker.
 */
import * as select from "@zag-js/select";
import * as combobox from "@zag-js/combobox";
import * as slider from "@zag-js/slider";
import * as pin from "@zag-js/pin-input";
import * as tags from "@zag-js/tags-input";
import * as fileUpload from "@zag-js/file-upload";
import * as carousel from "@zag-js/carousel";
import * as datePicker from "@zag-js/date-picker";
import { createService, normalizeProps, spreadProps } from "../runtime/zag-runtime.mjs";
import { t as i18n } from "../runtime/i18n.mjs";

let uid = 0;
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
const boot = (host, machine, props, render) => {
  let service;
  const created = createService(machine, props, () => render(service));
  service = created.service; host.__stop = created.stop; created.start();
};
const readItems = (host, attr) => [...host.querySelectorAll("[" + attr + "]")].map((n, i) => ({ value: n.getAttribute(attr) || String(i), label: (n.getAttribute(attr) || n.textContent || "").trim(), body: n.innerHTML }));

/* ---------------- it-select ---------------- */
class ItSelect extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Seleziona";
    const items = [...this.querySelectorAll("[data-value]")].map((n) => ({ value: n.getAttribute("data-value"), label: n.textContent.trim() }));
    this.innerHTML = "";
    const collection = select.collection({ items });
    const root = el("div", "agid-select"); const label = el("label", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-select-control");
    const trigger = el("button", "agid-select-trigger"); trigger.type = "button";
    const valueText = el("span"); trigger.appendChild(valueText);
    control.appendChild(trigger);
    const positioner = el("div", "agid-select-positioner");
    const content = el("div", "agid-select-content"); positioner.appendChild(content);
    const itemEls = {};
    for (const it of items) { const o = el("div", "agid-select-item"); o.textContent = it.label; content.appendChild(o); itemEls[it.value] = o; }
    root.append(label, control); this.appendChild(root); document.body.appendChild(positioner); this.__nodes = [positioner];
    boot(this, select.machine, { id: "sel-" + ++uid, collection }, (s) => {
      const a = select.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(control, a.getControlProps()); spreadProps(trigger, a.getTriggerProps());
      spreadProps(positioner, a.getPositionerProps()); spreadProps(content, a.getContentProps());
      valueText.textContent = a.valueAsString || "Scegli un'opzione";
      for (const it of items) spreadProps(itemEls[it.value], a.getItemProps({ item: it }));
      positioner.hidden = !a.open;
    });
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}

/* ---------------- it-combobox (senza filtro live) ---------------- */
class ItCombobox extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Cerca";
    const items = [...this.querySelectorAll("[data-value]")].map((n) => ({ value: n.getAttribute("data-value"), label: n.textContent.trim() }));
    this.innerHTML = "";
    const collection = combobox.collection({ items });
    const root = el("div", "agid-combobox"); const label = el("label", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-combobox-control"); const input = el("input", "agid-input"); control.appendChild(input);
    const positioner = el("div", "agid-select-positioner"); const content = el("div", "agid-select-content"); positioner.appendChild(content);
    const itemEls = {};
    for (const it of items) { const o = el("div", "agid-select-item"); o.textContent = it.label; content.appendChild(o); itemEls[it.value] = o; }
    root.append(label, control); this.appendChild(root); document.body.appendChild(positioner); this.__nodes = [positioner];
    boot(this, combobox.machine, { id: "cmb-" + ++uid, collection }, (s) => {
      const a = combobox.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(control, a.getControlProps()); spreadProps(input, a.getInputProps());
      spreadProps(positioner, a.getPositionerProps()); spreadProps(content, a.getContentProps());
      for (const it of items) spreadProps(itemEls[it.value], a.getItemProps({ item: it }));
      positioner.hidden = !a.open;
    });
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}

/* ---------------- it-slider ---------------- */
class ItSlider extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Valore"; this.innerHTML = "";
    const root = el("div", "agid-slider"); const label = el("label", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-slider-control"); const track = el("div", "agid-slider-track");
    const range = el("div", "agid-slider-range"); track.appendChild(range);
    const thumb = el("div", "agid-slider-thumb"); const input = el("input");
    thumb.appendChild(input); control.append(track, thumb); root.append(label, control); this.appendChild(root);
    boot(this, slider.machine, { id: "sld-" + ++uid, value: [50] }, (s) => {
      const a = slider.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(control, a.getControlProps()); spreadProps(track, a.getTrackProps());
      spreadProps(range, a.getRangeProps()); spreadProps(thumb, a.getThumbProps({ index: 0 }));
      spreadProps(input, a.getHiddenInputProps({ index: 0 }));
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-pin ---------------- */
class ItPin extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Codice";
    const length = parseInt(this.getAttribute("length") || "4", 10); this.innerHTML = "";
    const root = el("div", "agid-pin"); const label = el("label", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-pin-control"); const inputs = [];
    for (let i = 0; i < length; i++) { const inp = el("input", "agid-pin-input"); control.appendChild(inp); inputs.push(inp); }
    root.append(label, control); this.appendChild(root);
    boot(this, pin.machine, { id: "pin-" + ++uid }, (s) => {
      const a = pin.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      inputs.forEach((inp, i) => spreadProps(inp, a.getInputProps({ index: i })));
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-tags ---------------- */
class ItTags extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Voci"; this.innerHTML = "";
    const root = el("div", "agid-tags"); const label = el("label", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-tags-control"); const input = el("input", "agid-input");
    control.appendChild(input);
    root.append(label, control); this.appendChild(root);
    boot(this, tags.machine, { id: "tag-" + ++uid, value: ["Roma"] }, (s) => {
      const a = tags.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(control, a.getControlProps());
      // ricostruisci i tag dinamici
      [...control.querySelectorAll(".agid-tag")].forEach((n) => n.remove());
      a.value.forEach((val, index) => {
        const chip = el("span", "agid-tag"); chip.textContent = val;
        const del = el("button", "agid-tag-del"); del.type = "button"; del.textContent = "×";
        spreadProps(chip, a.getItemProps({ index, value: val }));
        spreadProps(del, a.getItemDeleteTriggerProps({ index, value: val }));
        chip.appendChild(del); control.insertBefore(chip, input);
      });
      spreadProps(input, a.getInputProps());
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-upload ---------------- */
class ItUpload extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Allegati"; this.innerHTML = "";
    const root = el("div", "agid-upload"); const label = el("label", "agid-label"); label.textContent = labelText;
    const dropzone = el("div", "agid-upload-drop");
    const trigger = el("button", "agid-btn agid-btn-outline"); trigger.type = "button"; trigger.textContent = i18n("chooseFile");
    const input = el("input"); const list = el("ul", "agid-upload-list");
    dropzone.append(trigger); root.append(label, dropzone, input, list); this.appendChild(root);
    boot(this, fileUpload.machine, { id: "up-" + ++uid }, (s) => {
      const a = fileUpload.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(dropzone, a.getDropzoneProps()); spreadProps(trigger, a.getTriggerProps());
      spreadProps(input, a.getHiddenInputProps());
      list.innerHTML = "";
      (a.acceptedFiles || []).forEach((file) => { const li = el("li"); li.textContent = file.name; list.appendChild(li); });
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-carousel ---------------- */
class ItCarousel extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const slides = [...this.querySelectorAll("[data-slide]")].map((n) => n.innerHTML);
    this.innerHTML = "";
    const root = el("div", "agid-carousel");
    const group = el("div", "agid-carousel-track");
    const slideEls = [];
    slides.forEach((html) => { const sl = el("div", "agid-carousel-slide"); sl.innerHTML = html; group.appendChild(sl); slideEls.push(sl); });
    const controls = el("div", "agid-carousel-controls");
    const prev = el("button", "agid-btn agid-btn-outline"); prev.type = "button"; prev.textContent = "‹";
    const next = el("button", "agid-btn agid-btn-outline"); next.type = "button"; next.textContent = "›";
    controls.append(prev, next); root.append(group, controls); this.appendChild(root);
    boot(this, carousel.machine, { id: "car-" + ++uid, slideCount: slides.length }, (s) => {
      const a = carousel.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(group, a.getItemGroupProps());
      slideEls.forEach((el2, i) => spreadProps(el2, a.getItemProps({ index: i })));
      spreadProps(prev, a.getPrevTriggerProps()); spreadProps(next, a.getNextTriggerProps());
    });
  }
  disconnectedCallback() { this.__stop?.(); }
}

/* ---------------- it-datepicker ---------------- */
class ItDatepicker extends HTMLElement {
  connectedCallback() {
    if (this.__i) return; this.__i = true;
    const labelText = this.getAttribute("label") || "Data"; this.innerHTML = "";
    const root = el("div", "agid-datepicker"); const label = el("label", "agid-label"); label.textContent = labelText;
    const control = el("div", "agid-datepicker-control"); const input = el("input", "agid-input");
    const trigger = el("button", "agid-btn agid-btn-outline"); trigger.type = "button"; trigger.textContent = "📅";
    control.append(input, trigger);
    const positioner = el("div", "agid-select-positioner"); const content = el("div", "agid-datepicker-content");
    const head = el("div", "agid-dp-head");
    const prev = el("button", "agid-dp-nav"); prev.type = "button"; prev.textContent = "‹";
    const viewLabel = el("button", "agid-dp-view"); viewLabel.type = "button";
    const next = el("button", "agid-dp-nav"); next.type = "button"; next.textContent = "›";
    head.append(prev, viewLabel, next);
    const table = el("table", "agid-dp-table");
    content.append(head, table); positioner.appendChild(content);
    root.append(label, control); this.appendChild(root); document.body.appendChild(positioner); this.__nodes = [positioner];
    boot(this, datePicker.machine, { id: "dp-" + ++uid }, (s) => {
      const a = datePicker.connect(s, normalizeProps);
      spreadProps(root, a.getRootProps()); spreadProps(label, a.getLabelProps());
      spreadProps(control, a.getControlProps()); spreadProps(input, a.getInputProps());
      spreadProps(trigger, a.getTriggerProps()); spreadProps(positioner, a.getPositionerProps());
      spreadProps(content, a.getContentProps());
      spreadProps(prev, a.getPrevTriggerProps()); spreadProps(next, a.getNextTriggerProps());
      spreadProps(viewLabel, a.getViewTriggerProps()); viewLabel.textContent = a.visibleRangeText?.start || "Mese";
      // ricostruisci la griglia dei giorni
      spreadProps(table, a.getTableProps({ view: "day" }));
      table.innerHTML = "";
      const thead = el("thead"); const trh = el("tr");
      (a.weekDays || []).forEach((wd) => { const th = el("th"); th.textContent = wd.narrow || wd.short; trh.appendChild(th); });
      thead.appendChild(trh); table.appendChild(thead);
      const tbody = el("tbody");
      (a.weeks || []).forEach((week) => {
        const tr = el("tr");
        week.forEach((day) => {
          const td = el("td"); spreadProps(td, a.getDayTableCellProps({ value: day }));
          const cell = el("div", "agid-dp-day"); cell.textContent = String(day.day);
          spreadProps(cell, a.getDayTableCellTriggerProps({ value: day }));
          td.appendChild(cell); tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      positioner.hidden = !a.open;
    });
  }
  disconnectedCallback() { this.__stop?.(); this.__nodes?.forEach((n) => n.remove()); }
}

customElements.define("it-select", ItSelect);
customElements.define("it-combobox", ItCombobox);
customElements.define("it-slider", ItSlider);
customElements.define("it-pin", ItPin);
customElements.define("it-tags", ItTags);
customElements.define("it-upload", ItUpload);
customElements.define("it-carousel", ItCarousel);
customElements.define("it-datepicker", ItDatepicker);
