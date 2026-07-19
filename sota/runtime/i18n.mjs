/**
 * i18n.mjs — micro-layer di internazionalizzazione per le stringhe INTERNE
 * dei componenti (bottoni, aria-label). Locale da localStorage o <html lang>,
 * fallback all'italiano. Esposto come window.AgidI18n per i selettori di lingua.
 */
const DICT = {
  it: {
    close: "Chiudi",
    next: "Avanti",
    prev: "Indietro",
    chooseFile: "Scegli file",
    menuToggle: "Apri o chiudi il menu di navigazione",
    closeNotification: "Chiudi la notifica",
    closePanel: "Chiudi il pannello",
    searchTable: "Cerca nella tabella",
    loading: "Caricamento in corso",
    spidLogin: "Accedi con SPID",
  },
  en: {
    close: "Close",
    next: "Next",
    prev: "Back",
    chooseFile: "Choose file",
    menuToggle: "Open or close the navigation menu",
    closeNotification: "Close the notification",
    closePanel: "Close the panel",
    searchTable: "Search the table",
    loading: "Loading",
    spidLogin: "Sign in with SPID",
  },
};

function detect() {
  try {
    const stored = localStorage.getItem("agid-locale");
    if (stored && DICT[stored]) return stored;
  } catch {}
  const l = (typeof document !== "undefined" && document.documentElement.lang || "it").slice(0, 2);
  return DICT[l] ? l : "it";
}

let locale = detect();
if (typeof document !== "undefined") document.documentElement.lang = locale;

export function t(key) {
  return (DICT[locale] && DICT[locale][key]) || DICT.it[key] || key;
}

export function setLocale(l) {
  if (!DICT[l]) return;
  locale = l;
  try { localStorage.setItem("agid-locale", l); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = l;
}

if (typeof window !== "undefined") {
  window.AgidI18n = { t, setLocale, get locale() { return locale; }, locales: Object.keys(DICT) };
}
