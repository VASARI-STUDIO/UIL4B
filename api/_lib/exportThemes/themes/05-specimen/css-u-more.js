// Styles for u-more.js (classes start ku3-): status, feedback, dialog, table, empty. Page 794 x 1123 on the gate's open sheet.
// The catalogue's furniture is drawn in Rod line (1.5 px) as the gate draws it; the components keep the kit's own tokens (.pg .ui).
// The dark ground is the drawer interior. Goudy only at 24 px and over; values in mono through ku3-mono (not the gate's k-mono).
export function cssUMore(ctx) {
  return `
.ku3-mono{font-family:var(--kmono);font-weight:400;letter-spacing:0;font-size:.92em}
.ku3-body{flex:1;min-height:0;display:flex;flex-direction:column;padding-bottom:72px}
.ku3-pg .k-lead{margin-bottom:28px}

/* the foot: a See also reference, then the page's rules as numbered tracings */
.ku3-foot{margin-top:auto;padding-top:24px;display:flex;flex-direction:column;gap:6px;max-width:620px}
.ku3-see{font-family:var(--body);font-size:14px;line-height:21px}
.ku3-see b{font-weight:600}
.ku3-trace{font-family:var(--body);font-size:13px;line-height:19px;color:var(--rod)}

/* a drawer label holder: frame, two screws, the label slid in */
.ku3-hold{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 8px;border:1.5px solid var(--rod);background:var(--ground);align-self:flex-start}
.ku3-screw{display:block;width:5px;height:5px;border-radius:50%;border:1.5px solid var(--rod);flex:none}
.ku3-lab{display:block;height:22px;padding:0 10px;background:var(--face);font-family:var(--body);font-size:14px;line-height:22px;color:var(--ink);white-space:nowrap}
.ku3-lab b{font-weight:600}

/* status: the light page and the drawer interior side by side, the chips at twice their size */
.ku3-st{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);flex:none}
.ku3-st>.ui{position:relative;padding:52px 0 40px 0}
.ku3-st-l{background:var(--surface)}
.ku3-st>.ku3-st-d{background:var(--surface);padding-left:40px;border-left:1.5px solid var(--rod)}
.ku3-side{position:absolute;top:14px;left:0;font-size:12px;line-height:16px;color:var(--quiet)}
.ku3-st-d .ku3-side{left:40px}
.ku3-chips{display:flex;flex-direction:column;gap:36px}
.ku3-chiprow{display:block;height:74px}
.ku3-chiprow .ui-chip{zoom:2.6}
.ku3-ents{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px 40px;margin-top:40px;flex:none}
.ku3-ent{display:flex;flex-direction:column;gap:6px}
.ku3-en{font-family:var(--body);font-size:15px;line-height:22px;color:var(--ink)}
.ku3-en b{font-weight:600}
.ku3-et{font-size:12px;line-height:18px;color:var(--rod)}
.ku3-et .ku3-mono{color:var(--ink)}
.ku3-badge{display:flex;align-items:center;gap:16px;margin-top:36px;background:transparent}
.ku3-badge-n{zoom:1.6}

/* feedback: the drawer pulled open, guide cards dividing it by how long a message stays */
.ku3-drw{position:relative;isolation:isolate;flex:none;border-left:1.5px solid var(--rod);border-right:1.5px solid var(--rod);padding:0 20px}
.ku3-fgs{display:flex;flex-direction:column}
.ku3-fg{display:flex;flex-direction:column;padding:26px 0 12px}
.ku3-fg:first-child{padding-top:30px}
.ku3-guide{position:relative;height:0;margin:0 -20px 12px;border-top:1.5px solid var(--rod)}
.ku3-gtab{position:absolute;bottom:100%;display:flex;align-items:center;height:28px;padding:0 14px;margin-bottom:-1.5px;background:var(--face);border:1.5px solid var(--rod);border-bottom:0;border-radius:7px 7px 0 0;font-family:var(--body);font-size:14px;line-height:20px;font-weight:600;color:var(--ink);white-space:nowrap}
.ku3-guide--l .ku3-gtab{left:20px}
.ku3-guide--c .ku3-gtab{left:calc(33.3% + 10px)}
.ku3-guide--r .ku3-gtab{left:calc(66.6% + 10px)}
.ku3-fn{font-family:var(--body);font-size:14px;line-height:21px;color:var(--ink);max-width:520px;margin-bottom:10px}
.ku3-fc{background:transparent}
.ku3-alerts{display:flex;flex-direction:column;gap:8px;zoom:1.08}
.ku3-toast .ui-toast{zoom:1.08}
.ku3-inline{zoom:1.08}
.ku3-load{display:flex;gap:24px;align-items:center}
.ku3-skel{display:flex;flex-direction:column;gap:10px}
.ku3-lip{display:block;height:16px;margin:0 -20px;background:var(--ground);border-top:1.5px solid var(--rod)}

/* dialog: the confirmation large on its scrim across the sheet, the modal smaller in the drawer interior */
.ku3-dl-big{flex:none;margin-top:10px}
.ku3-scrim{padding:52px 32px}
.ku3-dl-big .ui-dialog{zoom:1.3;max-width:440px}
.ku3-dl-row{display:grid;grid-template-columns:330px minmax(0,1fr);gap:40px;margin-top:36px;flex:none}
.ku3-dl-mod{display:flex;flex-direction:column}
.ku3-dl-dk{margin-top:10px}
.ku3-scrim--s{padding:40px 20px}
.ku3-dl-dk .ui-dialog{max-width:none}
.ku3-dl-rules{display:flex;flex-direction:column;gap:18px;padding-top:44px}
.ku3-dl-rules li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:baseline}
.ku3-dl-rules b{font-size:28px;line-height:1;color:var(--plum)}
.ku3-dl-rules p{font-family:var(--body);font-size:15px;line-height:22px;color:var(--ink)}

/* table: the shelf list set large, its row states pencilled in the margin */
.ku3-tbw{flex:none;padding-left:64px;background:transparent}
/* the old sheet keys its table rules on data-page; these restate the engine's own sizes over them */
.ku3-pg-tb .ku3-tbw .ui-table{zoom:var(--z)}
.ku3-pg-tb .ku3-tbw .ui-table th{height:44px}
.ku3-pg-tb .ku3-tbw .ui-table td{height:52px}
.ku3-pg-tb .ku3-tbw .ui-table td:first-child{white-space:nowrap;min-width:150px}
.ku3-pg-tb .ku3-tbw .ui-table td:nth-child(2),.ku3-pg-tb .ku3-tbd .ui-table td:nth-child(2){white-space:nowrap}
.ku3-tbw .ui-table th:first-child,.ku3-tbw .ui-table td:first-child{position:relative}
.ku3-tbw th[aria-sort]::before,.ku3-tbw tr[aria-selected="true"] td:first-child::before,.ku3-tbw tr.is-hover td:first-child::before{position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);font-family:var(--chrome);font-weight:400;font-size:calc(12px / var(--z));line-height:1.35;color:var(--quiet);white-space:nowrap}
.ku3-tbw th[aria-sort]::before{content:'Sorted'}
.ku3-tbw tr[aria-selected="true"] td:first-child::before{content:'Selected'}
.ku3-tbw tr.is-hover td:first-child::before{content:'Hover'}
.ku3-key{font-size:12px;line-height:18px;color:var(--rod);margin:14px 0 0 64px}
.ku3-tbd{position:relative;flex:none;margin:40px calc(-1 * var(--m)) 0 0;padding:44px var(--m) 32px 24px;background:var(--surface);border-left:1.5px solid var(--rod)}
.ku3-tbd .ku3-side{left:24px}
.ku3-pg-tb .ku3-tbd .ui-table{zoom:1}
.ku3-pg-tb .ku3-tbd .ui-table th{height:44px}
.ku3-pg-tb .ku3-tbd .ui-table td{height:52px}
.ku3-pg-tb .ku3-tbd .ui-table td:first-child{white-space:nowrap}

/* empty: two drawers, each named on its holder, the empty order at the first indention, the first run at the second */
/* the card's indentions, as the guidelines set them: first = margin + 40 px, second = margin + 80 px */
.ku3-em{display:flex;flex-direction:column;flex:none}
.ku3-em--1{margin-left:40px}
.ku3-em--2{margin:22px 0 0 80px}
.ku3-emc{margin-top:12px;background:transparent}
.ku3-pg-em .ku3-emc--big .ui-empty{zoom:1.2}
.ku3-pg-em .ku3-em--2 .ui-empty{zoom:1}
.ku3-steps{display:flex;flex-direction:column;gap:8px;margin:4px 0 8px}
.ku3-steps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-body)}
.ku3-steps li>.num{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--text);font-size:13px;line-height:1;flex:none}
`;
}
