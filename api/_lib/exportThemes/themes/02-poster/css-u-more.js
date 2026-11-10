// Styles for u-more.js: status, feedback, dialog, table, empty. Classes start tu3-.
// The pages stand on the gate's page (.pg.tk) and use its serials (.tk-sn), fields (.tk-ff) and perforation (.tk-perf) as they are.
// Dialog is the page after dark: .tu3-night swaps the page's own colour variables to the dark roles. Components keep the engine's
// own styles; only their frames (scrim height, the empty panel's size) are set here. No hex is written here.
// meta is read at call time (index.js calls this after it has loaded), for the condensed face's pinned width.
import { meta } from './index.js';

export const cssUMore = (ctx) => {
  const D = ctx.roles.dark, st = meta.chrome.stretch;
  // the Night stub on the status page: 396 px inside the page, plus the margin it runs off into
  const NW = 396;
  return `
.pg.tk.tu3-night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
.tu3-h{font-size:64px;line-height:0.95;letter-spacing:-0.02em}
.tu3-tag{display:flex;align-items:baseline;gap:12px;margin:0}
.tu3-tag b{font-family:var(--cond);font-weight:700;font-stretch:${st}%;font-size:20px;line-height:22px;letter-spacing:0.02em}
.tu3-cap{font-size:13px;line-height:1.45;color:var(--soft);max-width:46ch}
.tu3-hr{position:relative;height:3px;flex:none}
.tu3 .ui{background:transparent}
.tu3-top{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:48px;align-items:end}
.tu3-top .tk-lead{font-size:14px}
/* the headline dropped to the stub at the lead's size (table, empty): the component is the large thing */
.tu3-sh{margin:0;font-family:var(--body);font-stretch:100%;font-size:15px;line-height:1.5;font-weight:600;letter-spacing:0;color:var(--ink)}

/* status: the roll on Stock, its Night stub off the right edge to the foot, a perforation between every row */
.tu3-st{position:relative;isolation:isolate;flex:1;min-height:0;display:flex;flex-direction:column;gap:20px}
.tu3-st__night{position:absolute;z-index:-1;top:-20px;bottom:-40px;right:calc(-1 * var(--m));width:calc(${NW}px + var(--m));background:${D.surface}}
.tu3-st__top{display:grid;grid-template-columns:minmax(0,1fr) ${NW}px;align-items:end}
.tu3-st__lead{padding-left:40px;font-size:14px;line-height:1.5;color:${D.textSoft}}
.tu3-inl{display:inline-flex;vertical-align:-4px;margin-left:4px}
.tu3-srs{flex:1;min-height:0;display:flex;flex-direction:column}
.tu3-sr{position:relative;flex:1 1 0;min-height:0;display:grid;grid-template-columns:64px 232px minmax(0,1fr) 88px ${NW}px;column-gap:16px;align-items:center}
.tu3-sr--lead{flex-grow:1.5}
.tu3-hr--day,.tu3-hr--night{position:absolute;top:0}
.tu3-hr--day{left:0;right:${NW + 16}px}
.tu3-hr--night{right:calc(-1 * var(--m));width:calc(${NW - 40}px + var(--m))}
/* the chips are the large thing on the page, at twice their working size; zoom keeps their layout box in step */
.tu3-chip{display:flex}
.tu3-sr .tu3-chip > .ui-chip{zoom:2}
.tu3-sr__m{font-size:14px;line-height:1.45;max-width:40ch}
.tu3-sr--lead .tu3-sr__m{font-size:16px;font-weight:600;max-width:52ch}
.tu3-sr__x{display:block;margin-top:4px;font-size:13px;line-height:1.4;font-weight:400}
.tu3-sr__n{display:grid;grid-template-columns:232px auto;column-gap:16px;align-items:center;padding-left:40px;color:${D.text}}
/* the ratio is the chip's footnote, at label size */
.tu3-sr__r{font-size:15px;line-height:20px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
/* Light and Dark, said once over the roll */
.tu3-srh{flex:none;margin-bottom:-8px;font-size:13px;line-height:16px;font-weight:500;color:var(--soft)}
.tu3-srh .tu3-sr__n{color:${D.textSoft}}

/* feedback: a run of four, each torn from the last; the banners take the width */
.tu3--feedback .tu3-top{grid-template-columns:minmax(0,1fr);gap:14px;align-items:start}
.tu3--feedback .tu3-h{font-size:62px}
.tu3-run{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 340px 190px 240px;margin-top:12px}
.tu3-fc{position:relative;min-width:0;display:flex;flex-direction:column;gap:14px;padding:4px 24px 0}
.tu3-fc:first-child{padding-left:0}
.tu3-fc:last-child{padding-right:0}
.tu3-alerts{display:flex;flex-direction:column;gap:10px}
.tu3-big{zoom:1.25}
.tu3-big .ui-toast{max-width:100%;box-sizing:border-box}
.tu3-big .ui-toast>span{min-width:0;overflow-wrap:anywhere}
.tu3-load{display:flex;gap:16px;align-items:center}
.tu3-skel{display:flex;flex-direction:column;gap:10px}

/* dialog: the modal on the body; the question and its lead head the stub, the confirmation stands tall beneath them */
.tu3-dg{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 480px}
.tu3-dg__body{min-width:0;display:flex;flex-direction:column;padding-right:48px}
.tu3-dg__t{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
.tu3-dg__t .tk-lead{font-size:14px}
.tu3-dg__fig{display:flex;flex-direction:column;gap:12px;flex:1;min-height:0}
.tu3-dg__fig .tu3-scrim{flex:1;min-height:0;display:flex}
.tu3-dg__fig .ui-scrim{flex:1}
.tu3-dg__stub{position:relative;display:flex;flex-direction:column;min-height:0;padding-left:48px}
.tu3-scrim--tall{flex:1;min-height:0;display:flex}
.tu3-scrim--tall .ui-scrim{flex:1}
/* slot edition: the two answers are descriptor boxes. They stay side by side, safe answer first, labels wrapping inside; they stack (still safe first) only when the dialog is too narrow for two */
.tu3--slot .ui-dialog__actions{flex-direction:row;justify-content:stretch;align-items:stretch}
.tu3--slot .ui-dialog__actions .ui-btn{flex:1 1 7rem;min-width:0;height:auto;min-height:44px;padding-block:8px;white-space:normal;line-height:1.2;text-align:center;overflow-wrap:anywhere}

/* table: the table is the body, its keys torn off along its foot; the headline and lead on the stub */
.tu3-tb{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 360px}
.tu3-tb__body{min-width:0;display:flex;flex-direction:column;gap:32px;padding-right:48px}
/* the table is the large thing: shown at 125 % so its rows fill the body; every length inside scales with it */
.tu3-tbl{zoom:1.25}
.tu3-tb__stub{position:relative;display:flex;flex-direction:column;gap:8px;padding-left:48px}
/* hover is its own state: a sunken fill and a hairline bar, so it never reads as the selected row's raised fill and Action bar */
.tu3-tbl .ui-table tbody tr.is-hover{background:var(--sunken);box-shadow:inset 1px 0 0 var(--text-soft)}
.tu3-keys{margin-top:auto;display:flex;flex-direction:column;gap:16px}
.tu3-keys ol{display:flex}
.tu3-keys li{position:relative;flex:1 1 0;min-width:0;display:flex;align-items:baseline;gap:16px;padding:0 24px}
.tu3-keys .tk-sn{white-space:nowrap}
.tu3-keys li:first-child{padding-left:0}

/* empty: one grid; the empty state alone on the body from the top, the headline at lead size, the lead and first run on the stub */
.tu3-em{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 440px;grid-template-rows:auto auto minmax(0,1fr) auto;column-gap:48px;row-gap:12px}
.tu3-em__perf{position:relative;grid-column:2;grid-row:1 / -1;margin-left:-24px;width:3px}
.tu3-em__intro{grid-column:2;grid-row:1;display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
.tu3-em__intro .tk-lead{font-size:14px}
/* the Empty tag sits at the top of the body and the panel runs from under it (22 px tag + 12 px gap) to the caption row */
.tu3-em__k1{grid-column:1;grid-row:1;align-self:start}
.tu3-em__k2{grid-column:2;grid-row:2}
.tu3-em__big{grid-column:1;grid-row:1 / 4;margin-top:34px;display:flex;min-height:0}
.tu3-em__big .ui-empty{flex:1;justify-content:center;padding:48px 56px}
.tu3-em__first{grid-column:2;grid-row:3;display:flex;min-height:0}
.tu3-em__first .ui-empty{flex:1}
.tu3-em__c1{grid-column:1;grid-row:4}
.tu3-em__c2{grid-column:2;grid-row:4}
.tu3-steps{list-style:none;display:flex;flex-direction:column;gap:8px;margin:4px 0 8px;padding:0}
.tu3-steps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-body)}
.tu3-steps .tu3-n{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:var(--r-control);box-shadow:inset 0 0 0 var(--w-control) var(--text);font:600 12px/1 var(--ff-body)}
`;
};
