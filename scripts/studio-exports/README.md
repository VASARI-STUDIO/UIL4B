# Studio export templates

The two downloads are **Brand guidelines** and **UI style guide**. Each ZIP contains a responsive HTML file, a vector PDF and 192 dpi PNG pages for both A4 portrait and a 16:9 deck. The HTML UI style guide includes live form controls. Its download includes the same CSS tokens, JSON tokens, Tailwind v4 theme, font faces and component CSS used by the guide.

| Theme | Sample project | Design |
| --- | --- | --- |
| Flyleaf | Margin | A plum book cover, a jacket photographed in hand and an editorial type specimen |
| Set Square | Plumbline | A bound technical manual, a site hoarding and ruled specification sheets |
| Dispatch | Kerbside | Full-bleed rider photography, a street billboard and high-contrast wayfinding layouts |
| Doorlist | Encore | A venue poster, a ticket-style colour spread and a mobile box office |
| Market Day | Saltbush | A produce circular, market photography, a jar label and round colour samples |
| Contact Sheet | Long Room | Paired gallery prints, an exhibition panel and a visitor screen |
| Workbench | Offcut | A clipboard quote with a tear-off job summary |

Every brand guide includes a one-page identity sheet. Every UI guide has a keyboard-operable form with error and success states, also included as `form-example.html` in the ZIP. The sample applications use the corresponding project’s titles, prices and details. Provide `items` as an array of `{ "title", "detail", "price" }` records to populate them for another project.

The collection takes the chapter structure and repeatable page formats in Circular’s [Odessa](https://www.madebycircular.com.au/product/odessa-brand-guidelines) and [Calypso](https://www.madebycircular.com.au/product/calypso-brand-guidelines) as references. All illustrations, layouts and implementation files here are built from UIL4B project assets and code.

## Build

From the repository root, with the project dependencies, Playwright Chromium and Poppler’s `pdftoppm` on PATH, run the following command.

```sh
node scripts/studio-exports/build.mjs --out ./studio-exports
```

The builder locates the workspace’s `export-systems/engine/scenes` directory. For an independent checkout, pass `--scenes <path-to-scenes>`. It fits the project artwork to the photographed surfaces using their saved coordinates and embeds the finished images in the guides.

Open `index.html` in the output directory. Each guide also has a directly openable PDF and HTML file for each layout. Individual page images are inside the ZIP. The two guides embed their font faces and work offline. Keep the standalone form example beside the bundled stylesheets when extracting it. The code download links in the UI guide work offline as well.

To generate one theme for another project, supply a JSON file. Use a separate output directory for each collection.

```sh
node scripts/studio-exports/build.mjs --theme flyleaf --project ./project.json --out ./my-guides
```

```json
{
  "name": "Sample studio",
  "design": {
    "palette": { "colors": ["#184C48", "#F0EEE6"], "base": "#184C48" },
    "fonts": {
      "heading": { "family": "Commissioner", "weight": 800 },
      "body": { "family": "Commissioner", "weight": 400 }
    },
    "typeScale": { "base": 16, "ratio": 1.25 }
  },
  "icons": ["calendar", "mail"]
}
```

Supply the saved logo as `design.logo.src`, a supported base64 image. Optional fields include `date` (ISO date), `headline`, `application`, `mission`, `voice`, `paletteNames`, `colourUses`, `screenTitle`, `screenDetail`, `formLabel`, `formValue` and `action`. See `samples.mjs` for complete project inputs and `themes.mjs` for the page order and studio collection. Fonts come from the local UIL4B font collection. The build reports an unavailable family or weight.

The local builder produces the product files directly. The live export picker uses the existing format registry.
