// Styles for p-type.js (theme 08, Riso): proportion, typefaces, hierarchy, type-in-use, type-rules. Classes start rt-.
// Page 794 x 1123, margin 72, spacing on a 4 px base. Every figure is a sheet of the paper edged by a hairline, with a cross at each
// corner (--xi sets how far in). Familjen Grotesk is the chrome; the brand's faces only where they are the subject.
import { drums, drumNo } from './guidelines-r.js';

// a separation of the hierarchy poster keeps only its own drum's paths of the logo (the composite keeps them all)
const sepLogo = (ctx) => (ctx.edition === 'slot' ? '' : drums(ctx).map((d) => `.rt-po--l${drumNo(ctx, d)} .rt-po__lg svg path:not([fill="${d.hex}" i]){fill:none}`).join('\n'));

export const cssPType = (ctx) => `
.rt-body{position:absolute;left:72px;right:72px;top:232px}
.rt-q{color:var(--quiet)}
.rt-sheet{position:relative;background:var(--ground);outline:1px solid var(--hair);outline-offset:-1px;isolation:isolate}
.rt-cap{margin-top:12px;font-size:13px;line-height:1.5;color:var(--ink)}

/* the job line (one form across the theme): under its sheet, flush with its left edge, 12 px in the quiet grey, at most two lines */
.rt-job{margin-top:12px;max-width:72ch;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet)}
.rt-job b{font-weight:600}
.rt-sw{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:0}
.rt-cap .rt-job{margin-top:4px}

/* proportion: the page to scale at the left, the paper's share large at the right */
.rt-body--pr{top:216px;display:grid;grid-template-columns:460px minmax(0,1fr);gap:32px;align-items:start}
.rt-pf{margin:0}
.rt-cov{--xi:1px}
.rt-cov__pp{position:absolute;left:28px;top:28px;color:var(--ink)}
.rt-cov__b{position:absolute;display:flex}
.rt-cov__d{display:flex;flex-direction:column;padding:8px;min-width:0}
.rt-cov__k{display:block;font-size:12px;line-height:1.3}
.rt-cov__n{display:block;font-weight:600;font-size:13px;line-height:1.3}
.rt-cov__p{display:block;margin-top:auto;font-weight:700;font-size:20px;line-height:1.1}
.rt-cov__pp .rt-cov__n{font-weight:700;font-size:28px;line-height:1.1;letter-spacing:-0.01em}
.rt-pw{padding-top:4px}
.rt-big{font-family:var(--chrome);font-weight:700;font-size:80px;line-height:0.95;letter-spacing:-0.03em;color:var(--ink)}
.rt-big__c{margin-top:12px;font-size:16px;line-height:1.4;color:var(--ink)}
.rt-rule{margin-top:28px;padding-top:16px;border-top:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}

/* typefaces: the display sheet across the measure, then the body and mono sheets side by side (wide, narrow); each sheet's job
   line under it, then its note */
.rt-body--tf{top:168px}
.rt-ff{margin:0;min-width:0}
.rt-fs{--xi:3px}
.rt-fs--d{padding:28px 32px 28px}
.rt-aa{display:flex;gap:32px;font-size:168px;line-height:1;color:var(--ink)}
.rt-it{font-style:italic}
.rt-gl{margin-top:16px;font-size:24px;line-height:1.3;color:var(--ink);overflow-wrap:anywhere}
.rt-fn{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:32px;margin-top:16px}
.rt-fn .r-ps__d,.rt-fn__n,.rt-fn__w{grid-column:1}
.rt-fn__r{grid-column:2;grid-row:1 / span 3;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}
.rt-fn__n{font-family:var(--chrome);font-weight:700;font-size:22px;line-height:1.2;letter-spacing:-0.01em;color:var(--ink)}
.rt-fn__w{margin-top:2px;font-size:13px;line-height:1.4;color:var(--quiet)}
.rt-ffr{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);gap:28px;margin-top:24px}
.rt-ffr .rt-fn{grid-template-columns:minmax(0,1fr);row-gap:0}
.rt-ffr .rt-fn__r{grid-column:1;grid-row:auto;margin-top:8px}
.rt-fs--b,.rt-fs--m{padding:24px;height:164px;display:flex;flex-direction:column}
.rt-fs__row{display:flex;align-items:center;gap:28px}
.rt-aa--b{font-family:var(--body);font-weight:400;font-size:96px;line-height:1;color:var(--ink)}
.rt-wts{font-family:var(--body);font-size:20px;line-height:1.5;color:var(--ink)}
.rt-ms{margin-top:8px;font-family:var(--mono);font-size:16px;line-height:1.5;overflow-wrap:anywhere}
.rt-lic{margin-top:24px;font-size:13px;line-height:1.5;color:var(--quiet)}

/* hierarchy: the poster grid (the sheet behind the first column, each spec on its specimen's baseline in the margin, the logo at
   the foot), then its separations in a row */
.rt-lead{max-width:none}
.rt-body--hi{top:216px}
.rt-po{position:relative;display:grid;column-gap:24px;align-content:space-between;align-items:baseline;padding:28px 0;isolation:isolate}
.rt-po__sh{position:absolute;left:0;top:0;bottom:0;z-index:-1;--xi:3px}
.rt-po__c{padding:0 28px;min-width:0}
.rt-po__c p{overflow-wrap:anywhere;text-wrap:balance}
.rt-po__c .ph-c{font-size:1em}
${ctx.edition === 'slot' ? '/* the dashed outline is drawn round the whole placeholder, not per line, so wrapped lines at display leading do not cross */\n.rt-po__c .ph-c{display:inline-block;max-width:100%;vertical-align:top}' : ''}
.rt-po__c .ph-n{white-space:normal!important}
.rt-po__btn{display:inline-block;padding:10px 20px}
.rt-po__n{font-size:12px;line-height:1.4;color:var(--ink)}
.rt-po__n .r-mono{line-height:1.4}
.rt-po__sz{margin-top:2px}
.rt-po__ft{align-self:end;padding-top:12px}
.rt-po__lg{line-height:0}
.rt-po__lg svg,.rt-po__lg .logo-slot{display:block}
.rt-po--sep{width:650px}
.rt-po--sep .rt-po__n{visibility:hidden}
.rt-po--l1 [data-dr]:not([data-dr="1"]),.rt-po--l2 [data-dr]:not([data-dr="2"]),.rt-po--l3 [data-dr]:not([data-dr="3"]),
.rt-po--l4 [data-dr]:not([data-dr="4"]),.rt-po--l5 [data-dr]:not([data-dr="5"]),.rt-po--l6 [data-dr]:not([data-dr="6"]){visibility:hidden}
${sepLogo(ctx)}
.rt-seps{display:flex;gap:20px;margin-top:24px}
.rt-sep{display:flex;gap:12px;align-items:flex-start;margin:0;flex:1 1 0;min-width:0}
.rt-sep__sh{position:relative;flex:none;overflow:hidden;background:var(--ground);outline:1px solid var(--hair);outline-offset:-1px}
.rt-sep__in{width:650px}
.rt-sep figcaption{min-width:0}
.rt-sep__n{display:block;font-weight:700;font-size:20px;line-height:1.15;color:var(--ink);overflow-wrap:anywhere}
.rt-sep__c{display:block;margin-top:4px;font-size:13px;line-height:1.4;color:var(--quiet)}

/* type in use: a folded room sheet down to the foot margin, two panels and the fold. The headline is trimmed to its cap height so
   it starts on the photo's top edge; the paragraph and the caption are trimmed to their baselines and end on one line. */
.rt-body--tu{top:216px}
.rt-rs{display:grid;grid-template-columns:minmax(0,0.85fr) 1px minmax(0,1.15fr);grid-template-rows:minmax(0,1fr);height:712px;padding:32px 0;--xi:3px}
.rt-rs__l,.rt-rs__r{display:flex;flex-direction:column;padding:0 32px;min-width:0;min-height:0}
.rt-rs__ph{position:relative;flex:1 1 0;min-height:0}
.rt-rs__ph>*{position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box}
.rt-rs__cap{margin-top:12px;max-width:40ch;color:var(--quiet);text-box:trim-end cap alphabetic}
.rt-rs__fold{display:block;margin:-32px 0;background:var(--hair)}
.rt-rs__h{color:var(--ink);text-wrap:balance;text-box:trim-start cap alphabetic}
.rt-rs__p{margin-top:auto;padding-top:24px;max-width:65ch;color:var(--ink);text-box:trim-end cap alphabetic}
.rt-rs--slot .rt-rs__cap,.rt-rs--slot .rt-rs__h,.rt-rs--slot .rt-rs__p{text-box:none}
.rt-rsn{display:grid;grid-template-columns:minmax(0,0.85fr) minmax(0,1.15fr);gap:0 48px;margin-top:16px;padding:0 32px}
.rt-rsn__r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 24px}
.rt-rsn .r-ps__d{color:var(--ink)}
.rt-rsn__t{margin-top:2px;font-size:13px;line-height:1.45;color:var(--quiet)}

/* type rules: one two-drum sheet whose height comes from its rules (no fixed block, so no hole): the first rule across the sheet,
   a hairline 48 px under its Don't line, the other four two by two directly under it */
.rt-body--ru{top:216px}
.rt-trs{display:flex;flex-direction:column;width:650px;padding:56px 44px 60px;--xi:4px}
.rt-trl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto auto auto;column-gap:32px;row-gap:48px}
.rt-tr{display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;align-items:start}
.rt-tr--lead{grid-column:1 / -1;grid-template-columns:88px minmax(0,1fr);gap:20px;padding-bottom:48px;border-bottom:1px solid var(--hair)}
.rt-tr__n{font-size:48px;line-height:1}
.rt-tr--lead .rt-tr__n{font-size:96px;line-height:0.9}
.rt-tr__do,.rt-tr__no{font-family:var(--body)}
.rt-tr__do{font-size:18px;line-height:1.45}
.rt-tr--lead .rt-tr__do{font-size:32px;line-height:1.25}
.rt-tr__no{margin-top:8px;font-size:15px;line-height:1.5}
.rt-tr--lead .rt-tr__no{margin-top:16px;font-size:18px}
.rt-tr__do b,.rt-tr__no b{font-weight:600}
`;
