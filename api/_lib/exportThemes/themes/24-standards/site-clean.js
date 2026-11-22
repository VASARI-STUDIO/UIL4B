// Theme 24, Standards, the published sites: what the slot edition leaves out. The words the project has still to write are placeholders
// in the slot edition (guidance for an editor); a published site carries none. The site is drawn from a cleaned context (theme 21's
// helpers, read only): the brand's name is set in the display face where the dashed logo frame would go, the strings nobody wrote are
// empty, and the font a stand-in serves is named as itself. `raw` keeps the uncleaned context, so `keep` can see what is really written.
import { siteCtx, servedCtx, hasPh, nameFor } from '../21-presentation/lane-ht-clean.js';
import { dispStyle, dfont } from './lane-bk-kit.js';
import { adv } from './helpers.js';

export { hasPh };
// The logo's box is drawn to the outlined name's own proportions and a dimension line spans that box, so the typeset name is set to fill it edge to
// edge (measured in the display face): the line then measures what the eye sees. The versions with a symbol keep their shapes.
function fitName(ctx, html, o) {
  const name = nameFor(ctx), w = o.width || 200;
  const fs = w / (adv(dfont(ctx), name, 100, -0.01) / 100);
  const size = o.share ? `font-size:min(${(fs * 2).toFixed(1)}px,${((fs / w) * o.share * 100).toFixed(2)}cqw)` : `font-size:${fs.toFixed(1)}px`;
  return html.replace(/font-size:[^;"]+/, size);
}
export function prepareSite(ctx0) {
  const served = servedCtx(ctx0), clean = siteCtx(served);
  if (clean === served) return served;
  const base = clean.logo, plain = (id) => id !== 'horizontal' && id !== 'stacked' && id !== 'symbol';
  const logo = {
    ...base,
    html: (id, o = {}) => (plain(id) ? fitName(clean, base.html(id, o), o) : base.html(id, o)),
    forMisuse: (width, o = {}) => fitName(clean, base.forMisuse(width, o), { width, share: o.share }),
  };
  const out = Object.create(clean);
  Object.defineProperty(out, 'logo', { value: logo, enumerable: true });
  Object.defineProperty(out, 'raw', { value: served, enumerable: false });
  return out;
}
export const rawOf = (ctx) => ctx.raw || ctx;
// the typeset mark (theme 21's wordmark markup) in this theme's own face and weight: the display face, no tracking, the version's shapes
export const wordmarkCss = (ctx) => `
.ht-d{${dispStyle(ctx)};letter-spacing:-0.01em;line-height:1.02}
.ht-wm{display:inline-flex;align-items:center;justify-content:center;max-width:100%;white-space:nowrap;line-height:1.1;letter-spacing:-0.01em;overflow:visible}
.ht-wm--sym{letter-spacing:0}
.ht-wm--h{gap:.45em}
.ht-wm--h .ht-wm__s{font-size:1em;padding-right:.45em;border-right:.08em solid currentColor;line-height:1.1}
.ht-wm--st{flex-direction:column;gap:.15em}
.ht-wm--st .ht-wm__s{font-size:1.9em;line-height:1}
.ht-wm--st span{font-size:.55em;letter-spacing:.04em;text-transform:uppercase}
.ht-wm__s{font-weight:inherit}
.ht-wm__a{font-style:normal}
`;
