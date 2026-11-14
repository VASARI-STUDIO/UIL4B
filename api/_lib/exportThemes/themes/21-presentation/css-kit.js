// Styles for uikit.js. Appended to css() in index.js; uses the .pg custom properties for the page chrome and the kit's own tokens
// (scoped to .ui, light by default and data-theme="dark" for the dark panels) for everything inside a .ui region.
// Every kit page is a slide: the stage on top, a foot with the title and the rules. Component states run left to right as a build sequence.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

export function cssKit(ctx) {
  const B = ctx.brand, g = tokenGroups(ctx), stretch = B.fonts.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const tokens = `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}--chrome:'${ctx.theme?.chrome?.family || 'Instrument Sans'}',sans-serif}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}`;
  return `
/* kit: tokens and components, scoped under .pg */
${tokens}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.ui-display{font-stretch:${stretch}%}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
.ui{--mono:${'var(--ff-mono)'}}
.mono{font-family:var(--ff-mono);font-size:0.92em;font-variant-numeric:tabular-nums}

/* the slide: stage on top, foot below it */
.kbody{flex:1;min-height:0;padding:24px 0 20px;display:flex;flex-direction:column;font-size:13px;line-height:1.4}
.kstage{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;padding-bottom:28px}
.kfoot{flex:none;display:grid;grid-template-columns:300px minmax(0,1fr);gap:0 48px;align-items:end;padding-top:16px;border-top:1px solid var(--divider)}
.kft{font-size:28px;line-height:1.05;overflow-wrap:break-word}
.krules{display:grid;grid-template-columns:repeat(var(--n,1),minmax(0,1fr));gap:0 24px;align-items:start}
.krule{font-family:var(--ff-body);font-size:12px;line-height:1.55;color:var(--text)}
.kg{display:flex;flex-direction:column;min-width:0}
.kg>h3,.ktg>h3{font:500 12px/1 var(--chrome);color:var(--quiet);margin-bottom:12px}
.kcap{display:block;font:400 11px/1.5 var(--chrome);color:var(--quiet);max-width:34ch}
.kcap b{display:block;font-size:12px;font-weight:500;color:var(--text)}
.kcap--after{margin-top:12px}
.kcap--ink{color:var(--text-soft)}
.kcell{display:flex;flex-direction:column;gap:8px;min-width:0}
.kcell>.ui-btn,.kcell>.ui-toast{align-self:flex-start}
.kna{font:400 11px/1.5 var(--chrome);color:var(--quiet)}
.kstack{display:flex;flex-direction:column;gap:24px;min-width:0}
.k2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-content:start}
.k3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:start}
.k5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px;align-items:start}
.kfull{display:flex;flex-direction:column;gap:28px;flex:1;min-height:0}

/* a framed slide holding one specimen */
.kfr{box-sizing:border-box;background:var(--surface);box-shadow:inset 0 0 0 1px var(--divider);border-radius:2px;padding:20px;display:flex;align-items:center;justify-content:center;min-width:0;min-height:96px}
.kfr>.ui-field,.kfr>.ui-list,.kfr>.ui-alert{width:100%}
.kfr .ui-card{width:100%;max-width:320px}
.kfr:has(>.ui-scrim,>.ui-empty){padding:0;overflow:hidden}
.kfr:has(>.ui-scrim,>.ui-empty)>*{width:100%}
.kfr--flush{padding:0;justify-content:stretch;align-items:stretch;overflow:hidden}
.kfr--flush>*{width:100%}

/* a build sequence: frames left to right, an arrow between each */
.kseq{display:flex;align-items:stretch;min-width:0}
.kseq-a{flex:none;width:28px;display:grid;place-items:center;align-self:center;color:var(--quiet)}
.ksf{flex:1 1 0;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;padding:16px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--divider);border-radius:2px}
.ksf-h{display:flex;flex-direction:column;gap:6px;padding-bottom:12px;border-bottom:1.5px solid var(--text)}
.ksf-h b{font:600 13px/1.2 var(--chrome);color:var(--text)}
.ksf-h .kcap{max-width:none}
.ksf-b{display:flex;flex-direction:column;gap:16px;min-width:0}
.kl{display:flex;flex-direction:column;gap:6px;align-items:flex-start;min-width:0}
.kl-t{font:500 11px/1.3 var(--chrome);color:var(--quiet)}
.kl .ui-field{width:100%}
.kl .ui-btn{height:40px;padding:0 var(--sp-4);font-size:var(--fs-label)}
.kl .ui-choice{min-height:32px}
.kseq--states .ksf-h{min-height:80px}
.kseq--states .ksf-b{gap:12px}
.kseq--inputs .ksf-b,.kseq--choices .ksf-b{gap:18px}
.kseq--choices .ksf{padding-bottom:20px}
.kseg{display:flex;gap:48px;align-items:flex-start}
.kseg .kcap{max-width:40ch}

/* cover: a title slide, the logo centred alone */
.pg--kcover{background:var(--dark);color:var(--dark-ink);display:flex;flex-direction:column;justify-content:space-between;padding:40px var(--m) 52px}
.kc-top{display:flex;justify-content:space-between;font-size:12px;letter-spacing:0.01em}
.kc-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px}
.kc-name{font-size:96px;line-height:0.9}
.kc-line{font-family:var(--body);font-size:15px;line-height:1.4;text-align:center}

/* contents: a slide sorter, one small slide per section with its pages listed under it */
.kct-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;align-items:start}
.kct-s{aspect-ratio:16/9;box-sizing:border-box;background:var(--dark);color:var(--dark-ink);padding:16px 18px;display:flex;flex-direction:column;justify-content:space-between;border-radius:2px}
.kct-n{font-size:56px;line-height:0.9}
.kct-t{font-size:20px;line-height:1.05}
.kct-l{margin-top:12px}
.kct-l li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--divider);font-size:12px;color:var(--text)}
.kct-l li:last-child{border-bottom:1px solid var(--divider)}
.kct-l .num{color:var(--quiet)}

/* colour roles: one small slide per role, filled with the role's pair */
.kband{min-width:0}
.kband--dark{background:var(--surface);margin:0 calc(-1 * var(--m));padding:8px var(--m)}
.kroles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.kroles-t{box-sizing:border-box;aspect-ratio:2.1/1;padding:10px 12px;display:flex;flex-direction:column;gap:6px;border-radius:2px;min-width:0;overflow:hidden;box-shadow:inset 0 0 0 1px var(--divider)}
.krt-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.krt-top .mono,.krt-foot .mono{font-size:11px}
.krt-top b{font:500 12px/1.2 var(--chrome);white-space:nowrap}
.krt-name{margin-top:auto;font-size:17px;line-height:1;overflow-wrap:break-word}
.krt-foot{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font:400 11px/1.3 var(--chrome)}

/* type scale: a slide for the faces, then one slide per style at its true size with its spec in the foot */
.kts-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.kts-t{box-sizing:border-box;height:136px;padding:12px 16px;display:flex;flex-direction:column;justify-content:space-between;gap:8px;border-radius:2px;min-width:0;overflow:hidden;box-shadow:inset 0 0 0 1px var(--divider)}
.kts-s{flex:1;min-height:0;overflow:hidden;color:var(--text)}
.kts-f{flex:none;display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:0 12px;align-items:baseline;padding-top:8px;border-top:1px solid var(--divider)}
.kts-f .mono{font-size:11px;color:var(--quiet)}
.kts-f .kcap{max-width:none}
.kts-t--face{grid-column:span 2;background:var(--dark);color:var(--dark-ink);justify-content:center;box-shadow:none;gap:6px}
.kts-fd{font-size:56px;line-height:1}
.kts-fb{font:500 20px/1.2 var(--ff-body)}

/* spacing: a staircase of squares at their true size */
.kstair{display:flex;align-items:flex-start}
.ksc{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding-right:12px}
.ksc .mono{font-size:11px;color:var(--text)}
.ksc .mono+.mono{color:var(--quiet)}
.ksq{display:flex;align-items:flex-end;align-self:stretch;height:120px;border-bottom:1.5px solid var(--text);margin-bottom:10px}
.ksq i{display:block;background:var(--text)}

/* radii and borders */
.krow2{display:flex;align-items:center;gap:20px}
.kw{border-top:0}
.k3{align-items:stretch}
.k3>.kcell{height:100%}
.k3>.kcell>.kfr{flex:1;min-height:132px}
.kstack>.kg{gap:0}

/* elevation: ground, hairline, floating */
.kelev{align-items:flex-start}
.kelev .ksf{box-shadow:none;padding:0}
.kelev>.ksf:nth-of-type(1){flex:0 0 220px}
.kelev>.ksf:nth-of-type(2){flex:1 1 0}
.kelev>.ksf:nth-of-type(3){flex:1.5 1 0}
.kstepl{display:flex;flex-direction:column;gap:12px}
.kstep{display:flex;gap:12px;align-items:flex-start}
.kstep-sw{flex:none;width:44px;height:44px;border-radius:var(--r-control);box-shadow:inset 0 0 0 1px var(--divider)}
.kelev .ui-dialog{max-width:none;padding:20px}
.kelev .ui-dialog__actions .ui-btn{height:36px;padding:0 var(--sp-4);font-size:var(--fs-label)}

/* buttons: the construction drawn at left, the states as a sequence, the variants under */
.kbtn{display:grid;grid-template-columns:380px minmax(0,1fr);gap:40px;align-items:start}
.kbtn-l{display:flex;flex-direction:column;gap:12px}
.kdraw{position:relative;height:170px}
.kd{position:absolute;background:var(--text)}
.kd-v{position:absolute;font-size:12px;line-height:16px;color:var(--text)}
.kzoom{position:absolute;zoom:2}
.kspec{display:flex;flex-direction:column;gap:4px;font:400 12px/16px var(--chrome);color:var(--quiet)}
.kspec .mono{color:var(--text);font-size:12px}
.kseq--btn{gap:0}
.kseq--btn>.kst{flex:1 1 0;min-width:0}
.kseq--btn .kseq-a{width:20px}
.kst{display:flex;flex-direction:column;min-width:0}
.kst .kfr{min-height:72px;padding:12px;justify-content:flex-start}
.kst .ui-btn{height:40px;padding:0 var(--sp-3);font-size:var(--fs-label)}
.kst b{margin-top:10px;font:500 12px/1.3 var(--chrome)}
.kst p{margin:4px 0 0;font:400 11px/1.55 var(--chrome);color:var(--quiet)}
.k5--v{display:flex;flex-wrap:wrap;gap:16px 24px;align-items:flex-start}
.k5--v .kcell{gap:6px;flex:0 0 auto}
.k5--v .kcap{max-width:22ch}

/* cards, nav, lists */
.kcards{display:grid;grid-template-columns:1.35fr 1fr 1fr .8fr;gap:24px;align-items:start;flex:none;justify-content:center}
.kcards{align-items:stretch}
.kcards .kcell{height:100%}
.kcards .kfr{flex:1;min-height:240px;align-items:center;padding:16px}
.knav .kfr{min-height:0}
.knav .kfr:not(.kfr--flush){padding:16px 20px}
.knav .kstack{gap:14px}
.kcard-act{margin-top:8px}
.kstats{display:flex;flex-direction:column;gap:12px}
.knav{display:grid;grid-template-columns:minmax(0,1.7fr) 200px 280px;gap:28px;align-items:start}
.knav .ui-sidebar{min-height:300px}
.klists{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:start}

/* status: one column per state, the words on the light ground, then on the dark. The dark cells touch, so the dark samples read as one panel */
.kstatus{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:auto auto auto 1fr;grid-auto-flow:column;align-items:stretch;border:1px solid var(--divider);border-radius:2px;overflow:hidden}
.kstat{display:contents}
.kstat>.kcap{padding:10px 14px 0;max-width:none;min-width:0}
.kstat>.kcap--ink{padding-bottom:14px}
.kstat:not(:first-child)>:not(.kstat-d){border-left:1px solid var(--divider)}
.kstat-l,.kstat-d{display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:14px;background:var(--surface);color:var(--text);min-height:104px}
.kstat-d{width:auto}
.krr{display:flex;flex-direction:column;align-items:flex-start;gap:1px;font:400 11px/1.3 var(--chrome);color:var(--quiet);text-align:left}
.krr b{font:500 13px/1.3 var(--ff-body);color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap}
.kdk{border-radius:0}

/* feedback, dialog, table, empty */
.kfeed{display:flex;flex-direction:column;gap:24px}
.kfeed-r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr);gap:24px;align-items:start}
.kalerts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.kload{display:flex;gap:20px;align-items:center}
.kskel{display:flex;flex-direction:column;gap:10px}
.kdlg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-content:start}
.kdlg .ui-scrim{padding:32px 24px;min-height:300px}
.kdlg .ui-dialog{padding:20px}
.kdlg .ui-dialog__actions .ui-btn{height:40px;padding:0 var(--sp-4);font-size:var(--fs-label)}
.kkeys{display:flex;gap:40px}
.k2 .ui-empty{min-height:300px}
.ksteps{list-style:none;display:flex;flex-direction:column;gap:8px;margin:4px 0 8px}
.ksteps li{display:flex;align-items:center;gap:12px;font-size:var(--fs-body)}
.ksteps li span{display:grid;place-items:center;width:24px;height:24px;border-radius:var(--r-round);background:var(--surface);box-shadow:inset 0 0 0 var(--w-control) var(--text);font:600 12px/1 var(--ff-body);font-variant-numeric:tabular-nums}

/* screens */
.pg--kscreen .kstage{justify-content:stretch;padding-bottom:24px}
.pg--kscreen .kbody{padding-top:16px}
.pg--kscreen .kfoot{grid-template-columns:minmax(0,1fr)}
.pg--kscreen .kft{white-space:nowrap}
.kscreen-wrap{flex:1;min-height:0;display:flex}
.kscreen{display:flex;flex-direction:column;width:100%;border:1px solid var(--divider);border-radius:var(--r-card);overflow:hidden;min-height:0}
.kscreen .ui-topbar{flex:none}
.ks-clock{color:var(--quiet);font-size:var(--fs-label)}
.ks-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:56px;padding:20px 32px;background:var(--surface)}
.ks-title{font:500 var(--fs-label)/1 var(--ff-body);color:var(--quiet);margin-bottom:14px}
.ks-eta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.ks-time{font-size:var(--fs-headline);line-height:var(--lh-headline);margin:0;color:var(--text)}
.ks-pickup{margin-top:8px;color:var(--text-soft);font-size:var(--fs-body);line-height:1.5}
.ks-prog{margin-top:22px;max-width:520px}
.ks-route{display:flex;justify-content:space-between;margin-top:8px;font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ks-rider{display:flex;align-items:center;gap:12px;margin-top:22px;padding-top:16px;border-top:1px solid var(--divider);max-width:520px}
.ks-rmain{flex:1;min-width:0}
.ks-rname{font:500 15px/1.4 var(--ff-body)}
.ks-rsub{font:400 13px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:12px;max-width:520px;border-top:1px solid var(--divider)}
.ks-detail div{padding:10px 0;border-bottom:1px solid var(--divider)}
.ks-detail dt{font:400 12px/1.4 var(--ff-body);color:var(--quiet)}
.ks-detail dd{font:500 14px/1.4 var(--ff-body);font-variant-numeric:tabular-nums}
.ks-track .ui-btn--block{margin-top:16px;max-width:520px}
.ks-deliv{display:flex;flex-direction:column;min-width:0}
.ks-book{margin-top:20px;display:flex}

/* mobile page: the sequence of headlines on the left, the phone on a panel on the right */
.pg--kphone{display:grid;grid-template-columns:minmax(0,1fr) 406px;background:var(--ground)}
.kp-l{box-sizing:border-box;height:720px;padding:40px 8px 28px;background:var(--panel);display:flex;flex-direction:column;justify-content:space-between;align-items:center}
.kcap-d{align-self:flex-start;padding:0 12px;font-size:12px;line-height:1.4;color:var(--quiet-panel)}
.kphone{width:390px;height:620px;box-sizing:border-box;border-radius:var(--r-card);overflow:hidden;display:flex;flex-direction:column;background:var(--surface)}
.kph-top{display:flex;justify-content:space-between;align-items:center;padding:16px 24px 0;font:600 13px/20px var(--ff-body)}
.kph-top .ui-display{font-size:12px;line-height:1}
.kph-body{flex:1;min-height:0;padding:20px 24px 20px;display:flex;flex-direction:column}
.kph-chip{display:flex}
.kph-time{margin:12px 0 0;font-size:var(--fs-title);line-height:var(--lh-title)}
.kph-body .ks-prog,.kph-body .ks-rider,.kph-body .ks-detail,.kph-body .ui-btn--block{max-width:none}
.kph-body .ks-prog{margin-top:20px}
.kph-body .ks-rider{margin-top:18px}
.kph-body .ui-btn--block{margin-top:auto}
.kphone .ui-tabbar{flex:none}
.kp-r{box-sizing:border-box;height:720px;min-width:0;padding:40px 40px 40px var(--m);display:flex;flex-direction:column;justify-content:space-between}
.kp-r .hd{display:flex;justify-content:space-between}
.kp-r .kfoot{grid-template-columns:minmax(0,1fr)}
.kp-r .kft{margin-bottom:12px}
.kp-r .krules{grid-template-columns:repeat(var(--n,1),minmax(0,1fr))}
.kseq--states2{gap:0}
.kseq--states2 .kseq-a{width:14px}
.kseq--states2 .kstate{padding:12px;min-height:176px}
.kstate{flex:1 1 0;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;padding:12px;box-shadow:inset 0 0 0 1px var(--divider);border-radius:2px;background:var(--surface)}
.kstate-chip{display:flex}
.kstate-line{margin-top:auto;font-size:17px;line-height:1.15;color:var(--text);display:block}
.kstate-line small{display:block;margin-top:4px;font:400 var(--fs-body)/1 var(--ff-body);color:var(--quiet)}
.kstate-line.is-final{font-size:20px;line-height:1.1}

/* tokens: a reference sheet, four ruled columns */
.ktokens{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 20px;align-items:start}
.ktokens>div+div{border-left:1px solid var(--divider);padding-left:20px}
.ktokens .ktk:not(.ktk--2){grid-template-columns:108px minmax(0,1fr) minmax(0,1fr);gap:0 6px}
.ktg{margin-bottom:16px}
.ktk{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:0 8px;align-items:center;height:20px;border-bottom:1px solid var(--divider);font:400 12px/1 var(--ff-body)}
.ktk--2{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}
.ktk--h{height:auto;padding-bottom:6px;font:500 11px/1 var(--chrome);color:var(--quiet);border-bottom:1.5px solid var(--text)}
.ktk .mono{font-size:11px;white-space:nowrap}
.ktk--h .mono{font-weight:400}
.ktv{display:flex;align-items:center;gap:6px}
.ktsw{display:block;width:12px;height:12px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--divider);flex:none}

/* code: three blocks across, the files in three columns under them */
.kcode-row{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
.kfiles-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.kfile{display:flex;flex-direction:column;gap:2px;padding:9px 0;border-bottom:1px solid var(--divider);font:400 12px/1.45 var(--ff-body);color:var(--text-soft)}
.kfile .mono{font-size:12px;color:var(--text)}
.kfiles .kg>h3{margin-bottom:4px}
.kcode{margin:0;padding:14px 18px;border-radius:var(--r-card);background:var(--surface);color:var(--text);font:400 12px/1.7 var(--ff-mono);white-space:pre;overflow:hidden}
.kcode code{font:inherit}
`;
}
