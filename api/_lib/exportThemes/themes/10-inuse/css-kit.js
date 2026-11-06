// Styles for uikit.js (theme 10, In use). Appended to css() in index.js. Page chrome reads the .pg custom properties from index.js
// (--ink, --soft, --quiet, --ground, --float ...); everything inside a .ui region reads the kit's own tokens (light by default,
// data-theme="dark" on the dark pages). Classes start k. Add new rules above the end marker.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const g = tokenGroups(ctx), D = ctx.roles.dark;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const deep = ctx.colours.find((c) => c.role === 'text').hex;
  const scr = colourMap(ctx, 'light').scrim.replace('#', ''), scrim = [0, 2, 4].map((i) => parseInt(scr.slice(i, i + 2), 16)).join(',');
  const tokens = `.pg{${decl(g.font)}--deep:${deep};}
.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
.pg.pg--kdark{--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--ground:${D.surface};--card:${D.raised};--panel:${D.sunken};--hair:${D.divider}}`;
  return `
/* kit: tokens and components, scoped under .pg */
${tokens}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd,figure,pre){margin:0;padding:0}
.mono{font-family:var(--ff-mono);font-size:0.92em;font-variant-numeric:tabular-nums}

/* the kit page: running head, title, lead, then a .ui body. Every page is phones on a sunken stage with a numbered key */
.pg--k{padding:48px var(--m) 56px}
.pg--k .ttl{margin-top:24px}
.klead{margin-top:8px;max-width:600px;font-size:14px;line-height:1.55;color:var(--quiet)}
.klead .mono{font-size:12px;color:var(--ink)}
.kb{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px;margin-top:20px;background:transparent}
.kb>*{flex:none}
.kcap{display:block;font:400 13px/1.5 var(--chrome);color:var(--quiet)}
.kcap b{display:block;font-weight:600;color:var(--text)}
.kcap .mono{font-size:12px}
.kcap--cap{margin-top:12px}
.kh{font:600 13px/20px var(--chrome);color:var(--text);margin-bottom:8px}
.kh--in{margin-bottom:0}
.krow2{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px}
.k2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 24px;align-items:start}
.kg{min-width:0}

/* the stage and the phone */
.kstage{display:flex;gap:24px;justify-content:center;align-items:stretch;padding:20px;border-radius:24px;background:var(--sunken);min-width:0}
.kstage--eq{align-items:stretch}
.kstage--3{gap:20px;padding:20px 16px;align-items:stretch}
.kb>.kstage:first-child,.kb>.kside{flex:1}
.kb>.kside{align-items:stretch}
.kside-l>.kstage{flex:1;align-items:stretch}
.pg--ktbl .kb>.kstage:first-child,.pg--kcode .kb>.kside{flex:none}
.pg--kcode .kside{align-items:start}
.kstage--h .kcol .kp{flex:1}
.kstage--h .kcol{flex:none;display:flex;flex-direction:column}
.kstage--h .kcol .kh{text-align:center}
.kstage--w{padding:20px 24px}
.kp{position:relative;isolation:isolate;flex:none;display:flex;flex-direction:column;width:var(--pw,305px);border-radius:28px;background:var(--surface);box-shadow:0 0 0 1px var(--divider);padding-bottom:20px}
.kp::after{content:"";position:absolute;left:50%;bottom:8px;width:88px;height:4px;margin-left:-44px;border-radius:2px;background:var(--edge);opacity:.5}
.kp--wide::after,.kp--crop::after,.kp--m::after,.kp--nav::after{display:none}
.ksb{height:40px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;font:700 14px/1 var(--ff-body);color:var(--text);font-variant-numeric:tabular-nums}
.kp-b{flex:1 0 auto;padding:6px 16px 0;display:flex;flex-direction:column;gap:14px;align-items:stretch;min-width:0}
.kp .ui-tabbar{border-radius:0 0 28px 28px}
.kp .ui-help{margin:0}
.kp .ui-alert,.kp .ui-toast{min-width:0}
.kp .ui-segmented{display:flex;width:100%}
.kp .ui-segmented button{flex:1}
.kp--wide{width:100%;padding-bottom:16px;border-radius:20px}
.kp--wide .kp-b{padding-top:16px}

/* the pin: the same numbered circle sits beside the thing and beside its note. A full-width block takes its pin in the phone's side margin;
   .kn--in shrinks to the content and takes a corner pin (.kn--c does the same inside a grid cell); .kn--rc and .kn--r put it beside a chip or a row */
.kn{position:relative;min-width:0}
.kn--in{align-self:flex-start}
.kmk{position:absolute;top:-12px;right:-22px;z-index:1}
.kmk--l{right:auto;left:-22px}
.kn--in>.kmk,.kn--c>.kmk{right:-8px}
.kn--in>.kmk--l,.kn--c>.kmk--l{right:auto;left:-8px}
.kn--rc>.kmk{top:50%;right:auto;left:calc(100% + 6px);transform:translateY(-50%)}
.kn--r>.kmk{top:50%;right:-22px;transform:translateY(-50%)}
.kn--d>.kmk{top:-32px;left:0;right:auto;background:var(--raised);color:var(--text)}
.kk b .mono{font-weight:400}
.kmk--sb{top:8px;right:16px}
.kmk--row{top:50%;left:-24px;right:auto;transform:translateY(-50%)}
.ui-table th,.ui-table td{position:relative}
.ui-table th .kmk{top:-4px;right:auto;left:-24px}
.kp[data-theme="dark"] .mk{background:var(--text);color:var(--surface)}

/* the key: a numbered row for every pin */
.kkey{list-style:none;border-top:1px solid var(--divider)}
.kkey--2{border-top:0;column-count:2;column-gap:32px}
.kkey--2 .kk{break-inside:avoid;border-bottom:0;border-top:1px solid var(--divider);padding:5px 0}
.kk{display:grid;grid-template-columns:34px minmax(0,1fr);gap:0;align-items:start;padding:10px 0;border-bottom:1px solid var(--divider);font:400 13px/1.45 var(--chrome);color:var(--quiet)}
.kk b{display:block;font-weight:600;color:var(--text)}
.kk div>span{display:block}
.kk div>.mono{display:block}
.kk .mono{font-size:12px;color:var(--text);white-space:nowrap}
.kk .kratio{margin-bottom:2px}
.kk .kratio b{display:inline}
.kk--c{grid-template-columns:34px 40px minmax(0,1fr) auto;align-items:center;column-gap:8px;padding:3px 0}
.kk--c .mk{margin-top:0}
.kside{display:grid;grid-template-columns:360px minmax(0,1fr);gap:28px;align-items:start}
.kside-l{display:flex;flex-direction:column;gap:20px;min-width:0}
.kside-r{min-width:0}
.kside .kp{--pw:320px}
.kside .kstage{justify-content:center}
.kside-n .kkey{border-top:1px solid var(--divider)}

/* cover and contents */
.pg--kcover .sub{font-size:14px}
.pg--kcover .note{top:560px}
.kcover-key{position:absolute;left:var(--m);top:650px;width:290px}
.kcover-key .kk{padding:8px 0}
.kcover-key .kk b,.kcover-key .kk span{display:inline}
.kcover-key .kk b::after{content:': '}
.kstripe{position:absolute;right:0;top:0;width:96px;height:100%;background:var(--float)}
.kstage--toc{margin-top:36px;width:560px;flex:1;justify-content:center;align-items:stretch}
.kp--toc{--pw:480px}
.kp--toc .kp-b{padding:6px 24px 0}
.ktoc{flex:1;display:flex;flex-direction:column;list-style:none;border-top:1px solid var(--divider)}
.ktoc li{flex:1;display:grid;grid-template-columns:34px minmax(0,1fr) 32px;gap:0 6px;align-items:center;padding:16px 0;border-bottom:1px solid var(--divider)}
.ktoc-t{min-width:0}
.ktoc-h{display:block;font:600 22px/28px var(--ff-body);color:var(--text)}
.ktoc-s{display:block;margin-top:6px;font:400 14px/1.5 var(--chrome);color:var(--quiet)}
.ktoc-p{text-align:right;font:600 14px/24px var(--ff-body);font-variant-numeric:tabular-nums;color:var(--text)}

/* colour roles, in use */
.kp--col .kp-b{gap:12px}
.kq{font:400 14px/1.4 var(--ff-body);color:var(--quiet)}
.kscr-h{font-size:var(--fs-title);line-height:var(--lh-title)}
.kscr-h--s{font-size:var(--fs-title-s);line-height:var(--lh-title-s)}
.kscr-p{color:var(--text-soft)}
.kfr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:stretch}
.kraise,.ksunk{display:flex;flex-direction:column;justify-content:center;gap:2px;min-height:52px;padding:8px 12px;border-radius:var(--r-input)}
.kraise{background:var(--raised);box-shadow:inset 0 0 0 1px var(--divider)}
.ksunk{background:var(--sunken);font:400 14px/1.4 var(--ff-body);color:var(--quiet-sunken)}
.ksunk b,.kraise b{font:600 14px/1.3 var(--ff-body);color:var(--text)}
.ksunk--b{flex-direction:row;align-items:center;justify-content:space-between;min-height:56px}
.kscrimband{height:36px;border-radius:var(--r-input);background:var(--scrim)}
.kk--c .ksw{width:40px;height:28px;border-radius:var(--r-input);display:grid;place-items:center;font:600 13px/1 var(--ff-body);box-shadow:inset 0 0 0 1px var(--divider)}
.kk--c .krn{display:flex;flex-direction:column;gap:0;min-width:0}
.kk--c .krn b{font:600 13px/1.2 var(--chrome)}
.kk--c .krn .mono{font-size:12px;color:var(--quiet)}
.kk--c .krr{display:flex;flex-direction:column;align-items:flex-end;gap:0;text-align:right}
.kk--c .krr b{font:600 13px/1.3 var(--chrome);color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}
.kk--c .krr .mono{font-size:12px;color:var(--quiet)}
.pg--kcol .kside{grid-template-columns:350px minmax(0,1fr)}
.pg--kcol .kside .kp{--pw:310px}

/* type scale */
.kp--type .kp-b{gap:40px;padding-top:20px}
.kts{display:block;color:var(--text)}
.kfaces{display:flex;flex-direction:column;gap:12px;padding-top:4px}
.kface{display:flex;align-items:center;gap:16px}
.kface-a{font-size:56px;line-height:1;color:var(--text)}
.kface-a--b{font-family:var(--ff-body);font-weight:600}
.kk .mono+b{margin-top:1px}

/* spacing */
.ksp{list-style:none;border-top:1px solid var(--divider)}
.ksr{display:grid;grid-template-columns:72px minmax(0,1fr) 28px;gap:0 12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--divider)}
.ksr .mono{font-size:12px;color:var(--quiet)}
.ksr>b{font:600 14px/1 var(--chrome);color:var(--text);text-align:right}
.ksr .kcap{grid-column:1 / -1;margin-top:2px;padding-left:84px}
.ksr-b i{display:block;height:14px;border-radius:4px;background:var(--action)}
.kband{display:flex;align-items:center;justify-content:flex-end;padding-right:8px;border-radius:4px;background:var(--float)}
.kband b{font:600 12px/1 var(--chrome);color:var(--deep)}
.kband--s{height:16px}
.kph-h{font-size:var(--fs-title);line-height:var(--lh-title);white-space:normal}
.kp--sp .kp-b{gap:0}
.kp--sp .kph-h{margin-bottom:var(--sp-5)}
.kp--sp .kn:nth-of-type(2){margin:0}
.kp--sp{padding-bottom:28px}

/* radii, borders */
.ui-list.kw{border-top:0}
.kcard{max-width:none}
.kp--rb .kp-b{gap:12px}
.kp--rb .kfr .ui-field{min-width:0}

/* elevation */
.kp--el .kp-b{gap:14px}
.kscrim-in{border-radius:var(--r-card);padding:14px}
.kscrim-in .ui-dialog{max-width:100%}

/* states */
.kgrp{display:flex;flex-direction:column;gap:12px;align-items:flex-start;padding:12px 0 0;border-top:1px solid var(--divider)}
.kp--st .kp-b{gap:12px;padding-top:16px}
.kp--st .ui-field{width:100%}
.kgrp>.ui-field{align-self:stretch}
.kgrp .krow2{flex-wrap:nowrap;gap:8px}
.kgrp .krow2>*{flex:none;min-width:0}
.kgrp .ui-btn{padding:0 14px}

/* buttons */
.kstage--3 .kp{--pw:200px}
.kp--bt .kp-b{padding:6px 14px 0;gap:12px}
.kp--bt .ui-btn{max-width:100%}
.kp--bt{padding-bottom:20px}

/* inputs */
.kp--in .kp-b{padding:6px 14px 0;gap:16px}
.kp--in .ui-textarea{height:44px;min-height:44px}
.kcol .kh{margin-bottom:6px}

/* choices */
.kct{display:flex;flex-direction:column;gap:2px;align-items:flex-start}
.kct .kcap{font-size:12px;padding-left:2px}
.kp--ch .kp-b{padding:6px 14px 0;gap:10px}
.kseg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding:0 16px}
.kp--wide .kseg{padding:16px 16px 0}

/* cards */
.kp--cards .kp-b{gap:14px}
.kp--cards .ui-card__media{aspect-ratio:16/9;height:auto}
.kstats{display:flex;gap:16px}
.kstats>*{flex:1}

/* navigation */
.ktop{border:1px solid var(--divider);border-radius:var(--r-card);flex-direction:column;align-items:flex-start;height:auto;padding:12px 10px 4px;gap:4px}
.ktop .ui-topbar__links{flex-wrap:nowrap;gap:0}
.ktop .ui-link{padding:0 10px}
.kbar{border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden}
.kp--nav .kp-b{gap:16px}
.kp--nav>.kn{margin:24px 16px 0}
.kp--nav>.kn:last-child{margin-top:auto}
.kp--nav>.kn:last-child{margin-bottom:0}
.kp--nav .ui-sidebar{width:100%}
.kp--nav .ui-tabbar{border-radius:0}
.kp--nav .ui-tabs{overflow:hidden}

/* lists, status */
.kp--ls .kp-b{gap:14px}
.kp--sts .kp-b{padding:6px 16px 0}
.kp--sts .ui-row{gap:10px}
.kp--sts .ui-row .ui-chip{flex:none}
/* plain words reach the pin's edge, so the marker beside a status gets its own room */
.kp--sts .ui-row .kn--r{padding-right:6px}
.kratio{display:block}

/* feedback */
.kalerts{display:flex;flex-direction:column;gap:12px}
.kload{display:flex;align-items:center;gap:20px}
.kskel{display:flex;flex-direction:column;gap:8px}
.kskel .ui-skeleton{display:block}
.kp--fb .kp-b{gap:18px}

/* dialog */
.kp--dlg{min-height:420px;overflow:hidden}
.kp--dlg .kp-b{gap:14px}
.kghost{display:flex;flex-direction:column;gap:12px}
.kghost .kscr-h--s{margin-top:4px}
.kgrow{display:flex;align-items:center;gap:12px;padding-top:12px;border-top:1px solid var(--divider)}
.kgav{flex:none;width:40px;height:40px;border-radius:50%;background:var(--float)}
.kgl{display:flex;flex-direction:column;gap:6px;flex:1}
.kgl i{display:block;height:10px;border-radius:5px;background:var(--sunken)}
.kgl i+i{width:60%}
.kscrim-ov{position:absolute;left:0;right:0;top:0;bottom:0;padding:16px;z-index:2;border-radius:28px;display:grid;place-items:center;background:rgba(${scrim},.86)}
.kscrim-ov .kn{width:100%}
.kscrim-ov .ui-dialog{max-width:100%;width:100%}

/* table */
.kp--tbl .ui-table{width:100%}
.kp--tbl .kp-b{padding:20px 20px 0}
.kp--tl .kp-b{gap:14px}

/* empty */
.ksteps{list-style:none;display:flex;flex-direction:column;gap:12px}
.ksteps li{display:flex;align-items:center;gap:12px;font:600 14px/1.3 var(--chrome);color:var(--text)}
.ksteps .mk{background:transparent;color:var(--text);box-shadow:inset 0 0 0 1.5px var(--text)}
.kp--em .kp-b{gap:14px}

/* the product: the Today screen and the booking form */
.kp--scr .kp-b{gap:12px}
.khead{display:flex;align-items:center;height:36px}
.kscr-h{margin-top:0}
.kpool{position:relative;height:150px;border-radius:var(--r-card);background:var(--success-bg);overflow:hidden}
.kp--m .kpool{height:168px}
.kpool .lane{position:absolute;top:12px;bottom:12px;border-left:2px dashed var(--raised)}
.ui[data-theme="dark"] .kpool .lane,[data-theme="dark"] .kpool .lane{border-left-color:var(--quiet)}
.kpool .fl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:var(--r-chip);background:var(--float);color:var(--deep);font:600 14px/1 var(--ff-body);white-space:nowrap}
.kteach{display:flex;gap:12px;align-items:center;padding-top:12px;border-top:1px solid var(--divider)}
.kteach .ui-avatar{background:var(--float);color:var(--deep);flex:none}
.kteach-t{flex:1;display:flex;flex-direction:column;min-width:0}
.kteach-t b{font:600 15px/1.3 var(--ff-body);color:var(--text)}
.kteach-t span{font:400 13px/1.4 var(--ff-body);color:var(--quiet)}
.kteach--s{padding-top:0;border-top:0}
.kscr-h.kph-h--l,.kph-h--l{font-size:30px;line-height:1.05;white-space:normal}
.kp--m .kp-b{gap:16px}
.kp--m .kp-b>.kn:last-child{margin-bottom:0}
.kp--m{padding-bottom:0;overflow:hidden}
.kp--m .kp-b{padding-bottom:24px}
.kph{position:absolute;width:360px;height:740px;border-radius:28px;overflow:hidden;background:var(--surface);box-shadow:0 0 0 1px var(--divider)}
.kph .ksb{padding:0 24px}
.kph-b{padding:16px 20px 0;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
.kph-b>*{align-self:stretch}
.kph .kph-h{white-space:nowrap}
.kph .ui-segmented{display:flex;width:100%}
.kph .ui-segmented button{flex:1}
.kfld .ui-label{display:block;margin-bottom:6px}
.kph .kmk{right:-6px}

/* tokens */
.pg--ktok .klead{max-width:none}
.ktokens{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px;align-items:start}
.ktg{margin-bottom:8px}
.ktg>h3{display:flex;align-items:center;gap:8px;font:600 13px/20px var(--chrome);color:var(--text);border-top:1px solid var(--divider);padding-top:8px;margin-bottom:4px}
.ktg>h3 .mk{width:20px;height:20px;font-size:11px;line-height:20px}
.ktk{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:8px;align-items:center;min-height:17px;font:400 12px/15px var(--chrome);color:var(--text)}
.ktk--2{grid-template-columns:1fr 1fr}
.ktk--3{grid-template-columns:1fr}
.ktk--h{color:var(--quiet);font-weight:600}
.ktk .mono{font-size:12px}
.ktv{display:flex;align-items:center;gap:6px}
.ktsw{flex:none;width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--divider)}
.kstage--crop{padding:16px 16px 0;margin-top:8px;overflow:hidden;align-items:flex-end}
.kp--crop{--pw:276px;border-radius:24px 24px 0 0;padding-bottom:0;height:196px;overflow:hidden}
.kp--crop .kp-b{gap:10px;padding:2px 14px 0}
.kp--crop .ksb{height:28px}
.kp--crop .ui-toast{max-width:100%}

/* code */
.kp--code .kp-b{gap:12px}
.kkey--f .kk{padding:5px 0}
.kkey--f .kk b{display:none}
.kkey--f .kk .mono{display:block;font-weight:400}
.kcode{padding:10px 16px;border-radius:var(--r-card);box-shadow:inset 0 0 0 1px var(--divider);font:400 12px/1.45 var(--ff-mono);color:var(--text);overflow:hidden;white-space:pre}
.kcode code{font:inherit}
.pg--kcode .kg .kh{margin-bottom:6px}
.pg--kcode .kb{gap:10px}
/* @@END css */
`;
}
