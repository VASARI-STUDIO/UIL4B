// Styles for u-screens.js: screen-light, screen-dark, screen-mobile, tokens, code. Classes start tu4-.
// Reads the .pg.tk custom properties set in css-gate.js; the gate's classes are used, never restyled. The screens are the kit's own
// components (.ui, scoped to light or dark tokens in css-kit.js). No hex is written here.
import { cssStr, cssNum } from '../../engine/escape.js';
export const cssUScreens = (ctx) => {
  const D = ctx.roles.dark, B = ctx.brand, mono = B.fonts.mono, d = B.fonts.display, rc = B.ui.radius.card;
  return `
/* the one page after dark in this run: Night ground, Stock ink */
.pg.tk.tu4--night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
.tu4-mono{font-family:'${cssStr(mono.family)}',monospace;font-weight:400;font-size:0.9em;font-variant-numeric:tabular-nums}
/* the perforation as a rule: a box the size of its holes, the holes drawn along it */
.tu4-hr{position:relative;flex:none;height:3px}
.tu4-vr{position:relative;flex:none;width:3px;align-self:stretch}
/* the page's line in a stub column at lead size, so the component beside it is the large thing */
.tu4-stub{display:flex;flex-direction:column;gap:8px}
.pg.tk .tu4-lh{margin:0;font-family:var(--body);font-stretch:100%;font-size:15px;line-height:1.5;font-weight:600;letter-spacing:0;color:var(--ink);text-wrap:balance;max-width:24ch}
.tu4-stub .tk-lead{margin:0;max-width:34ch}
.tu4-sw{display:inline-block;flex:none;width:14px;height:14px;border-radius:${B.ui.radius.control}px;box-shadow:inset 0 0 0 1px var(--hair);vertical-align:-2px}

/* the app's screen: a window the same size on both screen pages, so the layout cannot move between modes */
.pg .ui.tu4-win{flex:none;width:800px;height:468px;display:flex;flex-direction:column;border-radius:${rc}px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--divider)}
.tu4-win .ui-topbar{flex:none;padding:0 20px}
.tu4-win__logo{display:flex;align-items:center}
.tu4-win__clock{font-size:var(--fs-label);color:var(--quiet);min-width:40px;text-align:right}
.tu4-win__main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 276px;gap:24px;padding:24px}
.tu4-more{display:flex;flex-direction:column;min-height:0}
.tu4-more__h{margin:0 0 8px;font:var(--fw-label) var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--quiet)}
.tu4-more .ui-list{margin-bottom:16px}
.tu4-more .ui-row{min-height:0;padding:10px 0}

/* the live ticket as the app draws it: body, the app's tear line, the stub with the one code */
.tu4-tix{display:flex;align-self:start;min-width:0;background:var(--raised);border-radius:var(--r-card);box-shadow:inset 0 0 0 1px var(--divider)}
.tu4-tix .tk-ff{gap:0 20px}
.tu4-tix .tk-ff dt{font:var(--fw-label) var(--fs-caption)/var(--lh-caption) var(--ff-body);color:var(--quiet)}
.tu4-tix .tk-ff dd{font:600 var(--fs-body)/var(--lh-body) var(--ff-body);color:var(--text)}
.tu4-tix__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px;padding:20px 20px 22px}
.tu4-tix__top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.tu4-tix__eta{font:var(--fw-label) var(--fs-label)/var(--lh-label) var(--ff-body);color:var(--text-soft);font-variant-numeric:tabular-nums}
.tu4-tix__act{margin:0;font-size:var(--fs-title);line-height:var(--lh-title);font-stretch:${cssNum(d.stretch || 100)}%;overflow-wrap:break-word}
/* the slot edition's act is a placeholder box wider than a two-word act: it steps down and wraps inside the body, short of the tear line */
.tu4-tix--slot .tu4-tix__act{font-size:var(--fs-title-s);line-height:var(--lh-title-s);max-width:100%;overflow-wrap:anywhere}
.tu4-tix--slot .tu4-tix__act *{white-space:normal!important;overflow-wrap:anywhere}
.tu4-route{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:0;font:600 var(--fs-body)/var(--lh-body) var(--ff-body);color:var(--text);font-variant-numeric:tabular-nums}
.tu4-route__to{display:flex;color:var(--quiet)}
.tu4-tix__adm{margin:0;font-size:var(--fs-label);line-height:var(--lh-label);color:var(--text-soft);max-width:40ch}
.tu4-tix__stub{position:relative;flex:0 0 184px;display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding:20px 20px 22px 22px}
.tu4-tix__code{display:flex;flex-direction:column;gap:6px;color:var(--text)}
.tu4-tix__code .tu4-mono{font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--text-soft)}
.tu4-tix__stub .ui-btn{align-self:flex-start}
/* on the phone the stub tears off below the body */
.tu4-tix--tall{flex-direction:column}
.tu4-tix--tall .tu4-tix__body{padding:18px 18px 20px}
.tu4-tix--tall .tu4-tix__stub{flex:none;flex-direction:row;flex-wrap:wrap;align-items:flex-end;padding:18px}
.tu4-tix--tall .tu4-tix__code{flex:1 0 100%}
.tu4-tix--tall .tu4-paid{flex:1}
.tu4-bc{display:block}

/* screen-light: the screen as the body, a perforation, the stub column with the line */
.tu4-sl{flex:1;min-height:0;display:grid;grid-template-columns:800px auto minmax(0,1fr);gap:0 28px}
.tu4-sl__body{display:flex;flex-direction:column;justify-content:flex-end;gap:24px;min-height:0}
.tu4-facts{gap:0 40px}
.tu4-sl__stub .tu4-facts{gap:14px;margin-top:20px}
.tu4-facts dt{color:var(--quiet)}
.tu4-sl__stub{min-height:0;padding-top:4px}

/* screen-dark: the stub column (the line, then the run of swaps), a perforation, the same screen as the body */
.tu4-sd{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) auto 800px;gap:0 28px;align-items:end}
.tu4-sd__stub{align-self:stretch;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding-top:4px}
.tu4-swaps{min-width:0;display:flex;flex-direction:column;gap:14px}
.tu4-swaps li{display:flex;flex-direction:column;gap:8px}
.tu4-swaps .tu4-hr{margin-bottom:6px}
.tu4-swap__hd{display:flex;align-items:baseline;gap:12px}
.tu4-swap__hd b{font-size:15px;line-height:20px;font-weight:600}
.tu4-swap__ff{gap:0 16px}
.tu4-swap__ff div{flex:1 1 0}
.tu4-swap__ff dt{font-size:12px;line-height:16px;color:var(--quiet)}
.tu4-swap__ff dd{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;font-size:13px;line-height:18px;font-weight:500}
.tu4-swap__ff dd .tu4-mono{flex:1 0 100%;font-size:12px;color:var(--soft)}

/* screen-mobile: the line, the phone at 390, a perforation, then the headline state by state as a run of serials */
.tu4-sm{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 390px auto 300px;gap:0 40px}
.tu4-sm__l{min-height:0;padding-top:4px}
.tu4-sm__ph{min-height:0;display:flex}
.pg .ui.tu4-ph{flex:1;min-height:0;display:flex;flex-direction:column;border-radius:28px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--edge)}
.tu4-ph__bar{flex:none;display:flex;justify-content:space-between;align-items:center;height:48px;padding:0 20px;font:600 var(--fs-label)/1 var(--ff-body)}
.tu4-ph__body{flex:1;min-height:0;display:flex;flex-direction:column;gap:16px;padding:4px 16px 16px}
.tu4-ph .ui-tabbar{flex:none}
.tu4-sm__r{display:flex;flex-direction:column;min-height:0}
.pg .ui.tu4-sts{background:transparent;display:flex;flex-direction:column;gap:12px}
.tu4-st{display:flex;flex-direction:column;gap:6px}
.tu4-st .tu4-hr{margin-bottom:6px}
.tu4-st__hd{display:flex;align-items:center;justify-content:space-between}
.tu4-st__act{font-size:26px;line-height:1}
.tu4-st__when{font-size:13px;line-height:18px;color:var(--soft)}

/* tokens: the stub column (the line, type, fonts), a perforation, the body (colour roles, then the small scales) */
.tu4-tok{flex:1;min-height:0;display:grid;grid-template-columns:300px auto minmax(0,1fr);gap:0 32px}
.tu4-tok__stub{display:flex;flex-direction:column;gap:16px;min-height:0}
.tu4-tok__h{font-size:46px;line-height:0.95}
.tu4-tok__stub .tk-lead{font-size:13px;line-height:1.45}
.tu4-tok__body{display:flex;flex-direction:column;gap:14px;min-height:0;min-width:0}
.tu4-tg .tk-h3{font-size:22px;line-height:24px;margin-bottom:6px}
.tu4-tg__hd{display:flex;align-items:baseline;gap:16px}
.tu4-tg__key{font-size:12px;line-height:16px;color:var(--quiet)}
.tu4-tg ul{display:flex;flex-wrap:wrap;gap:6px 18px}
.tu4-tk{display:flex;flex-direction:column;gap:1px;min-width:0}
.tu4-tk__n{font-family:'${cssStr(mono.family)}',monospace;font-size:11px;line-height:15px;color:var(--soft)}
.tu4-tk__v{display:flex;align-items:center;gap:6px;font-size:13px;line-height:18px}
.tu4-tk__v .tu4-sw{width:12px;height:12px}
.tu4-tk__v .tu4-mono{font-size:12px}
.tu4-tg--col ul{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px 16px}
.tu4-tg--col .tu4-tk__v+.tu4-tk__v{margin-top:1px}
.tu4-tg--type ul,.tu4-tg--ff ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 16px}
.tu4-tok__foot{display:grid;grid-template-columns:1.6fr 1.3fr 0.9fr 1.1fr 0.8fr;gap:0 20px}
.tu4-tg--sp ul,.tu4-tg--rd ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px}
.tu4-tok__foot .tu4-tg:not(.tu4-tg--sp):not(.tu4-tg--rd) ul{flex-direction:column}

/* code: the line across the top over a perforation; the install snippet large, two short ones under it; the files as serials */
.tu4-cd__top{display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:48px;align-items:end}
.tu4-cd__h{font-size:56px}
.tu4-cd{flex:1;min-height:0;display:grid;grid-template-columns:560px auto minmax(0,1fr);gap:0 32px}
.tu4-cd__body{display:flex;flex-direction:column;gap:16px;min-height:0}
.tu4-cd__pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.tu4-cb{margin:0;display:flex;flex-direction:column;min-width:0}
.tu4-cb .tk-h3{font-size:22px;line-height:24px;margin-bottom:6px}
.pg .ui.tu4-pre{margin:0;padding:14px 18px;border-radius:${rc}px;font:400 13px/20px '${cssStr(mono.family)}',monospace;white-space:pre;overflow:hidden}
.tu4-pre code{font:inherit}
.tu4-cb--lead .tu4-pre{padding:16px 22px;font-size:14px;line-height:21px}
.tu4-cd__stub{display:flex;flex-direction:column;min-height:0}
/* the files run down two columns, a perforation between the serials of a column */
.tu4-files{display:grid;grid-template-rows:repeat(5,auto);grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:8px 28px;align-content:start}
.tu4-files li{display:flex;flex-direction:column;gap:2px}
.tu4-files .tu4-hr{margin:0 0 6px}
.tu4-file__hd{display:flex;align-items:baseline;gap:10px}
.tu4-files .tk-sn{font-size:16px;line-height:18px}
.tu4-file__n{font-size:13px;line-height:18px}
.tu4-file__d{font-size:12px;line-height:16px;color:var(--soft)}
`;
};
