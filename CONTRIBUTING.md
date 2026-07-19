# Contribuire

Grazie! Il valore di questo progetto è nei **dati**: più componenti e ricette conformi ci sono, più utile diventa per chi sviluppa siti della PA.

## Aggiungere un componente (il modo più facile)

È **una PR a un file JSON**. Apri `data/components.json` e aggiungi un oggetto all'array `components`:

```json
{
  "id": "accordion",
  "name": "Accordion",
  "category": "contenuti",
  "tags": ["accordion", "collassabile", "fisarmonica"],
  "description": "Cosa fa il componente e quando usarlo.",
  "code": "<!-- markup Bootstrap Italia conforme -->",
  "accessibilityNotes": "Regole di accessibilità specifiche (ARIA, tastiera, focus...).",
  "docsUrl": "https://italia.github.io/bootstrap-italia/docs/componenti/accordion/"
}
```

### Regole per il markup
- Deve usare le **classi ufficiali di Bootstrap Italia** (verifica sui [docs](https://italia.github.io/bootstrap-italia/)).
- Deve essere **accessibile** (WCAG 2.1 AA): label sui form, `aria-*` dove serve, gerarchia heading corretta.
- Indica sempre la `docsUrl` ufficiale del componente.

## Aggiungere una ricetta di pagina

Come sopra, ma su `data/recipes.json`. Le ricette sono lo scheletro di una **pagina intera** conforme a un modello PA (Comuni/Scuole/Sanità).

## Verifica in locale

```bash
npm install
npm run build
npm run inspect   # apre l'MCP Inspector per provare i tool
```

## Stile
- Commit chiari (IT o EN vanno bene).
- Una PR = un componente/una ricetta, quando possibile.
