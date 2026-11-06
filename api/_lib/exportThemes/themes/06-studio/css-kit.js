// Styles for uikit.js (classes k...). Tokens and components are the engine's, scoped to .ui (light by default, data-theme="dark" for dark regions);
// the page chrome (.hd .top .bd .fo) is theme 06's own from index.js. Steel panels (.kpn) hold the brand's real UI.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const tokens = `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}`;
  return `
/* kit: tokens and components */
${tokens}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.mono{font-family:var(--ff-mono);font-size:0.92em;font-weight:400;font-variant-numeric:tabular-nums}
.pg--k .ui-display{font-weight:${ctx.weights.heading}}

/* the page body and its parts */
.pg--k .top{margin-top:28px}
.pg--k .bd{margin-top:24px}
.kb{flex:1;min-height:0;display:flex;flex-direction:column;gap:28px;font-size:13px;line-height:1.4;background:transparent}
.kg{display:flex;flex-direction:column;min-width:0}
.kh{font:500 12px/1 var(--chrome);color:var(--quiet);margin-bottom:12px}
.kcap{display:block;font:400 11px/1.5 var(--chrome);color:var(--quiet);max-width:34ch}
.kcap b{display:block;font:500 12px/1.4 var(--chrome);color:var(--text)}
.kcell{display:flex;flex-direction:column;gap:8px;min-width:0}
.kcell>.ui-btn,.kcell>.ui-toast{align-self:flex-start}
.kpn{background:var(--sunken);border-radius:var(--r-card);padding:24px;min-width:0}
.kpn .kcap,.kpn .kh{color:var(--quiet-sunken)}
.kpn .kcap b{color:var(--text)}
.kdm{position:relative;display:block;height:1px;background:var(--text);flex:none}
.kdm::before,.kdm::after{content:"";position:absolute;top:-4px;width:1px;height:9px;background:var(--text)}
.kdm::before{left:0}
.kdm::after{right:0}

.kts{color:var(--text)}

/* spacing */
.ksp{display:flex;flex-direction:column}
.ksr{display:grid;grid-template-columns:72px 48px 256px minmax(0,1fr);gap:0 16px;align-items:center;height:32px;border-bottom:1px solid var(--divider)}
.ksr .mono{font-size:11px;color:var(--quiet)}
.ksr-n{color:var(--text)!important}
.kgps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}
.kgp{display:flex;flex-direction:column;gap:12px}
.kgp-s{position:relative;display:flex;flex-direction:column;gap:var(--g);width:150px;min-height:88px}
.kgp-s i{display:block;height:28px;border-radius:6px;background:var(--surface);box-shadow:inset 0 0 0 var(--w-control) var(--edge)}
.kgp-s .kgp-d{position:absolute;right:-20px;top:28px;height:var(--g);width:1px;background:var(--text)}
.kgp-d::before,.kgp-d::after{content:"";position:absolute;left:-4px;width:9px;height:1px;background:var(--text)}
.kgp-d::before{top:0}
.kgp-d::after{bottom:0}
.kgp-d u{position:absolute;left:8px;top:50%;transform:translateY(-50%);font:400 11px/1 var(--chrome);text-decoration:none;color:var(--text)}
/* rules, tables, grids shared by the pages */
.krules{display:flex;flex-direction:column;border-bottom:1px solid var(--divider)}
.krules li{position:relative;padding:7px 0 7px 18px;border-top:1px solid var(--divider);font:400 13px/1.5 var(--ff-body);color:var(--text)}
.krules li::before{content:"";position:absolute;left:0;top:15px;width:8px;height:2px;background:var(--text)}
.krules .mono{font-size:12px}
.kstack{display:flex;flex-direction:column;gap:20px;min-width:0}
.k3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:end}
.kg2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px;align-items:start}
.kg3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:start}
.kg4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:start}
.krc{max-width:240px}
.krow2{display:flex;align-items:center;gap:20px}
.kna{font:400 11px/1.5 var(--chrome);color:var(--quiet)}

/* state matrix (states, buttons) */
.kmx{display:grid;grid-template-columns:84px repeat(5,minmax(0,1fr));gap:0 12px;align-items:start}
.kmx-h{position:relative;padding-bottom:30px;border-bottom:1.5px solid var(--text);font:500 12px/1 var(--chrome);color:var(--quiet)}
.kmx-r{align-self:stretch;padding:9px 0;border-bottom:1px solid var(--divider);font:500 12px/1.4 var(--chrome)}
.kmx-c{align-self:stretch;display:flex;align-items:center;min-width:0;padding:5px 0;border-bottom:1px solid var(--divider)}
.kmx-c .ui-btn{padding:0 var(--sp-4)}
.kmx-c .ui-btn--quiet{padding:0 var(--sp-3)}
.ksz{display:flex;align-items:flex-end;gap:40px}

/* elevation */
.kel-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:start}
.kstepl{display:flex;flex-direction:column;gap:12px}
.kstep{display:flex;gap:12px;align-items:flex-start}
.kstep-sw{flex:none;width:44px;height:44px;border-radius:var(--r-control);box-shadow:inset 0 0 0 1px var(--divider)}
.kel-scrim{border-radius:var(--r-card);padding:32px 24px;margin-bottom:8px}
.kel-scrim .ui-dialog{max-width:420px}

/* inputs */
.kg2--f{gap:32px}
/* choices, cards, navigation */
.k2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}
.kmx--c{grid-template-columns:76px repeat(5,minmax(0,1fr))}
.kmx--c .ui-choice{font-size:13px;gap:8px}
.kcards{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
.krc.kwide{max-width:none}
.kcards .ui-card__media{aspect-ratio:2.2 / 1}
.kcard-act{margin-top:12px;display:flex}
.kstats{display:block}
.kcell>.ui-segmented{align-self:flex-start}
.kb .ui-card__media.photo-slot{background:var(--raised);color:var(--quiet)}
.kmx--c~.kg .kstack{gap:10px}
.ktop{border:1px solid var(--divider);border-radius:var(--r-card)}
.kbar{border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden;max-width:390px}
.kcap--after{margin-top:10px;max-width:46ch}
.kb .ui-label{font-size:13px}
/* status, feedback */
.ksl{display:flex;flex-direction:column;border-top:1.5px solid var(--text)}
.kst{--kp:10px;display:grid;grid-template-columns:276px minmax(0,1fr);gap:0 20px;align-items:center;padding:var(--kp) 0;border-bottom:1px solid var(--divider)}
.kst--g{--kp:18px}.kst--g .kh{margin:0}
/* the dark half of every row runs to the row rule, so the dark samples read as one panel */
.kst-c{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:stretch;align-self:stretch;margin:calc(var(--kp) * -1) 0 calc(var(--kp) * -1 - 1px)}
.kst-c>:first-child{align-self:center}
.kdk{display:flex;align-items:center;box-sizing:border-box;padding:0 12px;font-size:13px;background:var(--surface);border-bottom:1px solid var(--divider)}
.kst-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.kst-t b{font:500 13px/1.4 var(--ff-body);color:var(--text)}
.kst-t b i{font:400 11px/1 var(--chrome);font-style:normal;color:var(--quiet);margin-left:6px}
.kst-t .kcap{max-width:none}
.kalerts{display:flex;flex-direction:column;gap:12px}
.kload{display:flex;gap:20px;align-items:center}
.kskel{display:flex;flex-direction:column;gap:10px}
/* dialog, table, empty */
.kdlg{gap:20px}
.kdlg .ui-scrim{padding:24px 16px;min-height:260px;border-radius:var(--r-card)}
.kdlg .ui-dialog{padding:20px}
.kdlg .ui-dialog__actions .ui-btn{height:40px;padding:0 var(--sp-4);font-size:var(--fs-label)}
.kdlg .kcap{color:var(--quiet-sunken)}
.ktbl{border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden}
.ktbl .ui-table td{height:56px}
.kkeys{gap:16px}
.ksteps{display:flex;flex-direction:column;gap:8px;margin:4px 0 8px}
.ksteps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-body)}
.ksteps li span{display:grid;place-items:center;width:24px;height:24px;border-radius:var(--r-round);background:var(--surface);box-shadow:inset 0 0 0 var(--w-control) var(--text);font:600 12px/1 var(--ff-body);font-variant-numeric:tabular-nums}
.kemp{align-items:stretch}
.kemp .kcell{height:100%}
.kemp .ui-empty{flex:1;padding:24px}
.kb .ui-empty__title{font-size:var(--fs-title);line-height:var(--lh-title)}
/* product screens: the 1280 x 760 sheets and the phone */
.pg--sheet{display:block;padding:0}
.ksh{box-sizing:border-box;height:100%;display:flex;flex-direction:column;gap:20px;padding:28px 40px;background:var(--sunken);color:var(--text);font:400 12px/1.5 var(--chrome)}
.ksh-hd{display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline;font-size:13px;line-height:18px;color:var(--quiet-sunken)}
.ksh-hd b{font-weight:600;color:var(--text)}
.ksh-hd .num{justify-self:end}
.ksh-p{font-weight:500;color:var(--text)}
.ksh-p .num{color:var(--quiet-sunken);margin-right:6px}
.ksh-hd>span:last-child{justify-self:end}
.ksh-fo{display:flex;justify-content:space-between;gap:24px;font-size:12px;line-height:18px;color:var(--quiet-sunken)}
.kscreen{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden;font-family:var(--ff-body)}
.kscreen .ui-topbar{flex:none}
.ks-clock{color:var(--quiet);font-size:var(--fs-label)}
.ks-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:56px;padding:36px 40px;background:var(--surface)}
.ks-title{margin:0 0 14px;font:500 var(--fs-label)/1 var(--ff-body);color:var(--quiet)}
.ks-eta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.ks-time{font-size:var(--fs-headline);line-height:var(--lh-headline);margin:0;color:var(--text)}
.ks-pickup{margin:8px 0 0;color:var(--text-soft);font-size:var(--fs-body);line-height:1.5}
.ks-prog{margin-top:32px;max-width:520px}
.ks-route{display:flex;justify-content:space-between;margin-top:8px;font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ks-rider{display:flex;align-items:center;gap:12px;margin-top:32px;padding-top:20px;border-top:1px solid var(--divider);max-width:520px}
.ks-rmain{flex:1;min-width:0}
.ks-rname,.ks-rsub{margin:0}
.ks-rname{font:500 15px/1.4 var(--ff-body)}
.ks-rsub{font:400 13px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin:16px 0 0;max-width:520px;border-top:1px solid var(--divider)}
.ks-detail div{padding:10px 0;border-bottom:1px solid var(--divider)}
.ks-detail dt{font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail dd{margin:0;font:500 14px/1.4 var(--ff-body);font-variant-numeric:tabular-nums}
.ks-track .ui-btn--block{margin-top:24px;max-width:520px}
.ks-deliv{display:flex;flex-direction:column;min-width:0}
.ks-book{margin-top:20px;display:flex}
.kph-wrap{display:flex;justify-content:center}
.kphone{width:390px;height:520px;box-sizing:border-box;border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden;display:flex;flex-direction:column;background:var(--surface)}
.kph-top{display:flex;justify-content:space-between;align-items:center;padding:14px 24px 0;font:600 13px/20px var(--ff-body)}
.kph-top .ui-display{font-size:12px;line-height:1}
.kph-body{flex:1;min-height:0;padding:16px 24px 20px;display:flex;flex-direction:column}
.kph-chip{display:flex}
.kph-time{margin:10px 0 0;font-size:var(--fs-title);line-height:var(--lh-title)}
.kph-body .ks-prog,.kph-body .ks-rider,.kph-body .ui-btn--block{max-width:none}
.kph-body .ks-prog{margin-top:18px}
.kph-body .ks-rider{margin-top:18px}
.kph-body .ui-btn--block{margin-top:auto}
.kphone .ui-tabbar{flex:none}
.kstates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;border-top:1.5px solid var(--text)}
.kstate{display:grid;grid-template-columns:116px minmax(0,1fr);align-items:center;gap:12px;min-height:56px;border-bottom:1px solid var(--divider)}
.kstate-line{font-size:var(--fs-title-s);line-height:var(--lh-title-s);color:var(--text)}
/* tokens, code */
.kqs{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:40px;align-items:start}
.kqc{display:flex;flex-direction:column;gap:20px;min-width:0}
.kq{display:grid;align-items:center;height:20px;border-bottom:1px solid var(--divider);font:400 12px/1 var(--chrome)}
.kq--3{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr);gap:0 8px}
.kq--2{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:0 8px}
.kq--h{height:auto;padding-bottom:6px;font:500 11px/1 var(--chrome);color:var(--quiet);border-bottom:1.5px solid var(--text)}
.kq .mono{font-size:11px;white-space:nowrap}
.kq .mono sup{font-size:9px;line-height:0}
.kqv{display:flex;align-items:center;gap:6px}
.kqsw{display:block;width:12px;height:12px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--divider);flex:none}
.kqg .kh{margin-bottom:8px}
.kqn{margin:8px 0 0;font:400 11px/1.4 var(--chrome);color:var(--quiet)}
.kfiles{display:flex;flex-direction:column;border-top:1.5px solid var(--text)}
.kfile{display:grid;grid-template-columns:116px minmax(0,1fr);gap:0 16px;padding:6px 0;border-bottom:1px solid var(--divider);font:400 13px/1.45 var(--ff-body);color:var(--text-soft)}
.kfile .mono{font-size:12px;color:var(--text)}
.kcode{margin:0;padding:16px 20px;border-radius:var(--r-card);background:var(--surface);color:var(--text);font:400 12px/1.7 var(--ff-mono);white-space:pre;overflow:hidden}
.kcode code{font:inherit}
/* Studio's drawing devices. Ink is the drawing line: a figure bar, numbered badges on a stem, dimension marks with end ticks, leader callouts, the key. */
.kb{--pbg:var(--sunken)}
.kpn.kfg{padding:0;overflow:hidden}
.kfg-bar{display:flex;justify-content:space-between;gap:16px;padding:9px 20px;border-bottom:1px solid var(--text);font:400 11px/14px var(--chrome);color:var(--quiet-sunken)}
.kfg-bar b{font-weight:600;color:var(--text)}
.kfg-bar span:first-child{color:var(--text)}
.kfg-in{padding:24px 20px 20px}
.an-n{position:relative;display:inline-block}
.an-n--b{display:block}
.an-b{position:absolute;top:-26px;right:6px;display:grid;place-items:center;width:18px;height:18px;border-radius:var(--r-round);background:var(--text);color:var(--surface);font:600 10px/1 var(--chrome);font-style:normal;font-variant-numeric:tabular-nums}
.an-b::after{content:"";position:absolute;left:8px;top:18px;width:1px;height:8px;background:var(--text)}
.an-n--t{display:inline-flex;align-items:center;gap:8px}
.an-n--t .an-b,.an-b--k{position:static;flex:none}
.an-n--t .an-b{order:-1}
.an-n--t .an-b::after,.an-b--k::after{display:none}
.dm-x{position:relative;display:inline-block;padding-bottom:28px}
.dm-l{position:absolute;left:0;right:0;bottom:8px;height:1px;background:var(--text)}
.dm-l::before,.dm-l::after{content:"";position:absolute;top:-4px;width:1px;height:9px;background:var(--text)}
.dm-l::before{left:0}
.dm-l::after{right:0}
.dm-l u{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:0 6px;background:var(--pbg);font:500 11px/14px var(--chrome);text-decoration:none;color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}
.dm-y{position:relative;display:inline-block;padding-right:32px}
.dm-y--b{display:block}
.dm-y>.dm-l{left:auto;top:0;bottom:0;right:8px;width:1px;height:auto}
.dm-y>.dm-l::before,.dm-y>.dm-l::after{left:-4px;right:auto;top:auto;width:9px;height:1px}
.dm-y>.dm-l::before{top:0}
.dm-y>.dm-l::after{bottom:0}
.dm--s{--pbg:var(--sunken)}
.dm--p{--pbg:var(--sunken)}
/* the key */
.kkey{display:flex;flex-direction:column;border-top:1px solid var(--text)}
.kkey li{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:0 12px;align-items:center;min-height:34px;padding:6px 0;border-bottom:1px solid var(--divider);font:400 13px/1.4 var(--chrome)}
.kkl{color:var(--text-soft)}
.kkv{text-align:right;color:var(--text)}
.kkv .mono{font-size:12px}
/* leader callouts, positioned from a static block so each lines up with its part */
.an-st{position:relative}
.an-pt{display:block}
.an-co{position:absolute;top:auto;width:148px;display:flex;flex-direction:column;gap:2px;font-style:normal;color:var(--text)}
.an-co--l{right:calc(100% + 14px);align-items:flex-end;text-align:right}
.an-co--r{left:calc(100% + 14px);align-items:flex-start;text-align:left}
.an-cn{display:flex;gap:6px;align-items:baseline;font:500 11px/14px var(--chrome)}
.an-cn em{font-style:normal;font-weight:400;color:var(--quiet-sunken)}
.an-co .mono{font-size:10px;line-height:12px;color:var(--quiet-sunken)}
.an-co::after{content:"";position:absolute;top:7px;height:1px;width:var(--rc);background:var(--text)}
.an-co::before{content:"";position:absolute;top:4px;width:7px;height:7px;border-radius:var(--r-round);background:var(--text)}
.an-co--l::after{left:calc(100% + 6px)}
.an-co--l::before{left:calc(100% + 6px + var(--rc) - 4px)}
.an-co--r::after{right:calc(100% + 6px)}
.an-co--r::before{right:calc(100% + 6px + var(--rc) - 4px)}
.an-card{position:relative;box-sizing:border-box;width:320px;max-width:100%;margin:0 auto;display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-card);font-family:var(--ff-body)}
.an-head{display:flex;justify-content:space-between;align-items:center;height:28px}
.an-q{font:400 var(--fs-label)/1 var(--ff-body);color:var(--quiet)}
.an-h{font-size:var(--fs-title);line-height:var(--lh-title);color:var(--text)}
.an-p{font:400 13px/22px var(--ff-body);color:var(--text-soft);white-space:nowrap}
.an-rider{padding-top:12px;border-top:1px solid var(--divider)}
.an-rr{display:flex;align-items:center;gap:12px}
.an-rn{flex:1;font:500 15px/1.4 var(--ff-body);color:var(--text)}
.an-cr{display:flex;gap:8px;flex-wrap:wrap}
.an-chips{margin-bottom:-4px}
/* the colour pages: the inspector */
.kcol,.kdark{display:flex;flex-direction:column;gap:20px;min-width:0}
.kdark{padding:14px;gap:14px;border-radius:var(--r-card);background:var(--surface);box-shadow:inset 0 0 0 1px var(--divider)}
.kins{border:1px solid var(--text);border-radius:var(--r-card);overflow:hidden;background:var(--surface)}
.kins-h{display:flex;justify-content:space-between;padding:8px 14px;background:var(--raised);border-bottom:1px solid var(--text);font:500 11px/14px var(--chrome);color:var(--text)}
.kins-r{display:grid;grid-template-columns:22px 104px 124px 56px 46px minmax(0,1fr);gap:0 10px;align-items:center;height:16px;padding:0 14px;border-bottom:1px solid var(--divider);font:400 11px/1 var(--chrome)}
.kins-r:last-child{border-bottom:0}
.kins-r .mono{font-size:10.5px;color:var(--text)}
.kins-r .mono:nth-of-type(1){color:var(--quiet)}
.kisw{position:relative;display:block;width:22px;height:12px;border-radius:3px;box-shadow:inset 0 0 0 1px var(--divider)}
.kisw b{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:var(--r-round)}
.kin{white-space:nowrap;color:var(--text);font-weight:500}
.kin i{font-style:normal;font-weight:400;color:var(--quiet);margin-left:4px}
.kir{font-weight:500;text-align:right;color:var(--text)}
.kiu{color:var(--quiet);white-space:nowrap}
.kiu i{font-style:normal;margin-left:4px}
.kins-r--f{height:auto;padding-top:3px;padding-bottom:3px;align-items:start}
.kins-r--f .kiu{white-space:normal}
/* type scale: live text in line boxes */
.ty-faces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--text)}
.ty-f{display:flex;flex-direction:column;gap:10px;min-width:0}
.ty-spec{display:flex;flex-direction:column;gap:1px;font:400 11px/14px var(--chrome);color:var(--quiet-sunken)}
.ty-spec b{font:500 12px/14px var(--chrome);color:var(--text)}
.ty-spec b.mono{font-size:11px}
.ty-spec .mono{font-size:11px;color:var(--text)}
.ty-box{box-sizing:content-box;display:flex;align-items:center;padding:0 14px;background:var(--surface);border-top:1px solid var(--text);border-bottom:1px solid var(--text);white-space:nowrap}
.ty-box--aa{height:72px;padding:0 16px}
.ty-aa{font-size:56px;line-height:72px;color:var(--text)}
.ty-aa--b{font-family:var(--ff-body);font-weight:500}
.ty-rows{display:flex;flex-direction:column}
.ty-r{display:grid;grid-template-columns:132px minmax(0,1fr);gap:0 16px;align-items:center}
.ty-r .ty-spec{grid-row:1;min-height:42px;justify-content:center}
.ty-r .dm-y{grid-row:1;grid-column:2}
.ty-gap{grid-column:2;grid-row:2;position:relative;display:block;margin-left:12px;width:1px;justify-self:start}
.ty-gap::before,.ty-gap::after{content:"";position:absolute;left:-4px;width:9px;height:1px;background:var(--text)}
.ty-gap::before{top:0}
.ty-gap::after{bottom:0}
.ty-gap{background:var(--text)}
.ty-gap u{position:absolute;left:24px;top:50%;transform:translate(-50%,-50%);padding:0 4px;background:var(--pbg);font:500 11px/14px var(--chrome);text-decoration:none;color:var(--text)}
/* cover: the logo in its contexts */
.pg--kcover .kb{gap:20px}
.cv-hd{display:flex;justify-content:center;align-items:flex-start;gap:16px;padding-right:32px}
.dm-v{position:relative;flex:none;width:9px;margin-top:1px}
.dm-v>.dm-l{left:4px;right:auto;top:0;bottom:0;width:1px;height:auto}
.dm-v>.dm-l::before,.dm-v>.dm-l::after{left:-4px;right:auto;top:auto;width:9px;height:1px}
.dm-v>.dm-l::before{top:0}
.dm-v>.dm-l::after{bottom:0}
.dm-v>.dm-l u{left:50%}
.cv-win{width:520px;background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-card)}
.cv-bar{display:flex;justify-content:space-between;align-items:center;height:56px;padding:0 20px;border-bottom:1px solid var(--divider)}
.cv-bar .an-n{margin-top:6px}
.cv-time{font:400 var(--fs-label)/1 var(--ff-body);color:var(--quiet)}
.cv-form{display:flex;flex-direction:column;gap:16px;padding:20px}
.cv-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cv-act{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-top:16px;border-top:1px solid var(--divider)}
.kcv-h{font-size:var(--fs-title);line-height:var(--lh-title)}
.cv-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:start}
.cv-c{display:flex;flex-direction:column;gap:10px;min-width:0}
.cv-p{display:flex;align-items:center;justify-content:center;height:268px;padding:16px}
.cv-tile{display:grid;place-items:center;width:96px;height:96px;border-radius:22px;background:var(--text)}
.cv-doc{width:200px;padding:16px;background:var(--surface);border-radius:var(--r-control);display:flex;flex-direction:column;gap:8px}
.cv-doc-h{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;margin-bottom:2px;border-bottom:1px solid var(--divider);font:600 var(--fs-label)/1 var(--ff-body);color:var(--text)}
.cv-doc-t{font:500 13px/1.35 var(--ff-body);color:var(--text)}
.cv-doc-s{font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.cv-fav{display:flex;flex-direction:column;align-items:center;gap:16px}
.cv-tab{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;background:var(--surface);border-radius:var(--r-control) var(--r-control) 0 0;font:500 12px/1 var(--ff-body);color:var(--text)}
.cv-big{display:grid;place-items:center;width:64px;height:64px;background:var(--surface);border-radius:var(--r-control)}
/* contents: a project tree, and under Foundations how to read a figure */
.kc-tree{flex:none}
.kc-toc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;align-items:start;padding-top:28px;padding-bottom:28px}
.kc-col{display:flex;flex-direction:column;gap:32px;min-width:0;margin:0}
.kc-s{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:0 8px;align-items:baseline;padding-bottom:8px;border-bottom:1px solid var(--text)}
.kc-s .t{grid-column:2;font:500 18px/1.3 var(--body);color:var(--text)}
.kc-s .n,.kc-ct{font:500 12px/1 var(--chrome);color:var(--text)}
.kc-pg{margin-left:6px;border-left:1px solid var(--text)}
.kc-pg li{position:relative;display:grid;grid-template-columns:36px minmax(0,1fr) 24px;gap:0 8px;align-items:baseline;height:36px;padding-left:20px;font:400 14px/36px var(--chrome);color:var(--text)}
.kc-pg li::before{content:"";position:absolute;left:0;top:18px;width:14px;height:1px;background:var(--text)}
.kc-leg ul{display:flex;flex-direction:column;gap:18px;margin:18px 0 0}
.kc-leg li{display:grid;grid-template-columns:48px minmax(0,1fr);gap:0 14px;align-items:start;font:400 13px/1.45 var(--ff-body);color:var(--text-soft)}
.kl-g{display:flex;align-items:center;height:19px}
.kl-d{position:relative;display:block;width:44px;height:1px;background:var(--text)}
.kl-d::before,.kl-d::after{content:"";position:absolute;top:-4px;width:1px;height:9px;background:var(--text)}
.kl-d::before{left:0}
.kl-d::after{right:0}
.kl-d u{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:0 4px;background:var(--sunken);font:500 11px/14px var(--chrome);text-decoration:none;color:var(--text)}
.kl-l{position:relative;display:block;width:40px;height:1px;background:var(--text)}
.kl-l::after{content:"";position:absolute;left:-3px;top:-3px;width:7px;height:7px;border-radius:var(--r-round);background:var(--text)}
.kl-p{display:block;width:40px;height:22px;border-radius:5px;background:var(--surface);box-shadow:0 0 0 5px var(--sunken),0 0 0 6px var(--text)}
.kc-pg .n{color:var(--quiet-sunken)}
.kc-pg .p{text-align:right}
/* component pages: stages, keys, tree */
.kpn{--ln:var(--quiet-sunken)}
.kh--g{margin-top:36px}
.k3--n{gap:40px 28px;padding-top:6px}
.kg4--n{gap:36px 16px;margin-top:36px;padding-top:6px}
.kg2--n{gap:36px 32px;margin-top:36px}
.k2--n{gap:36px 24px;padding-top:6px}
.kstack--n{gap:36px}
.kgx{margin-top:36px}
.kfg-in .kcell>.an-n{align-self:flex-start}
.kfg-in .kg:not(:first-child){margin-top:0}
.kpn .ksr{border-bottom:0}
.kpn .kmx-r,.kpn .kmx-c{border-bottom-color:var(--ln)}
.kfg-in .kmx{margin-top:6px}
.ksz--n{margin-top:6px;gap:48px}
.kfld{display:flex;align-items:flex-end;gap:10px}
.kfld>.ui-field{flex:1;min-width:0}
.dm-v{align-self:flex-end}
.kstep-n{align-self:center;font:500 12px/1.4 var(--chrome);color:var(--text)}
.kstepl{gap:30px}
.an-n--h{margin-bottom:8px}
.an-b--k{top:auto;right:auto}
.kkey-s{grid-template-columns:18px minmax(0,1fr)!important}
.kkey-s>span{color:var(--text);font:400 13px/1.45 var(--ff-body)}
.kkey-s .mono{font-size:12px}
.kkey li{border-bottom-color:var(--divider)}
.kls{position:relative;padding-left:34px}
.kls--t{padding-left:34px;padding-right:34px}
.an-b--h{position:absolute;left:0;right:auto;top:0}
.an-b--h::after{left:18px;top:8px;width:16px;height:1px}
.an-b--r{left:auto;right:0}
.an-b--r::after{left:auto;right:18px}
.an-b--in{top:6px;right:6px}
.an-b--in::after{display:none}
.ks-eta,.ks-title,.ui-topbar,.ks-book{position:relative}
.kshe{background:var(--surface);border-radius:var(--r-control);padding:20px}
.kshe .kh{color:var(--quiet)}
.kshe .ksl{border-top-color:var(--text)}
.kqs{gap:20px}
.kqg.kins{margin:0}
.kqb{padding:8px 14px 10px}
.kqc{gap:16px}
.kqg .kq{border-bottom-color:var(--divider)}
.kcb .kcode{border-radius:0;background:var(--surface)}
.kfl{margin-top:0}
.kfiles{border-top:0;padding:10px 14px 12px}
.kfile{position:relative;margin-left:16px;padding-left:20px;border-bottom:0;grid-template-columns:116px minmax(0,1fr)}
.kfile::before{content:"";position:absolute;left:0;top:0;bottom:0;width:1px;background:var(--text)}
.kfile::after{content:"";position:absolute;left:0;top:14px;width:14px;height:1px;background:var(--text)}
.kfile:last-child::before{bottom:auto;height:15px}
.kfile--d .mono{font-weight:400}
.kph-wrap{padding:4px 0 6px}
.kstate{border-bottom-color:var(--divider)}
/* compaction: every kit page has to sit inside 834 px of body */
.pg--k .kb{gap:18px}
.kb>*{flex:none}
.kfg-in{padding:20px 20px 14px}
.kkey li{min-height:26px;padding:4px 0}
.kkey-s>span{line-height:1.35}
.kh--g{margin-top:22px}
.k3--n{gap:34px 28px;padding-top:4px}
.kg4--n{margin-top:26px}
.kg2--n{margin-top:26px;gap:30px 32px}
.k2--n{gap:30px 24px}
.kstack--n{gap:30px}
.kgx{margin-top:26px}
.kstepl{gap:26px}
.kq{height:18px}
.kqg .kh{margin-bottom:4px}
.kqb{padding:6px 14px 8px}
.kfiles{padding:8px 14px 10px}
.kfile{padding-top:3px;padding-bottom:3px}
.kcode{padding:12px 16px;line-height:1.6}
.kcap--after{margin-top:6px}
.kls .ui-list{margin:0}
.kshe{padding:16px}
.kel-scrim{padding:20px 24px;margin-bottom:0}
.kel-2 .kh{margin-bottom:34px}
.kb>.kg .kstack{gap:4px}
.kb>.kg .ui-choice{min-height:32px}
.ks-clock{margin-right:26px}
.ks-eta .an-b--in,.ks-title .an-b--in,.ks-book .an-b--in{position:static;margin-left:10px;flex:none}
.ks-title{display:flex;align-items:center}
.ks-book{align-items:center}
/* finishing pass: what the first look found */
/* a disabled control has the Steel ground's own colour, so on a stage it gets a dashed outline to show its shape */
.kpn :is(.ui-btn,.ui-input,.ui-select,.ui-textarea):is(:disabled,[aria-disabled="true"],.is-disabled),.kpn .ui-choice input:disabled,.kpn .ui-segmented button:disabled{outline:1px dashed var(--quiet-sunken);outline-offset:-1px}
.kpn .ui-skeleton{background:var(--surface)}
.kpn .ui-spinner{border-color:var(--surface);border-top-color:var(--text)}
.kstep-sw{display:block}
.kgps{margin-top:2px}
/* badges stand 26 px above their part: leave that room under the figure bar */
.k2--n{padding-top:28px}
.k3--n{padding-top:24px}
.kcards{padding-top:26px}
.kemp+.kgx{margin-top:30px}
.kemp .ui-empty{padding:18px 24px}
.kb .ui-textarea{min-height:76px}
.kcol,.kdark{gap:16px}
.kdark{padding:10px;gap:12px}
.an-card{gap:8px}
.kg2--f .kstack{gap:10px}
.kstate{min-height:46px}
/* cover: the badge sits beside the logo, and the three contexts get the spare height */
.an-n--e .an-b{top:2px;left:calc(100% + 22px);right:auto!important}
.an-n--e .an-b::after{left:-16px;top:8px;width:14px;height:1px}
.pg--kcover .kb{gap:26px}
.cv-p{height:300px}
/* the sheets: each badge has a stem to its part */
.an-b--in{position:relative!important;top:auto!important;right:auto!important;margin-left:22px!important}
.an-b--in::after{display:block;left:-18px;top:8px;width:14px;height:1px}
.ui-topbar>.an-b--in{position:absolute!important;top:19px!important;right:8px!important;margin:0!important}
.ui-topbar>.an-b--in::after{left:-14px;width:12px}
/* @@next */
`;
}
