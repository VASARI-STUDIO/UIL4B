// Theme 33, Flyleaf: a quiet editorial edition. One page is a header line, a large title, the content, and a footer line with the folio, all on the brand's own
// ground and set in its own faces. The brand guidelines are 16:9 (the `slides` row) and the UI style guide is A4 portrait (the `guide` row); both are flow
// layout, so either holds at the other's size. Free draws a shorter edition with a credit line on each page (ctx.skeleton, set by the route from the plan).
// No photographs and no mockups: the places a photograph would sit are flat colour panels.
import { guidelines } from './brand-pages.js';
import { guide as uiGuide } from './lane-guide.js';
import { brandOrder, uiOrder, palette } from './helpers.js';
import { realCopy } from './real-copy.js';

export const meta = {
  id: '33-flyleaf', name: 'Flyleaf', tier: 'Free',
  brand: 'margin',
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 }, guidePage: { w: 794, h: 1123 },
  realCopy,  // the project's own name and colours print as words in the slot edition, not as placeholder boxes (see real-copy.js)
  chrome: { family: 'Hanken Grotesk', q: 'Hanken+Grotesk:wght@400;500;600', faces: [{ weight: 400, stem: 'HankenGrotesk-400' }, { weight: 500, stem: 'HankenGrotesk-500' }, { weight: 600, stem: 'HankenGrotesk-600' }] },
};

export { guidelines };
export const uikit = {};
export const guide = { ...uiGuide, order: (edition, ctx) => uiOrder(ctx) };
// the page list the document draws, by kind (the route reads it, with ctx.skeleton deciding the Free edition)
export const order = (kind, ctx) => (kind === 'guide' ? uiOrder(ctx) : brandOrder(ctx));
// the preview dialog asks for the engine's id for a page; this theme's own id for it
export const previewId = { palette: 'colour' };

export function css(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, W = ctx.weights, P = palette(ctx);
  const portrait = ctx.size.h > ctx.size.w, k = portrait ? ctx.size.w / 794 : ctx.size.h / 720;
  const px = (n) => `${Math.round(n * k * 10) / 10}px`;
  return `.pg.fl{--ground:${P.ground};--ink:${P.ink};--hair:${P.hair};--quiet:${P.quiet};--soft:${P.soft};--raised:${P.raised};--sunken:${P.sunken};
--chrome:'${meta.chrome.family}',sans-serif;--display:'${d.family}',serif;--body:'${b.family}',serif;--mono:'${m ? m.family : meta.chrome.family}',monospace;
background:var(--ground);color:var(--ink);font-family:var(--body);font-size:${px(15)};line-height:1.45;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;padding:${px(40)} ${px(56)} ${px(32)}}
.fl :where(h1,h2,h3,p,div){margin:0}
.fl .disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:0}
.fl .bf{font-family:var(--body);font-weight:${W.regular}}
.fl .fl-monof,.fl .fl-mono{font-family:var(--mono);font-size:${px(12.5)};line-height:1.4;font-variant-numeric:tabular-nums}
.fl-hd,.fl-ft{display:flex;justify-content:space-between;font:500 ${px(12)}/1.3 var(--chrome);color:var(--quiet)}
.fl-name{color:var(--ink)}
.fl-ft{padding-top:${px(12)};border-top:1px solid var(--hair)}
.fl-no{color:var(--ink);font-variant-numeric:tabular-nums}
.fl-bd{flex:1;min-height:0;display:flex;flex-direction:column;padding:${px(18)} 0 ${px(14)}}
.fl-ti{font:600 ${px(portrait ? 30 : 34)}/1.1 var(--chrome);letter-spacing:-.01em;margin-bottom:${px(18)}}
.fl-ct{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:${px(14)}}
.fl-credit{position:absolute;right:${px(56)};bottom:${px(8)};font:500 ${px(10.5)}/1 var(--chrome);color:var(--quiet);letter-spacing:.02em}
.fl-k{font:500 ${px(11.5)}/1.3 var(--chrome);color:var(--quiet);text-transform:uppercase;letter-spacing:.06em}
.fl-v{font-size:${px(15)}}
.fl-f{display:flex;flex-direction:column;gap:${px(3)}}
.fl-copy{font-size:${px(15)};line-height:1.45;max-width:62ch;text-wrap:pretty}
.fl-small{font:400 ${px(12)}/1.35 var(--chrome)}
.fl-h2{font-size:${px(30)};line-height:1.1}
.fl-h3{font-size:${px(19)};line-height:1.2}
.fl-big{font-size:${px(portrait ? 64 : 84)};line-height:1;text-wrap:balance}
.fl-grow{flex:1}
.fl-wrap{display:flex;flex-wrap:wrap;gap:${px(10)};align-items:center}
.fl-stack{display:flex;flex-direction:column;gap:${px(portrait ? 12 : 7)};min-height:0}
.fl-two{display:grid;grid-template-columns:${portrait ? '1fr' : '1fr 1fr'};gap:${px(24)};flex:1;min-height:0}
.fl-col{display:flex;flex-direction:column;gap:${px(14)};min-height:0}
.fl-grid{display:grid;gap:${px(14)};flex:1;min-height:0}
.fl-g2{grid-template-columns:1fr 1fr}
.fl-g4{grid-template-columns:repeat(4,1fr);grid-auto-rows:min-content}
.fl-cover{flex:1;display:flex;flex-direction:column;justify-content:center;gap:${px(14)}}
.fl-meta{font:500 ${px(13)}/1.3 var(--chrome);color:var(--quiet)}
.fl-strip{display:flex;height:var(--h,${px(96)});flex:none}
.fl-strip>span{display:block;min-width:0}
.fl-flat{border-radius:${px(6)};padding:${px(18)};display:flex;flex-direction:column;gap:${px(6)};min-height:0}
.fl-card{border-radius:${px(6)};padding:${px(16)};border:1px solid var(--hair);display:flex;flex-direction:column;gap:${px(6)};min-width:0}
.fl-flat.fl-card,.fl-flat.fl-sign{border:0;flex:1}
.fl-tiles{display:grid;gap:${px(12)};grid-template-columns:${portrait ? '1fr' : '1fr'};align-content:start}
.fl-tile{min-height:${px(90)}}
.fl-bar{display:flex;align-items:center;gap:${px(10)};padding:${px(8)} ${px(12)};justify-content:space-between;border-bottom:1px solid var(--hair)}
.fl-dot{width:${px(10)};height:${px(10)};border-radius:50%;flex:none}
.fl-browser{border:1px solid;border-radius:${px(6)};overflow:hidden;display:flex;flex-direction:column;min-height:0}
.fl-pagev{padding:${px(24)};display:flex;flex-direction:column;gap:${px(12)};flex:1;align-items:flex-start}
.fl-mail{border:1px solid;border-radius:${px(6)};padding:${px(18)};display:flex;flex-direction:column;gap:${px(10)};min-height:0}
.fl-rule{height:1px}
.fl-btn{display:inline-flex;align-items:center;justify-content:center;height:${px(38)};padding:0 ${px(18)};border-radius:${px(6)};font:500 ${px(14)}/1 var(--chrome)}
.fl-input{height:${px(38)};min-width:${px(140)};padding:0 ${px(12)};border:1.5px solid;border-radius:${px(6)};display:flex;align-items:center;font:400 ${px(13)}/1 var(--chrome)}
.fl-pill{padding:${px(5)} ${px(12)};border-radius:999px;font:500 ${px(12)}/1.2 var(--chrome)}
.fl-note{display:flex;justify-content:space-between;align-items:center;gap:${px(12)};padding:${px(14)} ${px(16)};border:1px solid;border-radius:${px(6)}}
.fl-lg{display:flex;flex-direction:column;gap:${px(6)};min-height:0}
.fl-lgbox{flex:1;min-height:${px(90)};display:flex;align-items:center;justify-content:center;padding:${px(12)};border-radius:${px(6)};border:1px solid var(--hair)}
.fl-facts{display:flex;gap:${px(32)};flex:none}
.fl-swatches{flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(${px(portrait ? 170 : 150)},1fr));gap:${px(10)}}
.fl-sw{border-radius:${px(6)};padding:${px(14)};display:flex;flex-direction:column;gap:${px(2)};min-height:${px(portrait ? 130 : 0)};border:1px solid var(--hair)}
.fl-swn{font-size:${px(18)};line-height:1.15}
.fl-spec{display:flex;gap:${px(20)};align-items:center}
.fl-aa{font-size:${px(54)};line-height:1;min-width:${px(86)}}
.fl-alpha{font-size:${px(13)};line-height:1.4;color:var(--soft)}
.fl-sample{border-top:1px solid var(--hair);padding-top:${px(14)};display:flex;flex-direction:column;gap:${px(8)}}
.fl-rows{display:flex;flex-direction:column;flex:1;min-height:0;justify-content:space-between}
.fl-row{display:grid;grid-template-columns:${portrait ? '1.2fr 1fr' : '1.6fr 1fr 1.4fr'};gap:${px(14)};align-items:baseline;border-bottom:1px solid var(--hair);padding-bottom:${px(6)}}
.fl-step{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fl-rowu{color:var(--soft)${portrait ? ';grid-column:1/-1' : ''}}
.fl-pgd{border:1px solid;align-self:start;max-height:100%;width:100%}
.fl-cols{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;height:100%}
.fl-pairs{display:flex;flex-direction:column;gap:${px(7)}}
.fl-pair{display:flex;align-items:center;gap:${px(12)};justify-content:space-between;border-bottom:1px solid var(--hair);padding-bottom:${px(5)}}
.fl-pl{flex:1;min-width:0}
.fl-aa-s{display:inline-flex;width:${px(34)};height:${px(26)};align-items:center;justify-content:center;border-radius:4px;font:600 ${px(12)}/1 var(--chrome);flex:none;border:1px solid var(--hair)}
.fl-chip{display:flex;justify-content:space-between;align-items:center;padding:0 ${px(12)};height:${px(portrait ? 34 : 28)};border-radius:4px;border:1px solid var(--hair)}
.fl-ic{display:flex;flex-direction:column;align-items:center;gap:${px(8)};padding:${px(14)} ${px(6)};border:1px solid;border-radius:6px}
.fl-screen{border:1px solid;border-radius:${px(8)};padding:0;flex:1;display:flex;flex-direction:column;min-height:0}
.fl-screen .fl-two{padding:${px(18)}}`;
}

export const guideCss = () => '';
