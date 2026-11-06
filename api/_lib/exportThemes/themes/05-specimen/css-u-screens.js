// Styles for u-screens.js (classes start ku4-). Open catalogue sheets around the product's own UI.
// One elevation language, the gate's: 1.5 px Rod lines for drawers and guide-card edges, 1 px for a screen's edge; no shadows.
// The drawer interior is the dark edition's own sunken ground. Goudy Bookletter 1911 at 24 px and over only.
import { KU4_Z } from './u-screens.js';
export function cssUScreens(ctx) {
  const D = ctx.roles.dark;
  return `
.ku4-pg{--ku4-z:${KU4_Z}}
.ku4-mono{font-family:var(--kmono);font-weight:400;letter-spacing:0;font-variant-numeric:tabular-nums}
.ku4-pg .k-lead.ku4-lead{margin-bottom:20px}
.ku4-pg-dark .k-lead.ku4-lead{margin-bottom:12px}
.ku4-shot{flex:none;display:flex}

/* the desktop book page */
.ku4-desk{display:flex;flex-direction:column;flex:none;zoom:var(--ku4-z);width:calc((794px - 2 * var(--m)) / var(--ku4-z));background:var(--surface);color:var(--text);box-shadow:inset 0 0 0 1px var(--rod)}
.ku4-desk[data-theme="dark"]{box-shadow:inset 0 0 0 1px var(--divider)}
.ku4-logo{display:block;line-height:0;flex:none}
.ku4-main{display:grid;grid-template-columns:200px minmax(0,1fr);gap:28px;padding:24px 28px 20px}
.ku4-cover{display:flex;align-items:flex-end;padding:12px;background:var(--sunken);color:var(--quiet-sunken);font:400 12px/16px var(--ff-body)}
.ku4-cover--desk{align-self:stretch}
.ku4-title{font-size:36px;line-height:40px;font-weight:400;white-space:nowrap;padding-bottom:.1em;margin-bottom:-.1em}
.ku4-by{margin-top:6px;font:400 15px/22px var(--ff-body);color:var(--quiet)}
.ku4-st{display:flex;align-items:center;gap:12px;margin-top:12px}
.ku4-eta{font:500 16px/24px var(--ff-body)}
.ku4-pick{margin-top:8px;font:400 15px/22px var(--ff-body);color:var(--text-soft)}
.ku4-prog{margin-top:20px}
.ku4-route{display:flex;justify-content:space-between;margin-top:8px;font:400 12px/16px var(--ff-body);color:var(--quiet)}
.ku4-seg{display:flex;align-items:center;gap:16px;margin-top:20px}
.ku4-price{font:500 16px/24px var(--ff-body)}
.ku4-btns{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}
.ku4-list{padding:0 28px 16px}
.ku4-lh{font:500 14px/18px var(--ff-body);margin-bottom:4px}
/* the text floor inside the scaled screen: 14 px drawn at ${KU4_Z} is ${Math.round(14 * KU4_Z * 100) / 100} px, so nothing small goes under 11 */
.ku4-desk .ku4-cover,.ku4-desk .ku4-route,.ku4-desk .ui-row__sub,.ku4-desk .ui-row__end,.ku4-desk .ui-chip,.ku4-desk .ui-segmented button,.ku4-desk .ui-help{font-size:14px}
.ku4-desk .ku4-cover,.ku4-desk .ku4-route{line-height:18px}

/* the foot of a sheet: tracings, then See and See also */
.ku4-foot{flex:none;display:flex;flex-direction:column;gap:6px;margin-top:16px;max-width:640px}
.ku4-trace,.ku4-see{font-family:var(--body);font-size:14px;line-height:21px}
.ku4-see{color:var(--rod)}
.ku4-trace b,.ku4-see b{font-weight:600;color:var(--ink);margin-right:4px}
.ku4-see b{font-style:italic;font-weight:400}

/* screen, dark: the open drawer, its guide tabs naming the editions */
.ku4-tabs{position:relative;height:30px;flex:none;margin-left:28px}
.ku4-etab{position:absolute;bottom:0;width:128px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px 8px 0 0;font-family:var(--display);font-size:24px;line-height:1;padding-bottom:3px}
.ku4-etab--back{left:0;bottom:4px;background:var(--face);color:var(--ink);box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.ku4-etab--front{left:136px;background:var(--plum);color:var(--plum-ink);z-index:1}
.ku4-drawer{position:relative;isolation:isolate;flex:none;padding:10px 10px 22px;background:${D.sunken};border:1.5px solid var(--rod);border-bottom:0}
.ku4-lip{position:absolute;left:0;right:0;bottom:0;height:14px;background:var(--ground);border-top:1.5px solid var(--rod)}
.ku4-shot--dark .ku4-desk{width:calc((794px - 2 * var(--m) - 23px) / var(--ku4-z))}
.ku4-scale{position:absolute;right:0;bottom:6px;font-family:var(--body);font-size:13px;line-height:18px;color:var(--rod)}
.ku4-trace--swap{max-width:none}
.ku4-swaps{columns:2;column-gap:28px;margin-top:2px}
.ku4-swaps .ku4-tp{font-size:13px;line-height:20px}
.ku4-foot--dark{margin-top:12px;gap:4px}
/* the foot is held clear of the rod hole: the screen clips inside its drawer before the footnotes can run into it */
.ku4-pg-light .ku4-foot,.ku4-pg-dark .ku4-foot{margin-bottom:72px}
.ku4-pg-code .ku4-foot{margin-top:8px;margin-bottom:12px}
.ku4-pg-dark .ku4-drawer{flex:0 1 auto;min-height:0;overflow:hidden}
.ku4-desk[data-theme="dark"] .ku4-cover{box-shadow:inset 0 0 0 1px var(--edge)}

/* screen, mobile: the phone, then guide cards edge on */
.ku4-mob{display:grid;grid-template-columns:390px minmax(0,1fr);gap:36px;flex:none}
.ku4-phone{width:390px;height:844px;display:flex;flex-direction:column;background:var(--surface);color:var(--text);box-shadow:inset 0 0 0 1px var(--rod)}
.ku4-ph-top{display:flex;justify-content:space-between;align-items:center;padding:16px 24px 0;font:500 13px/20px var(--ff-body)}
.ku4-ph-body{flex:1;min-height:0;padding:20px 24px 20px;display:flex;flex-direction:column}
.ku4-ph-chip{display:block}
.ku4-ph-title{margin-top:12px;font-size:36px;line-height:40px;font-weight:400;white-space:nowrap;padding-bottom:.1em;margin-bottom:-.1em}
.ku4-ph-body .ku4-eta{margin-top:8px}
.ku4-author{display:flex;align-items:center;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--divider)}
.ku4-amain{flex:1;min-width:0}
.ku4-aname{font:500 15px/20px var(--ff-body)}
.ku4-asub{font:400 13px/18px var(--ff-body);color:var(--quiet)}
.ku4-detail{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:16px}
.ku4-detail div{padding:8px 0;border-top:1px solid var(--divider)}
.ku4-detail dt{font:400 12px/16px var(--ff-body);color:var(--quiet)}
.ku4-detail dd{margin:0;font:500 15px/22px var(--ff-body)}
.ku4-ph-list{margin-top:20px}
.ku4-ph-body .ui-btn--block{margin-top:auto}
.ku4-mob-r{display:flex;flex-direction:column;gap:40px;min-width:0;padding-top:4px}
.ku4-notes{display:flex;flex-direction:column;gap:12px}
.ku4-notes li{font-family:var(--body);font-size:15px;line-height:22px;padding-left:20px;text-indent:-20px}
.ku4-entries{display:flex;flex-direction:column;gap:22px;background:none;color:var(--text)}
.ku4-entry{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.ku4-etitle{font-family:var(--display);font-size:26px;line-height:30px;margin-top:4px;padding-bottom:.1em;margin-bottom:-.1em}
.ku4-ewhen{margin-left:16px;font-family:var(--body);font-size:14px;line-height:20px}

/* a guide card edge on: its tab stands on the card's top edge at one of four cut positions */
.ku4-guide{position:relative;padding-top:28px;flex:none;min-width:0}
.ku4-gtab{position:absolute;top:0;left:calc(var(--cut) * 22%);z-index:1;height:29.5px;display:flex;align-items:center;padding:0 14px;background:var(--face);border-radius:7px 7px 0 0;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod);font-family:var(--body);font-size:15px;line-height:22px;font-weight:500;white-space:nowrap}
.ku4-gbody{border-top:1.5px solid var(--rod);padding-top:10px}

/* tokens */
.ku4-tokens{flex:none;display:flex;flex-direction:column;gap:8px}
.ku4-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 28px}
.ku4-key{display:flex;gap:20px;font-family:var(--body);font-size:13px;line-height:18px;margin-bottom:4px}
.ku4-key span{display:flex;align-items:center;gap:6px}
.ku4-cols{columns:3;column-gap:24px}
.ku4-pal{columns:5;column-gap:16px}
.ku4-ce{break-inside:avoid;display:flex;flex-wrap:wrap;column-gap:10px;padding:1px 0 3px}
.ku4-ck{flex:0 0 100%;font-size:12px;line-height:16px;white-space:nowrap}
.ku4-cv{display:inline-flex;align-items:center;gap:5px;font-size:12px;line-height:16px}
.ku4-ce .ku4-cv:nth-child(2){margin-left:16px}
.ku4-sw{display:block;width:11px;height:11px;flex:none;box-shadow:inset 0 0 0 1px var(--rod)}
.ku4-run{font-family:var(--body);font-size:14px;line-height:22px}
.ku4-run .ku4-mono{font-size:13px}
/* a token and its value: one pair per line, never broken; two columns unless the values are long */
.ku4-tps{columns:2;column-gap:20px}
.ku4-tps--one{columns:1}
.ku4-tp{break-inside:avoid;white-space:nowrap;font-family:var(--body);font-size:13px;line-height:21px}
.ku4-tp .ku4-mono{font-size:13px}

/* code */
.ku4-code{margin:0;flex:none;min-width:0}
.ku4-ccap{font-family:var(--body);font-size:15px;line-height:22px;margin-bottom:6px}
.ku4-pre{margin:0;padding:14px 16px;background:var(--surface);color:var(--text);font:400 13px/21px var(--kmono);white-space:pre;overflow:hidden}
.ku4-pre code{font:inherit}
.ku4-code--big .ku4-pre{font-size:17px;line-height:28px;padding:22px 26px}
.ku4-code2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;margin-top:20px;flex:none}
.ku4-guide--files{margin-top:28px}
.ku4-files{columns:2;column-gap:28px}
.ku4-file{break-inside:avoid;padding-bottom:10px}
.ku4-fname{display:block;font-size:13px;line-height:18px}
.ku4-fdesc{display:block;margin-left:16px;font-family:var(--body);font-size:14px;line-height:20px}
`;
}
