// Styles for p-front.js: contents, intro, personality, voice, write-this, messaging. Classes start tf-.
// The pages stand on the gate's page (.pg.tk) and use its serials (.tk-sn) and fields (.tk-ff) as they are. The Voice section is the
// queue at night: .tf-night swaps the page's own colour variables to the dark roles. No hex is written here.
// meta is read at call time (index.js calls this after it has loaded), for the condensed face's pinned width.
import { meta } from './index.js';
import { cssNum } from '../../engine/escape.js';

export const cssPFront = (ctx) => {
  const D = ctx.roles.dark, st = meta.chrome.stretch;
  return `
/* the page foot: the last line sits 56 px above the page's bottom edge, so it clears the trim (foot check 54 px) */
.pg.tk.tf-night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
/* the perforation on an open page: holes in the page's ink */
.tf-perf{color:var(--ink)}
/* small labels in the condensed stub face */
.tf-cs__t,.tf-no,.tf-wt__k,.tf-ms__k{font-family:var(--cond);font-weight:700;font-stretch:${st}%;letter-spacing:0.02em}

/* the page lead (D3, all Ticket lanes): under the title, 15 px in --soft from .tk-lead, held to 46ch here */
.pg.tk .tf-lead{max-width:46ch}

/* contents: the counts at the top right, one perforation under them, the sections top-aligned in open columns split by gutters */
.tf-ct__top{display:flex;justify-content:flex-end}
.tf-ff{flex:none}
.tf-ct__strip{position:relative;flex:1;min-height:0;padding-top:24px}
.tf-cs__row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:32px 24px;align-content:start}
.tf-cs{min-width:0;display:flex;flex-direction:column;gap:2px}
.tf-cs__t{font-size:34px;line-height:36px}
.tf-cs__set{display:flex;flex-direction:column;gap:4px;margin-top:10px}
.tf-cs__set li{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:baseline;font-size:17px;line-height:22px;text-wrap:pretty}
.tf-no{font-size:17px;line-height:22px}

/* intro: who we are at the title step on 8 of 12 columns (16 px gutters), top-aligned 48 px under the title; the facts on the stub.
   The description holds at least three lines' height so a short line (or the slot) still anchors the page. It stays in the display
   face's own width: the theme ships Anybody only at 150 (brand) and 50 (stub face), so a width-100 request falls back to the 50 file */
.tf-in{flex:1;min-height:0;display:grid;grid-template-columns:calc((100% - 176px) * 8 / 12 + 112px) minmax(0,1fr);column-gap:16px}
.tf-in__body{display:flex;flex-direction:column;justify-content:flex-start;gap:16px;padding:28px 24px 0 0}
.pg.tk .tf-in__d{font-size:34px;line-height:1.1;letter-spacing:-0.01em;text-wrap:pretty;min-height:calc(3 * 1.1 * 34px)}
.tf-in__stub{position:relative;display:flex;flex-direction:column;justify-content:flex-end;padding-left:40px}
.tf-ff--stack{flex-direction:column;gap:32px}
/* slot edition: each box carries its own label, so the field's label would print it twice */
.tf--in-slot .tf-ff dt{display:none}

/* personality: the first trait on the body, the others on the stub, the two lines torn off along the foot */
.tf-pe{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 480px}
.tf-pe__t{position:relative;display:flex;flex-direction:column;gap:8px}
.tf-pe__t--lead{justify-content:flex-end;padding-right:48px}
.tf-pe__n{white-space:nowrap}
.tf-pe__t--lead .tf-pe__n{line-height:0.86;margin-left:-6px}
.tf-pe__m{font-size:16px;line-height:1.5;max-width:46ch}
.tf-pe__t--lead .tf-pe__m{font-size:20px;line-height:1.45;margin-top:12px}
.tf-pe__stub{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding-left:40px}
.tf-pe__stub .tf-pe__t + .tf-pe__t{padding-top:24px}
.tf-pe__foot{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 480px;padding-top:20px}
.tf-pe__l{position:relative;font-family:var(--display);font-weight:${cssNum(ctx.brand.fonts.display.weights[0])};font-stretch:${cssNum(ctx.brand.fonts.display.stretch || 100)}%;font-size:30px;line-height:1.05;letter-spacing:-0.015em}
.tf-pe__l + .tf-pe__l{padding-left:40px}

/* voice: the event line at night, the habits under one perforation, split by gutters; the rule in the body face, the serial in the stub face */
.tf-vo__line{font-size:120px;line-height:0.9;letter-spacing:-0.025em}
/* a line is set one sentence to a block, so "Doors at 8." holds whole and the next sentence follows */
.tf-sent{display:block;text-wrap:balance}
/* slot edition: the main line is one compact chip at the display step, not a block capped at 18 px (the "tag" class name makes the engine use the compact, label-only form: one line) */
.tf-vo__line .ph-c{font-size:inherit}
.tf-vo__strip{position:relative;margin-top:auto;padding-top:24px}
.tf-vo__hs{display:grid;grid-template-columns:repeat(${ctx.brand.voice.principles.length},minmax(0,1fr));column-gap:32px}
.tf-vo__h{min-width:0;display:flex;flex-direction:column;gap:6px}
.tf-vo__k{font-family:var(--body);font-weight:600;font-size:17px;line-height:1.35}
.tf-vo__ex{font-size:22px;line-height:1.3;font-weight:600;margin-top:10px}

/* write this: one long perforation; the line you keep on the body, the line torn off on the stub */
.tf-wt{--keep:780px;position:relative;flex:1;min-height:0;display:flex;flex-direction:column;gap:16px}
.tf-wt>.tf-tear{position:absolute;top:0;bottom:0;left:var(--keep)}
.tf-wt__hd,.tf-wt__r{display:grid;grid-template-columns:var(--keep) minmax(0,1fr)}
.tf-wt__k{font-size:30px;line-height:32px}
.tf-wt__hd .tf-wt__k + .tf-wt__k,.tf-wt__not{padding-left:40px}
.tf-wt__rs{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between}
.tf-wt__keep{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:baseline;padding-right:40px}
.pg.tk .tf-wt__w{font-size:24px;line-height:1.05;letter-spacing:-0.015em;text-wrap:balance}
.pg.tk .tf-wt__r--lead .tf-wt__w{font-size:34px}
.tf-wt__b{font-size:15px;line-height:1.45;color:var(--soft);margin-top:6px}
.tf-wt__not{font-size:17px;line-height:1.45;color:var(--soft);padding-top:2px}

/* messaging: the small print on the stub, the lines as a run of serials on the body, the long boilerplate torn off below */
.tf-ms{flex:1;min-height:0;display:grid;grid-template-columns:380px minmax(0,1fr)}
.tf-ms__stub{display:flex;flex-direction:column;justify-content:flex-start;gap:32px;padding-right:40px}
.tf-ms__body{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding-left:44px}
.tf-ms__ls{display:flex;flex-direction:column;gap:20px}
.tf-ms__l{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:baseline}
.pg.tk .tf-ms__l p{font-size:32px;line-height:1.05;letter-spacing:-0.015em;text-wrap:balance}
.pg.tk .tf-ms__l--lead p{font-size:60px;line-height:0.94;letter-spacing:-0.02em}
.tf-ms__long{position:relative;padding-top:20px}
.tf-ms__b{display:flex;flex-direction:column;gap:6px}
.tf-ms__k{font-size:26px;line-height:28px}
.tf-ms__v{font-size:15px;line-height:1.5;max-width:68ch}

/* slot edition: placeholder boxes take their padding from the font size, so the names are set small and the write-this reason sits beside its line */
.tf--slot .tf-pe__n{font-size:20px}
.tf--slot .tf-pe,.tf--slot .tf-pe__foot{grid-template-columns:minmax(0,1fr) 600px}
.tf--slot .tf-pe__t{gap:4px}
.tf--slot .tf-pe__t--lead .tf-pe__m{margin-top:0}
.tf--slot .tf-pe__foot{padding-top:12px}
.tf--slot .tf-pe__stub .tf-pe__t + .tf-pe__t{padding-top:10px}
.tf--slot .tf-pe__stub{gap:6px}
.tf--slot .tf-wt__keep>div{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start}
.tf--slot .tf-wt__b{margin-top:0}
.pg.tk.tf--slot .tf-wt__w,.pg.tk.tf--slot .tf-wt__r--lead .tf-wt__w{font-size:24px}
`;
};
