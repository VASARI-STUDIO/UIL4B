// Theme 03, Broadsheet: a 1280 x 720 newspaper front page. Schibsted Grotesk chrome at 12 to 14 px for the running head and folio,
// the brand's display face for the nameplate and one headline a page, ruled columns, no boxes. Reads roles and colourways from the brand.
import { guidelines } from './guidelines.js';
import { uikit } from './uikit.js';
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';

export const meta = {
  id: '03-broadsheet', name: 'Broadsheet', tier: 'Pro', brand: 'saltbush',
  guidelinesPage: { w: 1280, h: 720 }, uikitPage: { w: 1280, h: 720 },
  chrome: { family: 'Schibsted Grotesk', q: 'Schibsted+Grotesk:wght@400;500;600', faces: [{ weight: 400, stem: 'SchibstedGrotesk-400' }, { weight: 500, stem: 'SchibstedGrotesk-500' }, { weight: 600, stem: 'SchibstedGrotesk-600' }] },
};

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, rev = B.logo.colourways.reversed;
  const m = B.layout.margin;
  // the brand's fill-only mark colour (role "mark"), else the action colour
  const mark = (B.colours.find((c) => c.role === 'mark') || { hex: L.action }).hex;
  return `.pg{--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--quiet-panel:${L.quietOnSunken};--ground:${L.surface};--panel:${L.sunken};--hair:${L.divider};--accent:${L.action};--accent-ink:${L.actionLabel};--mark:${mark};--dark:${rev.ground};--dark-ink:${rev.name};--m:${m}px;
  --chrome:'${meta.chrome.family}',sans-serif;--display:'${d.family}',serif;--body:'${b.family}',sans-serif;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:12px;line-height:1.4;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.disp{font-family:var(--display);font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-0.01em}
.num{font-variant-numeric:tabular-nums}

/* inner page: the running head over a 4 px action rule, then the body */
.pg--std{display:flex;flex-direction:column;gap:22px;padding:26px var(--m) 32px}
.hd{flex:none;display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px;border-bottom:4px solid var(--accent)}
.hd .nm{font-family:var(--display);font-size:24px;line-height:1.1}
.hd .tt{font-size:14px;font-weight:600}
.hd .tt b{font-weight:600;margin-right:10px}
.hd .fo,.fo{font-size:14px;font-variant-numeric:tabular-nums}
.body{flex:1;min-height:0;display:grid}
.h2{font-family:var(--body);font-size:18px;font-weight:700;line-height:1.2;margin-bottom:12px}
.lead{font-family:var(--body);font-size:19px;font-weight:500;line-height:1.35}
.txt{font-family:var(--body);font-size:14px;line-height:1.55;color:var(--soft)}
.cap{font-size:12px;line-height:1.4;color:var(--quiet)}
.cap b{display:block;font-size:12px;font-weight:600;color:var(--ink)}

/* front page (cover) */
.pg--cover{display:flex;flex-direction:column;padding:26px var(--m) 32px}
.ears{flex:none;display:flex;justify-content:space-between;font-size:12px;color:var(--quiet);padding-bottom:8px;border-bottom:1px solid var(--ink)}
.mast{flex:none;display:grid;grid-template-columns:200px minmax(0,1fr) 200px;align-items:center;padding:14px 0 12px;border-bottom:3px solid var(--ink)}
.rule2{flex:none;height:0;margin-top:2px;border-top:1px solid var(--ink)}
.ear{border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:6px 0;font-size:12px;line-height:1.4;color:var(--ink)}
.ear.r{text-align:right}
.mast .nameplate{display:flex;justify-content:center;align-items:center;font-size:112px;line-height:0.9;white-space:nowrap}
.front{flex:1;min-height:0;display:grid;grid-template-columns:4fr 2fr;margin-top:18px}
.front .l{padding-right:24px;display:flex;flex-direction:column;gap:8px;min-height:0}
.front .l .photo-slot{flex:1;min-height:0;box-shadow:inset 0 0 0 1px var(--hair)}
.front .r{padding-left:24px;border-left:1px solid var(--hair);display:flex;flex-direction:column;justify-content:space-between;gap:12px;min-height:0;overflow:hidden}
.pg--cover .lead{font-family:var(--display);font-size:24px;line-height:1.2;font-weight:400;padding-top:4px}
.wk{border-top:3px solid var(--ink);padding-top:10px}
.wk h3{display:flex;align-items:center;gap:8px;font-family:var(--body);font-size:14px;font-weight:700;margin-bottom:4px}
.wk h3 i{display:block;width:12px;height:12px;background:var(--mark)}
.wk li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.4}
.wk .q{color:var(--quiet);margin-left:6px}
.wk .pr{color:var(--accent);font-weight:700;white-space:nowrap}
.toc li{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--hair);font-size:14px}
.toc li span:last-child{font-variant-numeric:tabular-nums;color:var(--quiet)}

/* contents: an index of nine items in three ruled columns */
.pg--contents .body{grid-template-rows:auto minmax(0,1fr);gap:24px}
.ctop{display:flex;justify-content:space-between;align-items:baseline;gap:32px;padding-bottom:14px;border-bottom:3px solid var(--ink)}
.headline{font-family:var(--display);font-weight:400;font-size:56px;line-height:1.02;letter-spacing:-0.01em}
.idx{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));min-height:0}
.idx li{align-items:baseline;display:grid;grid-template-columns:76px minmax(0,1fr) auto;grid-template-rows:auto minmax(0,1fr);align-content:start;gap:6px 0;padding:18px 24px 18px 0;border-bottom:1px solid var(--hair)}
.idx li:nth-child(3n+2),.idx li:nth-child(3n){padding-left:24px;border-left:1px solid var(--hair)}
.idx li:nth-last-child(-n+3){border-bottom:1px solid var(--ink)}
.idx .n{grid-row:1/3;align-self:start;font-family:var(--display);font-size:64px;line-height:0.9;color:var(--accent);font-variant-numeric:tabular-nums}
.idx .t{display:flex;align-items:baseline;gap:8px;font-family:var(--body);font-size:20px;line-height:1.2;font-weight:700}
.idx .t::after{content:'';flex:1;min-width:12px;border-bottom:1px dotted var(--quiet)}
.idx .p{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.idx .s{grid-column:2/4;font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft)}

/* logo versions: the nameplate across the measure, six versions down two ruled columns */
.pg--versions .body{grid-template-rows:auto minmax(0,1fr);gap:24px}
.vmast{position:relative;display:grid;grid-template-columns:250px minmax(0,1fr) 250px;align-items:center;gap:0 24px;padding:14px 0;border-top:1px solid var(--ink);border-bottom:3px solid var(--ink);margin-bottom:3px}
.vmast::after{content:'';position:absolute;left:0;right:0;bottom:-7px;border-top:1px solid var(--ink)}
.vmast .nameplate{display:flex;justify-content:center;align-items:center;min-width:0}
.ear b{display:block;font-weight:600}
.vcols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));min-height:0}
.vcols ol{display:grid;grid-template-rows:repeat(3,minmax(0,1fr));min-height:0;padding-right:32px}
.vcols ol+ol{padding:0 0 0 32px;border-left:1px solid var(--hair)}
.vcols li{display:grid;grid-template-columns:230px minmax(0,1fr);align-items:center;gap:0 24px;padding:10px 0;border-top:1px solid var(--hair);min-height:0}
.vcols li:first-child{border-top:1px solid var(--ink)}
.vcols .tile{height:100%;max-height:112px;display:flex;align-items:center;justify-content:center;padding:8px;min-height:0}
.vcols .tile.hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.vcols .cap{font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft)}
.vcols .cap b{font-size:16px;line-height:1.3;font-weight:700;margin-bottom:2px}
.vmast .ear.r{text-align:left}

/* contrast: the weather table. Pairs are cities, ratios temperatures, "passes at" the forecast */
.pg--contrast .body{grid-template-rows:auto minmax(0,1fr);gap:20px}
.pg--contrast .lead{max-width:860px}
.wx-cols{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);min-height:0}
.wx{--wc:44px minmax(0,1fr) 104px 150px;padding-right:32px}
.wx--no{--wc:32px minmax(0,1fr) 104px 100px;padding:0 0 0 32px;border-left:1px solid var(--hair)}
.h3{font-family:var(--body);font-size:14px;font-weight:700;margin-bottom:8px}
.wx-h,.wx-r{display:grid;grid-template-columns:var(--wc);align-items:center;gap:0 14px}
.wx-h{padding:6px 0;border-top:3px solid var(--ink);border-bottom:1px solid var(--ink);font-size:12px;font-weight:600}
.wx-h .r{text-align:right}
.wx-r{padding:5px 0;border-bottom:1px solid var(--hair)}
.wx .sw{height:34px;display:flex;align-items:center;justify-content:center;font-family:var(--body);font-size:16px;font-weight:700}
.wx .sw.hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.wx .sw--s{height:32px;box-shadow:inset 0 0 0 1px var(--hair)}
.wx .sw i{display:block;width:12px;height:12px}
.wx-c b{display:block;font-size:14px;font-weight:600;line-height:1.25}
.wx-c span{display:block;font-size:12px;line-height:1.3;color:var(--quiet)}
.wx-t{white-space:nowrap;font-size:22px;font-weight:600;line-height:1;text-align:right;font-variant-numeric:tabular-nums}
.wx-r--no .wx-t{color:var(--soft)}
.wx-f{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600}
.wx-f svg{flex:none}

/* business card: a photo spread, two ruled columns with captions */
.pg--card .body{grid-template-rows:auto minmax(0,1fr);gap:28px}
.bc-top{display:flex;justify-content:space-between;align-items:baseline;gap:40px;padding-bottom:14px;border-bottom:3px solid var(--ink)}
.bc-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));min-height:0}
.bc-f{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:12px;padding-right:24px}
.bc-f+.bc-f{padding:0 0 0 24px;border-left:1px solid var(--hair)}
.bc-f .cap{width:540px;padding-top:8px;border-top:1px solid var(--ink)}
.card{width:540px;height:330px;position:relative;overflow:hidden;flex:none}
.card--front{background:var(--dark);color:var(--dark-ink)}
.card--back{background:var(--ground);color:var(--ink);box-shadow:inset 0 0 0 1px var(--hair)}
.card--front .logo{position:absolute;left:44px;top:50%;transform:translateY(-50%)}
.card--front .line{position:absolute;left:44px;bottom:36px;font-family:var(--body);font-size:15px}
.card--back .mark{position:absolute;right:40px;top:36px}
.card--back .who{position:absolute;left:44px;bottom:40px;font-family:var(--body)}
.card--back .who .nm{font-size:22px;font-weight:700;line-height:1.2}
.card--back .who .rl{font-size:15px;color:var(--soft);margin-top:2px}
.card--back .who .ct{font-size:15px;color:var(--ink);margin-top:20px;line-height:1.5}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:12px;line-height:1.4;background:var(--panel);color:var(--quiet-panel)}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx);
}

export { readMe, sheets } from './kit.js';
export { guidelines, uikit, brandBook, bookCss };
