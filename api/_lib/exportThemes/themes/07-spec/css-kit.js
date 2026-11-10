// Styles for theme 07, UI kit run (K). The kit's tokens and the engine's components sit under .pg .ui (light by default, data-theme="dark"
// for dark panels); the page chrome keeps the guidelines' classes from index.js (.hd, .t, .lede, .st, .foot, .notes, .toc2, .meta).
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  // the page's own variables follow the region, so a dark panel turns the ledger rules and quiet text with it
  const bridge = '--ink:var(--text);--hair:var(--divider);--soft:var(--text-soft);--rule:color-mix(in srgb,var(--text) 24%,var(--surface));';
  return `
/* kit: tokens, then the engine's components */
.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}${bridge}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}

/* the work area of a kit page */
.pg--k .kb{margin-top:20px;display:flex;flex-direction:column;font:400 13px/1.45 var(--chrome);color:var(--ink)}
.kq{color:var(--quiet)}
.st .kq{font-size:12px}
.pg--k .hd{margin-bottom:32px}
.kr li{display:grid;grid-template-columns:56px minmax(0,1fr);padding:7px 0;border-top:1px solid var(--hair);font-size:13px;line-height:1.55}
.kr li:last-child{border-bottom:1px solid var(--hair)}
.kr li span:first-child{color:var(--quiet)}
.krh{margin-top:36px}
.kf{display:flex;flex-direction:column;gap:10px;min-width:0}

/* dimension lines, positioned by the page */
.kd-h,.kd-v{position:absolute;border:0 solid var(--mark)}
.kd-h{height:0;border-top-width:1px}
.kd-h::before,.kd-h::after{content:'';position:absolute;top:-4px;height:7px;border-left:1px solid var(--mark)}
.kd-h::before{left:0}.kd-h::after{right:-1px}
.kd-v{width:0;border-left-width:1px}
.kd-v::before,.kd-v::after{content:'';position:absolute;left:-4px;width:7px;border-top:1px solid var(--mark)}
.kd-v::before{top:0}.kd-v::after{bottom:-1px}
.kd-n{position:absolute;font:600 12px/1 var(--chrome);color:var(--mark);white-space:nowrap}

/* cover: the standard's first page, document control numbered like clauses */
.pg--kcover{position:relative}
.kk-bar{height:12px;background:var(--accent);margin:-48px -56px 36px}
.kk-logo{margin-top:8px}
.kk-name{font-size:56px;line-height:0.95;color:var(--ink)}
.kk-main{margin-top:auto;padding-left:20px;border-left:6px solid var(--accent)}
.kk-n{font-size:13px;color:var(--quiet);margin-bottom:10px}
.kk-t{font-size:52px;line-height:1.05;margin:0 0 14px;max-width:560px}
.kk-h{margin:48px 0 8px}
.kk-ctl{margin-bottom:32px}
.kk-ctl li{display:grid;grid-template-columns:40px 120px minmax(0,1fr);padding:9px 0;border-top:1px solid var(--hair);font-size:13px}
.kk-ctl li:last-child{border-bottom:1px solid var(--hair)}
.kk-ctl li>span:not(:last-child){color:var(--quiet)}
.kk-chip{display:inline-block;width:20px;height:12px;margin-right:8px;border-radius:2px;background:var(--accent);vertical-align:-1px}
.kct td{padding:4px 10px 4px 0;font-size:13px}
.kct tr.h td{font-weight:600;border-bottom:1px solid var(--ink);padding-top:16px}
.kct tr.h:first-child td{padding-top:12px}
.kct td:first-child{color:var(--quiet);font-variant-numeric:tabular-nums}
.kct tr.h td:first-child{color:var(--ink)}
.kct .r{text-align:right;font-variant-numeric:tabular-nums}

/* the clause frame: scope, a table beside a figure, requirements */
.ksc{display:grid;grid-template-columns:56px minmax(0,1fr);margin-top:14px;font-size:14px;line-height:1.55;max-width:640px}
.ksc .num{color:var(--quiet);font-size:13px;padding-top:1px}
.ksc p{color:var(--soft)}
.ksc b{color:var(--ink);font-weight:600}
.kz{display:grid;grid-template-columns:minmax(0,1fr) var(--fw);gap:0 28px;align-items:start}
.kz--flip{grid-template-columns:var(--fw) minmax(0,1fr)}
.kz-a,.kz-b{display:flex;flex-direction:column;gap:22px;min-width:0}
.ktb{min-width:0}
.kz-l{font-size:12px;font-weight:600;line-height:1.3;margin-bottom:8px;color:var(--ink)}
.kn{color:var(--quiet);font-weight:600}
.kz-l .kn{margin-right:4px}
.cap b .kn{margin-right:2px}

/* colour: definitions, then the conformance matrix */
.kdf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px}
.kdf ol{display:flex;flex-direction:column}
.kdf li{display:grid;grid-template-columns:36px 20px minmax(0,1fr);gap:0 10px;padding:4px 0 4px;border-top:1px solid var(--hair);font-size:11.5px;line-height:1.35}
.kdf li:last-child{border-bottom:1px solid var(--hair)}
.kdf .num{color:var(--quiet)}
.kdt b{font-weight:600}
.kdt .m{color:var(--soft)}
.kdc{display:block;width:20px;height:14px;margin-top:2px;border-radius:2px}
.kdc.is-ring,.kmc{box-shadow:inset 0 0 0 1px var(--rule)}
.kdk{font-family:var(--chrome);background:var(--surface);color:var(--text);border-radius:var(--rc);padding:14px 18px 12px}
.kdk .ksgap{height:16px}
.pg--k .kdk{margin:0 -18px}
.kdk .st th{border-bottom-color:var(--text)}
.kmx{table-layout:fixed;font-size:11px}
.kmx th{font-size:10.5px;font-weight:500;color:var(--soft);padding:0 2px 6px 0;vertical-align:bottom;line-height:1.2}
.kmx thead th .kmc{display:block;margin-bottom:4px}
.kmx tbody th{text-align:left;font-size:11px;color:var(--ink);padding:0 4px 0 0;border-bottom:1px solid var(--hair);height:21px;white-space:nowrap}
.kmx .kmx-c{width:104px;vertical-align:bottom}
.kmc{display:inline-block;width:12px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}
.kmx .kx{height:21px;padding:0;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--ink)}
.kmx .kx span{font-weight:500}
.kmx .kx i{font-style:normal;font-size:9.5px;color:var(--soft);margin-left:3px}
.kmx .kx.is-low{color:var(--soft)}
.kx.is-used{outline:1.5px solid var(--ink);outline-offset:-2px}
.kmx-key{margin-top:10px;font-size:11.5px;line-height:1.5;color:var(--soft)}
.kmx-key .kx{display:inline-block;padding:1px 6px;margin-right:2px;color:var(--ink)}
.kmx-key b{font-weight:600;color:var(--ink)}

/* type scale */
.kt td{padding:10px 8px 10px 0;vertical-align:top;font-size:12px}
.kt .kts{display:block;color:var(--text);margin-top:4px}
.kt-k{display:block}
.kt .num{padding-top:2px;white-space:nowrap}

/* spacing */
.ksp-wrap{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:0 40px;align-items:start}
.ksp td{padding:9px 10px 9px 0;vertical-align:middle}
.ksq{display:block;background:var(--ink)}
.kgrp{position:relative;display:flex;flex-direction:column;gap:var(--bt);margin-left:44px}
.kgp{display:flex;flex-direction:column;gap:var(--in)}
.kgp i{display:block;width:132px;height:20px;border-radius:4px;background:var(--panel)}
/* radii and borders */
.kh{margin:0 0 10px}
.krb-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 32px;align-items:start;margin-bottom:36px}
.krb-grid .h3{margin-top:0}
.krt td{padding:10px 8px 10px 0;vertical-align:middle}
.krd{display:block;width:64px;height:40px;border:var(--w-control) solid var(--text);background:var(--surface)}
.kbl{display:block;width:64px;height:0;border:0 solid var(--text)}
.krow{display:flex;flex-wrap:wrap;align-items:center;gap:16px 20px;padding:24px;border-radius:var(--rc);background:var(--sunken)}
.krow .ui-stat{min-width:104px}

/* elevation */
.kelt td{padding:12px 10px 12px 0;vertical-align:middle}
.kel{display:grid;place-items:center;width:64px;height:48px;border-radius:var(--rc);background:var(--sunken)}
.kel i{display:block;width:44px;height:28px;border-radius:var(--rc)}

.kscene{position:relative;display:flex;flex-direction:column;align-items:stretch;padding:16px;border-radius:var(--rc);background:var(--sunken);}
.kscene>.ui-card{width:100%}
.kscene__f{margin:20px 0 0 24px;width:auto;position:relative;isolation:isolate;z-index:1}
.kscene .ui-dialog{padding:20px}

/* states */
.kst td{padding:10px 8px 10px 0;vertical-align:middle}
.kst th{padding-bottom:8px}
.kst .ui-btn{max-width:100%}
.kst .ui-input{padding:0 10px}
.ksgap{height:22px}
/* buttons */
.kbtop{display:grid;grid-template-columns:332px minmax(0,1fr);gap:0 32px;align-items:start}
.kbx-wrap{padding:30px 0 34px 56px;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.kbx{position:relative;display:inline-block}
.kbx-b{display:inline-flex;align-items:center;height:88px;padding:0 40px;border-radius:calc(var(--r-button)*2);background:var(--action);color:var(--action-label);font:var(--fw-control) calc(var(--fs-control)*2)/1 var(--ff-body);white-space:nowrap}
.kbt td{padding:3px 8px 3px 0;vertical-align:middle}
.kbt .r{text-align:right}
.kvg{display:flex;flex-direction:column;gap:14px;padding-top:0}
.kv{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
/* inputs and choices */
.kfs{display:flex;flex-direction:column;gap:14px}
.kfg .ui-textarea{height:52px;min-height:0}
.kfg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 32px;align-items:start}
.kfld{display:flex;flex-direction:column;gap:8px}
.kspec td{padding:5px 8px 5px 0;vertical-align:baseline}
.kseg{display:flex;gap:24px;flex-wrap:wrap}
.kuse{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.kuse>div{display:flex;flex-direction:column}
/* cards, navigation, lists */
.kcg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:stretch}
.kcg>.kf{height:100%}
.kcg .ui-card{flex:1}
.kca{margin-top:10px}
.kst2{display:flex;gap:16px}
.kst2 .ui-stat{min-width:180px}
.knv2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px 32px;align-items:start}
.knv3{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px 40px;align-items:start}
.kphn{width:320px;border:1px solid var(--divider);border-radius:var(--rc);overflow:hidden}
.kclock{color:var(--quiet);font-size:var(--fs-label)}
/* status, feedback, dialog */
.kstat td{padding:8px 8px 8px 0;vertical-align:middle}
.kstat .r{text-align:right}
.kchips{display:flex;flex-wrap:wrap;gap:8px;padding:16px}
.krow2{display:flex;align-items:center;gap:12px;padding:16px 0}
.kfg2{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:24px;align-items:start}
.kals{display:flex;flex-direction:column;gap:16px}
.kal{display:flex;flex-direction:column;gap:6px}
.kfb3{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:24px 32px;align-items:start}
.kcol{display:flex;flex-direction:column;gap:20px}
.kld{display:flex;gap:16px;align-items:center;padding:12px 0}
.kld-s{flex:1;display:flex;flex-direction:column;gap:10px}
.kst3{border-radius:var(--rc)}
/* table, empty */
.kut{table-layout:fixed}
.kut th:nth-child(1){width:34%}.kut th:nth-child(3){width:14%}.kut th:nth-child(4){width:24%}
.kut td{font-size:var(--fs-label)}
.kut td:first-child{font-weight:500}
.kut .is-num{padding-right:20px}
.ksort{gap:4px}
.ksort svg{transform:rotate(90deg)}
.kfg .ui-empty{height:100%;padding:24px}
.kfg .ui-empty__title{font-size:var(--fs-title)}
/* product screens */
.ksz{width:682px;overflow:hidden;border:1px solid var(--divider);border-radius:var(--rc)}
.ksz .kscreen{zoom:0.758;width:900px;display:flex;flex-direction:column}
.kscreen .ui-topbar{flex:none}
.ks-clock{color:var(--quiet);font-size:var(--fs-label)}
.ks-main{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:32px;padding:28px 32px;background:var(--surface)}
.ks-title{font:500 var(--fs-label)/1 var(--ff-body);color:var(--quiet);margin-bottom:14px}
.ks-eta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.ks-time{font-size:var(--fs-headline);line-height:var(--lh-headline);margin:0;color:var(--text)}
.ks-pickup{margin-top:8px;color:var(--text-soft);font-size:var(--fs-body);line-height:1.5}
.ks-prog{margin-top:22px}
.ks-route{display:flex;justify-content:space-between;margin-top:8px;font:400 14px/1.4 var(--ff-body);color:var(--quiet)}
.ks-rider{display:flex;align-items:center;gap:12px;margin-top:22px;padding-top:16px;border-top:1px solid var(--divider)}
.ks-rmain{flex:1;min-width:0}
.ks-rname{font:500 16px/1.4 var(--ff-body)}
.ks-rsub{font:400 14px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:12px;border-top:1px solid var(--divider)}
.ks-detail div{padding:10px 0;border-bottom:1px solid var(--divider)}
.ks-detail dt{font:400 14px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail dd{font:500 16px/1.4 var(--ff-body);font-variant-numeric:tabular-nums}
.ks-track .ui-btn--block{margin-top:16px}
.ks-deliv{display:flex;flex-direction:column;min-width:0}
.ks-book{margin-top:20px;display:flex}
.kparts td{padding:8px 10px 8px 0;vertical-align:baseline}
.kmob{display:grid;grid-template-columns:390px minmax(0,1fr);gap:0 32px;align-items:start}
.kphone{position:relative;width:390px;height:660px;border:1px solid var(--divider);border-radius:var(--rc);overflow:hidden;display:flex;flex-direction:column;background:var(--surface)}
.kph-top{display:flex;justify-content:space-between;align-items:center;padding:16px 24px 0;font:500 14px/20px var(--ff-body)}
.kph-top .ui-display{font-size:14px;line-height:1}
.kph-body{flex:1;min-height:0;padding:20px 24px;display:flex;flex-direction:column}
.kph-chip{display:flex}
.kph-time{margin:12px 0 0;font-size:var(--fs-title);line-height:var(--lh-title)}
.kph-body .ui-btn--block{margin-top:auto}
.kphone .ui-tabbar{flex:none}
.kpn{position:absolute;right:3px;display:grid;place-items:center;width:16px;height:16px;border:1px solid var(--mark);border-radius:50%;font:600 10px/1 var(--chrome);font-style:normal;color:var(--mark);background:var(--surface);z-index:1}
.knotes{display:flex;flex-direction:column;font-size:13px;line-height:1.5;padding-top:4px}
.knotes li{display:grid;grid-template-columns:24px minmax(0,1fr);padding:10px 0;border-top:1px solid var(--hair)}
.knotes li:last-child{border-bottom:1px solid var(--hair)}
.knotes b{display:block;font-weight:600}
/* tokens, code */
.ktg{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:0 28px;align-items:start}
.ktr{display:flex;flex-direction:column;gap:22px}
.ktk td{padding:3px 8px 3px 0;vertical-align:middle;line-height:1.3}
.ktk th{padding-bottom:5px}
.ktw{display:inline-block;width:10px;height:10px;margin-right:6px;border-radius:2px;vertical-align:-1px;box-shadow:inset 0 0 0 1px var(--rule)}
.kcd td{padding:6px 8px 6px 0;vertical-align:baseline}
.kpre{margin:0;padding:16px 20px;border-radius:var(--r);background:var(--panel);overflow:hidden}
.kpre code{font:400 12px/1.7 var(--mono);color:var(--ink);white-space:pre}
.kb2{display:block;font-weight:600}
.kb3{display:block;font-weight:400}
.kz-b .krow{flex-direction:column;align-items:flex-start;padding:16px}
/* the second-generation pages: figures that sit in the narrow column */
.kcs{display:flex;flex-direction:column;gap:14px}
.kcs .kst2{flex-direction:column;gap:10px}
.kcs .kst2 .ui-stat{min-width:0}
.kz-b .kuse{grid-template-columns:1fr;gap:4px}
.kz-b .kphn{width:100%}
.kz .kdk{margin:0}
.kz-b .kchips{padding:12px 14px}
.kz-b .krow2{padding:4px 0 0}
.kz-b .kld{padding:0}
.kz-b .ui-empty{padding:24px}
.kz-b .ui-empty__title{font-size:var(--fs-title);line-height:var(--lh-title)}
.kz .ui-tabbar a{font-size:12px}
.kz-b .ui-scrim.kst3,.kz-a .ui-scrim.kst3{padding:20px 16px}
.kb2+.kb3,.kb3{margin-top:1px}
.kz-b .kscene .ui-dialog{padding:16px}
/* @@END css */
`;
}
