// Styles for u-more.js: the UI kit's status, feedback, dialog, table and empty pages (classes start ru3-). Page 794 x 1123, margin 72,
// spacing on a 4 px base. A figure is a sheet of the paper (the gate's r-sheet) with crosses at its corners, its print area a .ui region;
// under it the job line, then the caption. A sheet whose component has an edge of its own drops its hairline (ru3-sh--bare); a dark
// sheet is the dark ground itself (ru3-sh--ink). The components keep the engine's own styles; only the layout round them is set here.
export const cssUMore = (ctx) => `
.ru3-body{position:absolute;left:72px;right:72px;top:216px}
.ru3-fig{margin:0;min-width:0}
.ru3-sh{padding:24px;--xi:6px}
.ru3-sh--bare{outline:0;padding:28px}
.ru3-sh--over{padding:24px}
.ru3-sh--ink{outline:0;background:${ctx.roles.dark.surface}}
.ru3-pr{min-width:0;background:var(--surface);color:var(--text);font-family:var(--ff-body)}
.ru3-sh--tbl{padding:20px}
.ru3-sh--tbs{padding:16px}

/* the job line (the book's one form): under the figure, flush with the sheet's left edge */
.ru3-job{margin-top:8px;max-width:72ch;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet);text-wrap:pretty}
.ru3-jd,.ru3-jn{white-space:normal}
.ru3-sw{display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:0;outline:1px solid var(--hair);outline-offset:-1px}

.ru3-cap{margin-top:16px}
.ru3-ct{font-family:var(--chrome);font-weight:600;font-size:16px;line-height:1.3;color:var(--ink)}
.ru3-cn{margin-top:4px;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}
.ru3-f{margin-top:8px;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--ink);max-width:62ch}
.ru3-f b{font-family:var(--chrome);font-weight:600}
.ru3-cn + .ru3-f{margin-top:8px}
.ru3-wrap{display:flex;flex-wrap:wrap;gap:12px}
.ru3-notes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin-top:4px}
.ru3-notes .ru3-f{margin-top:8px}
.ru3-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start;margin-top:24px}
.ru3-fig--side{display:grid;grid-template-columns:470px minmax(0,1fr);column-gap:28px;align-items:start;margin-top:24px}
.ru3-fig--side:first-child{margin-top:0}
.ru3-fig--side > .r-sheet,.ru3-fig--side > .ru3-job{grid-column:1}
.ru3-fig--side > .ru3-cap{grid-column:2;grid-row:1 / 3;margin-top:0;padding-top:4px}

/* status: one sheet of keys across the page (each chip the key to its sentence, a rule between), then the badge and the dark chips */
.ru3-sts{display:flex;flex-direction:column}
.ru3-st{display:grid;grid-template-columns:152px minmax(0,1fr);column-gap:24px;align-items:start;padding:10px 0;border-top:1px solid var(--divider)}
.ru3-st:first-child{border-top:0;padding-top:4px}
.ru3-st:last-child{padding-bottom:4px}
.ru3-st__c{line-height:0;padding-top:4px}
.ru3-st__u{font-family:var(--ff-body);font-size:18px;line-height:1.3;color:var(--text);text-wrap:pretty}
.ru3-st__r{margin-top:6px;font-family:var(--chrome);font-size:12px;line-height:1.4;color:var(--quiet)}
.ru3-st__r b{font-weight:700;font-size:14px;color:var(--text)}
.ru3-badge{display:inline-flex;align-items:center;gap:8px;font:400 15px/1 var(--ff-body);color:var(--text)}
.ru3-pg--status .ru3-cap{margin-top:12px}
.ru3-pg--status .ru3-fig + .ru3-fig{margin-top:20px}
/* the light chips on Wall: four keys in a row, each chip over its ratio */
.ru3-lr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.ru3-lr > div{min-width:0}
.ru3-lr .r-mono,.ru3-st__r .r-mono{white-space:nowrap}
.ru3-lr .ru3-st__r{margin-top:8px}
.ru3-sh--lr{padding:20px 24px}

/* feedback: each tone has its own icon and the engine's one edge, in the tone colour */
.ru3-alerts{display:flex;flex-direction:column;gap:8px}
.ru3-al__t{display:block;font-weight:600}
.ru3-foot{display:flex;justify-content:center;padding:8px 0}
.ru3-load{display:flex;flex-direction:column;gap:16px}
.ru3-spin{display:flex;align-items:center;gap:12px;font-size:15px;line-height:1.4;color:var(--text)}
.ru3-skel{display:flex;flex-direction:column;gap:8px}
.ru3-fig--in{margin-top:16px}
.ru3-pg--feedback .ru3-row{margin-top:16px}
.ru3-pg--feedback .ru3-fig:not(.ru3-fig--side) .ru3-cap{margin-top:12px}
.ru3-pg--feedback .ru3-sh{padding:20px 24px}
.ru3-pg--feedback .ru3-sh--bare{padding:20px 28px}
.ru3-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}
/* no widow: the error and help lines break so the last line is never one word */
.ru3-pg--feedback .ui-error,.ru3-pg--feedback .ui-help{text-wrap:pretty}

/* dialog: the dialog over a slice of the product's screen under the scrim; the same dialog at 390 as a bottom sheet */
.ru3-zz{display:grid;grid-template-columns:446px minmax(0,1fr);gap:28px;align-items:start}
.ru3-zz--r{grid-template-columns:minmax(0,1fr) 438px;margin-top:20px}
.ru3-pg--dialog .ru3-sh--over{padding:20px}
.ru3-pg--empty .ru3-row{margin-top:16px}
.ru3-zz .ru3-cap{margin-top:0;padding-top:4px}
.ru3-over{position:relative;height:276px;background:var(--surface)}
.ru3-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:4px}
.ru3-facts .ru3-f{margin-top:8px}
.ru3-fig--dd .ru3-cap{margin-top:12px}
.ru3-over--m{width:390px;height:344px}

.ru3-sl .ui-topbar{padding:0 16px}
.ru3-sl .ui-topbar__links{white-space:nowrap}
.ru3-sl__b{padding:12px 16px 0}
.ru3-sl__t{margin:0 0 4px;font-size:22px;line-height:1.2}
.ru3-sl .ui-row{min-height:56px}
.ru3-pr .ru3-scrim{position:absolute;inset:0;padding:16px;background:color-mix(in srgb,var(--scrim) 62%,transparent)}
.ru3-scrim .ui-dialog{max-width:400px}
.ru3-scrim .ui-dialog__actions{flex-wrap:wrap}
/* side by side, the safe answer first; they stack only when the two labels do not fit one row */
.ru3-scrim .ui-dialog__actions .ui-btn{flex:1 1 9rem;min-width:max-content}
.ru3-pr .ru3-scrim--m{padding:0;align-items:end;justify-items:stretch}
.ru3-scrim--m .ui-dialog{max-width:none;border-width:var(--w-control) 0 0}
.ru3-dsheet .ui-dialog__actions{flex-direction:column;align-items:stretch;gap:8px}
.ru3-dsheet .ui-btn{width:100%}
.ru3-dsheet .ui-dialog__actions .ui-btn{flex:none;min-width:0}

/* table: the table large, its notes in four columns under it; then the loading and empty tables, each keeping the header */
.ru3-pg .ui-table td{white-space:nowrap}
.ru3-sort{display:block;margin-left:2px}
.ru3-sh--tbs .ui-table th,.ru3-sh--tbs .ui-table td{padding:0 8px}
.ru3-pg .ui-table td.ru3-emp{height:64px;white-space:normal;color:var(--text-soft)}
.ru3-emp > span{margin-right:8px}
.ru3-emp .ui-btn{vertical-align:middle}
.ru3-note .ru3-f{margin-top:8px}

/* empty: First visit is the one large figure (no panel); no results and the failure are small and sit side by side */
.ru3-pg .ru3-first{background:transparent;padding:12px 8px 8px;gap:16px}
.ru3-nr{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.ru3-nr .ui-field{align-self:stretch}
.ru3-nr__t{margin:0;font:500 16px/1.3 var(--ff-body);color:var(--text)}
.ru3-nr__x{margin:0;font-size:14px;line-height:1.45;color:var(--text-soft)}
.ru3-nr .ui-btn--quiet{margin-left:-12px}
.ru3-lf{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:16px 0;border-top:2px solid var(--text);border-bottom:1px solid var(--divider)}
.ru3-lf .ui-alert{align-self:stretch}
${ctx.edition === 'slot' ? `/* slot: the two small sheets share one height (the taller sets it), so their bottom crop marks sit on one line and the longer placeholder block never reads as outgrowing its neighbour */
.ru3-pg--empty .ru3-row--t{grid-template-rows:auto auto;align-items:stretch}
.ru3-pg--empty .ru3-row--t .ru3-fig{display:grid;grid-row:span 2;grid-template-rows:subgrid;row-gap:0}
.ru3-pg--empty .ru3-row--t .r-sheet.ru3-sh--bare{padding:24px 28px}` : ''}
`;
