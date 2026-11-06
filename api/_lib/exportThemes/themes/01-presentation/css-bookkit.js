// Styles for the brand kit PDF pages (read-me, palette sheet, specimen, photography). Scoped under .pg; classes start k-.
import { cssStr } from '../../engine/escape.js';
export function cssBookKit(ctx) {
  return `
.pg--k{display:flex;flex-direction:column;justify-content:space-between;padding:40px var(--m)}
.k-title{font-size:72px;line-height:0.95}.k-title--sm{font-size:52px}
.k-mono{font-family:'${cssStr(ctx.brand.fonts.mono.family)}',monospace;font-size:11px;font-weight:400;display:block;margin-top:2px}
.k-note{margin-top:16px}
.k-read{flex:1;display:flex;flex-direction:column;justify-content:center;gap:56px;min-height:0}
.k-read__h{display:flex;flex-direction:column;gap:20px;max-width:640px}
.k-read__c{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:64px}
.k-folders li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;padding:11px 0;border-top:1px solid var(--hair);font-family:var(--body);font-size:13px;line-height:1.45;color:var(--soft)}
.k-folders li:last-child{border-bottom:1px solid var(--hair)}
.k-folders b{font-family:var(--chrome);font-weight:600;color:var(--ink)}
.k-how li{display:grid;grid-template-columns:24px minmax(0,1fr);padding:11px 0;border-top:1px solid var(--hair);font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-how li:last-child{border-bottom:1px solid var(--hair)}
.k-how b{font-weight:600;color:var(--ink)}
.k-brand{flex:1;display:flex;flex-direction:column;justify-content:center;gap:48px;min-height:0}
.k-brand__top{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) 260px;gap:48px;align-items:start}
.k-lines li{font-family:var(--body);font-size:16px;line-height:1.4;font-weight:500;padding:6px 0;color:var(--soft)}
.k-lines li.is-first{font-family:var(--display);font-stretch:${ctx.brand.fonts.display.stretch || 100}%;font-weight:800;font-size:30px;line-height:1;color:var(--ink);padding-bottom:12px}
.k-faces p{display:flex;align-items:baseline;gap:16px;margin-bottom:12px}
.k-aa{font-size:56px;line-height:1}.k-aa--body{font-family:var(--body);font-weight:500}
.k-strip{display:flex;gap:4px}
.k-strip li{min-width:0}
.k-strip i{display:block;height:120px;border-radius:2px}
.k-strip .cap{margin-top:8px}
.k-swatches{flex:1;display:flex;gap:4px;margin-top:32px;min-height:0}
.k-swatches li{min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:20px;border-radius:2px}
.k-sw__n{font-family:var(--chrome);font-size:20px;font-weight:600;line-height:1.1}
.k-sw__l{font-family:var(--body);font-size:12px;line-height:1.4;margin-top:6px}
.k-sw__v{display:flex;flex-direction:column;gap:2px;font-family:'${cssStr(ctx.brand.fonts.mono.family)}',monospace;font-size:11px;line-height:1.35;overflow-wrap:anywhere}
.k-faces2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px;margin-top:8px}
.k-face__aa{font-size:150px;line-height:1;margin-bottom:12px}
.k-face__n{font-size:15px;font-weight:600;margin-bottom:2px}
.k-face__al{font-size:17px;line-height:1.4;margin-top:14px;color:var(--ink)}
.k-spec{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:48px;align-items:start;margin-top:8px}
.k-spec__h{font-size:40px;line-height:1}
.k-spec__p{font-family:var(--body);font-size:14px;line-height:1.6;color:var(--soft);max-width:52ch}
.k-dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 56px;margin-top:40px}
.k-dir div{padding:16px 0;border-top:1px solid var(--hair)}
.k-dir dt{font-size:12px;font-weight:600;margin-bottom:4px}
.k-dir dd{margin:0;font-family:var(--body);font-size:15px;line-height:1.55;color:var(--soft)}
.k-shots{flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:20px 24px;margin-top:24px;min-height:0}
.k-shot{display:flex;flex-direction:column;gap:8px;min-height:0}
.k-shot__f{flex:1;min-height:0;width:100%;height:100%;object-fit:cover;border-radius:2px}
.k-shot .cap b{display:inline;margin-right:6px}
`;
}
