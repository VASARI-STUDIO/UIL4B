import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProject } from '../../scripts/studio-exports/samples.mjs';
import { renderTemplate } from '../../scripts/studio-exports/document.mjs';
import { themes } from '../../scripts/studio-exports/themes.mjs';
import { designTokens } from '../../src/utils/designTokens.js';
import { ratio } from '../../api/_lib/exportThemes/engine/color.js';

const PALETTES = [
  ['#0A7562', '#033C31', '#4A9FBC', '#D9E6E1'],
  ['#7A7A7A', '#8A8A8A', '#6E8C7A'],
  ['#737373'],
];
const HEX = '#[0-9a-fA-F]{6}';
const TEXT = 4.5, UI = 3;

const root = (html, name) => html.match(new RegExp(`--${name}:(${HEX})`))?.[1];
const check = (list, fg, bg, need, what) => list.push({ fg, bg, need, what, r: ratio(fg, bg) });
const token = (tokens, path) => tokens.find(t => t.type === 'color' && t.path.join('.') === path)?.value;

// Every text and background pair the template resolves to a hex value, without a browser.
function pairsFor(html, files, design) {
  const out = [];
  for (const [bg, fg] of [['dark', 'on-dark'], ['accent', 'on-accent'], ['spot', 'on-spot']]) {
    check(out, root(html, fg), root(html, bg), TEXT, `--${fg} on --${bg}`);
  }
  // Body ink runs on the cream and tinted papers each edition sets, not on white.
  for (const m of html.matchAll(new RegExp(`--paper:(${HEX})`, 'g'))) check(out, root(html, 'dark'), m[1], TEXT, `--dark on paper ${m[1]}`);
  check(out, root(html, 'dark'), '#faf9f5', TEXT, '--dark on default paper');
  for (const m of html.matchAll(new RegExp(`style="background:(${HEX});color:(${HEX})"`, 'g'))) check(out, m[2], m[1], TEXT, 'inline swatch');
  for (const m of html.matchAll(new RegExp(`--sample:(${HEX});--sample-ink:(${HEX})`, 'g'))) check(out, m[2], m[1], TEXT, 'swatch ink');
  if (files) {
    const tokens = designTokens(design);
    const primary = token(tokens, 'color.primary.$root'), hover = token(tokens, 'color.primary.hover');
    check(out, token(tokens, 'color.on-primary'), primary, TEXT, 'default button');
    const hoverInk = files['components.css'].match(/\.hover\{background:var\(--color-primary-hover\);color:(#[0-9a-fA-F]{6})\}/)?.[1];
    assert.ok(hoverInk, 'hover state sets its own text colour');
    check(out, hoverInk, hover, TEXT, 'hover button');
    check(out, token(tokens, 'color.focus'), token(tokens, 'color.surface') || '#ffffff', UI, 'focus ring on surface');
  }
  return out;
}

for (const id of Object.keys(themes)) {
  test(`${id} guides keep every colour pair readable for any palette`, () => {
    for (const colours of PALETTES) {
      const project = sampleProject(id);
      project.design.palette = { base: colours[0], colors: colours };
      delete project.design.logo;
      project.icons = [];
      for (const [product, layout] of [['brand', 'a4'], ['ui', 'deck']]) {
        const built = renderTemplate(project, id, product, layout);
        const pairs = pairsFor(built.html, product === 'ui' ? built.files : null, project.design);
        assert.ok(pairs.length >= 4, `${id} ${product}: pairs found`);
        for (const p of pairs) assert.ok(p.r >= p.need, `${id} ${product} [${colours}] ${p.what}: ${p.fg} on ${p.bg} is ${p.r.toFixed(2)}:1, needs ${p.need}`);
      }
    }
  });
}
