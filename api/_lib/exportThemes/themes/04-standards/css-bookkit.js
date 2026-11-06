// Styles for the brand kit PDF pages (read-me, palette sheet, specimen, photography) and the pack boards. Scoped under .pg; classes start k-.
// Imported by css-book.js. The pack boards (engine/pack.js) use .pg--std and need it to be a flex column, which this theme's .pg--std is not.
export function cssBookKit(ctx) {
  const B = ctx.brand, mono = B.fonts.mono.family;
  return `
/* pack boards: the engine's markup assumes a flex column */
.pg--std[data-page^="pack-"]{display:flex;flex-direction:column}
.pg--std[data-page^="pack-"] .pk{flex:1;min-height:0}

/* slot placeholders: their label is set in the chrome at 500, which this theme does not load; 600 is loaded */
.pg .ph-l,.pg .ph-b .ph-l,.pg .ui .ph-b .ph-l{font-weight:600}

/* kit sheets: the standards layout at 1123 x 794 */
.pg--k{display:flex;flex-direction:column;padding:48px var(--m) 56px}
.k-body{flex:1;display:grid;grid-template-columns:250px minmax(0,1fr);gap:0 40px;margin-top:28px;min-height:0}
.k-side h2{font-size:22px;font-weight:600;line-height:1.25;margin-bottom:10px}
.k-side .lead{font-size:13px;line-height:1.5;color:var(--quiet);margin-bottom:18px}
.k-side .rules b{font-weight:600}
.k-work{min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:space-between}
.k-h3{font-size:13px;font-weight:600;border-top:1px solid var(--hair);padding-top:10px;margin-bottom:12px}
.k-mono{font-family:'${mono}',monospace;font-size:11px;font-weight:400;display:block;margin-top:2px;color:var(--quiet)}
.k-note{margin-top:14px}

/* read me 1: the folders as a ruled contents list */
.k-folders{flex:1;display:flex;flex-direction:column;min-height:0}
.k-folders li{flex:1;display:grid;grid-template-columns:40px 200px minmax(0,1fr);align-items:center;gap:0 12px;border-top:1px solid var(--hair);padding:12px 0}
.k-folders li:last-child{border-bottom:1px solid var(--hair)}
.k-no{font-size:13px;color:var(--quiet)}
.k-folders b{font-size:56px;line-height:1;font-weight:700}
.k-fd{font-family:var(--body);font-size:15px;line-height:1.45;color:var(--ink);max-width:36ch}

/* read me 2: the brand on one page */
.k-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.k-tile{display:flex;align-items:center;justify-content:center;height:120px;border-radius:2px}
.k-tile--light{box-shadow:inset 0 0 0 1px var(--hair)}
.k-tile--dark{background:var(--dark);color:var(--dark-ink)}
.k-lines{margin-top:16px;display:flex;flex-direction:column;gap:2px}
.k-lines li{font-size:26px;line-height:1.1;color:var(--soft)}
.k-lines li:first-child{font-size:60px;line-height:1;color:var(--ink);margin-bottom:8px}
.k-faces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px;border-top:1px solid var(--hair);padding-top:14px}
.k-faces p{display:flex;align-items:center;gap:16px}
.k-aa{font-size:64px;line-height:1}.k-aa--body{font-family:var(--body);font-weight:500}
.k-strip{display:flex;gap:4px;margin-top:24px}
.k-strip li{min-width:0}
.k-strip i{display:block;height:56px;border-radius:2px}
.k-strip .cap{margin-top:6px}

/* palette: bands stacked, taller for a larger share */
.k-bands{flex:1;min-height:0;display:flex;flex-direction:column;gap:4px}
.k-bands li{min-height:0;display:grid;grid-template-columns:28px 104px minmax(0,1fr) 190px;align-items:center;gap:0 16px;padding:8px 16px;border-radius:2px}
.k-sw__n{font-size:32px;line-height:1}
.k-sw__l{font-family:var(--body);font-size:13px;line-height:1.4;max-width:44ch}
.k-sw__v{display:flex;flex-direction:column;gap:1px;font-family:'${mono}',monospace;font-size:11px;line-height:1.3}
.k-sw__v span{overflow-wrap:anywhere}
.k-sw__t{display:contents}
.k-sw__k{font-size:12px;line-height:1;font-weight:600}
/* a keyed block on the read-me: the clause number in a 40 px column, as on the folder list */
.k-kd{display:grid;grid-template-columns:40px minmax(0,1fr);gap:0 12px;align-items:start}
.k-kd>.k-no{padding-top:4px}
.k-kd+.k-kd{margin-top:16px}
.k-kd .k-lines,.k-kd .k-strip{margin-top:0}
.k-kd--faces{border-top:1px solid var(--hair);padding-top:14px}.k-kd--faces .k-faces{margin-top:0;border-top:0;padding-top:0}

/* typefaces */
.k-faces2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;border-top:1px solid var(--hair);padding-top:14px}
.k-face__aa{font-size:156px;line-height:1;margin-bottom:12px}
.k-face__n{font-size:13px;font-weight:600;margin-bottom:2px}
.k-face__al{font-size:20px;line-height:1.45;margin-top:12px;color:var(--ink)}
.k-spec{display:grid;grid-template-columns:28px minmax(0,1.3fr) minmax(0,1fr);gap:40px;align-items:start;margin-top:auto;border-top:1px solid var(--hair);padding-top:14px}
.k-spec__h{font-size:50px;line-height:0.9}
.k-spec__p{font-family:var(--body);font-size:17px;line-height:1.4;color:var(--ink);max-width:40ch}

/* photography */
.k-dir{flex:1;display:flex;flex-direction:column;min-height:0}
.k-dir div{flex:1;display:grid;grid-template-columns:104px minmax(0,1fr);align-content:center;gap:0 16px;border-top:1px solid var(--hair)}
.k-dir div:last-child{border-bottom:1px solid var(--hair)}
.k-dir dt{font-size:13px;font-weight:600}
.k-dir dd{margin:0;font-family:var(--body);font-size:19px;line-height:1.4;color:var(--ink);max-width:46ch}
.k-shots{flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:20px 16px;min-height:0}
.k-shot{display:flex;flex-direction:column;gap:8px;min-height:0}
.k-shot__f{flex:1;min-height:0;width:100%;border-radius:2px;overflow:hidden}
.k-shot__f.is-draw{box-shadow:inset 0 0 0 1px var(--hair)}
.k-shot__f .bk-draw{display:block;width:100%;height:100%}
.k-shot__f .ln{fill:none;stroke:var(--ink);stroke-width:1.5}
.k-shot__f .hl{fill:var(--ink)}
.k-shot__f .wk{fill:none;stroke:var(--ink);stroke-width:2.5}
.k-shot__f .oc{fill:var(--ground)}
.k-shot__f .sh{fill:none;stroke:var(--quiet);stroke-width:1}
.k-shot__f .wl{fill:none;stroke:var(--quiet);stroke-width:1;stroke-dasharray:4 4}
.k-shot__f text{fill:var(--ink);font:600 12px var(--chrome)}
.k-nophoto{margin-top:14px;font-size:13px;line-height:1.5;color:var(--ink);max-width:70ch}
`;
}
