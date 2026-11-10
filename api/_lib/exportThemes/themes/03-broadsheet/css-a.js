// Styles for guidelines-a.js (theme 03, Broadsheet). Appended to css() in index.js; reads the .pg custom properties. Every class starts a-.
import { cssStr } from '../../engine/escape.js';
export function cssA(ctx) {
  const mono = ctx.brand.fonts.mono;
  const nSteps = Object.keys(ctx.colours[0].ramp).length;
  return `
.pg{--mono:'${cssStr(mono.family)}',monospace}
/* ruled columns: a hairline between neighbours, padding on both sides of it */
.a-rules{display:grid;min-height:0}
.a-rules>*{min-width:0;min-height:0;padding:0 24px;border-left:1px solid var(--hair)}
.a-rules>:first-child{padding-left:0;border-left:0}
.a-rules>:last-child{padding-right:0}
/* a heavy rule over a hairline, as under the nameplate on the cover */
.a-dbl{position:relative;padding-top:20px;border-top:3px solid var(--ink)}
.a-dbl::before{content:"";position:absolute;left:0;right:0;top:2px;border-top:1px solid var(--ink)}
.a-h1{font-size:56px;line-height:1.02;text-wrap:balance}
.a-h1--md{font-size:44px;line-height:1.05}
.a-h1--sm{font-size:30px;line-height:1.1}
.a-nb{white-space:nowrap}
.a-mono{font-family:var(--mono);font-size:12px;line-height:1.3;color:var(--ink);white-space:nowrap;font-variant-numeric:tabular-nums}
.a-sw{display:block;flex:none;width:28px;height:28px}
.a-sw.hairline,.a-chip.hairline,.a-gt.hairline,.a-pt-tile.hairline,.a-sq.hairline,.a-bar.hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.a-onphoto{position:absolute;left:24px;top:24px;display:block}
.a-onphoto--mid{left:50%;top:50%;transform:translate(-50%,-50%)}
.a-cross{position:absolute;right:10px;top:10px;color:var(--ink)}
.a-ph{display:flex;flex-direction:column;gap:8px;min-height:0;height:100%}
.a-ph .photo-slot,.a-ph img{flex:1;min-height:0;width:100%;box-sizing:border-box;box-shadow:inset 0 0 0 1px var(--hair)}
.a-ph img{filter:grayscale(1) contrast(1.05);object-fit:cover}
.photo-slot.a-dark{background:var(--dark);color:var(--dark-ink);box-shadow:none}
.a-stack{display:flex;flex-direction:column;gap:16px;align-self:start}
.a-dg-cols .a-stack{border-top:3px solid var(--ink);padding-top:16px}
.a-lbl{display:block;font-family:var(--chrome);font-size:12px;font-weight:600;line-height:1.3;color:var(--quiet);margin-bottom:4px}
.a-lead-sm{font-size:17px;line-height:1.4}

/* intro: photo, lead story, briefs */
.a-intro{grid-template-columns:4fr 8fr}
.a-story{display:flex;flex-direction:column;gap:28px}
.a-story .a-h1{font-size:76px;line-height:1}
.a-story>.lead{max-width:640px}
.a-briefs{margin-top:auto;grid-template-columns:repeat(2,minmax(0,1fr))}
.a-briefs>div{padding-top:0}
.a-briefs .h2{margin-bottom:10px}
.a-briefs .lead{font-size:17px}

/* personality: lead trait wide, two beside it */
.a-pers{grid-template-rows:auto minmax(0,1fr) auto}
.a-pers-lead{max-width:540px}
.a-traits{grid-template-columns:1.7fr 1fr 1fr;align-self:start;margin-top:40px}
.a-traits li{display:flex;flex-direction:column;gap:18px}
.a-trait{font-size:60px;line-height:1.05}
.a-trait--lead .a-trait{font-size:100px;line-height:1}
.a-sub{font-family:var(--body);font-size:17px;line-height:1.5;color:var(--soft)}
.a-trait--lead .lead{max-width:420px}
.a-two{grid-template-columns:repeat(2,minmax(0,1fr))}
.a-line{font-size:40px;line-height:1.1}

/* voice: banner, then four columns */
.a-voice{grid-template-rows:auto minmax(0,1fr);gap:40px}
.a-banner{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,4fr);gap:0 56px;align-items:end}
.a-h1--stack{font-size:76px;line-height:1.02}
.a-h1--stack span{display:block}
.a-banner .lead{padding-bottom:8px}
.a-habits{align-self:stretch}
.a-habits li{display:flex;flex-direction:column;gap:20px;padding-bottom:8px}
.a-pt{font-family:var(--body);font-size:16px;line-height:1.3;font-weight:700}
.a-ex{font-size:44px;line-height:1.08}

/* write this: classifieds */
.a-wt{display:block}
.a-ads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);height:100%;border-top:3px solid var(--ink)}
.a-ads>li{display:flex;flex-direction:column;gap:14px;padding:20px 24px 22px;border-left:1px solid var(--hair);border-bottom:1px solid var(--hair);min-width:0}
.a-ads>li:nth-child(3n+1){padding-left:0;border-left:0}
.a-ads>li:nth-child(3n){padding-right:0}
.a-ads>li:nth-last-child(-n+3){border-bottom:0}
.a-ads-lead{justify-content:flex-start}
.a-w{font-size:28px;line-height:1.12;min-height:63px}
.a-n{font-family:var(--body);font-size:16px;line-height:1.4;color:var(--soft)}
.a-n s{text-decoration-thickness:1px}
.a-b{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft)}

/* messaging: banner, four columns */
.a-msg{grid-template-rows:auto minmax(0,1fr);gap:36px}
.a-msg-top{display:flex;justify-content:space-between;align-items:flex-end;gap:48px}
.a-nm{font-size:150px;line-height:1}
.a-first{font-size:44px;line-height:1.08;text-align:right;max-width:440px;text-wrap:balance;padding-bottom:6px}
.a-msg-cols{grid-template-columns:1.2fr 1fr 1fr 1.2fr;align-self:stretch}
.a-msg-cols .h2{margin-bottom:10px}
.a-linelist li{font-family:var(--body);font-size:19px;line-height:1.3;font-weight:500;padding:10px 0;border-bottom:1px solid var(--hair)}
.a-linelist li:first-child{padding-top:0}
.a-msg-cols .cap{margin:-6px 0 0}
.a-bpt{font-family:var(--body);font-size:18px;line-height:1.5;color:var(--ink);margin-top:10px}

/* logo: the nameplate */
.a-logo{grid-template-rows:minmax(0,1fr) auto;gap:28px}
.a-np{display:flex;flex-direction:column;min-height:0;margin-top:12px}
.a-np-in{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;border-top:3px solid var(--ink);border-bottom:3px solid var(--ink)}
.a-three{grid-template-columns:2fr 4fr 4fr}
.a-three .cap{align-self:start}

/* clear space, minimum size, grounds: a headline over ruled columns */
.a-diagram{grid-template-rows:auto minmax(0,1fr);gap:28px}
.a-dg-cols{grid-template-columns:minmax(0,1fr) 300px}
.a-stage-wrap{display:flex;align-items:center;justify-content:center;min-height:0;margin:0}
.a-stage{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-top:3px solid var(--ink);border-bottom:1px solid var(--hair)}
.a-zone{position:relative;background:var(--panel);flex:none}
.a-zin{position:absolute;background:var(--ground)}
.a-unit{position:absolute;box-sizing:border-box;border:1px dashed var(--quiet-panel)}
.a-dim{position:absolute;display:block;background:var(--ink);font-style:normal}
.a-dim--v{width:1px;transform:translateX(-0.5px)}
.a-dim--h{height:1px;transform:translateY(-0.5px)}
.a-dim b{position:absolute;font-size:12px;font-weight:500;line-height:1;color:var(--ink)}
.a-dim--v b{left:8px;top:50%;transform:translateY(-50%)}
.a-dim--h b{left:50%;top:8px;transform:translateX(-50%)}
.a-ms-top{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,3fr);gap:0 48px;align-items:end}
.a-ms-top .lead{padding-bottom:6px}
.a-ms2{grid-template-columns:repeat(2,minmax(0,1fr))}
.a-ms{display:flex;flex-direction:column;gap:12px;margin:0;min-height:0}
.a-msbox{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;border-top:3px solid var(--ink);border-bottom:1px solid var(--hair)}
.a-mslogo{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.a-ruler{display:block;height:6px;border:1px solid var(--ink);border-top:0;box-sizing:border-box}
.a-gs{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}
.a-bands{display:flex;flex-direction:column;min-height:0;border-top:3px solid var(--ink)}
.a-bands li{flex:1;min-height:0;display:grid;grid-template-columns:260px minmax(0,1fr);gap:24px;align-items:center;padding:12px 0;border-bottom:1px solid var(--hair)}
.a-bands li:last-child{border-bottom:0}
.a-gphoto{display:flex;flex-direction:column;gap:10px;min-height:0;margin:0;border-top:3px solid var(--ink)}
.a-gt{display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;height:100%;min-height:0}
.a-gphoto .a-gt{flex:1}
.a-gt--photo{display:block}
.a-gt--photo .photo-slot{position:absolute;inset:0;box-shadow:none}
.a-gphoto{padding-top:0}
.a-gphoto .a-gt--photo{margin-top:8px}

/* logo misuse: corrections */
.a-corrs{grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:0 48px}
.a-corr-l{display:flex;flex-direction:column;justify-content:space-between;gap:20px}
.a-corr-l .a-h1{font-size:56px}
.a-corr-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));border-top:3px solid var(--ink);border-bottom:3px solid var(--ink);align-self:stretch;min-height:0}
.a-corr-col>li{display:grid;grid-template-columns:200px minmax(0,1fr);gap:16px;align-items:center;padding:12px 20px 12px 0;border-bottom:1px solid var(--hair);min-height:0}
.a-corr-col>li:nth-child(even){padding:12px 0 12px 20px;border-left:1px solid var(--hair)}
.a-corr-col>li:nth-last-child(-n+2){border-bottom:0}
.a-mt{height:100%;max-height:150px;position:relative;overflow:hidden;background:var(--panel);display:flex;align-items:center;justify-content:center}
.a-mt--busy{display:block}
.a-busy{position:absolute;inset:0;width:100%;height:100%}
.a-boxed{border:2px solid var(--ink);padding:10px 14px;line-height:0}
.a-corr{font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft)}
.a-corr b{display:block;font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px}

/* palette: lead story and sidebar briefs */
.a-pal{grid-template-columns:minmax(0,6fr) minmax(0,5fr)}
.a-pal-lead{display:flex;flex-direction:column;gap:16px;min-height:0}
.a-pal-lead figure{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;margin:0}
.a-pt-tile{box-sizing:border-box;padding:16px;display:flex;flex-direction:column;justify-content:space-between;font-family:var(--body)}
.a-pt-tile--lead{flex:1;min-height:0;padding:24px}
.a-pt-tile--lead .a-ptext2{font-size:40px;line-height:1.1}
.a-pt-tile--brief{height:100%;min-height:0}
.a-sidebar{display:flex;flex-direction:column;min-height:0}
.a-sidebar>li{flex:1;min-height:0;display:grid;grid-template-columns:220px minmax(0,1fr);gap:20px;align-items:stretch;padding:14px 0;border-top:1px solid var(--hair)}
.a-sidebar>li:first-child{padding-top:0;border-top:0}
.a-sidebar>li:last-child{padding-bottom:0}
.a-sidebar .cap{align-self:center}
.a-ptext{font-size:26px;line-height:1.08}
.a-ptext2{font-size:18px;line-height:1.25;font-weight:700}
.a-pn{font-family:var(--chrome);font-size:12px;font-weight:600}

/* proportion: headline, story, figure, share table */
.a-prop{grid-template-rows:auto minmax(0,1fr);gap:28px}
.a-prop-cols{grid-template-columns:minmax(0,1fr) 360px;align-items:start}
.a-prop-side{display:flex;flex-direction:column;gap:24px}
.a-prop-side .lead{font-size:17px;line-height:1.45}
.a-prop-cols>figure{display:flex;flex-direction:column;gap:12px;margin:0}
.a-pg{position:relative;width:100%;aspect-ratio:16/9;display:grid;overflow:hidden}
.a-pg::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--ink);pointer-events:none}
.a-pgcol,.a-pgrow{display:grid;min-height:0;min-width:0}
.a-pgcol>div,.a-pgrow>div,.a-pg>div{min-height:0;min-width:0}
.a-plist{border-top:3px solid var(--ink)}
.a-plist li{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:6px 12px;align-items:center;padding:14px 0 14px;border-bottom:1px solid var(--hair)}
.a-plist .a-sw{width:20px;height:20px}
.a-pcn{font-family:var(--body);font-size:16px;font-weight:500}
.a-pct{font-family:var(--body);font-weight:700;font-size:30px;line-height:1}
.a-bar{display:block;grid-column:1 / -1;height:8px;min-width:2px}

/* colour values: the markets page */
.a-vals{grid-template-columns:minmax(0,1fr) 300px}
.a-market{display:flex;flex-direction:column;min-height:0}
.a-mrow{display:grid;grid-template-columns:150px 62px 126px 170px minmax(0,1fr);gap:0 14px;align-items:center}
.a-mhead{padding:0 0 8px;font-size:12px;font-weight:600;border-top:3px solid var(--ink);padding-top:8px;border-bottom:1px solid var(--ink)}
.a-mblock{flex:1;display:flex;flex-direction:column;justify-content:center;padding:12px 0 14px;border-bottom:1px solid var(--hair)}
.a-mblock:last-child{border-bottom:0}
.a-vname{display:flex;align-items:center;gap:10px;font-family:var(--body);font-size:16px;font-weight:700}
.a-vname b{font-weight:700}
.a-sq{display:block;flex:none;width:12px;height:12px}
.a-muse{font-family:var(--body);font-size:13px;line-height:1.3;color:var(--soft)}
.a-mramp{display:grid;grid-template-columns:repeat(${nSteps},minmax(0,1fr));gap:0 2px;margin-top:10px}
.a-mstep{display:flex;flex-direction:column;gap:3px;min-width:0}
.a-mstep em{font-style:normal;font-size:12px;line-height:1.2;color:var(--quiet)}
.a-mstep .a-chip{display:block;height:14px}
.a-mstep--base em{font-weight:600;color:var(--ink)}
.a-mstep--base .a-chip{box-shadow:0 3px 0 0 var(--ink)}
.a-mstep .a-mono{font-size:12px;margin-top:3px}
.a-mnote{margin-top:10px;font-size:13px;font-style:italic;color:var(--quiet)}
.a-vside{display:flex;flex-direction:column;gap:18px;min-height:0}
.a-vtext{font-family:var(--body);font-size:16px;line-height:1.5;color:var(--ink)}
.a-vside .h2{margin-bottom:10px}
.a-tones{border-top:1px solid var(--ink)}
.a-tones li{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:14px}
.a-tones b{font-weight:500}
`;
}
