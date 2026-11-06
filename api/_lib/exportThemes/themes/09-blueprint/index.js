// Theme 09, Blueprint: A4 portrait drawing sheets. Manrope chrome at 11 to 13 px, the brand's display face for one big line a page,
// Brick redlines with end ticks that print the true size, a ruled title block. Everything reads roles and colourways from the brand.
import { guidelines } from './guidelines.js';
import { uikit } from './uikit.js';
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { cssStr } from '../../engine/escape.js';

export const meta = {
  id: '09-blueprint', name: 'Blueprint', tier: 'Pro', brand: 'plumbline',
  guidelinesPage: { w: 794, h: 1123 }, uikitPage: { w: 794, h: 1123 },
  chrome: { family: 'Manrope', q: 'Manrope:wght@400;500;600', faces: [{ weight: 400, stem: 'Manrope-400' }, { weight: 500, stem: 'Manrope-500' }, { weight: 600, stem: 'Manrope-600' }] },
};

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, rev = B.logo.colourways.reversed;
  return `.pg{--ink:${L.text};--quiet:${L.quiet};--soft:${L.textSoft};--quiet-panel:${L.quietOnSunken};--ground:${L.raised};--card:${L.surface};--panel:${L.sunken};--hair:${L.divider};--accent:${L.action};--accent-ink:${L.actionLabel};--dark:${rev.ground};--dark-ink:${rev.name};--m:56px;
  --chrome:'${cssStr(meta.chrome.family)}',sans-serif;--display:'${cssStr(d.family)}',sans-serif;--body:'${cssStr(b.family)}',sans-serif;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:12px;line-height:1.4;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-0.01em}
.num{font-variant-numeric:tabular-nums}

/* redlines: Brick lines with end ticks, numbers in the chrome face */
.rl{position:absolute;display:block;border:0;border-style:solid;border-color:var(--accent)}
.rl.h{height:0;border-top-width:1px}
.rl.h::before,.rl.h::after{content:'';position:absolute;top:-4px;height:7px;border-left:1px solid var(--accent)}
.rl.h::before{left:0}.rl.h::after{right:-1px}
.rl.v{width:0;border-left-width:1px}
.rl.v::before,.rl.v::after{content:'';position:absolute;left:-4px;width:7px;border-top:1px solid var(--accent)}
.rl.v::before{top:0}.rl.v::after{bottom:-1px}
.rn{position:absolute;font:600 12px/12px var(--chrome);color:var(--accent);white-space:nowrap;font-variant-numeric:tabular-nums}

/* the sheet: running head, title, content */
.pg--std{display:flex;flex-direction:column;padding:48px var(--m)}
.hd{display:flex;justify-content:space-between;font-size:12px;font-weight:500}
.hd span:last-child{color:var(--quiet)}
.ttl{margin-top:48px;font-size:30px;line-height:1.2;font-weight:600}
.lead{margin-top:8px;max-width:480px;font-size:14px;line-height:1.55;color:var(--quiet)}
.h2{margin:40px 0 16px;font-size:18px;line-height:1.3;font-weight:600}
.cap{font-size:11px;line-height:1.45;color:var(--quiet)}
.cap b{display:block;font-size:12px;font-weight:600;color:var(--ink)}
.on-panel .cap{color:var(--quiet-panel)}

/* title block */
.tb{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.tbl{padding-right:24px}
.tbr{border-left:1px solid var(--hair);padding:10px 0 10px 24px}
.cell{padding:10px 0;border-top:1px solid var(--hair);font-size:13px;line-height:18px}
.cell:first-child{border-top:0}
.k{display:block;font-size:11px;line-height:14px;color:var(--quiet);margin-bottom:2px}
.big{display:block;font-size:22px;font-weight:600;line-height:28px}
.sh{font-size:13px;line-height:24px;font-variant-numeric:tabular-nums}
.sh span{display:inline-block;width:32px;color:var(--quiet)}

/* cover */
.pg--cover{display:flex;flex-direction:column;padding:48px var(--m)}

.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:11px;line-height:1.4;background:var(--panel);color:var(--quiet-panel)}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx);
}

export { readMe, sheets } from './kit.js';
export { guidelines, uikit, brandBook, bookCss };
