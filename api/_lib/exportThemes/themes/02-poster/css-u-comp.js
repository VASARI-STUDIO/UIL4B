// Styles for u-comp.js: buttons, inputs, choices, cards, navigation, lists. Classes start tu2-.
// The pages stand on the gate's page (.pg.tk) and use its serials (.tk-sn), heads (.tk-h3), fields (.tk-ff) and lead (.tk-lead) as
// they are. Navigation and lists are the queue at night: .tu2-night swaps the page's own colour variables to the dark roles. The
// components keep the engine's own styles; nothing here restyles a .ui- class. No hex is written here.
// meta is read at call time (index.js calls this after it has loaded), for the condensed face's pinned width.
import { meta } from './index.js';

export const cssUComp = (ctx) => {
  const D = ctx.roles.dark, st = meta.chrome.stretch;
  return `
.pg.tk.tu2-night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
/* the perforation on an open page: holes in the page's ink */
.tu2-perf{color:var(--ink)}
/* small labels in the condensed stub face; a serial and its label sit on one line */
.tu2-k{font-family:var(--cond);font-weight:700;font-stretch:${st}%;letter-spacing:0.02em;font-size:20px;line-height:22px}
.tu2-sk{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
.tu2-cap{font-size:13px;line-height:1.45;color:var(--soft);margin-top:8px;max-width:52ch}
.tu2-ui{min-width:0}
.tu2 .disp{text-wrap:balance}
/* the rule dropped to the stub at the lead's size, in Work Sans 600 and full ink, so the component stays the large thing (the kit-wide spec) */
.tu2 .tu2-lh{font-family:var(--body);font-stretch:100%;font-size:15px;font-weight:600;line-height:1.5;color:var(--ink);letter-spacing:0;margin:0}

/* buttons: the drawing and the rules on the body, the states as a roll along its foot, the variants on the stub */
.tu2-bt{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 320px}
.tu2-bt__body{display:flex;flex-direction:column;justify-content:space-between;gap:20px;padding-right:40px;min-width:0}
.tu2-bt__top{display:flex;gap:56px;align-items:flex-start}
.tu2-draw{flex:none;margin:0}
.tu2-dim{position:relative;color:var(--ink)}
.tu2-dim span{position:absolute;font-size:13px;line-height:16px}
.tu2-dim::before,.tu2-dim::after{content:"";position:absolute;background:currentColor}
.tu2-dim--h{height:24px;margin-left:40px;border-bottom:1px solid currentColor}
.tu2-dim--h::before,.tu2-dim--h::after{bottom:-5px;width:1px;height:9px}
.tu2-dim--h::before{left:0}
.tu2-dim--h::after{right:0}
.tu2-dim--h span{left:50%;top:0;transform:translateX(-50%)}
.tu2-zrow{display:flex;gap:12px;margin-top:10px}
.tu2-dim--v{flex:none;width:28px;border-right:1px solid currentColor}
.tu2-dim--v::before,.tu2-dim--v::after{right:-5px;width:9px;height:1px}
.tu2-dim--v::before{top:0}
.tu2-dim--v::after{bottom:0}
.tu2-dim--v span{right:8px;top:50%;transform:translateY(-50%)}
.tu2-zoom{zoom:3}
.tu2-draw .tu2-cap{margin-top:8px}
.tu2-bt__rules{display:flex;flex-direction:column;gap:10px;max-width:430px;font-size:15px;line-height:1.45;padding-top:8px}
.tu2-bt__r1{font-size:22px;line-height:1.25;font-weight:600}
.tu2-ff{flex-wrap:wrap;gap:12px 28px;margin-top:10px}
.tu2-ff dd{font-size:16px;line-height:22px}
.tu2-ff dd .tk-mono{font-weight:400}
.tu2-bt__foot{position:relative;padding-top:12px}
/* six states, two rows of three: the second row is torn from the first by a perforation */
.tu2-roll{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));row-gap:6px;margin-top:0}
.tu2-roll__t{position:relative;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:2px 10px 0 16px}
.tu2-roll__t:nth-child(3n+1){padding-left:0}
.tu2-roll__t--r2{padding-top:10px}
.tu2-roll .tu2-sk{margin-bottom:0}
.tu2-roll .tu2-cap{margin-top:2px}
/* pending: a 16 px ring before the label, in the label's own colour; it stops turning under reduced motion */
.tu2-spin{flex:none;width:16px;height:16px;margin-right:8px;box-sizing:border-box;border:2px solid var(--action-label);border-right-color:transparent;border-radius:var(--r-round);animation:ui-spin 900ms linear infinite}
@media (prefers-reduced-motion:reduce){.tu2-spin{animation:none}}
.tu2-bt__stub{position:relative;display:flex;flex-direction:column;padding-left:40px}
.tu2-va{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding-top:6px}
.tu2-va li{display:flex;flex-direction:column;align-items:flex-start}
.tu2-va__n{margin-top:10px}
.tu2-va .tu2-cap{margin-top:2px}

/* inputs: one form on the body, drawn at 1.1x, rest and focus side by side with the kinds named on the left, the disabled form torn
   off along the foot; the rule at lead size and the three errors on the stub */
.tu2-in{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 420px}
.tu2-in__body{display:flex;flex-direction:column;justify-content:space-between;gap:20px;padding-right:40px;min-width:0}
.tu2-in__form{display:grid;grid-template-columns:130px minmax(0,1fr) minmax(0,1fr);gap:20px 0;align-items:start}
.tu2-in__form .tu2-sk{margin-bottom:-12px}
.tu2-in__k{color:var(--soft);padding-top:4px}
.tu2-in__c{min-width:0;padding-right:24px}
.tu2-in__fc{padding-left:24px;padding-right:0}
.tu2-in__c .tu2-ui{zoom:1.1}
/* a value that outruns its field ends in an ellipsis, never mid-word */
.tu2 .ui-input{text-overflow:ellipsis}
.tu2-in__off{position:relative;padding-top:20px}
.tu2-in__offr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}
.tu2-in__stub{position:relative;display:flex;flex-direction:column;padding-left:40px;min-width:0}
.tu2-in__err{position:relative;margin-top:auto;padding-top:20px}
.tu2-in__err ul{display:flex;flex-direction:column;gap:14px}

/* choices: the rule across the top; under the tear, the state serials, one stub per control, the segmented control last */
.tu2-ch__top{display:flex;justify-content:space-between;align-items:flex-end;gap:56px}
.tu2-ch__d{font-size:76px;line-height:0.9;letter-spacing:-0.02em}
.tu2-ch__top .tk-lead{max-width:400px}
.tu2-ch{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:96px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 300px;padding-top:24px}
.tu2-ch__col,.tu2-ch__seg{position:relative;min-width:0;padding:0 10px 0 18px}
.tu2-ch__st{display:flex;flex-direction:column;gap:6px}
.tu2-ch__st li{height:56px;display:flex;align-items:center}
.tu2-ch__names .tu2-sk{flex-direction:column;align-items:flex-start;gap:0;margin:0}
.tu2-ch__seg{display:flex;flex-direction:column;gap:28px;padding-left:28px;padding-right:0}
.tu2-ch__seg .tk-h3{margin-bottom:-12px}
.tu2-ch__sg .tu2-k{margin-top:12px}
.tu2-ch__sg .tu2-cap{margin-top:2px}

/* cards: the headliner with its photo large on the body; the rule at lead size and the three smaller forms on the stub */
.tu2-cd{flex:1;min-height:0;display:grid;grid-template-columns:450px minmax(0,1fr)}
.tu2-cd__lead{display:flex;flex-direction:column;padding-right:44px;min-width:0}
.tu2-cd__r{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding-left:44px;min-width:0}
.tu2-cd__t{display:flex;flex-direction:column}
.tu2-cd .tu2-ui{overflow-wrap:break-word}
.tu2-cd__pair{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}
.tu2-cd__s{position:relative;min-width:0;padding-right:28px}
.tu2-cd__s + .tu2-cd__s{padding:0 0 0 28px}
.tu2-cd__sr{position:relative;padding-top:20px}
.tu2-cd__sr .tu2-cd__s{padding-right:0}
.tu2-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;overflow-wrap:normal}

/* navigation, at night: the top bar large across the page; under the tear the sidebar, tabs and breadcrumbs, and the stub with the
   rule over the phone's bar */
.tu2-nv__bar .tu2-ui,.tu2-nv__z15 .tu2-ui{zoom:1.5}
.tu2-nv__z125 .tu2-ui{zoom:1.25}
.tu2-nv__z15 .ui-sidebar{width:100%}
.tu2-nv__t{display:flex;flex-direction:column}
.tu2-nv{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:250px minmax(0,1fr) 430px;padding-top:18px;margin-top:12px}
.tu2-nv__c{position:relative;min-width:0;padding:0 24px 0 28px}
.tu2-nv__c--side{padding-left:0}
.tu2-nv__c--mob{padding-right:0}
.tu2-nv__cr{position:relative;margin-top:24px;padding-top:20px}

/* lists, at night: the rule over the list of five on the body; the two smaller forms on the stub */
.tu2-ls{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px}
.tu2-ls__body{display:flex;flex-direction:column;padding-right:48px;min-width:0}
/* the list is the large thing, drawn at 1.25x (zoom keeps every length inside in step) */
.tu2-ls__all{zoom:1.25}
.tu2-ls__stub{position:relative;display:flex;flex-direction:column;gap:28px;padding-left:40px}
.tu2-ls__t{display:flex;flex-direction:column;gap:8px}
.tu2-ls__v{position:relative}
.tu2-ls__v + .tu2-ls__v{padding-top:24px}
`;
};
