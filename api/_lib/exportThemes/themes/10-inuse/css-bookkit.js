// Styles for theme 10's brand kit PDF pages (read-me, palette sheet, specimen, photography). Scoped under .pg--k; classes start k-.
import { cssStr } from '../../engine/escape.js';
// The sheets reuse the guidelines frame (.pg--std, .hd, .ttl, .fo, .mk, .cap, .h3). Imported by css-book.js.
export function cssBookKit(ctx) {
  const B = ctx.brand, mono = cssStr(B.fonts.mono.family), rk = B.ui.radius.card, qs = ctx.roles.light.quietOnSunken;
  return `
/* pack boards (engine/pack.js): the guidelines frame already is a flex column; set the folder lists at a size that fills the page */
.pg--std[data-page^="pack-"] .pk{margin-top:48px;column-gap:32px}
.pg--std[data-page^="pack-"] .pk-d{margin-bottom:32px}
.pg--std[data-page^="pack-"] .pk-d h3{font-size:14px;margin-bottom:8px}
.pg--std[data-page^="pack-"] .pk-d li{font-size:13px;padding:7px 0}
.pg--std[data-page^="pack-"] .pk-r{margin-top:32px;font-size:14px}

/* kit sheets */
.pg--k .h3{font-size:14px;margin-top:0}
.pg--k .k-big{font-size:64px;line-height:1;margin-top:44px;letter-spacing:-0.01em}
.k-lead{font-family:var(--body);font-size:16px;line-height:1.5;color:var(--soft);max-width:52ch;margin-top:16px}
.k-mono{font-family:'${mono}',monospace;font-size:11px;font-weight:400;line-height:1.4;color:var(--quiet)}
.k-sec{display:flex;flex-direction:column;gap:12px;margin-top:32px}

/* read me 1: the Float stripe on the right, folders and steps as numbered rows */
.k-1{padding-right:152px}
.k-stripe{position:absolute;right:0;top:0;width:96px;height:100%;background:var(--float)}
.k-folders li{display:grid;grid-template-columns:24px 112px minmax(0,1fr);align-items:start;gap:0 16px;padding:16px 0;border-top:1px solid var(--hair)}
.k-folders li:last-child{border-bottom:1px solid var(--hair)}
.k-fn{font-family:var(--body);font-size:20px;line-height:24px;font-weight:600}
.k-fd{font-family:var(--body);font-size:14px;line-height:24px;color:var(--soft)}
.k-how li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:0 16px;padding:14px 0;border-top:1px solid var(--hair)}
.k-how li:last-child{border-bottom:1px solid var(--hair)}
.k-how p{font-family:var(--body);font-size:14px;line-height:1.55;color:var(--soft)}
.k-how b{display:block;font-weight:600;color:var(--ink)}
.k-contact{margin-top:auto;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-contact .k-mono{font-size:12px;color:var(--ink)}

/* read me 2: the Today screen with pins, the notes beside it, the share strip below */
.k-one{display:flex;gap:32px;margin-top:28px;align-items:flex-start}
.k-screen{position:relative;width:360px;height:740px;flex:none}
.k-pin{position:absolute;z-index:1}
.k-pin--1{left:98px;top:58px}
.k-pin--2{left:308px;top:101px}
.k-pin--3{left:246px;top:222px}
.k-pin--4{left:316px;top:384px}
.k-pin--5{left:328px;top:669px}
.k-ph__p{font-size:14px;line-height:1.5;color:var(--soft)}
.k-ph__r{display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid var(--hair);font-size:15px}
.k-ph__foot{position:absolute;left:0;right:0;bottom:0;padding:16px 20px 36px;background:var(--ground);border-top:1px solid var(--hair)}
.k-ph__btn{display:flex;align-items:center;justify-content:center;height:44px;border-radius:999px;background:var(--accent);color:${ctx.roles.light.actionLabel};font:700 16px/1 var(--body)}
.k-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:20px}
.k-logos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.k-tile{display:flex;align-items:center;justify-content:center;height:104px;border-radius:${rk}px;background:var(--card);box-shadow:inset 0 0 0 1px var(--hair)}
.k-line{display:flex;flex-direction:column;gap:6px}
.k-line__p{font-size:30px;line-height:1.05;white-space:normal;color:var(--ink);margin-bottom:6px}
.k-line__o{font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft)}
.k-notes li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:0 12px;padding:10px 0;border-top:1px solid var(--hair)}
.k-notes li:last-child{border-bottom:1px solid var(--hair)}
.k-notes p{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-notes b{display:block;font-size:14px;font-weight:600;color:var(--ink)}
.k-faces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.k-faces li{display:flex;align-items:center;gap:10px}
.k-aa{font-size:40px;line-height:1;color:var(--ink)}.k-aa--body{font-family:var(--body);font-weight:500}
.k-strip{display:flex;gap:4px;margin-top:auto}
.k-strip li{min-width:0}
.k-strip i{display:block;height:48px;border-radius:12px}
.k-strip .cap{margin-top:8px}

/* palette */
.k-share{display:flex;gap:4px;height:56px;margin-top:24px}
.k-share li{min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.3;font-weight:600}
.k-rows{display:flex;flex-direction:column;margin-top:20px}
.k-rows li{display:grid;grid-template-columns:24px 72px minmax(0,1fr) 172px;align-items:center;gap:0 16px;padding:8px 0;border-top:1px solid var(--hair)}
.k-rows li:last-child{border-bottom:1px solid var(--hair)}
.k-rows--t{margin-top:8px}
.k-rows + .h3{margin-top:24px}
.k-rows--t + .cap{margin-top:12px}
.k-rows--t li{grid-template-columns:72px minmax(0,1fr) 172px;padding:6px 0}
.k-sw{display:block;width:72px;height:72px;border-radius:${rk}px}
.k-sw--s{height:36px;border-radius:12px}
.k-sw__n{display:flex;flex-direction:column;gap:2px;font-size:12px;line-height:1.4;color:var(--quiet)}
.k-sw__n b{font-size:16px;line-height:1.25;font-weight:600;color:var(--ink)}
.k-sw__l{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft);margin-top:2px}
.k-sw__v{display:flex;flex-direction:column;gap:2px;font-family:'${mono}',monospace;font-size:11px;line-height:1.4;color:var(--ink)}
.k-sw__v span{overflow-wrap:anywhere}

/* typefaces */
.k-faces2{display:flex;flex-direction:column;gap:12px;margin-top:28px}
.k-face{display:grid;grid-template-columns:200px minmax(0,1fr);align-items:center;gap:0 24px;padding:16px 28px;border-radius:${rk}px;background:var(--panel)}
.k-face .cap{color:${qs}}
.k-face__aa{font-size:92px;line-height:1.05;color:var(--ink)}
.k-face__n{font-size:14px;line-height:1.4;font-weight:600;color:var(--ink)}
.k-face__al{margin-top:10px;font-size:15px;line-height:1.5;color:var(--ink)}
.k-scale{margin-top:24px}
.k-scale li{display:grid;grid-template-columns:24px 140px minmax(0,1fr);align-items:center;gap:0 16px;padding:10px 0;border-top:1px solid var(--hair)}
.k-scale li:last-child{border-bottom:1px solid var(--hair)}
.k-sc__s{color:var(--ink);overflow-wrap:anywhere}
.k-scale + .cap{margin-top:16px}

/* photography */
.k-dir{margin-top:28px}
.k-dir div{display:grid;grid-template-columns:24px 76px minmax(0,1fr);gap:0 16px;padding:18px 0;border-top:1px solid var(--hair);align-items:start}
.k-dir div:last-child{border-bottom:1px solid var(--hair)}
.k-dir dt{font-size:14px;line-height:24px;font-weight:600}
.k-dir dd{margin:0;font-family:var(--body);font-size:14px;line-height:1.55;color:var(--soft)}
.k-dd{margin-top:32px;display:flex;flex-direction:column;gap:12px}
.k-dd__l li{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;padding:16px 0;border-top:1px solid var(--hair)}
.k-dd__l li:last-child{border-bottom:1px solid var(--hair)}
.k-dd__l p{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft)}
.k-dd__l b{display:block;font-weight:600;color:var(--ink)}
.k-shots{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:20px 16px;margin-top:28px;min-height:0}
.k-shot{display:flex;flex-direction:column;gap:10px;min-height:0}
.k-shot__f{flex:1;min-height:0;width:100%;height:100%;object-fit:cover;border-radius:${rk}px;overflow:hidden}
.pg--k .photo-slot{color:${qs}}
.k-shot figcaption{display:grid;grid-template-columns:24px minmax(0,1fr);gap:0 12px;align-items:start}
`;
}
