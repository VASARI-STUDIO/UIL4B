// Theme 26, Notebook (Pro): the guidelines are an A5 sewn notebook, one open spread per page (1118 x 794, two leaves of 559 x 794).
// The notebook is the theme: a cool white stock, a grey 5 mm dot grid (19 px), a centre fold with its thread. Everything that is the brand is
// stuck in: prints of its own applications held by square-cut strips of its action-colour tape, cards cut from its own grounds, and the
// palette as full-height lengths of tape. Nothing is rotated, torn or handwritten, and every edge lands on a dot.
// Round 1 builds the six gate pages; the rest of the 33 pages, the UI kit and the brand book come in round 2.
import { guidelines } from './guidelines.js';
import { nb, tokens, CHROME_STEMS } from './helpers.js';

// The typefaces page greys out the weights the brand does not load, so those weights must exist. The server builds this theme from the Offcut
// sample brand, whose body face (Onest) loads 400 to 600: the lettering page asks for the 300 and 700 files beside them.
const spare = [300, 700].map((weight) => ({ family: 'Onest', weight, stem: `Onest-${weight}`, q: 'Onest:wght@400;500;600' }));

export const meta = {
  id: '26-notebook', name: 'Notebook', tier: 'Pro', brand: 'offcut',
  guidelinesPage: { w: 1118, h: 794 }, uikitPage: { w: 1118, h: 794 },
  chrome: {
    family: 'Atkinson Hyperlegible Next', q: 'Atkinson+Hyperlegible+Next:wght@400;600',
    faces: [{ weight: 400, stem: CHROME_STEMS[400] }, { weight: 600, stem: CHROME_STEMS[600] }],
  },
  fonts: [
    { family: 'Atkinson Hyperlegible Mono', weight: 400, stem: CHROME_STEMS.mono, q: 'Atkinson+Hyperlegible+Mono:wght@400' },
    ...spare,
  ],
};

export { guidelines };
export const uikit = {};

function baseCss(ctx) {
  const B = ctx.brand, N = nb(ctx), T = tokens(ctx), W = ctx.weights;
  const d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const font = (t, w, family) => `font-family:${family};font-weight:${w};font-size:${t.size}px;line-height:${t.lh}px;letter-spacing:${t.track}em`;
  const tapeA = `rgb(${[1, 3, 5].map((k) => parseInt(N.tape.slice(k, k + 2), 16)).join(' ')} / 0.92)`;
  const cn = `'${meta.chrome.family}',sans-serif`, cm = `'Atkinson Hyperlegible Mono',monospace`;
  return `.pg{--paper:${N.paper};--dot:${N.dot};--fold:${N.fold};--graphite:${N.graphite};--graphite-ink:${N.graphiteInk};--unused:${N.unused};
  --chrome:'${meta.chrome.family}',sans-serif;--tape:${N.tape};--tape-a:${tapeA};--tape-label:${N.tapeLabel};--thread:${N.thread};--ink:${N.text};
  --display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m ? m.family : 'Atkinson Hyperlegible Mono'}',monospace;
  background:var(--paper);color:var(--ink);font-family:var(--body);font-size:13px;line-height:19px;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg svg.dots,.pg svg.fold{position:absolute;left:0;top:0;pointer-events:none}
.pg svg.fold{z-index:5}
.leaf{position:absolute;top:0;width:559px;height:794px}
.leaf.v{left:0}
.leaf.r{left:559px}
.leaf>*{position:absolute}
.num{font-variant-numeric:tabular-nums}

/* type: every line box is a whole number of units, so each line sits on a dot row */
.t{position:absolute;white-space:nowrap}
.leaf>.t{z-index:4}
.ln{display:block;white-space:nowrap}
/* the dots stop around every run of text: block() in helpers.js draws a .ko box behind each line on the paper, with the nearest dot a full pitch
   (19 px) from the text's end. Text in a field or card has its own ground and no box. */
.ko{background:var(--paper);z-index:0}
.c-head{${font(T['c-head'], 400, cn)};color:var(--graphite)}
.c-label{${font(T['c-label'], 600, cn)}}
.c-label13{${font(T['c-label13'], 600, cn)}}
.c-note{${font(T['c-note'], 400, cn)};color:var(--graphite)}
.c-strong{${font(T['c-strong'], 600, cn)};color:var(--graphite-ink)}
.c-mono{${font(T['c-mono'], 400, cm)};color:var(--graphite);font-variant-numeric:tabular-nums}
.b-title{${font(T['b-title'], W.heading, 'var(--display)')};font-stretch:${d.stretch || 100}%;color:var(--ink)}
.b-line{${font(T['b-line'], W.strong, 'var(--body)')};color:var(--ink)}
.b-name{${font(T['b-name'], W.strong, 'var(--body)')};color:var(--ink)}
.b-body{${font(T['b-body'], W.regular, 'var(--body)')};color:var(--ink)}
.b-stack{${font(T['b-stack'], W.regular, 'var(--body)')}}
.b-hero{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:-0.02em;color:var(--ink)}
.b-hex{${m ? `font-family:var(--mono);font-weight:${m.weights[0]};font-size:13px;line-height:19px` : ''};color:var(--ink)}
.num{font-variant-numeric:tabular-nums}

/* tape: the action colour at 0.92 (the print or the paper shows faintly through), square cut, 0 degrees, and a 1 px darker edge along its
   bottom. The text stays opaque: the alpha is in the background colour only. */
.tape{background:var(--tape-a);color:var(--tape-label);z-index:3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tape::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:oklch(0.3 0.01 245 / 0.10)}
.strip{padding:0 10px;line-height:38px}
.strip.c-label13{padding:0 10px}
.tab{padding:0 10px;line-height:19px}
.piece{padding:0}

/* a print: borderless, square, stuck down */
.print{overflow:hidden;background:var(--paper);z-index:1}
.print img,.print svg.pl{position:absolute;display:block;max-width:none}
.stuck{box-shadow:0 1px 0 oklch(0.3 0.01 245 / 0.10),0 4px 10px -4px oklch(0.3 0.01 245 / 0.22)}

/* a length of tape run full height, and a cut card */
.field{z-index:2}
.field.edge{border-left:1px solid var(--fold);border-right:1px solid var(--fold)}
.card{z-index:1}
.card.edge{border:1px solid var(--fold)}
.card .when{position:absolute;left:12px;bottom:12px;font-family:var(--body);font-weight:${W.regular};font-size:11px;line-height:14px}
.m{font-family:${cm};font-weight:400;font-size:12px;color:var(--graphite-ink);letter-spacing:0;word-spacing:-0.3em;font-variant-numeric:tabular-nums}
.rule{background:var(--graphite)}
.ph-b>.ph-l{font-weight:600}
`;
}

// ---- lane modules (overnight build, 11 Nov): each builder adds lane-<name>.js beside this file, merged in file-name order (engine/lanes.js) ----
import { mergeLanes as __mergeLanes, laneCss as __laneCss } from '../../engine/lanes.js';
import * as __bk_css from './lane-bk-css.js';
import * as __bk from './lane-bk.js';
import * as __g1_art from './lane-g1-art.js';
import * as __g1 from './lane-g1.js';
import * as __g2 from './lane-g2.js';
import * as __g3 from './lane-g3.js';
import * as __g4 from './lane-g4.js';
import * as __g5 from './lane-g5.js';
import * as __hg_css from './lane-hg-css.js';
import * as __hg_parts from './lane-hg-parts.js';
import * as __hg from './lane-hg.js';
import * as __hk_comp from './lane-hk-comp.js';
import * as __hk_css from './lane-hk-css.js';
import * as __hk_found from './lane-hk-found.js';
import * as __hk_parts from './lane-hk-parts.js';
import * as __hk_screens from './lane-hk-screens.js';
import * as __hk from './lane-hk.js';
import * as __kt from './lane-kt.js';
import * as __u1 from './lane-u1.js';
import * as __u2 from './lane-u2.js';
import * as __u3 from './lane-u3.js';

const __L = __mergeLanes([__bk_css, __bk, __g1_art, __g1, __g2, __g3, __g4, __g5, __hg_css, __hg_parts, __hg, __hk_comp, __hk_css, __hk_found, __hk_parts, __hk_screens, __hk, __kt, __u1, __u2, __u3]);
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
