// The UI kit code package and the brand kit's engine-owned parts, as file maps ({ 'relative/path': string | Uint8Array }), plus zip.
import JSZip from 'jszip';
import { esc } from './brand.js';
import { tokensCss, tokensJson, tokensTs, tailwindCss, fontsCss, fontFaceCss, colourMap } from './tokens.js';
import { componentsCss, exampleHtml, icon, iconSet } from './components.js';
import { paletteAse, paletteCss, paletteJson } from './palette.js';
import { pageDoc, pageSizeMap, largestSize } from './doc.js';
import { finishText } from './placeholders.js';
import { ICONS_LICENCE } from '../icons.js';

// logo file names: the colour version is "full-colour"
export const LOGO_FILE = { colour: 'full-colour' };
export const logoFileName = (id) => LOGO_FILE[id] || id;

// Adds a file to a map. Text is finished for the edition (slot placeholders swapped in); binary data goes in as it is.
export function put(files, name, data) {
  files[name] = typeof data === 'string' ? finishText(data, name) : data;
  return files;
}

// A file map as a zip (Buffer). Entries are sorted and dated alike, so the same files give the same zip.
export async function zipFiles(files, top) {
  const zip = new JSZip();
  for (const name of Object.keys(files).sort()) {
    const v = files[name];
    zip.file((top ? top + '/' : '') + name, typeof v === 'string' ? Buffer.from(v, 'utf8') : v, { date: new Date('2026-01-01T00:00:00Z') });
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// icon as a standalone file (no class)
export const iconFile = (ctx, name) => icon(ctx, name, 24).replace(' class="ui-icon"', '') + '\n';

export function putIcons(ctx, files, dir) {
  for (const n of iconSet(ctx)) put(files, `${dir}/svg/${n}.svg`, iconFile(ctx, n));
  put(files, `${dir}/LICENSE.txt`, `These icons are from Lucide (https://lucide.dev), released under the ISC licence.\nStroke width and corner style are set to the ${ctx.brand.name} brand (stroke ${ctx.iconStyle.stroke}, ${ctx.iconStyle.join} joins).\n\n${ICONS_LICENCE}`);
}

function codeReadme(ctx) {
  const B = ctx.brand, L = colourMap(ctx, 'light');
  const ex = ['surface', 'text', 'action', 'action-label', 'focus', 'danger'].map((k) => `| \`--${k}\` | \`${L[k]}\` | \`${colourMap(ctx, 'dark')[k]}\` |`).join('\n');
  return `# ${B.name} UI kit: code package

Design tokens and working components for ${B.name}, built on plain CSS custom properties. No framework needed.

## What is here

| File | What it is |
|---|---|
| \`tokens.css\` | Custom properties. Light values on \`:root\`, dark on \`[data-theme="dark"]\` and on \`prefers-color-scheme: dark\` |
| \`tokens.json\` | The same tokens in the W3C design tokens format (DTCG). Colour tokens carry their dark value in \`$extensions.mode\` |
| \`tokens.ts\` | The same values as a typed export |
| \`tailwind.css\` | A Tailwind CSS v4 \`@theme\` block mapped to the tokens |
| \`components.css\` | Classes for every component, built only on the tokens |
| \`example.html\` | Every component live, with a light and dark switch. Open it in a browser |
| \`fonts.css\` | \`@font-face\` rules for the files in \`assets/fonts\`, and the Google Fonts link as an alternative |
| \`assets/\` | Logo, icons and font files |

## Install

1. Copy this folder into your project.
2. Link three stylesheets, in this order:

\`\`\`html
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
\`\`\`

3. Put \`class="ui"\` on \`<body>\` (or any wrapper) so the base type and colours apply.

\`\`\`html
<button class="ui-btn" type="button">${esc(B.ui.screen.content.form.book)}</button>
\`\`\`

With Tailwind v4: \`@import "tailwindcss"; @import "./tokens.css"; @import "./tailwind.css";\` then use \`bg-surface text-text\`, \`bg-action text-action-label\`.

## Token names

Colour tokens name a job, not a colour: \`--surface\`, \`--raised\`, \`--text\`, \`--quiet\`, \`--action\`, \`--action-label\`, \`--focus\`. State is plain words in one colour, never a tinted pill: \`--success\` (and \`--warning\`, \`--danger\`, \`--info\`) colours the words and the icon. Each has a \`-bg\` tint for a highlight or a chart, never under text. \`--action-text\` is the action colour where it reads as text, and the text colour where it does not.${ctx.houseRoles.length ? `The ${ctx.houseRoles.map((t) => `\`--${t}\``).join(' and ')} pair${ctx.houseRoles.length > 1 ? 's are' : ' is'} a house default, not a brand colour: ${B.name} has no ${ctx.houseRoles.join(' or ')} colour of its own, so the pair is there to keep the components working. ` : ''}Brand colours are \`--palette-<id>\`. Space is \`--sp-1\` to \`--sp-${ctx.space.length}\`, radii \`--r-control\` and \`--r-card\`, type \`--fs-*\`, \`--lh-*\`, \`--fw-*\`.

| Token | Light | Dark |
|---|---|---|
${ex}

## Light and dark

Light is the default. Set \`data-theme="dark"\` on \`<html>\` for dark, or \`data-theme="light"\` to force light. With no attribute the page follows the visitor's system setting.

## Accessibility

- Every text colour pair in the kit is measured: ratio 4.5:1 or better under 24 px, 3:1 for large text, control edges and focus rings. The same holds in dark.
- Focus is a ${ctx.borders[2].px}px ring in \`--focus\` on every control (\`:focus-visible\`). Do not remove it.
- Controls are 44 px tall (36 px for the small size) and use real elements: \`button\`, \`input\`, \`select\`. State is carried by \`disabled\`, \`aria-invalid\`, \`aria-pressed\`, \`aria-selected\` and \`aria-current\`, not by class alone.
- Fonts: ${[...new Set(ctx.faces.map((f) => f.family))].join(', ')}. All are open licence (SIL OFL 1.1).
- Icons are Lucide (ISC licence), drawn with currentColor.
`;
}

// The code package: tokens, components, example page, fonts, logo and icons.
// eslint-disable-next-line no-unused-vars -- theme is part of the builder signature all three kit writers share
export function codePackageFiles(ctx, theme) {
  const files = {};
  put(files, 'README.md', codeReadme(ctx));
  put(files, 'tokens.css', tokensCss(ctx));
  put(files, 'tokens.json', JSON.stringify(tokensJson(ctx), null, 2) + '\n');
  put(files, 'tailwind.css', tailwindCss(ctx));
  put(files, 'tokens.ts', tokensTs(ctx));
  put(files, 'components.css', componentsCss(ctx));
  put(files, 'example.html', exampleHtml(ctx));
  // fonts: local files first, Google as an alternative
  for (const f of ctx.faces) put(files, `assets/fonts/${f.stem}.woff2`, ctx.loaders.fontFile(f.stem, 'woff2'));
  put(files, 'fonts.css', `/* ${ctx.brand.name} fonts: local files in assets/fonts (open licence, SIL OFL 1.1). */\n${fontFaceCss(ctx, (f) => `assets/fonts/${f.stem}.woff2`)}\n\n/* Or load from Google Fonts instead: delete the rules above and use this.\n${fontsCss(ctx).split('\n').filter((l) => l.startsWith('@import')).join('\n')}\n*/\n`);
  // logo and icons
  if (ctx.edition === 'slot') put(files, 'assets/logo/logo-slot.svg', ctx.logo.slotSvgFile());
  else for (const id of ctx.logo.versions) put(files, `assets/logo/${ctx.slug}-${logoFileName(id)}.svg`, ctx.logo.svg(id) + '\n');
  putIcons(ctx, files, 'assets/icons');
  return files;
}

// The brand kit's files the engine writes: logo svgs, palette files, type notes, icons and the read-me.
// The PNG and PDF files are made outside the engine; kitListing names them for the brand book.
// eslint-disable-next-line no-unused-vars -- theme is part of the builder signature all three kit writers share
export function kitFiles(ctx, theme) {
  const B = ctx.brand, files = {}, slug = ctx.slug;
  if (ctx.edition === 'slot') {
    put(files, '01 Logo/logo-slot.svg', ctx.logo.slotSvgFile());
    put(files, '01 Logo/README.md', `# Logo\n\nThis folder is where the approved ${B.name} logo files go. Until then, \`logo-slot.svg\` is a labelled empty frame at the logo's proportion (${ctx.logo.geo.width.toFixed(0)} : ${ctx.logo.geo.height.toFixed(0)}).\n\nPut the final files in three folders:\n\n- \`svg/\` the vector master of each version\n- \`png/\` 512, 1024 and 2048 px wide, transparent\n- \`pdf/\` a vector PDF of each version\n\nVersions to supply: full colour, mono dark, mono light, reversed, horizontal, stacked, symbol.\n\nClear space is ${ctx.logo.clearShare}% of the logo's height on every side. Set the minimum size once the logo is in place.\n`);
  } else {
    const logo = ctx.logo;
    for (const id of logo.versions) {
      const g = logo.geos[id];
      put(files, `01 Logo/svg/${slug}-${logoFileName(id)}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n` + logo.svg(id, { title: `${B.name} logo, ${logo.labels[id].toLowerCase()}` }).replace('<svg ', `<svg width="${g.w.toFixed(1)}" height="${g.h.toFixed(1)}" `) + '\n');
    }
  }
  put(files, `02 Colour/${slug}-palette.ase`, paletteAse(ctx));
  put(files, `02 Colour/${slug}-palette.css`, paletteCss(ctx));
  put(files, `02 Colour/${slug}-palette.json`, JSON.stringify(paletteJson(ctx), null, 2) + '\n');
  const fams = [...new Map(ctx.faces.map((f) => [f.family, f])).values()];
  put(files, '03 Type/fonts.md', `# Typefaces\n\n${fams.map((f) => {
    const mine = ctx.faces.filter((x) => x.family === f.family), ws = mine.filter((x) => x.style !== 'italic').map((x) => x.weight).join(', '), it = mine.filter((x) => x.style === 'italic').map((x) => x.weight).join(', ');
    return `## ${f.family}\n\n- Role: ${f.role}\n- Weights: ${ws}${it ? `\n- Italics: ${it}` : ''}${B.fonts[f.role].axes ? `\n- Axes: ${B.fonts[f.role].axes}` : ''}\n- Google Fonts: https://fonts.google.com/specimen/${f.family.replace(/ /g, '+')}`;
  }).join('\n\n')}\n\n## Licence\n\nAll faces are released under the SIL Open Font License 1.1. You may use, embed and share them, including commercially. They may not be sold on their own.\n`);
  putIcons(ctx, files, '04 Icons');
  put(files, '05 Imagery/README.md', `# Photography direction\n\n${B.imagery.shots.map((s) => `## ${s.caption}\n\n${s.slot}`).join('\n\n')}\n`);
  put(files, 'README.md', `# ${B.name} brand kit\n\n${B.version ? `Version ${B.version.number}, ${ctx.date}.\n\n` : ''}${B.description}\n\n| Folder | What is in it |\n|---|---|\n| 01 Logo | ${ctx.edition === 'slot' ? 'Where the approved logo files go, and a slot frame' : 'Every version as svg, png (512, 1024, 2048 px wide, transparent) and pdf'} |\n| 02 Colour | The palette as ASE (Adobe), CSS and JSON, and a swatch sheet |\n| 03 Type | The typefaces, weights, links and licence |\n| 04 Icons | ${iconSet(ctx).length} interface icons (Lucide, ISC licence) in the brand's stroke |\n| 05 Imagery | Photography direction |\n\nThe palette: ${ctx.colours.map((c) => `${c.name} ${c.hex}`).join(', ')}.\n\nAsk your printer for a proof before a print run.\n`);
  return files;
}

// Brand kit PDFs, as page documents: read-me, palette sheet, type specimen, photography sheet. Each is
// { name, rel, html, size, pages }: rel is where its PDF sits in the kit, html the page document (fonts by assets/fonts/<stem>.woff2),
// size the viewport that fits its largest page. Empty when the theme has no read-me and sheets.
export function kitDocs(ctx, theme) {
  if (!(theme.readMe && theme.sheets)) return [];
  const S = theme.sheets(ctx), size = theme.meta.kitPage || theme.meta.guidelinesPage;  // read-me and sheets: the theme's kitPage, else its guidelines page
  const jobs = [['00 Read me', theme.readMe(ctx), '00 Read me.pdf'], ['palette', S.palette, `02 Colour/${ctx.slug}-palette.pdf`], ['typefaces', S.typefaces, '03 Type/Typefaces.pdf'], ['photography', S.photography, '05 Imagery/Photography.pdf']];
  return jobs.map(([name, pages, rel]) => ({
    name, rel, pages: pages.length,
    html: pageDoc(ctx, theme, { title: `${ctx.brand.name} brand kit: ${name}`, pages, size }),
    size: largestSize(size, pageSizeMap(theme.meta)),
  }));
}

// Nominal sizes (bytes) for the files made outside the engine, so the book can print a size beside each download.
const NOMINAL = { png512: 9000, png1024: 22000, png2048: 60000, logoPdf: 6000, readMePdf: 180000, palettePdf: 120000, typefacesPdf: 220000, photographyPdf: 120000 };

// The kit as the book lists it: the real files plus the PNG and PDF files made outside the engine, each with a nominal size.
// Returns [{ rel, size }] sorted by path.
export function kitListing(ctx, theme, files) {
  const list = Object.entries(files).map(([rel, v]) => ({ rel, size: typeof v === 'string' ? Buffer.byteLength(v) : v.length }));
  const add = (rel, size) => { if (!list.some((f) => f.rel === rel)) list.push({ rel, size }); };
  if (ctx.edition !== 'slot') {
    for (const id of ctx.logo.versions) {
      const n = `${ctx.slug}-${logoFileName(id)}`;
      add(`01 Logo/png/${n}-512.png`, NOMINAL.png512); add(`01 Logo/png/${n}-1024.png`, NOMINAL.png1024); add(`01 Logo/png/${n}-2048.png`, NOMINAL.png2048);
      add(`01 Logo/pdf/${n}.pdf`, NOMINAL.logoPdf);
    }
  }
  if (theme.readMe && theme.sheets) {
    add('00 Read me.pdf', NOMINAL.readMePdf); add(`02 Colour/${ctx.slug}-palette.pdf`, NOMINAL.palettePdf);
    add('03 Type/Typefaces.pdf', NOMINAL.typefacesPdf); add('05 Imagery/Photography.pdf', NOMINAL.photographyPdf);
  }
  return list.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
}
