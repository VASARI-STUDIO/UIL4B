// Theme 29, Blueprint (round 1): A3 landscape drawing sheets. Cool drafting film, a zone-referenced frame, a title block at the foot, and redlines
// in the brand's action colour only where a true size is printed. Chrome is Chivo and Chivo Mono (both SIL Open Font Licence 1.1, from Google Fonts).
import { guidelines } from './guidelines.js';

// the lettering sheet draws the brand's unused body weights faint beside the ones in use; the server fixes them to Commissioner's spare weights (plumbline)
const spare = [100, 200, 300, 700, 900].map((weight) => ({ family: 'Commissioner', weight, stem: `Commissioner-${weight}`, q: 'Commissioner:wght@100;200;300;400;500;600;700;900' }));

export const meta = {
  id: '29-blueprint', name: 'Drawing Sheet', tier: 'Pro', brand: 'plumbline',
  guidelinesPage: { w: 1587, h: 1123 }, uikitPage: { w: 1587, h: 1123 },
  chrome: { family: 'Chivo', q: 'Chivo:wght@400;500', faces: [{ weight: 400, stem: 'Chivo-400' }, { weight: 500, stem: 'Chivo-500' }] },
  fonts: [{ family: 'Chivo Mono', weight: 400, stem: 'ChivoMono-400', q: 'Chivo+Mono:wght@400' }, ...spare],
};

// The film and ink are the sheet's own material, the same for every brand (the spec's theme exception); --red is computed from the brand's action in guidelines.js.
export const SHEET = { film: '#EEF1F2', film2: '#E1E6E9', hair: '#C3CBD0', ink: '#1F2A33', quiet: '#56636D', faint: '#7C8891' };

// the redline colour: the brand's action, stepped down in OKLCH lightness until it holds 4.5 : 1 on the film; a blue-ish or grey action falls back to the theme's correction red
export function redOf(ctx) {
  const C = ctx.C, L = ctx.roles.light, o = C.toOklch(L.action);
  const gap = Math.abs(o.H - 245), hueGap = Math.min(gap, 360 - gap);
  if (hueGap < 35 || o.C < 0.06) return '#B23A2A';
  let hex = L.action;
  // a darker step than the action itself (7 : 1 on the film), so a redline never reads as the brand's own bright colour sitting beside it
  for (let l = o.L; C.ratio(hex, SHEET.film) < 7 && l > 0.2; l -= 0.02) hex = C.fromOklch(l, o.C, o.H);
  return hex;
}

function baseCss(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, rev = B.logo.colourways.reversed;
  const red = redOf(ctx);
  return `.pg{--film:${SHEET.film};--film2:${SHEET.film2};--hair:${SHEET.hair};--ink:${SHEET.ink};--quiet:${SHEET.quiet};--faint:${SHEET.faint};--red:${red};
  --b-ground:${L.raised};--b-panel:${L.surface};--b-text:${L.text};--b-quiet:${L.quiet};--b-action:${L.action};--b-rev:${rev.ground};--b-rev-text:${rev.name};
  --chrome:'Chivo',sans-serif;--cmono:'Chivo Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--bmono:'${(m || b).family}',monospace;
  background:var(--film);color:var(--ink);font-family:var(--chrome);font-size:13px;line-height:20px;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg .a{position:absolute}
.pg .nw{white-space:nowrap}
.pg .zr{position:absolute;font:400 12px/14px var(--cmono);color:var(--quiet);text-align:center}
.pg .tl{position:absolute;font:400 12px/16px var(--chrome);letter-spacing:.01em;color:var(--quiet)}
.pg .tv{position:absolute;font:400 13px/18px var(--chrome);color:var(--ink)}
.pg .v{font-family:var(--cmono)}
.pg .tv.t{font:500 22px/26px var(--chrome);letter-spacing:-.005em;white-space:nowrap}
.pg .sn{position:absolute;font:400 22px/26px var(--cmono)}.pg .sn small{font-size:13px;color:var(--quiet)}
.pg .c-note{font:400 13px/20px var(--chrome);color:var(--ink);text-wrap:pretty}
.pg .c-quiet{color:var(--quiet)}
.pg .c-head{font:500 15px/22px var(--chrome);color:var(--ink)}
.pg .c-label{font:400 12px/16px var(--chrome);letter-spacing:.01em;color:var(--quiet)}
.pg .c-mono{font:400 12px/16px var(--cmono);color:var(--ink)}
.pg .rv{position:absolute;font:400 12px/12px var(--cmono);color:var(--red);white-space:nowrap}
.pg .hl{position:absolute;height:1px;background:var(--hair)}
.pg .fld{position:absolute;overflow:hidden}
.pg .fld.edge{box-shadow:inset 1px 0 0 var(--hair),inset -1px 0 0 var(--hair)}
.pg .sw{position:absolute;width:12px;height:12px;box-shadow:inset 0 0 0 1px var(--hair)}
.pg .bn{font-family:var(--body)}.pg .bd{font-family:var(--display);font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-.01em;color:var(--b-text);white-space:nowrap}
`;
}
export { guidelines };

export const uikit = {};

// ---- lane modules (overnight build, 11 Nov): each builder adds lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __bk from './lane-bk.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g4 from './lane-g4.js';
import * as __g5 from './lane-g5.js';
import * as __hg from './lane-hg.js';
import * as __hk from './lane-hk.js';
import * as __kt from './lane-kt.js';
import * as __u1 from './lane-u1.js';
import * as __u2 from './lane-u2.js';
import * as __u3 from './lane-u3.js';

const __L = __mergeLanes([__bk, __g1, __g2, __g3, __g4, __g5, __hg, __hk, __kt, __u1, __u2, __u3]);
Object.assign(guidelines, __L.guidelines);
Object.assign(uikit, __L.uikit);
if (__L.fonts.length) meta.fonts = [...(meta.fonts || []), ...__L.fonts];
export const css = __laneCss(baseCss, __L);
export const brandBook = __L.brandBook || undefined;
export const bookCss = __L.bookCss || undefined;
export const readMe = __L.readMe || undefined;
export const sheets = __L.sheets || undefined;
export const guideSite = __L.guideSite || undefined;
export const kitSite = __L.kitSite || undefined;
