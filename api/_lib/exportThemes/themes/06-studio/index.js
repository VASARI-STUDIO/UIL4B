// Theme 06, Studio: a small-format design-system book. White pages, Geist chrome at 12 to 13 px, a running head with the folio,
// Steel panels holding the brand's real UI, drawn dimension marks. Everything below reads roles from the brand; no hex or brand name is written here.
import { guidelines } from './guidelines.js';
import { uikit } from './uikit.js';
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { cssStr } from '../../engine/escape.js';

export const meta = {
  id: '06-studio', name: 'Studio', tier: 'Pro', brand: 'offcut',
  guidelinesPage: { w: 794, h: 1123 }, uikitPage: { w: 794, h: 1123 },
  pageSizes: { 'screen-light': [1280, 760], 'screen-dark': [1280, 760] },
  chrome: { family: 'Geist', q: 'Geist:wght@400;500;600', faces: [{ weight: 400, stem: 'Geist-400' }, { weight: 500, stem: 'Geist-500' }, { weight: 600, stem: 'Geist-600' }] },
};

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, rev = B.logo.colourways.reversed, R = B.ui.radius;
  const m = B.layout.margin, nr = ctx.neutralRamp;
  return `.pg{--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--quiet-panel:${L.quietOnSunken};--ground:${L.surface};--panel:${L.sunken};--hair:${L.divider};--hair2:${nr[200]};--line:${nr[300]};--accent:${L.action};--accent-ink:${L.actionLabel};--dark:${rev.ground};--dark-ink:${rev.name};--m:${m}px;--rc:${R.control}px;--rk:${R.card}px;
  --chrome:'${cssStr(meta.chrome.family)}',sans-serif;--display:'${cssStr(d.family)}',sans-serif;--body:'${cssStr(b.family)}',sans-serif;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:12px;line-height:1.5;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-0.01em}
.num{font-variant-numeric:tabular-nums}

/* the standard page: running head, title, body, hairline foot */
.pg--std,.pg--cover{display:flex;flex-direction:column;padding:48px var(--m)}
.hd{display:flex;justify-content:space-between;font-size:13px;line-height:18px;color:var(--quiet)}
.hd__t{font-weight:600;color:var(--ink)}
.top{margin-top:64px;display:flex;flex-direction:column;gap:10px}
.top h1{font-family:var(--chrome);font-size:32px;line-height:1.1;font-weight:600;letter-spacing:-0.01em}
.lead{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--quiet);max-width:520px}
.bd{flex:1;min-height:0;margin-top:36px;display:flex;flex-direction:column;gap:24px}
.fo{display:flex;justify-content:space-between;gap:24px;border-top:1px solid var(--hair);padding-top:12px;font-size:12px;line-height:1.6;color:var(--quiet);font-variant-numeric:tabular-nums}
.fo .r{text-align:right}
.cap{font-size:12px;line-height:1.5;color:var(--quiet)}
.cap b{display:block;font-size:12px;font-weight:600;color:var(--ink)}
.h3{font-size:14px;line-height:20px;font-weight:600;color:var(--ink)}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:11px;line-height:1.4;background:var(--panel);color:var(--quiet-panel)}

/* base pages (guidelines.js): Steel panels, pins, dimension marks. Cover */
.pg--cover .fo{margin-top:0}
.g-cvbody{margin-top:140px;display:flex;flex-direction:column;gap:20px}
.a-panel.g-cvz{align-items:center;padding:64px 32px 72px}
.g-cvfoot{margin-top:auto;margin-bottom:28px}
.g-cvs{display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.a-panel.g-cvsp{padding:20px;align-items:flex-start}
.g-cvc{padding:16px 24px}
.g-cvc svg,.g-cvc .logo-slot{display:block}
.g-cvc .a-dimf{margin-top:12px}
/* contents: a project file tree */
.a-panel.g-tree{flex-direction:row;gap:16px;padding:16px;align-items:flex-start}
.g-pane{flex:1;min-width:0;padding:12px}
.g-row{display:flex;align-items:center;gap:8px;min-height:28px;font-size:13px;line-height:18px;color:var(--ink)}
.g-row--d,.g-row--r{min-height:32px}
.g-row b{font-weight:600}
.g-sn{font-size:12px;color:var(--quiet)}
.g-fo{margin-left:auto;font-size:12px;color:var(--quiet)}
.g-tl,.g-fl{margin-left:6px;padding-left:14px;border-left:1px solid var(--hair2)}
.g-ic,.g-caret{flex:none;display:block}
/* logo versions */
.a-panel.g-vp{padding:14px;gap:0;align-items:stretch}
.g-vp .g-vcw{padding-bottom:36px}
.g-vcw svg,.g-vcw .logo-slot{display:block}
.g-vf{display:flex;flex-direction:column}
.g-v3{display:flex;flex-direction:column;gap:20px}
.g-vr{display:grid;gap:16px}
.g-vr--a{grid-template-columns:216px 216px 218px}
.g-vr--b{grid-template-columns:236px 164px 250px}
.g-qd{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 24px}
.g-qr{display:flex;flex-direction:column}.g-qr span{font-size:15px;font-weight:600;line-height:20px}.g-qr i{font-style:normal;font-size:13px;line-height:18px;color:var(--quiet)}
.g-qt{display:flex;flex-direction:column;align-items:flex-end}.g-qt span{font-size:12px;color:var(--quiet)}.g-qt b{font-family:var(--display);font-size:24px;line-height:1.1;font-weight:700}
.g-pp,.g-dk{box-sizing:border-box;padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;border-radius:var(--rk)}
.g-pp{padding:14px 16px}
.g-dk{background:var(--dark);color:var(--dark-ink)}
.g-pr{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--hair);padding-top:8px;font-family:var(--body);font-size:13px;font-weight:600}
.g-dk .g-pr{border-top-color:color-mix(in srgb,var(--dark-ink) 28%,transparent)}
.g-ph{border-radius:var(--rk)}
.g-ph .photo-slot{font-size:0;padding:0}
.g-qr{margin-left:40px}.g-qr span,.g-qr i{white-space:nowrap}
.g-ic2{box-sizing:border-box;display:flex;align-items:center;gap:14px;padding:0 16px}
.g-tile{border-radius:14px;flex:none}
.g-tab{background:var(--panel);flex:none}
.g-av{box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:0}
.g-circ{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--hair2)}
.g-sig{box-sizing:border-box;padding:10px 16px;display:flex;flex-direction:column;justify-content:space-between}
.g-sg2{display:flex;flex-direction:column;font-size:11px;line-height:14px;color:var(--quiet);border-top:1px solid var(--hair);padding-top:6px}
.g-sg2 b{font-size:12px;color:var(--ink)}
/* contrast: the screen with every pair pinned, then the pairs as an inspector */
.g-contrast .bd{gap:18px}
.a-panel.g-cp{padding:20px 28px;align-items:center;gap:0}
.g-screen{--c:112px;width:470px;margin-right:var(--c);display:flex;flex-direction:column;gap:10px}
.g-sg,.g-dg{display:flex;flex-direction:column;gap:4px}
.g-sg .g-ln{padding-left:5px}
.a-card.g-cd{padding:10px 24px;display:flex;flex-direction:column;gap:4px}
.g-ln{display:flex;align-items:center;min-height:26px;margin-right:calc(-1 * var(--c))}
.g-ln--c{margin-right:calc(-1 * (var(--c) + 24px))}
.g-ln--f>.g-fx{flex:0 0 calc(100% - var(--c))}
.g-lead{flex:1;min-width:12px;height:1px;margin-left:10px;background:var(--ink);position:relative}
.g-lead::before{content:'';position:absolute;left:-3px;top:-3px;width:7px;height:7px;border-radius:50%;background:var(--ink);box-shadow:0 0 0 1.5px var(--ground)}
.g-ln--f .g-lead{margin-left:0}
.g-co{flex:none;width:var(--c);display:flex;align-items:center;gap:8px}
.g-rt{font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;font-variant-numeric:tabular-nums}
.g-t{display:inline-block;white-space:nowrap;outline:1px dashed var(--ink);outline-offset:3px;font-family:var(--body)}
.g-h{font-family:var(--display);font-size:26px;line-height:1.1;color:var(--ink)}
.g-p{font-size:14px;line-height:20px;color:var(--soft)}
.g-c{font-size:12px;line-height:16px;color:var(--quiet-panel)}
.g-c--w{color:var(--quiet)}
.g-n{font-size:16px;line-height:22px;font-weight:600;color:var(--ink)}
.g-a{font-size:14px;line-height:20px;font-weight:500;color:var(--accent);text-decoration:underline;text-underline-offset:3px}
.g-btn{flex:none;height:38px}
.g-fx{box-sizing:border-box}
.a-toast.g-fx{padding:10px 16px}
.g-tot{display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-radius:var(--rk);background:var(--dark);color:var(--dark-ink);font-family:var(--body);font-size:14px}
.g-big{font-family:var(--display);font-size:28px;line-height:1.1;color:var(--accent);outline-color:var(--dark-ink)}
.g-tbl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(5,auto);grid-auto-flow:column;gap:0 28px}
.g-tr{display:grid;grid-template-columns:22px 30px minmax(0,1fr) auto;gap:0 10px;align-items:center;min-height:36px;padding:3px 0;border-top:1px solid var(--hair)}
.g-tr:nth-child(5n),.g-tr:last-child{border-bottom:1px solid var(--hair)}
.g-tx b{display:block;font-size:12px;line-height:16px;font-weight:600;color:var(--ink)}
.g-tx i{display:block;font-style:normal;font-size:12px;line-height:16px;color:var(--quiet)}
.g-rr{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.g-sp{display:grid;place-items:center;width:30px;height:22px;border-radius:4px;flex:none}
.g-sp b{width:12px;height:12px;border-radius:2px}
.g-sp--h{box-shadow:inset 0 0 0 1px var(--hair2)}
.g-nus{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px}
.g-nu{display:flex;align-items:center;gap:10px;min-height:26px;border-top:1px solid var(--hair)}
.g-nu .cap{display:flex;gap:8px;align-items:baseline}
.g-nu .cap b{display:inline}
/* business card: 90 x 55 mm at 4.5 px to the millimetre, pinned and dimensioned */
.a-panel.g-bc{padding:64px 32px 28px 88px;gap:60px;align-items:flex-start}
.g-bcf{display:flex;flex-direction:column;gap:12px;width:405px}
.g-bcw{position:relative;width:405px;height:248px}
.g-dl b{left:auto;right:10px}
.g-hl{outline:1px dashed var(--hl,var(--quiet));outline-offset:4px}
.g-hl::after{content:'';position:absolute;left:calc(100% + 5px);top:50%;width:405px;border-top:1px dashed var(--hl,var(--quiet))}
.card--front .g-hl{--hl:var(--dark-ink)}
.g-pt .a-pin--r .a-pl{top:-8px}
.g-pt .a-pl{font-size:13px;font-weight:600;color:var(--ink)}
.card{width:405px;height:248px;border-radius:6px;position:relative;overflow:hidden;flex:none}
.card--front{background:var(--dark);color:var(--dark-ink)}
.card--back{background:var(--ground);color:var(--ink)}
.card--front .mk{position:absolute;left:32px;top:50%;transform:translateY(-50%)}
.card--front .ln{position:absolute;left:32px;bottom:26px;font-size:12px}
.card--back .mk{position:absolute;right:30px;top:28px}
.card--back .who{position:absolute;left:32px;bottom:30px;font-family:var(--body)}
.card--back .nm{font-size:18px;font-weight:600;line-height:1.2}
.card--back .rl{font-size:13px;color:var(--soft);margin-top:2px}
.card--back .ct{font-size:13px;margin-top:14px;line-height:1.5}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx);
}

export { readMe, sheets } from './kit.js';
export { guidelines, uikit, brandBook, bookCss };
