// Styles for uikit.js (theme 04). Kit tokens and the real component CSS are scoped to .ui regions; page chrome reads the .pg variables.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `
.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
.mono{font-family:var(--ff-mono);font-size:0.92em;font-weight:400;font-variant-numeric:tabular-nums}
/* status is plain words in the engine's status colour, a 6 px dot before them: no fill, box or pill */
.pg .ui .ui-chip{gap:6px}
.pg .ui .ui-chip::before{content:'';flex:none;width:6px;height:6px;border-radius:50%;background:currentColor}.pg .ui .kchip--gone{color:var(--quiet)}
/* a delay: the scheduled time struck through, the new time and the minutes late beside it in the warning colour */
.kdep-late{display:inline-flex;align-items:baseline;gap:8px;white-space:nowrap}
.kdep-late s{font:inherit;color:var(--quiet);text-decoration-thickness:2px}
.kdep-late b{font:inherit;color:var(--warning)}
/* a board that holds a delay widens every time column to the delay's width, so the wharf names still line up (two tabular times and the gap) */
.kdeps:has(.kdep-late) .kdep-t{width:128px}
/* slot edition: the time is a placeholder frame, so the time column grows to hold it */
.kdep-t:has(.ph-b){width:auto;max-width:45%}
.kdep-t .ph-b{width:auto}
/* inside the drawn screens the time placeholder is the compact label: it stacks on two lines in the 80 px time column, so the row keeps its 72 px and nothing runs into the wharf */
.kdep-t .ph-c{display:inline-block;max-width:100%;white-space:normal!important;font-size:14px;line-height:18px;font-weight:600;vertical-align:middle}
/* the display times are set at 700, which the slot edition does not load for the placeholder face: a placeholder there is set at the loaded 600 */
:is(.ks-time,.kstate-line,.kc-band,.kt-h .p,.kdep-t) :is(.ph-c,.ph-b,.ph-w){font-weight:600}
.pg--kit .work.ui{overflow:hidden}
.pg--kit .rules li{grid-template-columns:58px 1fr}
.pg--kit .work.is-dark{padding:24px;background:var(--surface)}
.kg{display:flex;flex-direction:column;min-width:0}
.ktg>h3{display:flex;gap:12px;font:600 13px/18px var(--chrome);color:var(--text);margin:6px 0 12px}
.kru-d{position:absolute;width:0;height:0}
.kru{display:block;color:var(--text);border-top:1px solid var(--text);height:6px}
.kg>h3{display:flex;gap:12px;font:600 13px/18px var(--chrome);color:var(--text);margin:6px 0 12px}
.kn{flex:none;min-width:36px;font-style:normal;font-weight:400;color:var(--quiet)}
/* a dimension drawn on a component at actual size: the height down its left edge, a length over its left edge with a guide down from its end */
.kdm{position:relative;display:flex;align-items:flex-start}
.kdm--v{padding-left:46px}
.kdm--h{margin-top:16px}
.kdm-i{position:relative;flex:1;min-width:0}
.kcell>.kdm,.kst>.kdm{align-self:flex-start}
.kv{position:absolute;left:34px;top:0;width:9px;box-sizing:border-box;border-top:1px solid var(--text);border-bottom:1px solid var(--text)}
.kv::before{content:'';position:absolute;left:4px;top:0;bottom:0;width:1px;background:var(--text)}
.kv b,.kv small{position:absolute;right:calc(100% + 5px);top:50%;white-space:nowrap;text-align:right;font:600 11px/14px var(--chrome);color:var(--text)}
.kv b{margin-top:-14px}
.kv small{font-weight:400;color:var(--quiet)}
.kh{position:absolute;left:0;top:-11px;height:9px;box-sizing:border-box;border-left:1px solid var(--text);border-right:1px solid var(--text)}
.kh::before{content:'';position:absolute;left:0;right:0;top:4px;height:1px;background:var(--text)}
.kh b{position:absolute;left:100%;top:-3px;margin-left:8px;white-space:nowrap;font:600 11px/14px var(--chrome);color:var(--text)}
.kh--s{position:relative;top:0;display:block;margin-bottom:14px}
.kh--s b{top:-3px;margin-left:6px;font-weight:400}
.kg-l{position:absolute;top:-2px;bottom:0;border-left:1px dashed var(--text);pointer-events:none}
.kcap{display:block;font:400 11px/1.5 var(--chrome);color:var(--quiet);max-width:34ch}
.kcap b{display:block;font-size:12px;font-weight:600;color:var(--text)}
.kcap--after{margin-top:12px}
.kcap--ink{color:var(--text-soft)}
.kcell{display:flex;flex-direction:column;gap:8px;min-width:0}
.kcell>.ui-btn,.kcell>.ui-toast{align-self:flex-start}
.kna{font:400 11px/1.5 var(--chrome);color:var(--quiet)}
.kstack{display:flex;flex-direction:column;gap:24px;min-width:0}
.k2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-content:start}
.k3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:end}
.k3--w{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr) minmax(0,1fr)}
.k3--v{align-items:start;row-gap:24px}
.k5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;align-items:start}

/* cover */
.pg--kcover{display:flex;flex-direction:column;justify-content:space-between;padding:48px var(--m) 56px;background:var(--dark);color:var(--dark-ink)}
.pg--kcover .cv-top{display:grid;grid-template-columns:1fr 1fr;gap:40px;border-top:1px solid var(--dark-ink);padding-top:14px}
.pg--kcover h1{font-size:28px;font-weight:600;line-height:1.2}
.pg--kcover .cv-top p{font-size:13px;margin-top:6px}
.pg--kcover .sec{list-style:none;justify-self:end;width:240px;font-size:13px;line-height:1.9}
.kc-row{display:flex;gap:36px;align-items:flex-start}
.kc-sheet{position:relative;flex:none}
.kc-svg{display:block}
.kc-svg .kc-zone{fill:none;stroke:var(--dark-ink);stroke-width:1;stroke-dasharray:4 3}
.kc-svg .kc-prot{fill:none;stroke:var(--dark-ink);stroke-width:1}
.kc-dim path{fill:none;stroke:var(--dark-ink);stroke-width:1}
.kc-dim text{fill:var(--dark-ink);font:400 11px var(--chrome);font-variant-numeric:tabular-nums}
.kc-logo{position:absolute}
.kc-spec{list-style:none;flex:1;min-width:0;font-size:13px;line-height:1.5;border-top:1px solid var(--dark-ink)}
.kc-spec li{display:grid;grid-template-columns:28px minmax(0,1fr);padding:10px 0;border-bottom:1px solid var(--dark-ink)}
.kc-spec span{font-variant-numeric:tabular-nums}
.kc-band{display:flex;align-items:center;gap:40px;height:112px;border-top:1px solid var(--dark-ink);border-bottom:1px solid var(--dark-ink)}
.kc-band .disp{font-size:80px;white-space:nowrap}
.kc-to{flex:1;min-width:0}
.kc-chip{display:inline-flex;align-items:center;color:var(--buoy);font:600 20px/1 var(--body);white-space:nowrap}
.pg--kcover .cv-bot p{font-size:13px;line-height:1.6;text-align:right}

/* contents */
.kt{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px}
.kt-c{display:flex;flex-direction:column;gap:28px}
.kt-h{display:grid;grid-template-columns:40px minmax(0,1fr) 64px;align-items:center;gap:0 12px;height:48px}
.kt-h .n{font:400 13px/1 var(--chrome);color:var(--quiet)}
.kt-h .t{font:500 18px/1.2 var(--ff-body)}
.kt-h .p{font:700 28px/1 var(--ff-display);text-align:right}
.kt-s .kru{margin-bottom:6px}
.kt-s ul{list-style:none}
.kt-s li{display:grid;grid-template-columns:52px auto minmax(12px,1fr) auto;align-items:baseline;gap:0 6px;padding:6px 0;font:400 13px/1.4 var(--chrome);color:var(--text-soft)}
.kt-s li .r{color:var(--quiet)}
.kt-s li .t{color:var(--text)}
.kt-s li .d{align-self:end;height:1px;margin-bottom:4px;border-bottom:1px dotted var(--quiet)}

/* colour chip sheet: each chip in its pair, its tint table under it, its spec block under that */
.pg--kroles .work.is-dark{padding:8px}
/* four families, unequal: ground, action and state share the first row at four narrow chips each, text and lines take the second row as eight wide chips */
.kfams{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:row dense;gap:14px 20px;align-content:start}
.kf{min-width:0}.kf--t{grid-column:1/-1}
.kf-h{margin:0 0 6px;padding-top:6px;border-top:1px solid var(--text);font:600 12px/16px var(--chrome);color:var(--text)}
/* ground, action and state sit two by two, so each chip has room for its token on one or two lines; text and lines runs eight across on shorter swatches */
.kqs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 8px;align-content:start}
.kf--t .kqs{grid-template-columns:repeat(8,minmax(0,1fr))}
.kf--t .kq-f{height:56px}
.kf--t .kq-a{font-size:24px}
.kq{display:flex;flex-direction:column;min-width:0}
.kq-f{height:76px;display:flex;flex-direction:column;justify-content:space-between;padding:7px 8px;box-shadow:inset 0 0 0 1px var(--divider);overflow:hidden}
.kq-n{font:400 11px/1 var(--chrome);font-variant-numeric:tabular-nums}
.kq-a{font:600 30px/1 var(--ff-body)}
.kq-s{font:400 12px/1 var(--ff-body)}
.kq-t{display:flex;gap:1px;margin-top:5px;padding-top:5px;height:17px;border-top:1px dashed var(--quiet)}
.kq-t i{flex:1;display:block;height:12px;box-shadow:inset 0 0 0 1px var(--divider)}
.kq-d{display:flex;flex-direction:column;gap:2px;margin-top:5px;min-width:0}
.kq-d>b{font:600 13px/16px var(--chrome)}
.kq-d .mono{font-size:10.5px;line-height:13px;color:var(--quiet);overflow-wrap:normal;word-break:normal}
.kq-r{font:400 11px/14px var(--chrome);color:var(--quiet)}
.kq-r b{font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}
.krr{display:flex;flex-direction:column;align-items:flex-end;font:400 11px/1.3 var(--chrome);color:var(--quiet);text-align:right}
.krr b{font:500 13px/1.3 var(--ff-body);color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}

/* type scale: a clause per style, the sample on drawn baseline, x-height and cap-height guides */
.ktype2{display:flex;flex-direction:column}
.ktr2{display:grid;grid-template-columns:68px minmax(0,1fr) 200px;gap:0 14px;align-items:start;padding:11px 0;border-top:1px solid var(--divider)}
.ktr2:last-child{border-bottom:1px solid var(--divider)}
.ktn{display:flex;flex-direction:column;gap:3px;font:400 11px/14px var(--chrome);color:var(--quiet)}
.ktn i{font-style:normal}
.ktn .mono{font-size:11px;color:var(--text)}
.ktb{min-width:0}
.ktb-s{position:relative;overflow:hidden}
.kts-svg{position:absolute;left:0;top:0;display:block}
.kts-svg path{fill:none;stroke:var(--text);stroke-width:1}
.kts-svg .kts-d{stroke:var(--quiet);stroke-dasharray:3 3}
.kts-svg text.kts{fill:var(--text);white-space:pre}
.kts-svg text.kts{stroke:none}
.kcap--use{margin-top:4px;max-width:none}
.kto{display:flex;flex-direction:column;gap:2px;font:400 11px/14px var(--chrome);color:var(--text-soft)}
.kto .mono{font-size:11px;color:var(--text)}
/* type scale, spacing */
.ktype{display:flex;flex-direction:column}
.ktr{display:grid;grid-template-columns:76px minmax(0,1fr) 92px 130px;gap:0 16px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--divider)}
.ktr:first-child{border-top:1px solid var(--divider)}
.ktr .mono{font-size:11px;color:var(--quiet)}
.ktm{text-align:right}
.kts{color:var(--text);white-space:nowrap;min-width:0}
.ktr.kts-sp{grid-template-columns:90px 100px 80px minmax(0,1fr);align-items:center;padding:10px 0}
.ksq{display:flex;flex-direction:column;align-items:flex-start;width:80px}
.ksq i{display:block;background:var(--text)}

.kbw{display:block;width:48px;margin:8px 0 0;background:var(--text)}
.kfake{display:flex;align-items:center;width:240px}
.kcons{display:flex;gap:28px;align-items:flex-start;margin-bottom:-6px}
.kcons .kdm--h{margin-top:14px}
.kcons .kdm{flex:none}

/* radii, elevation */
.ksp-card{max-width:220px}
.krow2{display:flex;align-items:center;gap:16px}
.kelev{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:32px 28px;align-items:start}
.kelev>.kg:first-child{grid-column:1/-1}
.kstepl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.kstep{display:flex;gap:12px;align-items:flex-start}
.kstep-sw{flex:none;width:44px;height:44px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--divider)}
.kelev .ui-dialog{max-width:none}
.kelev .ui-dialog__actions .ui-btn{height:36px;padding:0 var(--sp-4);font-size:var(--fs-label)}

/* state, option, input matrices */
.kmx{display:grid;grid-template-columns:84px minmax(0,1.2fr) repeat(4,minmax(0,1fr));gap:0 12px;align-items:start}
.kmx--3{grid-template-columns:70px minmax(0,1fr) minmax(0,1fr) minmax(0,1.35fr)}
.kmx--3 .kmx-c{padding-left:46px}
.kmx--3 .kmx-h:not(:first-child){padding-left:46px}
.kmx--3 .kmx-c .kdm{margin-left:-46px}
.kmx-h{display:flex;flex-direction:column;gap:4px;padding-bottom:10px;border-bottom:1px solid var(--text);min-height:44px}
.kmx-h b{font:600 12px/1 var(--chrome)}
.kmx-r{padding:16px 0;border-bottom:1px solid var(--divider);font:600 12px/1.4 var(--chrome);align-self:stretch}
.kmx-c{padding:10px 0;border-bottom:1px solid var(--divider);min-width:0;align-self:stretch;display:flex;align-items:center}
.kmx-c .ui-field{width:100%}
.kmx-c .ph-c{white-space:normal!important}
.kmx-c .ui-btn{padding:0 var(--sp-4)}
.kerr{display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;margin-top:20px;align-items:start}
.kin{display:grid;grid-template-columns:56px repeat(3,minmax(0,1fr));gap:0 16px}
.kin>div:not(.kmx-h):not(.kmx-r){padding:6px 0;border-bottom:1px solid var(--divider)}
.kin .ui-textarea{height:48px;min-height:48px}
.kin .kmx-r{padding:12px 0}
.kin .kmx-h{min-height:0;padding-bottom:6px}
.kseg{display:flex;gap:32px;align-items:flex-start;margin-top:24px}
.kseg .kcap{max-width:30ch}

/* buttons */
.kstack--btn{gap:28px}
.kbtn-top{display:grid;grid-template-columns:300px minmax(0,1fr);gap:24px}
.kdraw{position:relative;padding:4px 0 0}
.kd{position:absolute;background:var(--text)}
.kd-v{position:absolute;font-size:12px;line-height:16px}
.kzoom{position:absolute;zoom:2}
.kspec{display:flex;flex-direction:column;gap:6px;font:400 12px/16px var(--chrome);color:var(--quiet);padding-top:28px}
.kspec .mono{color:var(--text);font-size:12px}
.kst{display:flex;flex-direction:column;min-width:0}
.kst .ui-btn{align-self:flex-start;padding:0 var(--sp-4);font-size:var(--fs-label)}
.kst b{margin-top:10px;font:600 12px/1.3 var(--chrome)}
.kst p{margin:4px 0 0;font:400 11px/1.5 var(--chrome);color:var(--quiet)}

/* cards, navigation */
/* one tall card (with media) on the left, the three short ones stacked on the right */
.kcards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 32px;align-items:start}
.kcards>.kcell:first-child{grid-row:span 3}
.kcards .ui-card__media{aspect-ratio:16/9;overflow:hidden}
.kmedia .dr{display:block;width:100%;height:100%}
.kcards .kdm{align-self:stretch;max-width:340px}
.kstats{display:flex;gap:12px}
.kstats .ui-stat{flex:1}
.knav{display:flex;flex-direction:column;gap:28px}
.knav-2{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:28px;align-items:start}
.ktop{border:1px solid var(--divider);border-radius:2px}
.kbar{border:1px solid var(--divider);border-radius:2px;overflow:hidden}

/* departure rows, status */
.kdeps{border-top:1px solid var(--divider)}
.kdeps--one{width:100%}
.kdep{display:flex;align-items:center;height:72px;padding:0 16px;border-bottom:1px solid var(--divider)}
.kdep-t{flex:none;width:80px;font:600 28px/1 var(--ff-display);white-space:nowrap}
.kdep-t:has(.kdep-late){width:auto;min-width:80px}
.kdep-t.is-struck{text-decoration:line-through;text-decoration-thickness:2px}
.kdep-m{flex:1;min-width:0;margin:0 12px;overflow:hidden}
.kdep-m b{display:block;font:500 16px/20px var(--ff-body);white-space:nowrap}
.kdep-m span{display:block;font:400 14px/18px var(--ff-body);color:var(--quiet);white-space:nowrap}
.kdep.is-gone .kdep-t,.kdep.is-gone .kdep-m b{color:var(--quiet)}
.kstats-list{display:flex;flex-direction:column}
.kstat{display:grid;grid-template-columns:150px 120px 52px 52px minmax(0,1fr);gap:0 16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--divider)}
.kstat--h{padding:0 0 10px;border-bottom:1px solid var(--text);align-items:end}
.kstat--h b{font:600 12px/1 var(--chrome)}
.kstat>span:first-child,.kstat--h>b:first-child{padding-left:46px}
.kstat>span:first-child .kdm{margin-left:-46px}
.kstat .kdm--h{margin-top:0}
.kstat .kcap{max-width:none}
.kstat .krr{align-items:flex-start;text-align:left}
.kdk{display:flex;align-items:center;align-self:stretch;margin:-14px 0 -15px;padding:0 12px;background:var(--surface);border-bottom:1px solid var(--divider)}

/* feedback, dialog, empty */
.kfeed{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:28px;align-items:start}
.kalerts{display:flex;flex-direction:column;gap:12px}
.kload{display:flex;gap:16px;align-items:center}
.kskel{display:flex;flex-direction:column;gap:10px}
.kdlg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-content:start}
.kdlg .ui-scrim{padding:24px 16px;min-height:300px}
.kdlg .kdm{width:100%}
.kdlg .kh{border-color:var(--surface)}
.kdlg .kh::before{background:var(--surface)}
.kdlg .kh b{color:var(--surface)}
.kdlg .ui-dialog__actions .ui-btn{height:36px;padding:0 var(--sp-4);font-size:var(--fs-label)}
.kkeys{display:flex;gap:32px}
.k2 .ui-empty{min-height:340px}
.ksteps{list-style:none;display:flex;flex-direction:column;gap:8px;margin:4px 0 8px}
.ksteps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-body)}
.ksteps li span{display:grid;place-items:center;width:24px;height:24px;border-radius:2px;box-shadow:inset 0 0 0 var(--w-control) var(--text);font:600 12px/1 var(--ff-body)}

/* screens */
.ks-band{position:absolute;left:var(--m);right:var(--m);top:104px;display:grid;grid-template-columns:250px minmax(0,1fr);gap:40px}
.ks-band h2{font-size:22px;font-weight:600;line-height:1.25}
.ks-band .lead{font-size:13px;line-height:1.5;color:var(--quiet);align-self:center}
.ks-wrap{position:absolute;left:var(--m);right:var(--m);top:164px;bottom:56px;display:flex}
.ks-wrap>.kdm{flex:1;min-width:0;align-items:stretch}
.ks-wrap>.kdm>.kdm-i{display:flex}
.ks-wrap .kg-l{display:none}
.ks-later .kdm,.ks-later .ks-q{margin-left:0}
.ks-later .ks-q{padding-left:46px}
.kscreen{display:flex;flex-direction:column;width:100%;border:1px solid var(--divider);border-radius:2px;overflow:hidden;min-height:0}
.kscreen .ui-topbar{flex:none}
.ks-clock{color:var(--quiet);font-size:var(--fs-label)}
.ks-main{flex:1;min-height:0;display:grid;grid-template-columns:420px minmax(0,1fr);gap:56px;padding:24px 32px;background:var(--surface)}
.ks-q{display:block;font:500 14px/20px var(--ff-body);color:var(--quiet);margin-bottom:6px}
.ks-seg{margin-bottom:20px}
.ks-next{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.ks-time{font:700 72px/1 var(--ff-display)}
.ks-next .ui-chip{margin-bottom:10px}
.ks-pickup{margin-top:4px;font:400 15px/22px var(--ff-body)}
.ks-prog{margin-top:20px}
.ks-route{display:flex;justify-content:space-between;margin-top:8px;font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ks-rider{display:flex;align-items:center;gap:12px;margin-top:20px;padding-top:14px;border-top:1px solid var(--divider)}
.ks-rmain{flex:1;min-width:0}
.ks-rname{font:500 15px/1.4 var(--ff-body)}
.ks-rsub{font:400 13px/1.4 var(--ff-body);color:var(--quiet)}
.ks-later{min-width:0}
.ks-buy{margin-top:20px;display:flex}

/* mobile */
/* mobile: the board-first phone, its heights set from PH in uikit.js (top 48, wharf 40, rows 72, button 44 with 20 round it, tab bar 64) */
.kph-cols{display:grid;grid-template-columns:478px minmax(0,1fr);gap:20px;height:100%}
.kph-wrap{position:relative;padding-left:46px;height:100%}
.kphone{width:392px;box-sizing:border-box;height:100%;border:1px solid var(--divider);border-radius:2px;overflow:hidden;display:flex;flex-direction:column}
.kph-top{flex:none;display:flex;justify-content:space-between;align-items:center;height:48px;padding:0 20px;font:600 13px/20px var(--ff-body)}
.kph-body{flex:1;min-height:0;display:flex;flex-direction:column}
.kph-head{flex:none;display:flex;align-items:center;height:40px;padding:0 16px;font:500 14px/20px var(--ff-body);color:var(--quiet)}
.kph-board{flex:none}
.kph-board .kdep-t{width:64px;font-size:24px}
.kph-board .kdep-t:has(.kdep-late){width:auto;min-width:64px}
.kph-board .kdep-late{gap:6px}
.kph-board:has(.kdep-late) .kdep-t{width:108px}
.kph-note{padding:12px 16px 0;font:400 14px/20px var(--ff-body);color:var(--text-soft)}
.kph-body .ks-buy{margin-top:auto;padding:20px}
.kphone .ui-tabbar{flex:none;height:64px;box-sizing:border-box}
.kph-k{position:absolute;left:446px;font:600 11px/14px var(--chrome);color:var(--text);padding-left:6px;border-left:1px solid var(--text)}
.kstates{list-style:none;display:flex;flex-direction:column}
.kstate{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:14px 0;border-bottom:1px solid var(--divider)}
.kstate-line{font:700 24px/1 var(--ff-display);color:var(--text)}
.kstate-line s{color:var(--quiet);text-decoration-thickness:2px}

/* tokens, code */
.ktokens{display:grid;grid-template-columns:270px 200px 190px;gap:30px;align-items:start}
.ktg{margin-bottom:16px}
.ktk{display:grid;grid-template-columns:minmax(0,1fr) 70px 70px;gap:0 6px;align-items:center;height:19px;border-bottom:1px solid var(--divider);font:400 12px/1 var(--ff-body)}
.ktk--2{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}
.ktk--f{grid-template-columns:84px minmax(0,1fr);white-space:nowrap}
.ktk--h{height:auto;padding-bottom:6px;font:600 11px/1 var(--chrome);border-bottom:1px solid var(--text)}
.ktk .mono{font-size:11px;white-space:nowrap}
.ktv{display:flex;align-items:center;gap:6px}
.ktsw{display:block;width:12px;height:12px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--divider);flex:none}
.kcode-cols{display:grid;grid-template-columns:300px minmax(0,1fr);gap:28px}
.kfile{display:grid;grid-template-columns:96px minmax(0,1fr);gap:0 12px;padding:9px 0;border-bottom:1px solid var(--divider);font:400 12px/1.45 var(--ff-body);color:var(--text-soft)}
.kfile .mono{font-size:11px;color:var(--text)}
.kcode{margin:0;padding:12px 14px;border-radius:2px;background:var(--surface);color:var(--text);font:400 11px/1.7 var(--ff-mono);white-space:pre;overflow:hidden}
.kcode code{font:inherit}
`;
}
