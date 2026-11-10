// Theme 04, Standards: a 1123 x 794 landscape graphic standards manual. Public Sans chrome at 11 to 13 px under a ruled running head,
// a 250 px title column of numbered clauses, the work to its right, and every size given in x. Brand faces appear only as the work.
import { guidelines } from './guidelines.js';
import { uikit } from './uikit.js';
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { cssStr, cssNum } from '../../engine/escape.js';
export { readMe, sheets } from './kit.js';

export const meta = {
  id: '04-standards', name: 'Standards', tier: 'Free', brand: 'two-shores',
  guidelinesPage: { w: 1123, h: 794 }, uikitPage: { w: 1123, h: 794 },
  chrome: { family: 'Public Sans', q: 'Public+Sans:wght@400;500;600;700', faces: [{ weight: 400, stem: 'PublicSans-400' }, { weight: 500, stem: 'PublicSans-500' }, { weight: 600, stem: 'PublicSans-600' }, { weight: 700, stem: 'PublicSans-700' }] },
};

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, cw = B.logo.colourways, buoy = cw['on-buoy'], rev = cw.reversed;
  const m = B.layout.margin, dw = cssNum(d.weights[d.weights.length - 1]);
  return `.pg{--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--quiet-panel:${L.quietOnSunken};--ground:${L.surface};--raised:${L.raised};--panel:${L.sunken};--hair:${L.divider};--accent:${L.action};--buoy:${buoy.ground};--buoy-ink:${buoy.name};--dark:${rev.ground};--dark-ink:${rev.name};--m:${m}px;
  --chrome:'${cssStr(meta.chrome.family)}',sans-serif;--display:'${cssStr(d.family)}',sans-serif;--body:'${cssStr(b.family)}',sans-serif;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-weight:${dw};letter-spacing:0;line-height:1}
.num{font-variant-numeric:tabular-nums}
.pg--std{padding:48px var(--m) 56px}
.hd{display:flex;justify-content:space-between;font-size:12px;border-top:1px solid var(--ink);padding-top:10px}
.fo{font-size:12px}
.side{position:absolute;left:var(--m);top:104px;width:250px}
.side h2{font-size:22px;font-weight:600;line-height:1.25;margin-bottom:10px}
.side .lead{font-size:13px;line-height:1.5;color:var(--quiet);margin-bottom:18px}
.rules{font-size:13px;line-height:1.5}
.rules li{display:grid;grid-template-columns:40px 1fr;padding:9px 0;border-top:1px solid var(--hair)}
.rules li span{color:var(--quiet);font-variant-numeric:tabular-nums}
.work{position:absolute;left:346px;right:var(--m);top:104px;bottom:56px}
.cap{font-size:12px;line-height:1.4;color:var(--quiet)}
.cap b{display:block;font-size:13px;font-weight:600;color:var(--ink)}
.on-panel .cap{color:var(--quiet-panel)}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:11px;line-height:1.4;background:var(--panel);color:var(--quiet-panel)}

/* the drawings (helpers.js): line work 1 px at any scale, fills from the palette; no photograph is licensed, so every picture is drawn */
.pg{--go:${ctx.roles.light.success.fg};--rope:${L.action}}
.dr{display:block;width:100%;height:100%;background:var(--ground)}
.dr *{vector-effect:non-scaling-stroke}
.dr-hull{fill:var(--ink)}
.dr-buoy{fill:var(--buoy)}
.dr-rope{fill:var(--rope)}
.dr-go{fill:var(--go)}
.dr-ring{stroke:var(--ink);stroke-width:1}
.dr-box{fill:var(--ground);stroke:var(--ink);stroke-width:1}
.dr-l{fill:none;stroke:var(--ink);stroke-width:1}
.dr-ld{fill:none;stroke:var(--ink);stroke-width:1;stroke-dasharray:3 3}
.dr-q{fill:none;stroke:var(--quiet);stroke-width:1}
.dr-qd{fill:none;stroke:var(--quiet);stroke-width:1;stroke-dasharray:2 3}
.dr-pl{fill:none;stroke:var(--dark-ink);stroke-width:1}
.dr-slot{fill:none;stroke-width:1.5;stroke-dasharray:4 3}
.dr-tl{position:absolute;left:var(--m);right:var(--m);top:104px;display:grid;grid-template-columns:250px minmax(0,1fr);gap:0 40px;align-items:baseline}
.dr-tl h2{font-size:22px;font-weight:600;line-height:1.25}
.dr-tl .lead{font-size:13px;line-height:1.5;color:var(--quiet);max-width:72ch}
.dr-wk{position:absolute;left:var(--m);right:var(--m);top:156px;bottom:56px}

/* cover: binder tabs down the right edge, one per section, the way the dividers stand out of a ring binder */
.g-tabs{position:absolute;right:0;top:48px;bottom:56px;width:30px;display:flex;flex-direction:column;gap:4px}
.g-tabs li{flex:1;display:flex;align-items:flex-start;justify-content:center;padding-top:8px;background:var(--dark);color:var(--dark-ink);font-size:13px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;border-radius:2px 0 0 2px}

/* cover */
.pg--cover{display:flex;flex-direction:column;justify-content:space-between;padding:48px var(--m) 56px;background:var(--buoy);color:var(--buoy-ink)}
.cv-top{display:grid;grid-template-columns:1fr 1fr;gap:40px;border-top:1px solid var(--buoy-ink);padding-top:14px}
.cv-top h1{font-size:28px;font-weight:600;line-height:1.2}
.cv-top p{font-size:13px;margin-top:6px;max-width:44ch}
.sec{justify-self:end;width:240px;font-size:13px;line-height:1.9;font-variant-numeric:tabular-nums}
.sec span{display:inline-block;width:22px}
.cv-bot{display:flex;justify-content:space-between;align-items:flex-end}
.cv-bot p{font-size:13px;line-height:1.6;text-align:right}

/* cover: the logo on the page's own margins, dimensioned in x, and a ruler in x along the foot */
.pg.g-cv{justify-content:flex-start}
.g-cvm{position:relative;margin-top:auto}
.g-cvd{position:absolute;left:calc(var(--m) * -1);top:0;overflow:visible}
.g-cvl{position:absolute}
.g-cvn{position:absolute;right:0;bottom:0;font-size:13px;line-height:1.6;text-align:right}
.g-ruler{display:block;margin-top:28px;overflow:visible}
.g-cvd path,.g-ruler path{stroke:var(--buoy-ink);stroke-width:1;fill:none}
.g-cvd text,.g-ruler text{font:400 11px var(--chrome);fill:var(--buoy-ink);font-variant-numeric:tabular-nums}

/* contents: the manual's index in two columns, each section a ruled head, each page a clause with its folio on a leader */
.g-ixs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;align-items:start}
.g-ixs>ol{display:flex;flex-direction:column;gap:14px}
.g-ixh{display:grid;grid-template-columns:40px minmax(0,1fr) auto;border-top:1px solid var(--ink);padding:6px 0 6px;font-size:15px;font-weight:600;line-height:1.3}
.g-ixh .num:first-child{font-weight:400;color:var(--quiet)}
.g-ix ol li{display:grid;grid-template-columns:40px auto minmax(0,1fr) auto;height:24px;align-items:end;padding-bottom:4px;border-top:1px solid var(--hair);font-size:13px;line-height:1.3}
.g-ix ol li .num:first-child{color:var(--quiet);font-size:12px}
.g-ix ol li i{align-self:end;height:0;margin:0 8px 5px;border-bottom:1px dotted var(--quiet)}

/* logo versions: the construction sheet, every version at one scale on a grid of x, a heavier line every 6x */
.g-vs{display:flex;flex-direction:column;gap:4px}
.g-vr{display:block}
.g-vr text{font:400 11px var(--chrome);fill:var(--quiet);font-variant-numeric:tabular-nums}
.g-sheet{position:relative;box-shadow:0 0 0 1px var(--hair)}
.g-vg{position:absolute;left:0;top:0}
.g-vg pattern:first-child path{stroke:var(--hair);stroke-width:.6}
.g-vg pattern:last-child path{stroke:var(--hair);stroke-width:1.25}
.g-vt{position:absolute;box-sizing:border-box}
.g-vt.hairline{box-shadow:inset 0 0 0 1px var(--quiet)}
.g-tg{position:absolute;left:12px;top:10px;font-size:12px;line-height:1.2}
.g-vl{position:absolute}
.g-vd{position:absolute;left:0;top:0}
.g-vd path{stroke:currentColor;stroke-width:1;fill:none}
.g-vd text{font:400 11px var(--chrome);fill:currentColor;stroke:var(--g);stroke-width:4px;paint-order:stroke;font-variant-numeric:tabular-nums}
.g-vk{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:10px 14px 0;background:var(--ground);border-top:1px solid var(--ink);font-size:12px;line-height:1.5}
.g-vk p{max-width:34ch}
.g-vk b{font-weight:600}

/* contrast: a clause per pair, the pair set as a sample at its smallest size */
.g-crs{display:flex;flex-direction:column}
.g-cr{display:grid;grid-template-columns:48px 300px minmax(0,1fr);gap:0 16px;align-items:center;height:44px;border-top:1px solid var(--hair)}
.g-cr:first-child{border-top-color:var(--ink)}
.g-cn{font-size:12px;color:var(--quiet)}
.g-cs{margin:0;height:34px;display:flex;align-items:center;padding:0 12px;border-radius:2px;font-family:var(--body);line-height:1;white-space:nowrap;overflow:hidden}
.g-ci{display:grid;grid-template-columns:80px minmax(0,1fr);align-items:baseline;gap:0 4px;line-height:1.35}
.g-cr1{grid-row:1/3;font-size:18px;font-weight:600;white-space:nowrap}
.g-cu{font-size:13px;font-weight:600}
.g-ci .cap{grid-column:2}
.pg .g-nh{margin:18px 0 10px;border-top-color:var(--ink)}
.g-nus{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 16px}
.g-nu{display:flex;gap:8px;align-items:center;min-width:0}
.g-nsw{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--hair)}
.g-nsw i{display:block;width:10px;height:10px;border-radius:1px}
.g-nu .cap b{display:inline;margin-right:6px}
.g-nu .cap{white-space:nowrap}

/* business card, shown at 5 px to the millimetre: x is 4 px, so 0.8 mm */
.g-cps{display:flex;flex-direction:column;gap:20px}
.g-cp{display:grid;grid-template-columns:490px minmax(0,1fr);gap:0 24px;align-items:start}
.g-cd{position:relative}
.g-co{position:absolute;left:0;top:0;overflow:visible}
.g-co path{stroke:var(--quiet);stroke-width:1;fill:none}
.g-co text{font:400 11px var(--chrome);fill:var(--quiet)}
.g-cc{position:absolute;left:0}
.g-cm{position:absolute;left:0;top:0}
.g-cm path,.g-cm .g-z{stroke:currentColor;stroke-width:1;fill:none}
.g-cm .g-z{stroke-dasharray:4 3}
.g-cm text{font:400 11px var(--chrome);fill:currentColor;font-variant-numeric:tabular-nums}
.g-cp figcaption{margin-top:26px;border-top:1px solid var(--ink);padding-top:8px}
.g-ch{display:grid;grid-template-columns:40px 1fr;font-size:13px}
.g-ch .num{color:var(--quiet)}
.g-ch b{font-weight:600}
.g-cp figcaption>.cap{padding-left:40px}
.g-sch{display:grid;grid-template-columns:minmax(0,1fr) auto;margin:12px 0 0}
.g-sch dt,.g-sch dd{margin:0;padding:6px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.3}
.g-sch dd{text-align:right;padding-left:12px}
.g-xn{margin-top:12px;padding-left:0}
.h3{font-size:13px;font-weight:600;margin:28px 0 12px;border-top:1px solid var(--hair);padding-top:10px}
.card{width:450px;height:275px;border-radius:2px;position:relative;overflow:hidden;flex:none}
.card--front{background:var(--dark);color:var(--dark-ink)}
.card--back{background:var(--raised);color:var(--ink);box-shadow:inset 0 0 0 1px var(--hair)}
.card--front .logo{position:absolute;left:40px;top:50%;transform:translateY(-50%)}
.card--front .line{position:absolute;left:40px;bottom:28px;font-family:var(--display);font-weight:${dw};font-size:20px;line-height:1}
.card--back .mark{position:absolute;right:28px;top:28px}
.card--back .who{position:absolute;left:28px;bottom:28px;font-family:var(--body)}
.card--back .nm{font-size:16px;font-weight:600;line-height:1.2}
.card--back .rl{font-size:13px;color:var(--quiet);margin-top:2px}
.card--back .ct{font-size:13px;margin-top:12px;line-height:1.5}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx);
}

export { guidelines, uikit, brandBook, bookCss };
