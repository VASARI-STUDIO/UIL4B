// Writers for the UI kit code package and the brand kit's engine-owned parts, plus zip.
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { esc, ROOT } from './brand.js';
import { tokensCss, tokensJson, tokensTs, tailwindCss, fontsCss, fontFaceCss, colourMap } from './tokens.js';
import { componentsCss, exampleHtml, icon, iconSet } from './components.js';
import { paletteAse, paletteCss, paletteJson } from './palette.js';
import { renderLogoSet, logoFileName, printPdf } from './render.js';
import { write, mkdirp, pageDoc, copyAssets, pageSizeMap, largestSize } from './doc.js';

export async function zipFolder(dir, zipFile, topName) {
  const zip = new JSZip();
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(p, r); else zip.file((topName ? topName + '/' : '') + r, fs.readFileSync(p), { date: new Date('2026-01-01T00:00:00Z') });
    }
  };
  walk(dir, '');
  fs.writeFileSync(zipFile, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

// icon as a standalone file (no class)
export const iconFile = (ctx, name) => icon(ctx, name, 24).replace(' class="ui-icon"', '') + '\n';

export function writeIcons(ctx, dir) {
  const d = mkdirp(path.join(dir, 'svg'));
  for (const n of iconSet(ctx)) write(path.join(d, n + '.svg'), iconFile(ctx, n));
  write(path.join(dir, 'LICENSE.txt'), `These icons are from Lucide (https://lucide.dev), released under the ISC licence.\nStroke width and corner style are set to the ${ctx.brand.name} brand (stroke ${ctx.iconStyle.stroke}, ${ctx.iconStyle.join} joins).\n\nISC License\n\nCopyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.\n\nPermission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.\n`);
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

// The code package: the files the SPEC lists, from tokens and components only.
export function writeCodePackage(ctx, theme, dir) {
  mkdirp(dir);
  write(path.join(dir, 'README.md'), codeReadme(ctx));
  write(path.join(dir, 'tokens.css'), tokensCss(ctx));
  write(path.join(dir, 'tokens.json'), JSON.stringify(tokensJson(ctx), null, 2) + '\n');
  write(path.join(dir, 'tailwind.css'), tailwindCss(ctx));
  write(path.join(dir, 'tokens.ts'), tokensTs(ctx));
  write(path.join(dir, 'components.css'), componentsCss(ctx));
  write(path.join(dir, 'example.html'), exampleHtml(ctx));
  // fonts: local files first, Google as an alternative
  const fd = mkdirp(path.join(dir, 'assets', 'fonts'));
  for (const f of ctx.faces) fs.copyFileSync(path.join(ROOT, 'fonts', f.stem + '.woff2'), path.join(fd, f.stem + '.woff2'));
  write(path.join(dir, 'fonts.css'), `/* ${ctx.brand.name} fonts: local files in assets/fonts (open licence, SIL OFL 1.1). */\n${fontFaceCss(ctx, (f) => `assets/fonts/${f.stem}.woff2`)}\n\n/* Or load from Google Fonts instead: delete the rules above and use this.\n${fontsCss(ctx).split('\n').filter((l) => l.startsWith('@import')).join('\n')}\n*/\n`);
  // logo and icons
  const ld = mkdirp(path.join(dir, 'assets', 'logo'));
  if (ctx.edition === 'slot') write(path.join(ld, 'logo-slot.svg'), ctx.logo.slotSvgFile());
  else for (const id of ctx.logo.versions) write(path.join(ld, `${ctx.slug}-${logoFileName(id)}.svg`), ctx.logo.svg(id) + '\n');
  writeIcons(ctx, path.join(dir, 'assets', 'icons'));
}

// Brand kit (engine part): logo set, palette files, type notes, icons, imagery photos. PDFs come from the theme if it has them.
export async function writeBrandKitFiles(ctx, theme, dir) {
  const B = ctx.brand;
  const logoDir = mkdirp(path.join(dir, '01 Logo'));
  if (ctx.edition === 'slot') {
    write(path.join(logoDir, 'logo-slot.svg'), ctx.logo.slotSvgFile());
    write(path.join(logoDir, 'README.md'), `# Logo\n\nThis folder is where the approved ${B.name} logo files go. Until then, \`logo-slot.svg\` is a labelled empty frame at the logo's proportion (${ctx.logo.geo.width.toFixed(0)} : ${ctx.logo.geo.height.toFixed(0)}).\n\nPut the final files in three folders:\n\n- \`svg/\` the vector master of each version\n- \`png/\` 512, 1024 and 2048 px wide, transparent\n- \`pdf/\` a vector PDF of each version\n\nVersions to supply: full colour, mono dark, mono light, reversed, horizontal, stacked, symbol.\n\nClear space is ${ctx.logo.clearShare}% of the logo's height on every side. Set the minimum size once the logo is in place.\n`);
  } else await renderLogoSet(ctx, logoDir);
  const cd = mkdirp(path.join(dir, '02 Colour')), slug = ctx.slug;
  fs.writeFileSync(path.join(cd, `${slug}-palette.ase`), paletteAse(ctx));
  write(path.join(cd, `${slug}-palette.css`), paletteCss(ctx));
  write(path.join(cd, `${slug}-palette.json`), JSON.stringify(paletteJson(ctx), null, 2) + '\n');
  const td = mkdirp(path.join(dir, '03 Type'));
  const fams = [...new Map(ctx.faces.map((f) => [f.family, f])).values()];
  write(path.join(td, 'fonts.md'), `# Typefaces\n\n${fams.map((f) => {
    const mine = ctx.faces.filter((x) => x.family === f.family), ws = mine.filter((x) => x.style !== 'italic').map((x) => x.weight).join(', '), it = mine.filter((x) => x.style === 'italic').map((x) => x.weight).join(', ');
    return `## ${f.family}\n\n- Role: ${f.role}\n- Weights: ${ws}${it ? `\n- Italics: ${it}` : ''}${B.fonts[f.role].axes ? `\n- Axes: ${B.fonts[f.role].axes}` : ''}\n- Google Fonts: https://fonts.google.com/specimen/${f.family.replace(/ /g, '+')}`;
  }).join('\n\n')}\n\n## Licence\n\nAll faces are released under the SIL Open Font License 1.1. You may use, embed and share them, including commercially. They may not be sold on their own.\n`);
  writeIcons(ctx, path.join(dir, '04 Icons'));
  const id = mkdirp(path.join(dir, '05 Imagery'));
  const real = B.imagery.shots.filter((s) => s.photo);
  if (real.length) { const pd = mkdirp(path.join(id, 'photos')); for (const s of real) fs.copyFileSync(path.join(ctx.dir, s.photo), path.join(pd, path.basename(s.photo))); }
  write(path.join(dir, 'README.md'), `# ${B.name} brand kit\n\n${B.version ? `Version ${B.version.number}, ${ctx.date}.\n\n` : ''}${B.description}\n\n| Folder | What is in it |\n|---|---|\n| 01 Logo | ${ctx.edition === 'slot' ? 'Where the approved logo files go, and a slot frame' : 'Every version as svg, png (512, 1024, 2048 px wide, transparent) and pdf'} |\n| 02 Colour | The palette as ASE (Adobe), CSS and JSON, and a swatch sheet |\n| 03 Type | The typefaces, weights, links and licence |\n| 04 Icons | ${iconSet(ctx).length} interface icons (Lucide, ISC licence) in the brand's stroke |\n| 05 Imagery | Photography direction${real.length ? ' and the photos' : ''} |\n\nThe palette: ${ctx.colours.map((c) => `${c.name} ${c.hex}`).join(', ')}.\n\nAsk your printer for a proof before a print run.\n`);
  if (theme.readMe && theme.sheets) await writeKitPdfs(ctx, theme, dir);
}

// Brand kit PDFs from the theme: read-me, palette sheet, type specimen, photography sheet. The page HTML is kept in
// .scratch/kitdocs/<theme id>/<edition>/ (ctx.kitDocs lists it) so the build can check it, and is not part of the kit.
export async function writeKitPdfs(ctx, theme, dir) {
  const docs = path.join(ROOT, '.scratch', 'kitdocs', theme.meta.id, ctx.edition);
  fs.rmSync(docs, { recursive: true, force: true }); mkdirp(docs); copyAssets(ctx, theme, docs);
  const S = theme.sheets(ctx), size = theme.meta.kitPage || theme.meta.guidelinesPage;  // read-me and sheets: the theme's kitPage, else its guidelines page
  const jobs = [['00 Read me', theme.readMe(ctx), '00 Read me.pdf'], ['palette', S.palette, `02 Colour/${ctx.slug}-palette.pdf`], ['typefaces', S.typefaces, '03 Type/Typefaces.pdf'], ['photography', S.photography, '05 Imagery/Photography.pdf']];
  ctx.kitDocs = [];
  for (const [name, pages, rel] of jobs) {
    const file = path.join(docs, name.replace(/s+/g, '-') + '.html');
    write(file, pageDoc(ctx, theme, { title: `${ctx.brand.name} brand kit: ${name}`, pages, size }));
    mkdirp(path.dirname(path.join(dir, rel))); await printPdf(file, path.join(dir, rel), size);
    ctx.kitDocs.push({ name, file, pages: pages.length, size: largestSize(size, pageSizeMap(theme.meta)) });  // the viewport for the check and the shots fits the largest page
  }
}
