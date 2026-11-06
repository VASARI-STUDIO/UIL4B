// Styles for theme 09's brand kit PDF pages (read-me, palette sheet, specimen, photography) and the pack boards. Scoped under .pg--k; classes start k-.
// The sheets reuse the guidelines frame (.pg--std, .hd, .ttl, .lead, .cap, .h2). Imported by css-book.js (cssBook returns this).
export function cssBookKit(ctx) {
  const B = ctx.brand, mono = B.fonts.mono.family;
  return `
/* pack boards (engine/pack.js): the guidelines frame is a flex column; set the folder lists at a size that fills the sheet */
.pg--std[data-page^="pack-"] .pk{margin-top:48px;column-gap:32px}
.pg--std[data-page^="pack-"] .pk-d{margin-bottom:32px}
.pg--std[data-page^="pack-"] .pk-d h3{font-size:14px;margin-bottom:8px}
.pg--std[data-page^="pack-"] .pk-d li{font-size:13px;padding:7px 0}
.pg--std[data-page^="pack-"] .pk-r{margin-top:32px;font-size:14px}

/* kit sheets: the work fills the space between the title and the title block */
.pg--k .ttl{margin-top:40px}
.pg--k .ttl.k-big{font-family:var(--display);font-size:56px;line-height:1;font-weight:800;letter-spacing:-0.01em}
.pg--k .lead{max-width:520px}
.k-bd{flex:1;min-height:0;display:flex;flex-direction:column;gap:32px;margin-top:32px}
.k-mono{font-family:'${mono}',monospace;font-size:11px;font-weight:400;line-height:1.4}
.pg--k .cap .k-mono{display:block;margin-top:2px;color:var(--quiet)}
.k-h3{font-size:14px;line-height:1.3;font-weight:600}
.k-no{font-size:12px;color:var(--quiet)}
.pg--k .h2{margin:0 0 12px}

/* the title block at the foot: ruled cells, key above value */
.k-tb{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.4fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);margin-top:32px}
.k-c{padding:10px 16px;font-size:13px;line-height:18px}
.k-c:first-child{padding-left:0}
.k-c+.k-c{border-left:1px solid var(--hair)}
.k-c .k{margin-bottom:0}

/* read-me 1 */
.k-sec{display:flex;flex-direction:column}
.k-folders,.k-how{border-top:1px solid var(--ink)}
.k-folders li{display:grid;grid-template-columns:32px 96px minmax(0,1fr);gap:0 12px;align-items:baseline;padding:18px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft)}
.k-fn{font-family:var(--chrome);font-weight:600;color:var(--ink)}
.k-how li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:0 12px;align-items:baseline;padding:18px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft)}
.k-how b{font-weight:600;color:var(--ink)}
.k-contact{font-size:13px;line-height:1.5;color:var(--soft)}

/* read-me 2 */
.k-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.k-tile{height:200px;border-radius:4px;box-shadow:inset 0 0 0 1px var(--hair);display:flex;align-items:center;justify-content:center;padding-left:24px}
.k-tile--ink{background:var(--dark);box-shadow:none;padding-left:0}
.k-mark{position:relative;flex:none}
.k-line{display:flex;flex-direction:column;gap:12px}
.k-line__p{font-size:44px;line-height:1;font-weight:800}
.k-line__o{font-family:var(--body);font-size:18px;line-height:1.4;font-weight:500;color:var(--soft)}
.k-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;border-top:1px solid var(--ink);padding-top:16px}
.k-traits li p{margin-top:6px;font-family:var(--body);font-size:13px;line-height:1.55;color:var(--soft)}
.k-faces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;border-top:1px solid var(--hair);padding-top:16px}
.k-faces li{display:flex;align-items:baseline;gap:16px}
.k-aa{font-size:88px;line-height:1}
.k-aa--body{font-family:var(--body);font-weight:500}
.k-strip{display:flex;gap:4px;height:72px;margin-top:auto}
.k-strip li{min-width:0;border-radius:2px}
.k-keys{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0 12px;margin-top:-16px}

/* palette */
.k-share{display:flex;gap:4px;height:48px}
.k-share li{min-width:0;border-radius:2px}
.k-rows{border-top:1px solid var(--ink)}
.k-rows li{display:grid;grid-template-columns:56px 150px minmax(0,1fr) 176px;gap:0 16px;align-items:start;padding:12px 0;border-bottom:1px solid var(--hair)}
.k-sw{display:block;width:56px;height:56px;border-radius:2px}
.k-sw--s{height:40px}
.k-sw__n{font-size:12px;line-height:1.4;color:var(--quiet)}
.k-sw__n b{display:block;font-size:15px;font-weight:600;color:var(--ink)}
.k-sw__l{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-sw__v{display:flex;flex-direction:column;gap:2px;font-family:'${mono}',monospace;font-size:11px;line-height:1.4;color:var(--ink);overflow-wrap:anywhere}
.k-rows--t li{padding:10px 0}

/* typefaces */
.k-faces2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 48px}
.k-face{display:flex;flex-direction:column}
.k-face__aa{position:relative;margin:0 0 12px 40px;width:max-content}
.k-face__n{font-size:15px;font-weight:600}
.k-face__al{font-size:14px;line-height:1.45;margin-top:8px;color:var(--ink)}
.k-scale{border-top:1px solid var(--ink)}
.k-scale li{display:grid;grid-template-columns:128px minmax(0,1fr);gap:0 16px;align-items:center;padding:8px 0;border-bottom:1px solid var(--hair)}
.k-scale .cap span{display:block}
.k-sc__s{color:var(--ink);min-width:0;overflow-wrap:anywhere}

/* photography */
.k-dir{border-top:1px solid var(--ink)}
.k-dir div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:0 16px;padding:14px 0;border-bottom:1px solid var(--hair)}
.k-dir dt{font-size:12px;font-weight:600}
.k-dir dd{margin:0;font-family:var(--body);font-size:14px;line-height:1.55;color:var(--soft)}
.k-dd{display:flex;flex-direction:column;gap:12px}
.k-dd__l{border-top:1px solid var(--ink)}
.k-dd__l li{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;padding:12px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-dd__l b{display:block;font-family:var(--chrome);font-size:11px;font-weight:600;color:var(--ink)}
.k-shots{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:20px 24px;min-height:0}
.k-shot{display:flex;flex-direction:column;gap:8px;min-height:0}
.k-shot__f{flex:1;min-height:0;width:100%;height:100%;object-fit:cover;border-radius:4px}
`;
}
