// Theme 33, Flyleaf: shared helpers. Every colour a page draws is the brand's, and every text on a colour goes through readableOn() so a palette that
// cannot carry a pair still builds (the engine's pair() throws, and a throw drops the page). Brand copy is read through esc() only, so slot-edition
// placeholders reach it; this file never slices, splits or matches a brand string (a sentinel cut in half stays in the output and fails the build).
import { readableOn } from '../../engine/color.js';

export const BRAND_PAGES = ['cover', 'application', 'digital', 'logo', 'colour', 'specimen', 'type', 'strategy', 'composition', 'reference'];
// The 13 pages of the UI style guide, shared by every theme's guide; the route skips an id with no function.
export const UI_PAGES = ['cover', 'contents', 'screen', 'dark', 'roles', 'tints', 'type', 'buttons', 'fields', 'feedback', 'overlays', 'space', 'handoff'];
// The Free skeleton: a fixed shorter list, chosen from the account's plan in the route (ctx.skeleton) and never from a request.
export const BRAND_SKELETON = ['cover', 'logo', 'colour', 'type', 'reference'];
export const UI_SKELETON = ['cover', 'screen', 'roles', 'type', 'buttons', 'fields', 'handoff'];

export const brandOrder = (ctx) => (ctx.skeleton ? BRAND_SKELETON : BRAND_PAGES);
export const uiOrder = (ctx) => (ctx.skeleton ? UI_SKELETON : UI_PAGES);

export const NAMES = {
  cover: 'Cover', application: 'Application', digital: 'Digital', logo: 'Logo', colour: 'Colour', specimen: 'Specimen', type: 'Type', strategy: 'Strategy',
  composition: 'Composition', reference: 'Reference', interface: 'Interface', components: 'Components', feedback: 'Feedback', tints: 'Tints and pairs', contrast: 'Contrast',
  icons: 'Icons', handoff: 'Handoff', contents: 'Contents', screen: 'Screen', dark: 'Dark', roles: 'Colour roles', buttons: 'Buttons', fields: 'Fields', overlays: 'Overlays', space: 'Space',
};

// Every Flyleaf page carries a small credit line when the edition is the skeleton (the Free plan); the full edition has none.
export const CREDIT = 'Made with UIL4B';

// The colours a page draws from: the light roles, with the text on each one measured.
export function palette(ctx) {
  const L = ctx.roles.light;
  const on = (bg, pref = [], opt = {}) => readableOn(bg, [...pref, L.text, L.surface], opt);
  return {
    L, ground: L.surface, raised: L.raised || L.surface, sunken: L.sunken || L.surface, ink: L.text, hair: L.divider || L.border,
    quiet: on(L.surface, [L.quiet, L.textSoft], { size: 12 }), soft: on(L.surface, [L.textSoft, L.quiet], { size: 14 }),
    quietOn: (bg, size = 12) => on(bg, [L.quiet, L.textSoft], { size }), on,
  };
}

// The page frame: running head, title, content, folio and (skeleton only) the credit line. `order(ctx)` is the page list the folio counts in.
export function page(ctx, id, { title, section, body, order }) {
  const E = ctx.esc;
  const no = Math.max(1, order(ctx).indexOf(id) + 1);
  return `<section class="pg fl" data-page="${id}">
<header class="fl-hd"><span class="fl-name">${E(ctx.brand.name)}</span><span>${E(section)}</span></header>
<div class="fl-bd"><h2 class="fl-ti">${E(title)}</h2><div class="fl-ct">${body}</div></div>
<footer class="fl-ft"><span>${E(ctx.versionLine)}</span><span class="fl-no">${String(no).padStart(2, '0')}</span></footer>${ctx.skeleton ? `\n<div class="fl-credit">${CREDIT}</div>` : ''}
</section>`;
}

export const pct = (share) => `${+((share ?? 0) * 100).toFixed(1)}%`;
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// a small label over a value
export const field = (ctx, label, value) => `<div class="fl-f"><div class="fl-k">${ctx.esc(label)}</div><div class="fl-v">${value}</div></div>`;
