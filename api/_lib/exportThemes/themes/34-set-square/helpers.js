// Theme 34, Set Square: shared helpers. Every colour a page draws is the brand's, and every text on a colour goes through readableOn() so a palette that
// cannot carry a pair still builds (the engine's pair() throws, and a throw drops the page). Brand copy is read through esc() only, so slot-edition
// placeholders reach it; this file never slices, splits or matches a brand string (a sentinel cut in half stays in the output and fails the build).
import { readableOn } from '../../engine/color.js';

// The order is the standards manual's: the rules of the sheet first (the grid, then the reference sheet), then the mark and the type, then the colour and its uses.
export const BRAND_PAGES = ['cover', 'composition', 'reference', 'logo', 'specimen', 'type', 'colour', 'application', 'digital', 'strategy'];
export const UI_PAGES = ['cover', 'interface', 'colour', 'type', 'tints', 'contrast', 'components', 'feedback', 'icons', 'handoff'];
// The Free skeleton: a fixed shorter list, chosen from the account's plan in the route (ctx.skeleton) and never from a request.
export const BRAND_SKELETON = ['cover', 'composition', 'logo', 'type', 'colour'];
export const UI_SKELETON = ['cover', 'colour', 'type', 'components'];

export const brandOrder = (ctx) => (ctx.skeleton ? BRAND_SKELETON : BRAND_PAGES);
export const uiOrder = (ctx) => (ctx.skeleton ? UI_SKELETON : UI_PAGES);

export const NAMES = {
  cover: 'Cover', application: 'Application', digital: 'Digital', logo: 'Logo', colour: 'Colour', specimen: 'Specimen', type: 'Type', strategy: 'Strategy',
  composition: 'Composition', reference: 'Reference', interface: 'Interface', components: 'Components', feedback: 'Feedback', tints: 'Tints', contrast: 'Contrast',
  icons: 'Icons', handoff: 'Handoff',
};

// Every Set Square page carries a small credit line when the edition is the skeleton (any plan but Pro); the full edition has none.
export const CREDIT = 'Made with UIL4B';

// The colours a page draws from: the light roles, with the text on each one measured.
export function palette(ctx) {
  const L = ctx.roles.light;
  const on = (bg, pref = [], opt = {}) => readableOn(bg, [...pref, L.text, L.surface], opt);
  return {
    L, ground: L.surface, raised: L.raised || L.surface, sunken: L.sunken || L.surface, ink: L.text, hair: L.divider || L.border, spot: L.action,
    quiet: on(L.surface, [L.quiet, L.textSoft], { size: 12 }), soft: on(L.surface, [L.textSoft, L.quiet], { size: 14 }),
    quietOn: (bg, size = 12) => on(bg, [L.quiet, L.textSoft], { size }), on,
  };
}

const pad2 = (n) => String(n).padStart(2, '0');

// The page frame: a running head ruled in ink, a title block down the left (the title, then the sheet number) split from the content by a rule, and a
// footer line with the folio. The spot colour (the brand's action colour) runs down the left edge of every sheet. `order(ctx)` is the page list the folio counts in.
export function page(ctx, id, { title, section, body, order }) {
  const E = ctx.esc, list = order(ctx);
  const no = Math.max(1, list.indexOf(id) + 1);
  return `<section class="pg ss" data-page="${id}">
<header class="ss-hd"><span class="ss-name">${E(ctx.brand.name)}</span><span>${E(section)}</span></header>
<div class="ss-in"><div class="ss-head"><h2 class="ss-ti disp">${E(title)}</h2><div class="ss-sheet">Sheet ${pad2(no)} of ${pad2(list.length)}</div></div><div class="ss-ct">${body}</div></div>
<footer class="ss-ft"><span>${E(ctx.versionLine)}</span><span class="ss-no">${pad2(no)}</span></footer>${ctx.skeleton ? `\n<div class="ss-credit">${CREDIT}</div>` : ''}
</section>`;
}

export const pct = (share) => `${+((share ?? 0) * 100).toFixed(1)}%`;
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// a small label over a value
export const field = (ctx, label, value) => `<div class="ss-f"><div class="ss-k">${ctx.esc(label)}</div><div class="ss-v">${value}</div></div>`;

// The stepped drawing of the cover (Codex's set-square art): seven stairs, each a top plane in the spot colour, a left face in ink and a right face in the ground,
// with a ruled edge. Flat vector shapes in the brand's own colours, no photograph.
export function steps(spot, ink, ground) {
  return Array.from({ length: 7 }, (_, i) => {
    const x = 38 + 34 * i, y = 267 - 24 * i;
    return `<path d="M${x} ${y} l56 -32 41 23 -56 32 Z" fill="${spot}"/><path d="M${x} ${y} l41 23 v28 l-41 -23 Z" fill="${ink}"/><path d="M${x + 41} ${y + 23} l56 -32 v28 l-56 32 Z" fill="${ground}"/><path d="M${x + 41} ${y + 51} l56 -32 v-28" fill="none" stroke="${ink}" stroke-width="1.3"/>`;
  }).join('');
}
