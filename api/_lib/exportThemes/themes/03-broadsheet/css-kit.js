// Run K's styles (uikit.js pages, theme 03 Broadsheet). Appended to css() in index.js. Classes start k.
// The light kit tokens and the engine's components css are already scoped under `.pg .ui` by css-b.js; this file adds the dark scope
// and the newspaper pages: a double rule under the running head, a display headline over ruled columns, a sidebar boxed out by rules,
// a fold with briefs below it, a 3 px ink rule on top of each column, hairlines between them, no boxes.
// Inside a .ui region read the kit tokens (--text, --divider, --quiet ...), so a data-theme="dark" panel flips by itself.
import { colourMap } from '../../engine/tokens.js';

export function cssKit(ctx) {
  const dark = Object.entries(colourMap(ctx, 'dark')).map(([k, v]) => `--${k}:${v};`).join('');
  return `
/* kit: dark scope (light is in css-b.js) */
.pg .ui[data-theme="dark"]{${dark}}
.ui-display{font-weight:400}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd,pre){margin:0;padding:0}
.mono{font-family:var(--ff-mono);font-size:0.92em;font-variant-numeric:tabular-nums}

/* running head: a double rule, like the foot of a nameplate */
.pg--k .hd{border-bottom:3px double var(--ink)}

/* the page body is a .ui region */
.kb{flex:1;min-height:0;display:flex;flex-direction:column;font-family:var(--ff-body);font-size:14px;line-height:1.5}
.kb .headline{flex:none;color:var(--text);font-size:48px;line-height:1.02;margin:0 0 18px}
.kb .headline--xl{font-size:84px;line-height:0.98;letter-spacing:-0.015em;max-width:1040px}
.kb .headline--m{font-size:44px;margin-bottom:16px}
.kb .headline--s{font-size:36px;line-height:1.04;margin-bottom:16px}
.kc{flex:1;min-height:0;display:grid;align-content:start}
.kcol{min-width:0;padding:0 28px;border-left:1px solid var(--divider);display:flex;flex-direction:column}
.kcol:first-child{padding-left:0;border-left:0}
.kcol:last-child{padding-right:0}
.kh3{font:600 12px/1.3 var(--chrome);letter-spacing:0.08em;text-transform:uppercase;color:var(--text);border-top:3px solid var(--text);padding-top:8px;margin-bottom:14px}
.kh3--d{font:400 22px/1.1 var(--ff-display);letter-spacing:-0.005em;text-transform:none;border-top:3px double var(--text);padding-top:8px;margin-bottom:10px}
.krules{border-top:3px solid var(--text)}
.krules li{font-family:var(--ff-body);font-size:14px;line-height:1.55;color:var(--text-soft);padding:11px 0;border-bottom:1px solid var(--divider)}
.krules .mono{color:var(--text)}
.kcap{display:block;font:400 12px/1.45 var(--chrome);color:var(--quiet);max-width:42ch}
.kcap b{display:block;font-size:12px;font-weight:600;color:var(--text)}
.kcap--after{margin-top:8px;max-width:none}
.kcap--ink{color:var(--text-soft)}
.kcell{display:flex;flex-direction:column;gap:8px;min-width:0}
.kcell>.ui-btn,.kcell>.ui-toast,.kcell>.ui-segmented{align-self:flex-start}
.kna{font:400 12px/1.45 var(--chrome);color:var(--quiet)}
.kstack{display:flex;flex-direction:column;gap:24px;min-width:0}
.kstack--s{gap:16px}
.kstack--n{gap:28px}
.kstack--3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 12px}
.kstack--2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}
.kg{display:flex;flex-direction:column;min-width:0}
.kgap{flex:none;height:24px}
.kscrim{padding:28px 20px}
.kS .kscrim{padding:96px 32px}
.kS .ui-empty{padding:72px 32px}
.kscrim+.kcap,.ui-empty+.kcap{margin-top:8px}
.kscrim .ui-dialog{padding:20px;max-width:none}
.kscrim .ui-dialog__actions .ui-btn{height:36px;padding:0 var(--sp-4);font-size:var(--fs-label)}
.kb .ui-card{max-width:none}

/* front page: the lead story left, the sidebar boxed out by rules right. Story page: the same turned round. */
.kA{flex:1;min-height:0;display:grid;align-items:stretch}
.kl{min-width:0;padding-right:28px;display:flex;flex-direction:column}
.kside{min-width:0;padding:10px 0 0 24px;border-left:1px solid var(--divider);border-top:3px double var(--text);display:flex;flex-direction:column}
.kside>.kh3:first-child{border-top:0;padding-top:0}
.kside .krules{border-top:1px solid var(--text)}
.kside .krules li{padding:8px 0}
.kS .kstory{padding-right:28px}
.kstory .krules{border-top:1px solid var(--text)}
.kS .kexh{padding:0 0 0 28px;border-left:1px solid var(--divider)}
.kS .kexh .kc{flex:none}
.kS--rev .kstory{padding:0 0 0 28px;border-left:1px solid var(--divider)}
.kS--rev .kexh{padding:0 28px 0 0;border-left:0}
.kS .kexh .kscreen-wrap{flex:1}
.kS .kscreen .ks-main{grid-template-columns:minmax(0,1fr) 270px;padding:20px 24px}
.kS .kscreen .ks-list{padding-right:24px}
.kS .kscreen .ks-order{padding-left:24px}

/* fold page: the exhibit across the measure, briefs in ruled columns below the fold */
.kB{flex:1;min-height:0;display:flex;flex-direction:column}
.kB-top{flex:none}
.kB-lead{flex:none;min-width:0}
.kfold{margin:auto 0 0;display:grid;border-top:3px double var(--text)}
.kfold li{padding:12px 24px 0;border-left:1px solid var(--divider);font:400 14px/1.55 var(--ff-body);color:var(--text-soft)}
.kfold li:first-child{padding-left:0;border-left:0}
.kfold li:last-child{padding-right:0}
.kfold .mono{color:var(--text)}
.kanat{margin-top:auto}
.kanat li b,.kcolo li b{display:block;font:600 12px/1.3 var(--chrome);letter-spacing:0.08em;text-transform:uppercase;color:var(--text);margin-bottom:6px}
.kB-lead .ui-table tbody td{height:68px}

/* band page: headline and rules across the top, the exhibit under a double rule */
.kband{flex:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:0 32px;align-items:end;padding-bottom:16px;border-bottom:3px double var(--text);margin-bottom:20px}
.kband .headline{margin:0}
.kband .kfold--band{margin:0;border-top:0}
.kband .kfold--band li{padding-top:0}
.kband-lead{flex:1;min-height:0;min-width:0}

/* cover: the nameplate across the full measure, a dateline, the headline, the index in a ruled column */
.pg--kcover{display:flex;flex-direction:column;padding:26px var(--m) 32px}
.kc-mast{flex:none;display:grid;grid-template-columns:200px minmax(0,1fr) 200px;gap:0 24px;align-items:center;padding:0 0 14px}
.kc-mast .ear b{font-weight:600}
.kc-np{display:flex;justify-content:center;align-items:center;min-width:0}
.kc-name{font-size:104px;line-height:1.1;padding:4px 0;white-space:nowrap}
.kc-dl{flex:none;margin:0;padding:7px 0;text-align:center;font:400 14px/1.3 var(--body);color:var(--soft);border-top:3px solid var(--ink);border-bottom:1px solid var(--ink)}
.kc-body{flex:1;min-height:0;display:grid;grid-template-columns:4fr 2fr;margin-top:26px}
.kc-main{padding-right:32px;display:flex;flex-direction:column;gap:22px;min-width:0}
.kc-h{flex:none;font-family:var(--display);font-weight:400;font-size:84px;line-height:1;letter-spacing:-0.015em;margin:0}
.kc-main .lead{max-width:620px;margin-top:auto}
.kc-btn{display:flex;align-items:center;gap:16px;background:transparent}
.kc-r{padding-left:24px;border-left:1px solid var(--ink);display:flex;flex-direction:column;gap:14px;min-height:0}
.kc-slot{margin-bottom:4px}
.kc-toc li{display:flex;align-items:baseline;gap:8px;padding:11px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:17px;line-height:1.2}
.kc-toc li:first-child{border-top:3px double var(--ink)}
.kc-toc .num{font-size:14px;color:var(--quiet)}
.kc-pull{margin:auto 0 0;padding:14px 0 0;border-top:3px double var(--ink);display:flex;flex-direction:column;gap:8px}
.kc-pull p{font:400 28px/1.15 var(--display);letter-spacing:-0.005em;color:var(--ink)}
.kdots{flex:1;min-width:16px;height:0;border-bottom:1px dotted var(--quiet);align-self:baseline}

/* contents: leaders to the folio */
.kidx li{display:flex;align-items:baseline;gap:8px;padding:15px 0;border-bottom:1px solid var(--divider);font-family:var(--ff-body);font-size:18px;line-height:1.3;color:var(--text)}
.kidx li .num{color:var(--quiet);font-size:14px}
.kcolo{flex:none;margin:24px 0 0}
.kcolo .mono{white-space:nowrap}
.kcolo li b{display:block;font:600 12px/1.3 var(--chrome);letter-spacing:0.08em;text-transform:uppercase;color:var(--text);margin-bottom:6px}
.kidx--s li{padding:9px 0;font-size:15px}
.kinside{margin-top:24px}
.kidx2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;align-items:start}
.kidx li span:first-child{min-width:0}

/* colour: the markets page. A ruled listing like share prices, a small inline square the only swatch, a one-column story beside it. */
.kmk{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 380px;align-items:start}
.kmk-l{min-width:0;padding-right:28px}
.kmk-list{border-top:3px solid var(--text)}
.kmk-list.kdk{background:var(--surface);color:var(--text);padding:0 16px 8px}
.kmr{display:grid;grid-template-columns:14px 118px 124px 64px 64px 82px minmax(0,1fr);gap:0 10px;align-items:center;height:27px;border-bottom:1px solid var(--divider);font:400 14px/1 var(--ff-body);color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}
.kmr b{font-weight:700}
.kmr .mono{font-size:12px;color:var(--quiet)}
.kmq{display:block;width:12px;height:12px;box-shadow:inset 0 0 0 1px var(--divider)}
.kmn{text-align:right;font-weight:700;color:var(--text)}
.kmf{font:500 12px/1 var(--chrome);color:var(--text-soft)}
.kmu{font:400 12px/1.3 var(--chrome);color:var(--quiet)}
.kmr--h{height:auto;padding:7px 0 6px;font:600 12px/1 var(--chrome);letter-spacing:0.08em;text-transform:uppercase;color:var(--text);border-bottom:1px solid var(--text)}
.kmr--h span{font:inherit}
.kmk-story{min-width:0;padding-left:24px;border-left:1px solid var(--divider)}
.kmk-story .headline{margin-bottom:12px}
.kph{margin:0 0 12px}
.kph-sw{height:120px;box-shadow:inset 0 0 0 1px var(--divider)}
.kph .kcap{max-width:none;margin-top:6px}
.kmk-story .krules{border-top:1px solid var(--text)}
.kmk-story .krules li{padding:8px 0}
.krr{display:flex;flex-direction:column;align-items:flex-start;gap:1px;font:400 12px/1.25 var(--chrome);color:var(--quiet);text-align:left}
.krr b{font:700 14px/1.25 var(--ff-body);color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}

/* type scale: front-page anatomy. Each style at its true size, labelled in the margin with a leader rule and its spec. */
.kfp-page{grid-template-columns:minmax(0,1fr) 300px}
.kfp-sheet{min-width:0;padding-right:28px;border-top:3px solid var(--text);display:flex;flex-direction:column;justify-content:space-between;padding-bottom:4px}
.kfp{display:grid;grid-template-columns:230px minmax(0,1fr);gap:0 14px;align-items:baseline;padding:10px 0}
.kfp-l{display:flex;flex-direction:column;gap:3px;min-width:0}
.kfp-t{display:flex;align-items:baseline;gap:8px}
.kfp-t .mono,.kfp-t b{font-size:12px;font-weight:400;color:var(--text)}
.kld{flex:1;min-width:16px;height:0;border-bottom:1px dotted var(--text);align-self:baseline}
.kfp-s{font:400 12px/1.4 var(--chrome);color:var(--quiet)}
.kfp-s .mono{font-size:12px;color:var(--text-soft)}
.kts{color:var(--text);white-space:nowrap}
.kfaces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}
.kface{display:flex;flex-direction:column;gap:2px;min-width:0}
.kface-a{font-size:72px;line-height:1.05;color:var(--text)}
.kface b{font:700 14px/1.3 var(--ff-body);color:var(--text)}

/* spacing: a bar chart of steps drawn at actual size, one ruled column each */
.ksp{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);border-top:3px solid var(--text)}
.ksp-c{padding:14px 14px 0;border-left:1px solid var(--divider);display:flex;flex-direction:column;gap:3px;min-width:0}
.ksp-c:first-child{padding-left:0;border-left:0}
.ksp-f{height:220px;display:flex;align-items:flex-end;margin-bottom:8px;border-bottom:1px solid var(--text)}
.ksp-f i{display:block;background:var(--text)}
.ksp-c .mono{font-size:12px;color:var(--quiet)}
.ksp-c b{font:700 16px/1.2 var(--ff-body);color:var(--text)}

/* radii and borders, elevation: sections share the page height; the sidebar carries the values as a price list */
.ksec{flex:1;display:flex;flex-direction:column;min-height:0}
.ksec--b{border-top:3px double var(--text);padding-top:12px}
.ksec--b>.kh3{border-top:0;padding-top:0}
.kside .ktk{height:24px}
.ktoast .ui-toast{max-width:100%}
.kr3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px;align-items:start}
.ksp-card{max-width:260px}
.krow2{display:flex;align-items:center;gap:20px}
.kstep{display:flex;gap:14px;align-items:flex-start}
.kstep-sw{flex:none;width:44px;height:44px;box-shadow:inset 0 0 0 1px var(--divider)}

/* matrices: states and choices (a row per state), inputs (a column per state) */
.kmx{display:grid;gap:0 20px;align-items:start;border-top:3px solid var(--text)}
.kmx--st{grid-template-columns:200px 1fr 1fr 1.5fr 1fr 1fr}
.kmx--ch{grid-template-columns:130px repeat(3,minmax(0,1fr))}
.kmx--ch .kmx-c{padding:21px 0}
.kmx-h{display:flex;flex-direction:column;gap:4px;padding:10px 0;border-bottom:1px solid var(--text);min-height:0}
.kmx-h b{font:600 12px/1.3 var(--chrome);letter-spacing:0.08em;text-transform:uppercase}
.kmx-r{padding:0;border-bottom:1px solid var(--divider);font:600 13px/1.3 var(--chrome);color:var(--text);align-self:stretch;display:flex;align-items:center}
.kmx-r--s{flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;padding:5px 0}
.kmx-r--s b{font:700 14px/1.25 var(--ff-body)}
.kmx-r--s .kcap{max-width:24ch}
.kmx-c{padding:4px 0;border-bottom:1px solid var(--divider);min-width:0;align-self:stretch;display:flex;align-items:center}
.kmx-c .ui-field{width:100%}
.kmx-c .ui-btn{height:40px;padding:0 var(--sp-4);font-size:var(--fs-label)}
.kmx-c .ui-choice{min-height:32px}
.kgrid5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px 20px;align-items:start}
.kgrid5 .kmx-h{padding:10px 0 0;border-bottom:0}
.kgrid5 .kcell{padding-bottom:14px;border-bottom:1px solid var(--divider)}

/* buttons */
.kdraw{position:relative;height:150px}
.kd{position:absolute;background:var(--text)}
.kd-v{position:absolute;font-size:12px;line-height:16px;color:var(--text)}
.kd-n{position:absolute;width:calc(100% - 130px);font:400 12px/1.4 var(--chrome);color:var(--text-soft)}
.kzoom{position:absolute;transform:scale(2);transform-origin:0 0}
.kvars{display:flex;flex-direction:column;margin-top:16px;border-top:3px solid var(--text)}
.kvar{display:grid;grid-template-columns:76px auto minmax(0,1fr);gap:0 16px;align-items:center;padding:5px 0;border-bottom:1px solid var(--divider)}
.kvar .kcap{max-width:none}
.kpair{display:flex;align-items:center;gap:10px}
.kst-row{display:grid;grid-template-columns:repeat(5,max-content);gap:0 20px;align-items:start}
.kst{display:flex;flex-direction:column;gap:6px;min-width:0}
.kst .ui-btn{align-self:flex-start}
.kst .kcap b{margin-bottom:0}
.kst .ui-help{max-width:30ch}

/* cards, navigation, lists */
.ui-card__media.photo-slot{align-items:flex-end;padding:10px 12px;background:var(--sunken);box-shadow:inset 0 0 0 1px var(--divider)}
.ui-card__media.photo-slot::after{content:'Photo, 16 : 9';font:400 12px/1 var(--chrome);color:var(--text-soft)}
.kcard-act{margin-top:8px}
.kstats{display:flex;flex-direction:column;gap:12px}
.ktop{border:1px solid var(--divider)}
.kbar{border:1px solid var(--divider)}
.kc--cards .kcol--top{padding-top:6px}

/* status: the weather strip. A column a status; the chip in light and dark, the ratios as the temperatures. */
.kwx-strip{display:grid;border-top:3px solid var(--text)}
.kwx{min-width:0;padding:16px 22px 0;border-left:1px solid var(--divider);display:flex;flex-direction:column;gap:14px}
.kwx:first-child{padding-left:0;border-left:0}
.kwx:last-child{padding-right:0}
.kwx-line{display:flex;align-items:center;justify-content:space-between;gap:12px}
.kwx .krr{align-items:flex-end;text-align:right}
.kwx .krr b{font:400 28px/1 var(--ff-display);letter-spacing:-0.01em}
.kwx .kcap{max-width:none}
.kwx-use{flex:none}
.kbdg{display:flex;flex-direction:column;gap:14px;margin-bottom:10px}
.kbd{display:inline-flex;align-items:center;gap:8px;font:400 16px/1.2 var(--ff-body);color:var(--text)}
.kbd-i{display:inline-flex;align-items:flex-start;gap:2px;color:var(--text)}
.kwx-lt .kwx{padding-bottom:14px}
.kwx-dk{border-top:0;margin:0 -16px;padding:0 16px}
.kwx-dk .kwx{padding-top:16px;padding-bottom:16px;border-left-color:var(--divider)}
.kwx-cp{border-top:0}
.kwx-cp .kwx{padding-top:14px}

/* feedback, table, empty */
.kalerts{display:flex;flex-direction:column;gap:12px}
.kload{display:flex;gap:20px;align-items:center}
.kskel{display:flex;flex-direction:column;gap:10px}
.kkeys{display:flex;gap:40px;margin-top:16px}
.ksteps{list-style:none;display:flex;flex-direction:column;gap:8px;margin:4px 0 8px}
.ksteps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-body)}
.ksteps li span{display:grid;place-items:center;width:24px;height:24px;border-radius:var(--r-round);background:var(--surface);box-shadow:inset 0 0 0 var(--w-control) var(--text);font:700 12px/1 var(--ff-body);font-variant-numeric:tabular-nums}
.kc .ui-empty{min-height:0}

/* screens */
.pg--kscreen .kb{padding:0}
.kscreen-wrap{flex:1;min-height:0;display:flex}
.kscreen{display:flex;flex-direction:column;width:100%;border:1px solid var(--ink);overflow:hidden;min-height:0}
.kscreen .ui-topbar{flex:none}
.kwm{font-size:22px;line-height:1}
.ks-clock{color:var(--quiet);font-size:var(--fs-label)}
.ks-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 360px;padding:24px 32px;background:var(--surface)}
.ks-list{min-width:0;padding-right:40px}
.ks-order{display:flex;flex-direction:column;gap:14px;padding-left:32px;border-left:1px solid var(--divider)}
.ks-h{font:400 40px/1.05 var(--ff-display);letter-spacing:-0.01em;color:var(--text)}
.ks-order .ks-h{font-size:26px;line-height:1.1}
.ks-sub{margin:4px 0 12px;font-size:var(--fs-label);color:var(--quiet)}
.ks-time{display:flex;flex-direction:column;gap:6px}
.ks-time .ui-segmented{display:flex}
.ks-time .ui-segmented button{flex:1}
.ks-order .ui-btn--block{margin-top:8px}
.kpr{color:var(--action);font-weight:700}

/* mobile page */
.kc--phone{align-items:start}
.kcol--phone{padding-right:36px}
.kphone{width:390px;height:540px;border:1px solid var(--ink);display:flex;flex-direction:column;background:var(--surface)}
.kph-top{display:flex;justify-content:space-between;align-items:center;padding:14px 24px 10px;border-bottom:1px solid var(--divider);font-size:var(--fs-label)}
.kph-top .kwm{font-size:20px}
.kph-body{flex:1;min-height:0;padding:16px 24px 20px;display:flex;flex-direction:column;gap:0}
.kph-body .ks-h{font-size:30px}
.kph-body .ks-time{margin-top:12px}
.kph-body .ui-btn--block{margin-top:auto}
.kph-body .ui-row{min-height:56px;padding:8px 0}

/* tokens: the classifieds */
.ktcols .kcol{padding:0 20px}
.ktcols .kcol:first-child{padding-left:0}
.ktcols .kcol:last-child{padding-right:0}
.ktcols .ktk--2{grid-template-columns:minmax(0,1fr) auto}
.ktcols .krules li{padding:9px 0}
.ktg{margin-bottom:18px}
.ktk{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr);gap:0 8px;align-items:center;height:21px;border-bottom:1px solid var(--divider);font:400 12px/1 var(--ff-body)}
.ktk--2{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}
.ktk--h{height:auto;padding-bottom:5px;font:600 12px/1 var(--chrome);color:var(--text);border-bottom:1px solid var(--text)}
.ktk .mono{font-size:12px;white-space:nowrap}
.ktv{display:flex;align-items:center;gap:6px}
.ktsw{display:block;width:12px;height:12px;box-shadow:inset 0 0 0 1px var(--divider);flex:none}
.ktg .kh3--d{font-size:18px;margin-bottom:6px}

/* code */
.kfiles{display:flex;flex-direction:column}
.kfile{display:grid;grid-template-columns:112px minmax(0,1fr);gap:0 16px;padding:12px 0;border-bottom:1px solid var(--divider);font:400 13px/1.45 var(--ff-body);color:var(--text-soft)}
.kfile .mono{font-size:12px;color:var(--text)}
.kB-lead .kstack{gap:14px}
.kcode{padding:12px 16px;background:var(--surface);color:var(--text);font:400 12px/1.65 var(--ff-mono);white-space:pre}
.kcode code{font:inherit}
.kg .kh3{margin-bottom:10px}
`;
}
