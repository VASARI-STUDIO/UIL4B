// Theme 10, In use: portrait 794 x 1123. The product on phones with numbered notes beside what they point at.
// Figtree chrome at 12 to 14 px, the brand's display face once a page, Chalk ground, one Float stripe. Roles and colourways only; no brand hex is written here.
import { guidelines } from './guidelines.js';
import { uikit } from './uikit.js';
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { cssStr, cssNum } from '../../engine/escape.js';

export const meta = {
  id: '10-inuse', name: 'In use', tier: 'Pro', brand: 'shallow-end',
  guidelinesPage: { w: 794, h: 1123 }, uikitPage: { w: 794, h: 1123 },
  chrome: { family: 'Figtree', q: 'Figtree:wght@400;500;600', faces: [{ weight: 400, stem: 'Figtree-400' }, { weight: 500, stem: 'Figtree-500' }, { weight: 600, stem: 'Figtree-600' }] },
};

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, m = B.layout.margin;
  const hl = ctx.colours.find((c) => c.role === 'highlight').hex;
  return `.pg{--hover:${(ctx.byId.hover || { hex: L.actionHover }).hex};--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--ground:${L.surface};--card:${L.raised};--panel:${L.sunken};--hair:${L.divider};--accent:${L.action};--float:${hl};--m:${m}px;
  --chrome:'${cssStr(meta.chrome.family)}',sans-serif;--display:'${cssStr(d.family)}',sans-serif;--body:'${cssStr(B.fonts.body.family)}',sans-serif;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:12px;line-height:1.5;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-weight:${cssNum(d.weights[d.weights.length - 1])};letter-spacing:-0.01em;line-height:1;white-space:nowrap}
.num{font-variant-numeric:tabular-nums}
.pg--std{display:flex;flex-direction:column;padding:48px var(--m) 56px}
.hd{display:flex;justify-content:space-between;font-size:12px;font-weight:600}
.fo{font-weight:500;color:var(--quiet);font-variant-numeric:tabular-nums}
.ttl{font-family:var(--chrome);font-size:28px;line-height:1.2;font-weight:600;margin-top:44px}
.cap{font-size:12px;line-height:1.6;color:var(--quiet)}
.cap b{display:block;font-weight:600;color:var(--ink)}
.mk{width:24px;height:24px;border-radius:50%;background:var(--ink);color:var(--card);font:600 12px/24px var(--chrome);text-align:center;display:block;flex:none}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:12px;line-height:1.5;background:var(--panel);color:var(--quiet)}
.ph{position:absolute;width:360px;height:740px;border-radius:28px;overflow:hidden;background:var(--ground);box-shadow:0 0 0 1px var(--hair);font-family:var(--body);color:var(--ink)}
.ph .sb{height:44px;padding:0 24px;display:flex;align-items:center;font-size:14px;font-weight:700}
.ph .scr{padding:12px 20px 0;display:flex;flex-direction:column;gap:16px}
.ph .s30{font-size:30px;line-height:1.05;white-space:normal}
.chip{align-self:flex-start;display:inline-flex;align-items:center;font:500 14px/1.3 var(--body);white-space:nowrap}
.pool{position:relative;height:200px;border-radius:20px;background:${L.success.bg};overflow:hidden}
.pool .lane{position:absolute;top:10px;bottom:10px;border-left:2px dashed var(--card)}
.pool .fl{position:absolute;left:146px;top:84px;display:inline-flex;align-items:center;height:28px;padding:0 11px;border-radius:999px;background:var(--float);color:var(--ink);font:600 14px/1 var(--body)}
.teach{display:flex;gap:14px;align-items:center;padding-top:12px;border-top:1px solid var(--hair)}
.teach b{display:block;font-size:16px;font-weight:600}.teach div span{font-size:14px;color:var(--quiet)}
.av{width:40px;height:40px;border-radius:50%;background:var(--float);color:var(--ink);display:flex;align-items:center;justify-content:center;font:700 15px/1 var(--body);flex:none}
.pg--cover .stripe{position:absolute;left:438px;top:0;width:240px;height:100%;background:var(--float)}
.pg--cover .top{position:absolute;left:var(--m);right:var(--m);top:48px;display:flex;justify-content:space-between;font-size:13px;font-weight:600}
.pg--cover .name{position:absolute;left:var(--m);top:140px}
.pg--cover .sub{position:absolute;left:var(--m);top:290px;font-size:13px;color:var(--quiet)}
.pg--cover .note{position:absolute;left:var(--m);top:880px;width:300px}
.pg--cover .ver{position:absolute;left:var(--m);bottom:48px;font-size:12px;line-height:1.6;color:var(--quiet)}
.pg--cover .slot-corner{position:absolute;left:var(--m);top:140px}
.pg--cover .slot-corner .logo-slot{border-color:var(--ink)}
.pg--contents .stripe{position:absolute;left:438px;top:0;width:240px;height:100%;background:var(--float)}
.toc{margin-top:48px;width:560px}
.toc li{display:grid;grid-template-columns:34px 1fr 32px;gap:0 8px;padding:18px 0;border-top:1px solid var(--hair);align-items:start}
.toc li:last-child{border-bottom:1px solid var(--hair)}
.toc .t{font-family:var(--body);font-size:20px;line-height:24px;font-weight:600}
.toc .s{display:block;font-size:12px;color:var(--quiet);margin-top:4px;line-height:1.5}
.toc .p{font-size:14px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;line-height:24px}
.lv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 16px;margin-top:32px}
.lv .tile{display:flex;align-items:center;justify-content:center;border-radius:20px;height:176px;margin-bottom:12px}
.lv .tile.hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.lv .lead{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);gap:0 24px;align-items:end}
.lv .lead .tile{height:268px;margin:0}
.lv .appicon{width:112px;height:112px;border-radius:26px;display:flex;align-items:center;justify-content:center}
.cr{margin-top:28px}
.cr li{display:grid;grid-template-columns:300px 1fr auto;gap:16px;align-items:center;padding:10px 0;border-top:1px solid var(--hair)}
.cr li:last-child{border-bottom:1px solid var(--hair)}
.cr .samp{display:flex;align-items:center;height:44px;padding:0 20px;border-radius:999px;font:700 15px/1 var(--body);white-space:nowrap}
.cr .samp.hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.cr .r{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.nu{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:12px}
.nu span{display:flex;align-items:center;gap:8px}
.nu i{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--hair)}.nu i b{width:12px;height:12px;border-radius:50%;display:block}
.h3{font-size:12px;font-weight:600;margin-top:24px}
.bc{display:flex;gap:32px;align-items:flex-start;margin-top:28px}
.bc .stage{width:482px;padding:40px;border-radius:20px;flex:none}
.card{width:405px;height:247.5px;border-radius:12px;position:relative;overflow:hidden}
.card--front{background:var(--ink);color:var(--ground)}
.card--back{background:var(--card);color:var(--ink);font-family:var(--body)}
.card--front .lg{position:absolute;left:36px;top:50%;transform:translateY(-50%)}
.card--front .ln{position:absolute;left:36px;bottom:24px;font-size:12px}
.card--back .mkr{position:absolute;right:28px;top:26px}
.card--back .who{position:absolute;left:30px;bottom:28px}
.card--back .nm{font-size:16px;font-weight:700;line-height:1.3}.card--back .rl{font-size:13px;color:var(--quiet)}.card--back .ct{font-size:12px;margin-top:12px;line-height:1.5}
.bc ul{flex:1}
.bc li{display:grid;grid-template-columns:34px 1fr;padding:12px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.6;color:var(--quiet)}
.bc li b{display:block;color:var(--ink);font-weight:600;font-size:14px}

.g-cvn{position:absolute;left:var(--m);top:330px;width:262px;text-align:right}
.g-cvl{position:absolute;left:354px;top:341px;width:40px;border-top:1px solid var(--ink)}
.g-cvl::after{content:'';position:absolute;right:-2px;top:-3px;width:5px;height:5px;border-radius:50%;background:var(--ink)}
.g-cw{flex:none;position:relative;height:792px;margin-top:28px}
.g-cp{width:322px;height:740px}
.g-cp ol{padding:8px 20px 0}
.g-cp li{display:grid;grid-template-columns:24px minmax(0,1fr) 28px;gap:0 12px;align-items:start;padding:16px 0;border-top:1px solid var(--hair)}
.g-cp li:first-child{border-top:0}
.g-cp .t{display:block;font-size:20px;line-height:24px;font-weight:600}
.g-cp .s{display:block;font-size:12px;line-height:1.5;color:var(--quiet);margin-top:4px}
.g-cp .p{font-size:14px;line-height:24px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.g-sp{position:relative;flex:none;border-radius:var(--r);box-shadow:0 0 0 1px var(--hair)}
.g-spi{left:0;top:0;transform-origin:0 0;box-shadow:none}
.g-top{overflow:hidden}
.g-tag{position:absolute;display:flex;align-items:center;gap:6px;height:24px;white-space:nowrap;z-index:1}
.g-tag--l{right:calc(100% - var(--in))}
.g-tag--r{left:calc(100% - var(--in))}
.g-tag em{font:600 12px/1 var(--chrome);font-style:normal}
.g-tag i{position:relative;display:block;width:calc(10px + var(--in));border-top:1px solid var(--ink)}
.g-tag i::after{content:'';position:absolute;top:-3px;width:5px;height:5px;border-radius:50%;background:var(--ink)}
.g-tag--l i::after{right:-2px}.g-tag--r i::after{left:-2px}
.g-pin{position:absolute;z-index:1}
.g-e{position:absolute}
.g-card{box-sizing:border-box;border-radius:16px;background:var(--card);box-shadow:inset 0 0 0 1px var(--hair);overflow:hidden;font-family:var(--body)}
.g-c1{display:flex;align-items:center;gap:12px;height:72px;padding:0 16px;font-size:16px}
.g-c2{height:72px;display:flex;align-items:center;padding:0 16px;border-top:1px solid var(--hair);font-size:14px;color:var(--quiet)}
.g-c3{display:flex;flex-direction:column;justify-content:center;height:88px;padding:0 16px;gap:2px}
.g-c3 b{font-size:16px}.g-c3 span{font-size:14px;color:var(--quiet)}
.g-c4{display:flex;justify-content:flex-end;align-items:center;height:59px;padding:0 16px;border-top:1px solid var(--hair)}
.g-lk{font:600 15px/1 var(--body);color:var(--accent)}
.g-lks{display:flex;justify-content:flex-end;align-items:center;gap:20px}
.g-btn{display:flex;align-items:center;justify-content:center;border-radius:999px;background:var(--accent);color:var(--card);font:700 16px/1 var(--body)}
.g-btn--h{background:var(--hover)}
.g-toast{box-sizing:border-box;border-radius:12px;background:var(--ink);color:var(--ground);font:400 15px/1 var(--body)}
.g-toast span{position:absolute;left:16px}.g-toast span:first-child{top:21px}
.g-toast .g-ta{top:65px;font-weight:600;color:var(--float);text-decoration:underline;text-underline-offset:3px}
.g-cf{position:relative;flex:none;width:682px;margin-top:24px}
.g-ckey{display:grid;grid-auto-flow:column;grid-template-rows:repeat(6,auto);grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;margin-top:16px}
.g-ckey li{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:10px;align-items:start;padding:5px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.4;color:var(--quiet)}
.g-ckey b{display:block;font-size:13px;color:var(--ink);font-weight:600}
.g-ckey .r{font-size:15px;font-weight:600;color:var(--ink)}
.g-vrow{flex:none;display:flex;justify-content:space-between;margin-top:28px;align-items:flex-start}
.g-vc{display:flex;flex-direction:column;gap:12px}
.g-vn{display:grid;grid-template-columns:34px minmax(0,1fr);font-size:12px;line-height:1.5;color:var(--quiet)}
.g-vn b{display:block;font-size:14px;color:var(--ink);font-weight:600}
.g-ab{position:absolute}
.g-fill{position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box}
.g-scrim{position:absolute;inset:0;background:color-mix(in srgb,var(--ink) 72%,transparent)}
.g-home{position:absolute;left:0;right:0;top:84px;display:grid;grid-template-columns:repeat(4,64px);justify-content:space-between;padding:0 24px}
.g-hi{height:104px;display:flex;flex-direction:column;align-items:center;gap:6px}
.g-ic{display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:16px;background:var(--panel)}
.g-ic--app{box-shadow:inset 0 0 0 1px var(--hair)}
.g-hl{font:600 12px/1.2 var(--body);color:var(--ink)}
.g-hdr{padding:12px 20px;border-bottom:1px solid var(--hair);position:relative;display:flex;align-items:center}
.g-hscr{padding:20px;display:flex;flex-direction:column;gap:16px}
.g-prof{margin:16px auto 0;border-radius:32px;display:flex;align-items:center;justify-content:center}
.g-pn{text-align:center;font:600 16px/1 var(--body);margin-top:16px}
.g-bc{flex:none;display:flex;align-items:flex-start;gap:56px;margin-top:32px}
.g-bc--f{margin:32px calc(-1 * var(--m)) 0;padding:40px var(--m);background:var(--float)}
.g-cd{position:relative;flex:none}
.g-cd .card--front,.g-cd .card--back{box-shadow:0 0 0 1px var(--hair)}
.g-lv{position:absolute;left:calc(100% + 16px)}
.g-lv::before{content:'';position:absolute;right:100%;top:11.5px;width:16px;border-top:1px solid var(--ink)}
.g-bn{flex:1;min-width:0}
.g-bn li{display:grid;grid-template-columns:34px minmax(0,1fr);padding:12px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.6;color:var(--quiet)}
.g-bn li:first-child{padding-top:0;border-top:0}
.g-bn li b{display:block;color:var(--ink);font-weight:600;font-size:14px}
.g-bc--f .g-bn li{color:var(--ink);border-color:var(--ink)}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx);
}

export { guidelines, uikit, brandBook, bookCss };
export { readMe, sheets } from './kit.js';
