// Theme 07, Specification: an A4 portrait standards document. Hanken Grotesk chrome at 12 to 14 px, hairline rules, section
// numbers that are real cross-references (§ and 4.3), Martian Mono only on literal values. Mostly empty pages, one idea each.
// Everything below reads roles and colourways from the brand; no brand name or hex is written here.
import { guidelines } from './guidelines.js';
import { uikit } from './uikit.js';
import { cssA } from './css-a.js';
import { cssB } from './css-b.js';
import { cssKit } from './css-kit.js';
import { cssBook, bookCss } from './css-book.js';
import { brandBook } from './book.js';
import { cssStr } from '../../engine/escape.js';

export const meta = {
  id: '07-spec', name: 'Specification', tier: 'Free', brand: 'northern-current',
  guidelinesPage: { w: 794, h: 1123 }, uikitPage: { w: 794, h: 1123 },
  // the chrome face: running heads, folios, captions, tables. Files are in fonts/; google css2 query for canvas boards.
  chrome: { family: 'Hanken Grotesk', q: 'Hanken+Grotesk:wght@400;500;600', faces: [{ weight: 400, stem: 'HankenGrotesk-400' }, { weight: 500, stem: 'HankenGrotesk-500' }, { weight: 600, stem: 'HankenGrotesk-600' }] },
};

export function css(ctx) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const top = d.weights[0], sub = d.weights[d.weights.length - 1];
  return `.pg{--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--ground:${L.surface};--panel:${L.sunken};--hair:${L.divider};--rule:color-mix(in srgb,${L.text} 24%,${L.surface});--accent:${L.action};--accent-ink:${L.actionLabel};--mark:${L.danger.fg};
  --chrome:'${cssStr(meta.chrome.family)}',sans-serif;--display:'${cssStr(d.family)}',sans-serif;--body:'${cssStr(b.family)}',sans-serif;--mono:'${cssStr(m.family)}',monospace;--r:${B.ui.radius.control}px;--rc:${B.ui.radius.card}px;
  background:var(--ground);color:var(--ink);font-family:var(--chrome);font-size:13px;line-height:1.45;-webkit-font-smoothing:antialiased}
.pg :where(h1,h2,h3,p,ul,ol,figure,table){margin:0;padding:0}
.pg :where(ul,ol){list-style:none}
.pg :where(th){font-weight:500}
.disp{font-family:var(--display);font-weight:${top};letter-spacing:-0.015em}
.disp--sub{font-weight:${sub};letter-spacing:-0.01em}
.num{font-variant-numeric:tabular-nums}
.m{font-family:var(--mono);font-size:10.5px;letter-spacing:-0.02em;white-space:nowrap}

/* the standard page: running head, one idea, a note at the foot */
.pg--std{display:flex;flex-direction:column;padding:48px 56px}
.hd{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet);margin-bottom:44px}
.t{font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-0.01em;margin-bottom:10px}
.lede{font-size:14px;line-height:1.55;color:var(--quiet);max-width:560px}
.foot{margin-top:auto;font-size:12px;line-height:1.55;color:var(--quiet);max-width:560px;padding-top:14px}
.notes{display:grid;grid-template-columns:1fr 1fr;gap:32px;font-size:13px;line-height:1.55;color:var(--quiet);border-top:1px solid var(--rule);padding-top:14px}
.notes .m{color:var(--ink)}
.cap{font-size:12px;line-height:1.5;color:var(--quiet)}
.cap b{display:block;font-size:12px;font-weight:600;color:var(--ink)}
.cap .m{color:var(--quiet)}

/* a ledger table: hairline under every row, a full rule under the header */
.st{width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.4;table-layout:fixed}
.st th{text-align:left;font-size:11.5px;color:var(--quiet);padding:0 10px 8px 0;border-bottom:1px solid var(--ink)}
.st td{padding:0 10px 0 0;border-bottom:1px solid var(--hair);vertical-align:middle}
.st .r{text-align:right;padding-right:0;font-variant-numeric:tabular-nums}

/* cover */
/* the designation block top right, then Figure 0.1: the logo's horizon as the x-axis of one day */
.g-des{align-self:flex-end;text-align:right;margin-top:-12px}
.g-dsn{font-family:var(--display);font-weight:${top};font-size:30px;line-height:1.1;letter-spacing:-0.015em}
.g-dss{margin-top:4px;font-size:13px;color:var(--quiet)}
.g-day{margin-top:36px}
.g-dw{position:relative;width:682px}
.g-dl{position:absolute;left:0;line-height:0}
.g-dsv{position:absolute;left:0;top:0;display:block}
.g-dt{position:absolute;left:0;right:0}
.g-dt li{position:absolute;transform:translateX(-50%);font-size:11.5px;line-height:1;color:var(--quiet)}
.g-day .a-fc{margin-top:8px}
.g-doc{margin-top:36px;padding-top:16px;border-top:1px solid var(--ink);font-size:40px;line-height:1.1;font-weight:600;letter-spacing:-0.015em}
.g-line{margin-top:8px;font-family:var(--display);font-weight:${sub};font-size:22px;line-height:1.2;color:var(--soft)}
.a-h2.g-dch{margin:auto 0 12px}
.st.g-dc th,.st.g-dc td{padding:10px 0;border-bottom:1px solid var(--hair);font-size:13px;line-height:1.45;vertical-align:top;text-align:left}
.st.g-dc th{width:120px;font-weight:400;color:var(--quiet)}
.st.g-dc tr:first-child th,.st.g-dc tr:first-child td{border-top:1px solid var(--ink)}
.st.g-dc+.notes{margin-top:32px}
.meta{margin-top:auto;font-size:13px}
.meta li{display:grid;grid-template-columns:120px minmax(0,1fr);padding:9px 0;border-top:1px solid var(--hair)}
.meta li span:first-child{color:var(--quiet)}
.meta+.notes{margin-top:28px}

/* contents */
.toc2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;margin-top:28px}
.toc2 li{display:grid;grid-template-columns:40px minmax(0,1fr) 28px;padding:7px 0;border-top:1px solid var(--hair);font-size:13px}
.toc2 li.h{font-weight:600;border-top:1px solid var(--ink);margin-top:16px;padding-top:9px}
.toc2 li.h:first-child{margin-top:0}
.toc2 li span:last-child{text-align:right;font-variant-numeric:tabular-nums}
.toc2 li:not(.h) span:first-child{color:var(--quiet);font-variant-numeric:tabular-nums}

/* logo versions */
.vcell .tile{display:flex;align-items:center;justify-content:center;border-radius:var(--r);padding:12px}
.vcell .tile.hairline{box-shadow:inset 0 0 0 1px var(--rule)}
.vcell .cap{margin-top:8px}
.vcell--wide{grid-column:1/-1}

/* contrast */
.smp{display:grid;place-items:center;width:44px;height:32px;border-radius:var(--r);font-family:var(--body);font-weight:500;font-size:15px}
.smp--big{font-size:24px;width:56px;height:40px}
.st.ct td{height:50px}
.st.ct .hx{display:block;margin-top:2px}
.h3{font-size:15px;font-weight:600;margin:30px 0 12px}

/* business card, drawn at 5 px to the millimetre with its measurements */
.g-cds{display:flex;flex-direction:column;gap:32px;margin-top:40px}
.g-cd{display:grid;grid-template-columns:514px minmax(0,1fr);gap:0 24px;align-items:start}
.g-cf{margin:0}
.g-cf .a-fc{margin-top:12px;max-width:514px}
.g-rq .a-h3{margin:30px 0 8px}
.st.g-rt2 tr{display:block;padding:8px 0;border-bottom:1px solid var(--hair)}
.st.g-rt2 tr:first-child{border-top:1px solid var(--ink)}
.st.g-rt2 th,.st.g-rt2 td{display:block;padding:0;border:0;text-align:left;font-size:12px;line-height:1.45}
.st.g-rt2 th{font-weight:400;color:var(--quiet)}
.st.g-rt2 th .num{margin-right:4px}
.st.g-rt2 td{margin-top:2px;font-size:13px;color:var(--ink)}
.cdw{position:relative;margin:30px 0 0 64px;width:450px;height:275px}
.card{width:450px;height:275px;border-radius:var(--r);position:relative;overflow:hidden}
.card--front{background:var(--accent);color:var(--accent-ink)}
.card--back{background:var(--ground);color:var(--ink);box-shadow:inset 0 0 0 1px var(--rule)}
.card .lg{position:absolute;left:34px;top:50%;transform:translateY(-50%)}
.card .ln{position:absolute;left:34px;bottom:28px;font-family:var(--body);font-weight:500;font-size:13px}
.card .mk{position:absolute;right:30px;top:30px}
.card .who{position:absolute;left:34px;bottom:30px;font-family:var(--body)}
.who .nm{font-family:var(--display);font-weight:${sub};font-size:20px;line-height:1.2}
.who .rl{font-size:14px;color:var(--soft);margin-top:2px}
.who .ct{font-size:14px;margin-top:14px;line-height:1.5}
.dh,.dv{position:absolute;border:0 solid var(--mark)}
.dh{left:0;width:450px;top:-18px;border-top-width:1px;height:0}
.dh::before,.dh::after{content:'';position:absolute;top:-4px;height:7px;border-left:1px solid var(--mark)}
.dh::before{left:0}.dh::after{right:-1px}
.dv{left:-18px;top:0;height:275px;border-left-width:1px;width:0}
.dv::before,.dv::after{content:'';position:absolute;left:-4px;width:7px;border-top:1px solid var(--mark)}
.dv::before{top:0}.dv::after{bottom:-1px}
.dn{position:absolute;font-size:12px;font-weight:600;line-height:1;color:var(--mark);white-space:nowrap}
/* the business card's dimension lines are Ink, like every drawing in the document */
.cdw .dh,.cdw .dv,.cdw .dh::before,.cdw .dh::after,.cdw .dv::before,.cdw .dv::after{border-color:var(--ink)}
.cdw .dn{color:var(--ink)}

/* contents: each section hangs its number and page range over its clauses */
.g-toc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;margin-top:24px;align-items:start}
.g-sec{margin-bottom:16px}
.g-sh{display:grid;grid-template-columns:40px minmax(0,1fr) auto;padding:8px 0;border-top:1px solid var(--ink);font-size:14px;line-height:1.3;font-weight:600}
.g-sh span:first-child{color:var(--quiet);font-weight:400}
.g-kd{font-weight:400;color:var(--quiet)}
.a-h2.g-rvh{margin:auto 0 10px}
.st.g-rv td{padding:8px 10px 8px 0;font-size:13px}
.notes.g-cn{margin-top:24px}
.g-sec li{display:grid;grid-template-columns:40px minmax(0,1fr) auto;padding:6px 0;border-top:1px solid var(--hair);font-size:13px;line-height:1.35}
.g-sec li span:first-child{color:var(--quiet)}
.g-sec li span:last-child{text-align:right}

/* logo versions: a table with a small render per row, then one figure at actual size */
.st.g-lv{margin-top:24px}
.st.g-lv th{padding:0 12px 8px 0}
.st.g-lv td,.st.g-lv tbody th{padding:8px 12px 8px 0;border-bottom:1px solid var(--hair);vertical-align:middle;text-align:left;font-weight:400;font-size:12.5px;line-height:1.45}
.st.g-lv td.a-no{color:var(--quiet)}
.g-rt{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:124px;height:64px;padding:6px;border-radius:var(--r)}
.g-vn b{display:block;font-size:13px;font-weight:600}
.g-file{display:block;margin-top:2px;color:var(--quiet);white-space:normal;overflow-wrap:anywhere}
.g-ch{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:8px;vertical-align:-1px}
.g-fig{margin-top:24px}
.g-min{display:flex;align-items:flex-end;gap:24px}
.g-mt{display:flex;flex-direction:column;gap:8px}
.g-ms{display:flex;align-items:center;justify-content:center;padding:12px;border-radius:var(--r)}
.g-ml{font-size:12px;line-height:1.3;color:var(--quiet)}

/* contrast: the pairs in use as clauses, then every colour as text on every colour as ground */
.g-aa{display:grid;place-items:center;width:44px;height:32px;border-radius:var(--r);font-family:var(--body);font-weight:500;font-size:15px}
.g-aa--big{width:52px;height:40px;font-size:24px}
.st.g-pt th{padding:0 12px 8px 0}
.st.g-pt th.r{padding-right:0}
.st.g-pt td{padding:6px 12px 6px 0;border-bottom:1px solid var(--hair);vertical-align:middle;font-size:12.5px;line-height:1.4}
.st.g-pt td.a-no{color:var(--quiet)}
.st.g-pt td.r{padding-right:0}
.g-pr b{display:block;font-weight:600}
.st.g-mx{table-layout:fixed;margin-top:0}
.st.g-mx th{padding:8px 10px;border:0;font-size:12px;line-height:1.3;font-weight:600;text-align:left;vertical-align:middle}
.st.g-mx thead th.g-mxc{width:104px;padding-left:0;background:none;color:var(--quiet);font-weight:500;vertical-align:bottom}
.st.g-mx thead th.g-ch2{border-right:2px solid var(--ground)}
.st.g-mx tbody th.g-rh{width:104px;border-bottom:2px solid var(--ground)}
.st.g-mx td.g-x{height:44px;padding:0 10px;border:1px solid var(--hair);vertical-align:middle;font-size:11.5px;line-height:1.3}
.g-x b{display:block;font-size:13px;font-weight:600}
.g-x:not(.is-used) b{font-weight:400;color:var(--quiet)}
.g-x span{display:block;color:var(--soft)}
.st.g-mx td.g-x.is-used{outline:2px solid var(--ink);outline-offset:-2px}
.st.g-mx td.g-x--same{background:var(--panel)}
.photo-slot{display:flex;align-items:flex-end;padding:12px;font-size:12px;line-height:1.4;background:var(--panel);color:var(--quiet);border-radius:var(--r)}
` + cssA(ctx) + cssB(ctx) + cssKit(ctx) + cssBook(ctx);
}

export { readMe, sheets } from './kit.js';
export { guidelines, uikit, brandBook, bookCss };
