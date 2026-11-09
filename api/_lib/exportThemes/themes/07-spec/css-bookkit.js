// Styles for theme 07's brand kit pages (read-me, palette, typefaces, photography): .pg pages in the standards style, classes k-.
// Wired through cssBook in css-book.js (cssBookKit(ctx) + ...). Every rule is scoped under .pg--k. Roles come from the brand; no hex is written here.
import { cssStr, cssNum } from '../../engine/escape.js';
export function cssBookKit(ctx) {
  const B = ctx.brand, d = B.fonts.display;
  return `
.pg--k .hd{margin-bottom:40px}
.pg--k .k-fo{margin-left:12px;color:var(--ink)}
.pg--k .k-title{font-size:40px;line-height:1.1;margin-bottom:14px}
.pg--k .k-h{display:grid;grid-template-columns:44px minmax(0,1fr);font-size:15px;line-height:1.3;font-weight:600;margin:36px 0 10px}
.pg--k .k-h .num{color:var(--quiet);font-weight:500}
.pg--k .k-cls{border-top:1px solid var(--ink)}
.pg--k .k-cl{display:grid;grid-template-columns:44px 150px minmax(0,1fr);gap:0 0;padding:11px 0;border-bottom:1px solid var(--hair);font-size:13px;line-height:1.5}
.pg--k .k-cl__n{color:var(--quiet)}
.pg--k .k-cl__l{font-weight:600;padding-right:12px}
.pg--k .k-cl__c{min-width:0;color:var(--soft);font-family:var(--body);font-size:14px;line-height:1.55}
.pg--k .k-cl__c p+p{margin-top:2px}
.pg--k .k-cl--face .k-cl__l{font-family:var(--chrome)}
.pg--k .k-note{font-family:var(--chrome);font-size:12px;color:var(--quiet)}
.pg--k .k-mono{font-family:'${cssStr(B.fonts.mono.family)}',monospace;font-size:10.5px;line-height:1.5;letter-spacing:-0.02em}
.pg--k .k-logo{margin-top:8px}
.pg--k .k-lines{margin-top:32px}
.pg--k .k-lines li{font-family:var(--body);font-size:15px;line-height:1.4;padding:5px 0;color:var(--soft)}
.pg--k .k-lines li.is-first{font-family:var(--display);font-weight:${cssNum(d.weights[0])};font-size:30px;line-height:1.15;color:var(--ink);padding-bottom:10px}
.pg--k .k-bar{display:flex;height:72px;gap:0;border-top:1px solid var(--ink);padding-top:0}
.pg--k .k-bar li{min-width:0}
.pg--k .k-tab{margin-top:0}
.pg--k .k-tab td{padding:9px 10px 9px 0;font-size:13px;vertical-align:middle}
.pg--k .k-tab td:first-child{color:var(--quiet)}
.pg--k .k-tab tr:first-child td{border-top:0}
.pg--k .k-chip{display:inline-block;width:16px;height:16px;border-radius:2px;vertical-align:-3px;margin-right:10px}
.pg--k .k-bands{flex:1;display:flex;flex-direction:column;min-height:0;margin-top:12px}
.pg--k .k-band{min-height:96px;padding:16px 18px;display:grid;grid-template-columns:44px minmax(0,1fr) 200px;gap:0 12px;align-items:end;border-radius:0}
.pg--k .k-band__n{font-size:13px;align-self:start}
.pg--k .k-band h2{font-family:var(--display);font-weight:${cssNum(d.weights[0])};font-size:30px;line-height:1.05;letter-spacing:-0.01em}
.pg--k .k-band p{font-family:var(--body);font-size:13px;line-height:1.45;margin-top:4px}
.pg--k .k-band p.k-mono{margin-top:0;font-family:'${cssStr(B.fonts.mono.family)}',monospace;font-size:10.5px}
.pg--k .k-samp{font-family:var(--body);font-weight:500;font-size:18px;line-height:1.4;color:var(--ink);margin-top:10px}
.pg--k .k-samp--d{font-family:var(--display);font-weight:${cssNum(d.weights[0])};font-size:34px;line-height:1.15;letter-spacing:-0.015em}
.pg--k .k-cl--face{padding:14px 0 20px}
.pg--k .k-face__aa,.pg--k .k-face__al{color:var(--ink)}
.pg--k .k-face__aa{font-size:104px;line-height:1.05;margin-top:8px}
.pg--k .k-face__al{font-size:17px;line-height:1.4;overflow-wrap:anywhere;margin-top:6px}
.pg--k .k-scale td{padding:10px 10px 10px 0;vertical-align:baseline}
.pg--k .k-scale td:nth-child(2){color:var(--quiet);font-size:12px}
.pg--k .k-spl{display:block;white-space:normal;overflow-wrap:anywhere;padding-bottom:.1em}
.pg--k .k-dd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}
.pg--k .k-dd b{display:block;font-family:var(--chrome);font-size:12px;font-weight:600;color:var(--ink);margin-bottom:2px}
.pg--k .k-shots{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:20px 20px;margin-top:12px;min-height:0}
.pg--k .k-shot{display:flex;flex-direction:column;gap:8px;min-height:0}
.pg--k .k-shot .photo-slot,.pg--k .k-shot__f{flex:1;min-height:0;width:100%;height:100%;object-fit:cover;border-radius:var(--r)}
.pg--k .k-shot .cap b .num{color:var(--quiet);font-weight:500}
/* pack boards (engine pack.js): file list at its own height, the README preview takes the rest and stops inside the page margin */
.pg--std[data-page^="pack-"] .pk{flex:0 0 auto}
.pg--std[data-page^="pack-"] .pk-r{flex:1 1 0;min-height:0;overflow:hidden;white-space:pre-line;max-width:none}
`;
}
