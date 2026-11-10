// Styles for uikit.js (theme 09, Blueprint). The page chrome is the drawing sheet (Manrope furniture, Brick redlines, hairline rules); every
// component is the engine's own markup under a .ui region that carries the kit's real tokens (light, or data-theme="dark" on a dark panel).
// Redline numbers in a figure are the 1x values of what is drawn; a figure drawn at 3x or 4x says so in its caption.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const tokens = `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}--accent:${ctx.roles.dark.action}}`;
  return `
/* kit: tokens and components, then the sheet furniture */
${tokens}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.mono{font-family:var(--ff-mono);font-size:11px;line-height:1.4;font-weight:400;font-variant-numeric:tabular-nums}

/* the page body is a .ui region on the plaster ground */
.pg .ui.kbody{flex:1;min-height:0;position:relative;display:flex;flex-direction:column;margin-top:18px;background:transparent;font-family:var(--chrome);font-size:13px;line-height:1.5}

/* the drawing sheet: a ruled frame with centring marks, a drawing title with its bubble, and the title block at the foot */
.pg--kit{position:relative;padding:36px var(--m) 36px}
.kframe{position:absolute;inset:16px;border:1px solid var(--ink);pointer-events:none}
.kframe i{position:absolute;background:var(--ink)}
.kframe i:nth-child(1){left:50%;top:-8px;width:1px;height:16px}
.kframe i:nth-child(2){left:50%;bottom:-8px;width:1px;height:16px}
.kframe i:nth-child(3){top:50%;left:-8px;height:1px;width:16px}
.kframe i:nth-child(4){top:50%;right:-8px;height:1px;width:16px}
.kttl{display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:1px solid var(--ink)}
.pg--kit .ttl{margin:0;font-size:26px;line-height:1.2;font-weight:600}
.kbub{display:inline-grid;place-items:center;flex:none;width:24px;height:24px;border:1px solid var(--ink);border-radius:50%;font:600 12px/1 var(--chrome);color:var(--ink)}
.kbub--sheet{width:40px;height:40px;font-size:14px}
.kscale{margin-left:auto;font:400 12px/1 var(--chrome);color:var(--quiet)}
.pg--kit .lead{margin-top:12px}
.ktb{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr) 140px 80px 108px;margin-top:20px;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.ktb-c{white-space:nowrap;padding:8px 12px;font:400 13px/18px var(--chrome);min-width:0}
.ktb-c+.ktb-c{border-left:1px solid var(--hair)}
.ktb-c:first-child{padding-left:0}
.ktb-c .k{display:block;font-size:11px;line-height:14px;color:var(--quiet)}
.ktb-c b{font-weight:600}
.kh2{display:flex;align-items:center;gap:10px;margin:14px 0 0;padding-top:8px;border-top:1px solid var(--ink);font:600 14px/1.3 var(--chrome)}
.kh2-s{margin-left:auto;font:400 11px/1.3 var(--chrome);color:var(--quiet);white-space:nowrap}
.kg{display:flex;flex-direction:column;min-width:0}
.kg-in{flex:1;min-width:0}
.kdl{display:flex;align-items:flex-start;gap:10px;margin-top:10px;min-width:0}
.kdl .kbub{margin-top:1px}
.kdl-t b{display:block;font:600 12px/1.45 var(--chrome)}
.kbub--sec{font-weight:500}
.kdm{position:relative;display:inline-block;max-width:100%}
.kdm--b{display:block}
.ksp-x{position:absolute;top:10px;height:18px;border-left:1px solid var(--ink);width:0}
.kcap{display:block;font:400 11px/1.45 var(--chrome);color:var(--quiet)}
.kcap b{display:block;font:600 12px/1.45 var(--chrome);color:var(--text)}
.kcap b.mono{font-family:var(--ff-mono);font-weight:400;font-size:11px}
.krules{margin-top:auto;border-top:1px solid var(--ink)}
.krules p{display:grid;grid-template-columns:28px minmax(0,1fr);padding:3px 0;border-top:1px solid var(--divider);font:400 13px/1.55 var(--chrome)}
.krules p.krules-h{display:block;padding:8px 0 6px;border-top:0;font:600 12px/1.3 var(--chrome)}
.krn-n{font-weight:600;font-variant-numeric:tabular-nums;color:var(--accent)}
.kfig{position:relative}
.kpanel{background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-card)}
.kpanel[data-theme="dark"]{border-color:var(--divider)}
.kna{font:400 11px/1.45 var(--chrome);color:var(--quiet)}
.kz{zoom:3}.kz4{zoom:4}
.pg .ui.kz,.pg .ui.kz4{background:transparent}

/* redline numbers inside a line: the number is the line's 1x value */
.rl>b{position:absolute;font:600 12px/12px var(--chrome);color:var(--accent);white-space:nowrap;font-variant-numeric:tabular-nums}
.rl.h>b{left:50%;bottom:8px;transform:translateX(-50%)}
.rl.h.u>b{bottom:auto;top:8px}
.rl.h.rt>b{left:100%;bottom:auto;top:50%;transform:translate(6px,-50%)}
.rl.v>b{left:10px;top:50%;transform:translateY(-50%)}
.rl.v.l>b{left:auto;right:10px}
.rl.v.r>b{left:8px}
.rn.r{position:absolute}

/* cover */
.pg--kcover{position:relative;display:flex;flex-direction:column;padding:44px var(--m)}
.kc-fig{position:relative;display:inline-block;align-self:flex-start;margin:48px 0 0 56px}
.kc-cap{margin:24px 0 0 56px;font-size:12px;color:var(--quiet)}
.kc-grow{flex:1;min-height:0}
.kc-t{margin:56px 0 0;font-family:var(--display);font-size:112px;line-height:1;font-weight:800;letter-spacing:-0.01em;color:var(--ink)}
.kc-det{display:flex;align-items:center;gap:10px;margin:40px 0 0 0}
.pg--kcover .kframe{inset:16px}
.kc-logo{padding-bottom:36px}
.kc-lg{position:relative;display:inline-block;margin-top:6px}

/* contents: the drawing register */
.kidx{border-bottom:1px solid var(--ink)}
.kidx-s,.kidx-h{display:grid;grid-template-columns:124px minmax(0,1fr);gap:0 12px;padding:8px 0;border-top:1px solid var(--ink)}
.kidx-h{padding:8px 0 6px;font:600 11px/26px var(--chrome);color:var(--quiet);border-top:0}
.kidx-h>span{line-height:20px}
.kidx-s h2{display:flex;align-items:flex-start;gap:10px;font:600 14px/24px var(--chrome)}
.kidx-s h2 .kbub{margin-top:0}
.kidx-s ol,.kidx-h ol{list-style:none}
.kidx-s li,.kidx-h li{display:grid;grid-template-columns:32px 150px minmax(0,1fr) 92px;gap:0 10px;font:400 12px/24px var(--chrome);white-space:nowrap}
.kidx-s li+li{border-top:1px solid var(--divider)}
.kidx-s li i{font-style:normal;font-variant-numeric:tabular-nums;font-size:13px;font-weight:600;color:var(--accent)}
.kidx-s li b{font-weight:500;font-size:13px}
.kidx-s li span{color:var(--quiet);overflow:hidden;text-overflow:clip}
.kidx-s li em{font-style:normal;color:var(--text);font-variant-numeric:tabular-nums}
.kidx-h li{font:600 11px/20px var(--chrome);color:var(--quiet)}

/* colour: the elevation and the finishes schedule */
.kelevw{margin:0 0 12px}
.kelev{display:block;width:100%;height:auto}
.kelev text{font:600 11px/1 var(--chrome);font-variant-numeric:tabular-nums}
.ksch{border-top:1px solid var(--ink)}
.ksch-r{display:grid;grid-template-columns:44px 96px 108px 52px 96px 156px minmax(0,1fr);gap:0 4px;align-items:center;height:22px;border-bottom:1px solid var(--divider);font:500 12px/1 var(--chrome);white-space:nowrap}
.ksch-r .mono{color:var(--text)}
.ksch-h{height:26px;font:600 11px/1 var(--chrome);color:var(--quiet)}
.ksch-k{display:flex;align-items:center;gap:5px;font-weight:600;color:var(--accent);font-variant-numeric:tabular-nums}
.ksch-k i{flex:none;width:11px;height:11px;box-shadow:inset 0 0 0 1px var(--text)}
.ksch-q{display:flex;align-items:baseline;gap:6px;font-weight:400;color:var(--quiet)}
.ksch-q b{font:600 12px/1 var(--chrome);color:var(--text);font-variant-numeric:tabular-nums}
.krr b{display:block;font:600 12px/16px var(--chrome)}
.krr span{display:block;font:400 11px/14px var(--chrome);color:var(--quiet)}
.kpanel .mono{color:var(--text)}

/* type scale: a lettering sheet. Guides are drawn from the font's own metrics; redlines print the true sizes */
.ktype{border-top:1px solid var(--ink)}
.ktl{display:grid;grid-template-columns:160px minmax(0,1fr) 100px;gap:0 16px;align-items:start;padding:20px 0;border-bottom:1px solid var(--divider)}
.ktl-d{position:relative}
.ktl-s{min-width:0}
.ktl-s .kcap{margin-top:8px}
.ktl-art{position:relative}
.ktl-t{position:relative}
.ktl-g{position:absolute;left:0;right:0;height:0;border-top:1px dashed var(--quiet)}
.ktl-g--b{border-top:1px solid var(--ink)}
.ktl-m b{display:block;font:600 12px/16px var(--chrome)}
.ktl-m .mono{display:block;color:var(--quiet)}
.ktl-key{display:flex;gap:24px;margin-bottom:12px;font:400 11px/1 var(--chrome);color:var(--quiet)}
.ktl-key span{display:flex;align-items:center;gap:8px}
.ktl-key .ktl-g,.ktl-key .rl{position:static;display:block;width:28px}
.ktl-key .rl.h::before,.ktl-key .rl.h::after{top:-3px;height:6px}

/* spacing */
.ksp{border-top:1px solid var(--ink)}
.ksp-r{display:grid;grid-template-columns:60px 396px minmax(0,1fr);gap:0 12px;align-items:center;height:38px;border-bottom:1px solid var(--divider)}
.ksp-r .kfig{height:38px}
.ksp-r .mono{color:var(--quiet)}
.ksp-r .kcap{padding-left:12px}
.kpanel-r{background:var(--surface);border-radius:var(--r-card);box-shadow:0 0 0 1px var(--divider)}
.kmcard{position:relative;width:440px;height:350px;padding:32px;display:flex;flex-direction:column}
.kmcard>.kmt{font:800 30px/30px var(--ff-display);margin-bottom:24px}
.kmcard>.ui-field+.ui-field{margin-top:20px}
.kmcard>.ui-btn{margin-top:32px}
.kmeas{position:absolute;left:520px;top:0;width:162px}
.kmeas li{list-style:none;display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid var(--divider);font:400 12px/16px var(--chrome)}
.kmeas li b{font-weight:600;font-variant-numeric:tabular-nums}
/* shared grids */
.k2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px}
.k3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.kgap{height:22px;flex:none}
.kstack{display:flex;flex-direction:column;gap:20px;min-width:0}
.kcap--after{margin-top:8px}
.kpad{padding:16px}
.kcol{border-top:1px solid var(--ink);padding-top:10px;min-width:0}

/* radii and borders: the real control, clipped at 4x */
.kcropw{position:relative;width:132px;height:84px;margin:30px 0 0 36px}
.kcrop{position:absolute;inset:0;overflow:hidden;background:var(--surface);box-shadow:0 0 0 1px var(--divider)}
.kcz{position:absolute;left:0;top:0;padding:6px;background:transparent}
.kreal{margin-top:16px;min-width:0}

/* elevation */
.kstep-sw{display:flex;align-items:flex-end;height:80px;padding:10px 12px;margin-bottom:8px;border-radius:var(--r-control);box-shadow:inset 0 0 0 1px var(--divider);font:600 13px/1 var(--chrome);color:var(--text)}
.kscrim{border-radius:var(--r-card);padding:24px}

/* states: a grid of the real controls; each state a lettered detail, a dimension column for the control's own size */
.kmx{display:grid;grid-template-columns:78px 44px repeat(5,minmax(0,1fr));border-top:1px solid var(--ink)}
.kmx>*{min-width:0;border-bottom:1px solid var(--divider)}
.kmx-h{padding:8px 8px 8px 0}
.kmx-hd{display:grid;grid-template-columns:24px minmax(0,1fr);gap:2px 8px;align-content:start}
.kmx-hd b{font:600 12px/24px var(--chrome)}
.kmx-hd .kcap{grid-column:1/-1}
.kmx-r{padding:8px 6px 8px 0;font:600 12px/16px var(--chrome)}
.kmx-r .kcap{margin-top:2px;font-weight:400}
.kmx-d{position:relative}
.kmx-c{display:flex;align-items:flex-start;padding:8px 6px 8px 0}
.kmx-c .ui-field{width:100%}
.kmx-c .ui-btn{padding:0 var(--sp-5)}
.kmx-c .ui-btn--quiet{padding:0 var(--sp-3)}
.kmx-c .ui-choice{gap:8px;font-size:14px}

/* buttons at 4x */
.kb4{position:relative;display:inline-block;align-self:flex-start;margin:28px 0 0 56px}
.kb4 .kz{display:block}
.kb4-c{margin:12px 0 0 56px}
.kspec{display:grid;grid-template-columns:repeat(5,auto);justify-content:space-between;gap:0 16px;margin-top:8px;border-top:1px solid var(--ink);padding-top:6px}
.kspec-c b{display:block;font:600 13px/18px var(--chrome)}
.kvars{row-gap:0}
.kvar .kdl{margin-top:16px;margin-bottom:16px}
.kvar{display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-width:0}

/* choices: sizes at 3x, segmented */
.kcz3{display:flex;gap:0 72px;padding:0 0 28px 36px}
.kseg .ui-segmented{max-width:100%}
.kpx{width:0}

/* cards, navigation, lists */
.kcards{margin-top:30px;align-items:start}
.kcard-act{display:flex;gap:8px;margin-top:10px}
.kstats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ktop{border:1px solid var(--divider);border-radius:var(--r-card)}
.kwm{font-size:20px;line-height:1}
.kdim{margin-right:0}
.ui-card__media.photo-slot{display:block}

/* status, feedback, dialog */
.kb4--chip{margin-top:34px}
.kstl{border-top:1px solid var(--ink)}
.kst{display:grid;grid-template-columns:132px 132px 84px 84px minmax(0,1fr);gap:0 14px;align-items:center;min-height:52px;border-bottom:1px solid var(--divider)}
.kst--h{min-height:32px;font:600 11px/1 var(--chrome);color:var(--quiet)}
.kdk{display:flex;align-items:center;align-self:stretch;justify-self:stretch;box-sizing:border-box;margin-bottom:-1px;padding:0 10px;background:var(--surface);border-bottom:1px solid var(--divider)}
.kalerts{display:flex;flex-direction:column;gap:8px}
.kload{display:flex;align-items:center;gap:20px}
.kskel{display:flex;flex-direction:column;gap:10px}
.kscrim2{border-radius:var(--r-card);padding:24px}
.kdlg{display:grid;grid-template-columns:488px minmax(0,1fr);gap:0 48px;align-items:start}
.kdlspec{padding-top:28px}
.kdlspec>div{padding:5px 0;border-top:1px solid var(--divider)}
.kdlspec>div:first-child{border-top:1px solid var(--ink)}
.kdlspec b{display:block;font:600 13px/18px var(--chrome)}
/* table: the selected row's bar at 4x, and the state keys */
.kbarw{width:156px;height:96px;margin:30px 0 0 12px}
.kbarc{position:absolute;inset:0;overflow:hidden;background:var(--surface);box-shadow:0 0 0 1px var(--divider)}
.kbarc .ui{width:39px;background:transparent}
.kkeys{display:flex;flex-direction:column;gap:14px;padding-top:30px}
.ktable{overflow:hidden}
.ktable .ui-table{table-layout:fixed}
.ktable td{white-space:nowrap;overflow:hidden}
.ktable th:nth-child(1){width:200px}.ktable th:nth-child(2){width:276px}.ktable th:nth-child(3){width:124px}

/* empty */
.kemp{align-items:start;gap:0 56px}
.kemp>div{display:flex;flex-direction:column;min-width:0}
.kemp .ui-empty__title{font-size:var(--fs-title);line-height:var(--lh-title)}
.ksteps{list-style:none;display:flex;flex-direction:column;gap:10px;margin:4px 0 8px}
.ksteps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-label);line-height:1.4;max-width:30ch}
.ksteps li span{display:grid;place-items:center;flex:none;width:24px;height:24px;border-radius:var(--r-round);background:var(--surface);box-shadow:inset 0 0 0 var(--w-control) var(--text);font:600 12px/1 var(--ff-body);font-variant-numeric:tabular-nums}
.kemp-list{border-bottom:1px solid var(--divider)}
.kemp-li{padding:16px 0}

/* the product screen, desktop and phone */
.kscr{margin-top:20px}
.ktag{position:absolute;display:grid;place-items:center;width:18px;height:18px;margin:-9px 0 0 -9px;border:1px solid var(--accent);border-radius:50%;background:var(--ground);color:var(--accent);font:600 11px/1 var(--chrome);font-style:normal;font-variant-numeric:tabular-nums}
.ktag--s{position:static;flex:none;margin:0}
.kkey{display:flex;justify-content:space-between;gap:8px;margin-top:10px;font:400 11px/16px var(--chrome);color:var(--soft)}
.kkey span{display:flex;align-items:center;gap:6px;white-space:nowrap}
.kkey--v{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin-top:20px;padding-top:10px;border-top:1px solid var(--ink)}
.pg .ui.kscreen{display:flex;flex-direction:column;width:100%;box-sizing:border-box;border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden;background:var(--surface);color:var(--text)}
.kscreen .ui-topbar{flex:none}
.ks-clock{color:var(--quiet);font-size:var(--fs-label)}
.ks-main{display:flex;flex-direction:column;gap:20px;padding:20px 28px 24px}
.ks-top{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:0 32px;align-items:start}
.ks-title{font:500 var(--fs-label)/1 var(--ff-body);color:var(--quiet);margin-bottom:14px}
.ks-eta{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ks-time{font-size:var(--fs-title);line-height:var(--lh-title);margin:0;color:var(--text)}
.ks-pickup{margin-top:8px;color:var(--text-soft);font-size:var(--fs-body);line-height:1.5}
.ks-prog{margin-top:20px}
.ks-route{display:flex;justify-content:space-between;margin-top:8px;font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ks-rider{display:flex;align-items:center;gap:12px;padding-bottom:12px}
.ks-rmain{flex:1;min-width:0}
.ks-rname{font:500 15px/1.4 var(--ff-body)}
.ks-rsub{font:400 13px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;border-top:1px solid var(--divider)}
.ks-detail div{padding:10px 0;border-bottom:1px solid var(--divider)}
.ks-detail dt{font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail dd{font:500 14px/1.4 var(--ff-body);font-variant-numeric:tabular-nums}
.ks-side .ui-btn--block{margin-top:16px}
.ks-jh{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.ks-jh .ks-title{margin:0}
.kphw{width:390px}
.pg .ui.kphone{width:390px;height:580px;box-sizing:border-box;border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden;display:flex;flex-direction:column;background:var(--surface);color:var(--text)}
.kph-top{display:flex;justify-content:space-between;align-items:center;padding:16px 24px 0;font:600 13px/20px var(--ff-body)}
.kph-top .ui-display{font-size:12px;line-height:1}
.kph-body{flex:1;min-height:0;padding:20px 24px;display:flex;flex-direction:column}
.kph-chip{display:flex}
.kph-time{margin:12px 0 0;font-size:var(--fs-title);line-height:var(--lh-title)}
.kph-body .ks-rider{margin-top:18px;padding-bottom:12px}
.kph-body .ks-detail{margin-bottom:16px}
.kph-body .ui-btn--block{margin-top:auto}
.kphone .ui-tabbar{flex:none}
.kmob{display:grid;grid-template-columns:390px minmax(0,1fr);gap:0 48px;align-items:start}
.kmob .kphw{margin-top:36px}
.kmob .kg{padding-top:0}
.kstates{list-style:none;border-top:1px solid var(--ink)}
.kstate{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:14px 0;border-bottom:1px solid var(--divider)}
.kstate-line{font-size:var(--fs-title-s);line-height:var(--lh-title-s);color:var(--text)}
.kstate-line.is-final{font-size:var(--fs-headline);line-height:var(--lh-headline)}

/* tokens */
.ktokens{display:grid;grid-template-columns:396px minmax(0,1fr);gap:0 24px;align-items:start}
.ktg{margin-bottom:10px}
.ktg>.kh2{margin:0 0 2px;padding:0 0 4px;border-top:0;border-bottom:1px solid var(--ink);font:600 13px/1.3 var(--chrome)}
.ktk{display:grid;grid-template-columns:28px 156px 94px 94px;gap:0 8px;align-items:center;min-height:17px;border-bottom:1px solid var(--divider);font:400 11px/1 var(--chrome)}
.ktk--2{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}
.ktk--d{grid-template-columns:96px 52px minmax(0,1fr)}
.ktk--t{grid-template-columns:64px 90px minmax(0,1fr)}
.ktk--f{grid-template-columns:88px minmax(0,1fr) 40px}
.kckey{font:600 11px/1 var(--chrome);color:var(--accent);font-variant-numeric:tabular-nums}
.ktd-bar{display:block;height:8px;background:var(--text)}
.ktd-box{display:block;box-sizing:border-box;width:28px;height:16px;border:1px solid var(--text)}
.ktd-rule{display:block;width:48px;height:0;border-top:1px solid var(--text)}
.ktd-t,.ktd-f{display:block;color:var(--text);white-space:nowrap}
.ktd-f{font-size:16px;line-height:18px}
.ktpal-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.ktpal-g .ktk--2{grid-template-columns:minmax(0,1fr) 64px}
.ktk--h{grid-template-columns:28px 156px 94px 94px}
.ktk--h{height:auto;padding-bottom:4px;font:600 11px/1 var(--chrome);color:var(--quiet)}
.ktk .mono{white-space:nowrap}
.ktk>.mono:first-child{color:var(--text)}
.ktv{display:flex;align-items:center;gap:6px;min-width:0}
.ktsw{flex:none;width:12px;height:12px;box-shadow:inset 0 0 0 1px var(--divider)}

/* code */
.kfh{display:grid;grid-template-columns:34px 112px minmax(0,1fr) 112px;gap:0 12px;padding:8px 0 6px;border-top:1px solid var(--ink);font:600 11px/1 var(--chrome);color:var(--quiet)}
.kfile{display:grid;grid-template-columns:34px 112px minmax(0,1fr) 112px;gap:0 12px;align-items:baseline;padding:6px 0;border-top:1px solid var(--divider);font:400 12px/1.5 var(--chrome);color:var(--soft)}
.kfile .mono{color:var(--text)}
.kfm{font-weight:600;font-variant-numeric:tabular-nums;color:var(--accent)}
.kfs{color:var(--quiet);font-variant-numeric:tabular-nums}
.kfiles{border-bottom:1px solid var(--ink)}
.kcodes{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:0 56px;align-items:start}
.pg pre.ui.kcode{margin:0;padding:14px 16px;border-radius:var(--r-card);background:var(--surface);color:var(--text);font:400 11px/1.7 var(--ff-mono);white-space:pre;overflow:hidden}
.kcode code{font:inherit}
/* @@END css */
`;
}
