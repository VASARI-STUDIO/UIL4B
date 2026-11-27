// Theme 34, Set Square: a standards manual. Every sheet is ruled in ink with a spot-colour edge down the left, a title block on the left split from the content
// by a rule, square corners and 2px ink outlines on every control, and blueprint grid paper behind the logo and the page grid. The brand guidelines are 16:9
// (the `slides` row) and the UI style guide is A4 portrait (the `guide` row); both are flow layout, so either holds at the other's size. Pro only; a non-Pro
// account draws a shorter edition with a credit line on each page (ctx.skeleton, set by the route from the plan, never blurred).
// No photographs and no mockups: the places a photograph would sit are flat colour panels, and the cover is a flat drawing of steps.
import { guidelines } from './brand-pages.js';
import { guide as uiGuide } from './lane-guide.js';
import { brandOrder, uiOrder, palette } from './helpers.js';

export const meta = {
  id: '34-set-square', name: 'Set Square', tier: 'Pro',
  brand: 'plumbline',
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 }, guidePage: { w: 794, h: 1123 },
  chrome: { family: 'Manrope', q: 'Manrope:wght@400;500;600', faces: [{ weight: 400, stem: 'Manrope-400' }, { weight: 500, stem: 'Manrope-500' }, { weight: 600, stem: 'Manrope-600' }] },
};

export { guidelines };
export const uikit = {};
export const guide = { ...uiGuide, order: (edition, ctx) => uiOrder(ctx) };
// the page list the document draws, by kind (the route reads it, with ctx.skeleton deciding the shorter edition)
export const order = (kind, ctx) => (kind === 'guide' ? uiOrder(ctx) : brandOrder(ctx));
// the preview dialog asks for the engine's id for a page; this theme's own id for it
export const previewId = { palette: 'colour' };

export function css(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, W = ctx.weights, P = palette(ctx);
  const portrait = ctx.size.h > ctx.size.w, k = portrait ? ctx.size.w / 794 : ctx.size.h / 720;
  const px = (n) => `${Math.round(n * k * 10) / 10}px`;
  const grid = `background-image:linear-gradient(var(--hair) 1px,transparent 1px),linear-gradient(90deg,var(--hair) 1px,transparent 1px);background-size:${px(22)} ${px(22)}`;
  return `.pg.ss{--ground:${P.ground};--ink:${P.ink};--hair:${P.hair};--quiet:${P.quiet};--soft:${P.soft};--raised:${P.raised};--sunken:${P.sunken};--spot:${P.spot};
--chrome:'${meta.chrome.family}',sans-serif;--display:'${d.family}',serif;--body:'${b.family}',serif;--mono:'${m ? m.family : meta.chrome.family}',monospace;
background:var(--ground);color:var(--ink);font-family:var(--body);font-size:${px(15)};line-height:1.45;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;padding:${px(24)} ${px(46)} ${px(20)} ${px(46)};border-left:${px(14)} solid var(--spot);box-sizing:border-box;position:relative}
.ss :where(h1,h2,h3,p,div){margin:0}
.ss .disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:-.035em}
.ss .bf{font-family:var(--body);font-weight:${W.regular}}
.ss .ss-mono{font-family:var(--mono);font-size:${px(12.5)};line-height:1.4;font-variant-numeric:tabular-nums}
.ss-hd,.ss-ft{display:flex;justify-content:space-between;gap:${px(12)};font:600 ${px(12)}/1.3 var(--chrome);color:var(--quiet)}
.ss-hd{padding-bottom:${px(10)};border-bottom:${px(3)} solid var(--ink);color:var(--ink)}
.ss-ft{padding-top:${px(10)}}
.ss-no{color:var(--ink);font-variant-numeric:tabular-nums}
.ss-in{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,.49fr) minmax(0,1.51fr);border-bottom:${px(2)} solid var(--ink)}
.ss-head{display:flex;flex-direction:column;justify-content:space-between;gap:${px(12)};padding:${px(25)} ${px(16)} ${px(15)} 0;border-right:1px solid var(--ink);min-width:0}
.ss-ti{font-size:${px(portrait ? 27 : 42)};line-height:1.02;overflow-wrap:anywhere}
.ss-sheet{font:600 ${px(11)}/1.3 var(--chrome);color:var(--quiet);text-transform:uppercase;letter-spacing:.06em}
.ss-ct{min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:${px(14)};padding:${px(22)} 0 ${px(22)} ${px(26)}}
.ss-credit{position:absolute;right:${px(46)};bottom:${px(6)};font:600 ${px(10.5)}/1 var(--chrome);color:var(--quiet);letter-spacing:.02em}
.ss-k{font:600 ${px(11)}/1.3 var(--chrome);color:var(--quiet);text-transform:uppercase;letter-spacing:.06em}
.ss-v{font-size:${px(15)}}
.ss-f{display:flex;flex-direction:column;gap:${px(3)}}
.ss-copy{font-size:${px(15)};line-height:1.45;max-width:58ch;text-wrap:pretty}
.ss-small{font:400 ${px(12)}/1.35 var(--chrome)}
.ss-h2{font-size:${px(28)};line-height:1.02}
.ss-h3{font-size:${px(19)};line-height:1.1}
.ss-big{font-size:${px(portrait ? 56 : 76)};line-height:.95;text-wrap:balance;overflow-wrap:anywhere}
.ss-grow{flex:1}
.ss-wrap{display:flex;flex-wrap:wrap;gap:${px(10)};align-items:center}
.ss-stack{display:flex;flex-direction:column;gap:${px(portrait ? 10 : 7)};min-height:0}
.ss-two{display:grid;grid-template-columns:${portrait ? '1fr' : '1fr 1fr'};gap:${px(22)};flex:1;min-height:0}
.ss-two2{display:grid;grid-template-columns:1fr 1fr;gap:${px(portrait ? 14 : 22)};flex:1;min-height:0;align-content:start}
.ss-col{display:flex;flex-direction:column;gap:${px(14)};min-height:0}
.ss-cover{flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:${px(14)};min-height:0}
.ss-covtitle{border-top:${px(5)} solid var(--ink);padding-top:${px(14)};display:flex;flex-direction:column;gap:${px(14)}}
.ss-meta{font:600 ${px(13)}/1.3 var(--chrome);color:var(--quiet)}
.ss-plan{flex:1;min-height:0;border-block:1px solid var(--ink);display:flex;align-items:center;justify-content:center;padding:${px(8)};${grid}}
.ss-plan svg{height:100%;max-height:${px(portrait ? 420 : 300)};width:auto;max-width:100%}
.ss-key{display:flex;justify-content:space-between;gap:${px(12)};border-top:1px solid var(--ink);padding-top:${px(10)};flex:none}
.ss-strip{display:flex;height:var(--h,${px(44)});flex:none;border:1px solid var(--ink)}
.ss-strip>span{display:block;min-width:0}
.ss-flat{padding:${px(16)};display:flex;flex-direction:column;gap:${px(6)};min-height:0;border:1px solid var(--ink)}
.ss-card{padding:${px(14)};border:1px solid var(--ink);display:flex;flex-direction:column;gap:${px(6)};min-width:0;margin:0 -1px -1px 0}
.ss-tiles{display:grid;gap:${px(10)};grid-template-columns:1fr;align-content:start}
.ss-tile{min-height:${px(80)}}
.ss-bar{display:flex;align-items:center;gap:${px(10)};padding:${px(8)} ${px(12)};justify-content:space-between;border-bottom:1px solid var(--ink)}
.ss-dot{width:${px(10)};height:${px(10)};flex:none;background:var(--ink)}
.ss-browser{border:1px solid var(--ink);overflow:hidden;display:flex;flex-direction:column;min-height:0}
.ss-pagev{padding:${px(22)};display:flex;flex-direction:column;gap:${px(12)};flex:1;align-items:flex-start}
.ss-mail{border:1px solid var(--ink);border-left:${px(8)} solid var(--spot);padding:${px(18)};display:flex;flex-direction:column;gap:${px(10)};min-height:0}
.ss-rule{height:1px}
.ss-btn{display:inline-flex;align-items:center;justify-content:center;height:${px(38)};padding:0 ${px(20)};font:600 ${px(14)}/1 var(--chrome)}
.ss-input{height:${px(38)};min-width:${px(140)};padding:0 ${px(12)};border:2px solid;display:flex;align-items:center;font:400 ${px(13)}/1 var(--chrome)}
.ss-pill{padding:${px(5)} ${px(12)};font:600 ${px(12)}/1.2 var(--chrome);border:1px solid}
.ss-note{display:flex;justify-content:space-between;align-items:center;gap:${px(12)};padding:${px(12)} ${px(16)};border:1px solid;border-left-width:${px(8)}}
.ss-lg{display:flex;flex-direction:column;gap:${px(6)};min-height:0}
.ss-lgbox{flex:1;min-height:${px(90)};display:flex;align-items:center;justify-content:center;padding:${px(12)};border:1px solid var(--ink);${grid}}
.ss-facts{display:flex;gap:${px(28)};flex:none;border-top:1px solid var(--ink);padding-top:${px(12)}}
.ss-swatches{flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(${px(portrait ? 200 : 190)},1fr));gap:0;align-content:start}
.ss-sw{padding:${px(12)};display:flex;flex-direction:column;gap:${px(2)};min-height:${px(portrait ? 120 : 150)};border:1px solid var(--ink);margin:0 -1px -1px 0}
.ss-swn{font-size:${px(18)};line-height:1.1}
.ss-spec{display:flex;gap:${px(20)};align-items:center;border-bottom:1px solid var(--hair);padding-bottom:${px(8)}}
.ss-aa{font-size:${px(50)};line-height:1;min-width:${px(portrait ? 74 : 86)}}
.ss-alpha{font-size:${px(13)};line-height:1.4;color:var(--soft)}
.ss-sample{border-left:${px(14)} solid var(--spot);padding-left:${px(16)};display:flex;flex-direction:column;gap:${px(8)}}
.ss-rows{display:flex;flex-direction:column;flex:1;min-height:0;justify-content:space-between}
.ss-row{display:grid;grid-template-columns:${portrait ? '1.1fr 1fr' : '1.5fr 1fr 1.4fr'};gap:${px(14)};align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:${px(6)}}
.ss-step{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ss-rowu{color:var(--soft)${portrait ? ';grid-column:1/-1' : ''}}
.ss-pgd{border:1px solid var(--ink);align-self:start;max-height:100%;width:100%;box-sizing:border-box;${grid}}
.ss-cols{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;height:100%}
.ss-pairs{display:flex;flex-direction:column;gap:${px(6)}}
.ss-pair{display:flex;align-items:center;gap:${px(12)};justify-content:space-between;border-bottom:1px solid var(--hair);padding-bottom:${px(5)}}
.ss-pl{flex:1;min-width:0}
.ss-aa-s{display:inline-flex;width:${px(34)};height:${px(26)};align-items:center;justify-content:center;font:600 ${px(12)}/1 var(--chrome);flex:none;border:1px solid var(--ink)}
.ss-chip{display:flex;justify-content:space-between;align-items:center;padding:0 ${px(10)};height:${px(28)};border:1px solid var(--ink);margin-bottom:-1px}
.ss-ic{display:flex;flex-direction:column;align-items:center;gap:${px(8)};padding:${px(14)} ${px(6)};border:1px solid;margin:0 -1px -1px 0}
.ss-grid{display:grid;gap:0;align-content:start;padding:0 1px 1px 0}
.ss-g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.ss-g2{grid-template-columns:repeat(2,minmax(0,1fr));gap:${px(14)}}
.ss-screen{border:2px solid;padding:0;flex:1;display:flex;flex-direction:column;min-height:0}
.ss-screen .ss-two{padding:${px(16)}}`;
}

export const guideCss = () => '';
