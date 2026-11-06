// Styles for theme 06's brand kit PDF pages (read-me, palette sheet, specimen, photography). Scoped under .pg--k; classes start k-.
// The sheets reuse the guidelines frame (.pg--std, .hd, .top, .lead, .bd, .fo). Imported by css-book.js.
export function cssBookKit(ctx) {
  const B = ctx.brand, mono = B.fonts.mono.family;
  return `
/* pack boards (engine/pack.js): the guidelines frame already is a flex column; set the folder lists at a size that fills the page */
.pg--std[data-page^="pack-"] .pk{margin-top:48px;column-gap:32px}
.pg--std[data-page^="pack-"] .pk-d{margin-bottom:32px}
.pg--std[data-page^="pack-"] .pk-d h3{font-size:14px;margin-bottom:8px}
.pg--std[data-page^="pack-"] .pk-d li{font-size:13px;padding:7px 0}
.pg--std[data-page^="pack-"] .pk-r{margin-top:32px;font-size:14px}

/* kit sheets: the same page as the guidelines, a little tighter under the title */
.pg--k .top{margin-top:48px}
.pg--k .bd{margin-top:32px;gap:28px}
.pg--k .h3{font-size:14px}
.pg--k .top h1.k-big{font-family:var(--display);font-size:48px;line-height:1.05;font-weight:700;letter-spacing:-0.02em}
.k-mono{font-family:'${mono}',monospace;font-size:11px;font-weight:400;line-height:1.4;color:var(--quiet)}
.k-sec{display:flex;flex-direction:column;gap:12px}
.k-no{font-size:12px;color:var(--quiet)}

/* read me 1: folders as a ruled list, steps in three columns */
.k-folders li{display:grid;grid-template-columns:36px 150px minmax(0,1fr);align-items:baseline;gap:0 12px;padding:22px 0;border-top:1px solid var(--hair)}
.k-folders li:last-child{border-bottom:1px solid var(--hair)}
.k-fn{font-family:var(--display);font-size:22px;line-height:1.2;font-weight:${B.fonts.display.weights[B.fonts.display.weights.length - 1]}}
.k-fd{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft);max-width:44ch}
.k-how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.k-how li{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--hair);padding-top:12px}
.k-how p{font-family:var(--body);font-size:13px;line-height:1.55;color:var(--soft)}
.k-how b{font-weight:600;color:var(--ink)}
.k-contact{margin-top:auto;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-contact .k-mono{font-size:12px;color:var(--ink)}

/* read me 2: logo tiles, the line, three traits, two faces, the share strip */
.k-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.k-tile{display:flex;align-items:center;justify-content:center;height:152px;border-radius:var(--rk);background:var(--panel)}
.k-tile--ink{background:var(--dark);color:var(--dark-ink)}
.k-line{display:flex;flex-direction:column;gap:10px}
.k-line__p{display:flex;flex-direction:column;font-size:52px;line-height:1.1;color:var(--ink)}
.k-line__o{font-family:var(--body);font-size:15px;line-height:1.4;color:var(--soft)}
.k-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.k-traits li{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--hair);padding-top:12px}
.k-traits p{font-family:var(--body);font-size:13px;line-height:1.55;color:var(--soft)}
.k-faces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;border-top:1px solid var(--hair);padding-top:16px}
.k-faces li{display:flex;align-items:center;gap:16px}
.k-aa{font-size:56px;line-height:1;color:var(--ink)}.k-aa--body{font-family:var(--body);font-weight:500}
.k-strip{display:flex;gap:4px;margin-top:auto;margin-bottom:12px}
.k-strip li{min-width:0}
.k-strip i{display:block;height:80px;border-radius:var(--rc)}
.k-strip .cap{margin-top:8px}

/* palette */
.k-share{display:flex;gap:4px;height:64px}
.k-share li{min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px 12px;border-radius:var(--rc);font-size:12px;line-height:1.3;font-weight:600}
.k-rows{display:flex;flex-direction:column}
.k-rows li{display:grid;grid-template-columns:72px 124px minmax(0,1fr) 196px;align-items:center;gap:0 20px;padding:16px 0;border-top:1px solid var(--hair)}
.k-rows li:last-child{border-bottom:1px solid var(--hair)}
.k-sw{display:block;width:72px;height:72px;border-radius:var(--rc)}
.k-sw--s{height:48px;margin:12px 0}
.k-sw__n{display:flex;flex-direction:column;gap:2px;font-size:12px;line-height:1.4;color:var(--quiet)}
.k-sw__n b{font-size:16px;line-height:1.25;font-weight:600;color:var(--ink)}
.k-sw__l{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-sw__v{display:flex;flex-direction:column;gap:2px;font-family:'${mono}',monospace;font-size:11px;line-height:1.4;color:var(--ink)}
.k-sw__v span{overflow-wrap:anywhere}
.k-rows--t li{padding:0}

/* typefaces */
.k-faces2{display:flex;flex-direction:column;gap:12px}
.k-face{display:grid;grid-template-columns:200px minmax(0,1fr);align-items:center;gap:0 24px;padding:12px 28px;border-radius:var(--rk);background:var(--panel)}
.k-face__aa{font-size:92px;line-height:1.05;color:var(--ink)}
.k-face__n{font-size:14px;line-height:1.4;font-weight:600;color:var(--ink)}
.k-face__al{margin-top:10px;font-size:15px;line-height:1.5;color:var(--ink)}
.k-scale li{display:grid;grid-template-columns:148px minmax(0,1fr);align-items:center;gap:0 20px;padding:7px 0;border-top:1px solid var(--hair)}
.k-scale li:last-child{border-bottom:1px solid var(--hair)}
.k-scale .cap b{display:block}
.k-sc__s{color:var(--ink);overflow-wrap:anywhere}

/* photography */
.k-dir div{display:grid;grid-template-columns:100px minmax(0,1fr);gap:0 20px;padding:14px 0;border-top:1px solid var(--hair)}
.k-dir div:last-child{border-bottom:1px solid var(--hair)}
.k-dir dt{font-size:13px;line-height:1.5;font-weight:600;color:var(--ink)}
.k-dir dd{margin:0;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--ink);max-width:58ch}
.k-dd{display:flex;flex-direction:column;gap:12px}
.k-dd__l li{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;padding:12px 0;border-top:1px solid var(--hair)}
.k-dd__l li:last-child{border-bottom:1px solid var(--hair)}
.k-dd__l p{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}
.k-dd__l b{display:block;font-family:var(--chrome);font-size:12px;font-weight:600;color:var(--ink)}
.k-shots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 14px}
.k-shot{display:flex;flex-direction:column;gap:8px}
.k-shot__f{flex:none;height:176px;width:100%;border-radius:var(--rc);overflow:hidden}
`;
}
