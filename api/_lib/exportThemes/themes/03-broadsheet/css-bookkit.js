// Styles for the brand kit PDF pages (read-me, palette sheet, specimen, photography). Scoped under .pg; classes start k-.
export function cssBookKit(ctx) {
  const mono = ctx.brand.fonts.mono.family;
  return `
.pg--k.pg--std{gap:18px}
.k-mast{flex:none;display:flex;justify-content:space-between;align-items:baseline;padding:16px 0 12px;border-bottom:3px solid var(--ink)}
.k-name{font-family:var(--display);font-size:48px;line-height:1}
.k-sub{font-size:14px;font-weight:600}
.k-head{flex:none;margin:22px 0 0;font-family:var(--display);font-weight:400;font-size:60px;line-height:1.02;letter-spacing:-0.01em}
.k-cols{flex:1;min-height:0;display:grid;grid-template-columns:4fr 2fr;margin-top:20px;padding-top:16px;border-top:1px solid var(--hair)}
.k-l{padding-right:24px;min-height:0}.k-r{padding-left:24px;border-left:1px solid var(--hair);min-height:0}
.k-l .lead{max-width:640px;font-size:17px}
.k-mono{font-family:'${mono}',monospace;font-size:11px;font-weight:400;display:block;margin-top:2px}
.k-folders{margin-top:14px}
.k-folders li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;padding:8px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.4;color:var(--soft)}
.k-folders b{font-weight:700;color:var(--ink)}
.k-how li{display:grid;grid-template-columns:24px minmax(0,1fr);padding:9px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft)}
.k-how b{font-weight:700;color:var(--ink)}
.k-brand{flex:1;display:flex;flex-direction:column;justify-content:space-between;min-height:0}
.k-top3{display:grid;grid-template-columns:4fr 3fr 3fr}
.k-top3>*{padding:0 24px;border-left:1px solid var(--hair)}.k-top3>:first-child{padding-left:0;border-left:0}
.k-lines li{font-family:var(--body);font-size:16px;line-height:1.4;font-weight:500;padding:6px 0;color:var(--soft)}
.k-lines li.is-first{font-family:var(--display);font-weight:400;font-size:30px;line-height:1.05;color:var(--ink);padding-bottom:12px}
.k-faces p{display:flex;align-items:baseline;gap:16px;margin-bottom:12px}
.k-aa{font-size:56px;line-height:1}.k-aa--body{font-family:var(--body)}
.k-strip{display:flex}.k-strip li{min-width:0}
.k-strip i{display:block;height:120px}.k-strip .cap{margin-top:8px}
.k-tbl{width:100%;border-collapse:collapse;table-layout:fixed;font-family:var(--body);font-size:13px;line-height:1.35}
.k-tbl th{text-align:left;font-family:var(--chrome);font-weight:600;font-size:12px;color:var(--quiet);padding:0 12px 6px 0;border-bottom:1px solid var(--ink)}
.k-tbl td{padding:6px 12px 6px 0;border-bottom:1px solid var(--hair);vertical-align:middle}
.k-tbl th:nth-child(1){width:76px}.k-tbl th:nth-child(2){width:150px}.k-tbl th:nth-child(3){width:260px}
.k-chip{display:block;width:56px;height:28px}
.k-n{font-weight:700}
.k-v{font-family:'${mono}',monospace;font-size:11px}.k-v span{display:block}
.k-note{margin-top:8px}
.k-faces2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.k-face{padding:0 32px;border-left:1px solid var(--hair)}.k-face:first-child{padding-left:0;border-left:0}
.k-face__aa{font-size:130px;line-height:0.95;margin-bottom:12px}
.k-face__n{font-family:var(--body);font-size:18px;font-weight:700;margin-bottom:2px}
.k-face__al{font-size:17px;line-height:1.4;margin-top:12px;color:var(--ink)}
.k-spec{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:48px;align-items:start;border-top:1px solid var(--ink);padding-top:14px}
.k-spec__h{font-size:36px}
.k-dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;border-top:1px solid var(--ink)}
.k-dir div{padding:14px 0;border-bottom:1px solid var(--hair)}
.k-dir dt{font-family:var(--body);font-size:16px;font-weight:700;margin-bottom:4px}
.k-dir dd{margin:0;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--soft)}
.k-shots{flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:16px 24px;min-height:0}
.k-shot{display:flex;flex-direction:column;gap:8px;min-height:0}
.k-shot .photo-slot{flex:1;min-height:0;box-shadow:inset 0 0 0 1px var(--hair)}
.k-shot .cap b{display:inline;margin-right:6px}
`;
}
