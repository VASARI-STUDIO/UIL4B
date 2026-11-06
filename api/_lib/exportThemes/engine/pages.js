// The fixed page-id lists for the two documents. Order is the order in the PDF.
// A theme implements guidelines[id] / uikit[id] for every id. `section` is null for front matter.
const S = (n, title) => ({ n, title });
const G = {
  intro: S(1, 'Introduction'), voice: S(2, 'Voice'), logo: S(3, 'Logo'), colour: S(4, 'Colour'), type: S(5, 'Typography'),
  imagery: S(6, 'Imagery'), layout: S(7, 'Layout'), apps: S(8, 'Applications'), close: S(9, 'Close'),
};
const g = (id, title, section = null) => ({ id, title, section });

export const GUIDE_PAGES = [
  g('cover', 'Cover'), g('contents', 'Contents'),
  g('intro', 'Who we are', G.intro), g('personality', 'Personality', G.intro),
  g('voice', 'How we sound', G.voice), g('write-this', 'Write this, not that', G.voice), g('messaging', 'Lines and boilerplate', G.voice),
  g('logo', 'The logo', G.logo), g('logo-versions', 'Logo versions', G.logo), g('clear-space', 'Clear space', G.logo), g('min-size', 'Minimum size', G.logo),
  g('logo-grounds', 'Logo on colour and photos', G.logo), g('logo-misuse', 'Logo misuse', G.logo),
  g('palette', 'The palette', G.colour), g('proportion', 'Proportion', G.colour), g('contrast', 'Contrast', G.colour), g('colour-values', 'Colour values', G.colour),
  g('typefaces', 'Typefaces', G.type), g('hierarchy', 'Hierarchy', G.type), g('type-in-use', 'Type in use', G.type), g('type-rules', 'Type rules', G.type),
  g('photo-direction', 'Photography', G.imagery), g('shot-list', 'Shot list', G.imagery), g('imagery-rules', 'Imagery rules', G.imagery),
  g('grid', 'The grid', G.layout), g('layouts', 'Layouts', G.layout),
  g('business-card', 'Business card', G.apps), g('social', 'Social', G.apps), g('signage', 'Signage', G.apps), g('email-signature', 'Email signature', G.apps), g('digital', 'Digital', G.apps),
  g('summary', 'The brand on one page', G.close), g('contact-scope', 'Contact and scope', G.close),
];

const U = { foundations: S(1, 'Foundations'), components: S(2, 'Components'), patterns: S(3, 'Patterns'), handoff: S(4, 'Handoff') };
export const UIKIT_PAGES = [
  g('cover', 'Cover'), g('contents', 'Contents'),
  g('colour-light', 'Colour, light', U.foundations), g('colour-dark', 'Colour, dark', U.foundations), g('type-scale', 'Type scale', U.foundations), g('spacing', 'Spacing', U.foundations),
  g('radii-borders', 'Radii and borders', U.foundations), g('elevation', 'Elevation', U.foundations), g('states', 'States', U.foundations),
  g('buttons', 'Buttons', U.components), g('inputs', 'Inputs', U.components), g('choices', 'Choices', U.components), g('cards', 'Cards', U.components),
  g('navigation', 'Navigation', U.components), g('lists', 'Lists', U.components), g('status', 'Status', U.components), g('feedback', 'Feedback', U.components),
  g('dialog', 'Dialog', U.components), g('table', 'Table', U.components), g('empty', 'Empty states', U.components),
  g('screen-light', 'Product screen, light', U.patterns), g('screen-dark', 'Product screen, dark', U.patterns), g('screen-mobile', 'Product screen, mobile', U.patterns),
  g('tokens', 'Token reference', U.handoff), g('code', 'The code package', U.handoff),
];

// Pages whose output differs between the slot and showcase editions (get a `-slot` canvas board).
export const LOGO_DEPENDENT = ['cover', 'logo', 'logo-versions', 'clear-space', 'min-size', 'logo-grounds', 'logo-misuse', 'social', 'signage', 'email-signature', 'digital', 'summary'];

// Numbers every page: ctx.pageNo(id) is the 1-based position in the full list, plus any extra pages a theme declares in meta.extraPages.
export function numberPages(list, extra = {}) {
  let n = 0; const out = {};
  for (const p of list) { out[p.id] = n + 1; n += 1 + (extra[p.id] || 0); }
  return out;
}
