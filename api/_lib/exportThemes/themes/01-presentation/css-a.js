// Styles for guidelines-a.js. Appended to css() in index.js; use the same custom properties (.pg vars). Every class starts a-.
// The pages are full-bleed slides (.pg--a): panels run edge to edge, the running head and folio are laid over the first panel.
import { cssStr } from '../../engine/escape.js';
export function cssA(ctx) {
  const mono = ctx.brand.fonts.mono;
  return `
.pg{--mono:'${cssStr(mono.family)}',monospace}
.pg--a{padding:0}
.pg--a .hd,.pg--a .fo{position:absolute;z-index:2;color:inherit}
.pg--a .hd{top:36px;left:var(--m);right:var(--m)}
.pg--a .fo{left:var(--m);bottom:32px}
.pg--a :where(.lead,.cap,.h3),.pg--a .cap b{color:inherit}
.pg--a .hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.a-full{position:absolute;inset:0}
.a-body{font-family:var(--body);font-size:15px;line-height:1.6;max-width:420px}
.a-mono{font-family:var(--mono);font-size:12px;line-height:1.3;color:inherit;white-space:nowrap}
.a-sw{display:block;flex:none;width:28px;height:28px;border-radius:2px}
.a-fillimg{position:absolute;inset:0;width:100%;height:100%}
.a-gart--photo .a-fillimg.photo-slot{background:var(--dark);color:var(--dark-ink);align-items:flex-end}
.a-onphoto{position:absolute;left:24px;top:24px;display:block}
.a-onphoto--mid{left:50%;top:50%;transform:translate(-50%,-50%)}
.a-cross{position:absolute;right:20px;top:18px;color:var(--ink)}
.a-h1{font-size:104px;line-height:1;max-width:1100px;text-wrap:balance}
.a-bl{position:absolute;left:var(--m);bottom:72px;width:440px}
.a-br{position:absolute;right:var(--m);bottom:72px;width:300px;text-align:right}
.a-stack{display:flex;flex-direction:column;gap:16px}

/* intro: a title slide on the action colour */
.a-intro{padding:120px var(--m) 72px;display:flex;flex-direction:column;justify-content:space-between}
.a-intro-foot{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px;align-items:start}
.a-intro-foot>*{border-top:2px solid currentColor;padding-top:14px}
.a-intro-foot .h3{margin-bottom:8px}

/* personality: one panel per trait, edge to edge, then the two lines */
.a-traits{position:absolute;left:0;right:0;top:0;height:576px;display:grid}
.a-traits li{display:flex;flex-direction:column;justify-content:space-between;padding:104px 40px 36px}
.a-trait{font-size:60px;line-height:1.02}
.a-pband{position:absolute;left:0;right:0;top:576px;bottom:0;padding:28px var(--m) 0;background:var(--ground);color:var(--ink);display:grid;grid-template-columns:380px minmax(0,1fr);gap:64px;align-items:start}
.a-lines{display:flex;gap:48px;font-family:var(--body);font-size:24px;line-height:1.25;font-weight:500}

/* voice: the line, set huge, and the four habits as a build along the foot */
.a-voice{padding:120px var(--m) 72px;display:flex;flex-direction:column;justify-content:space-between}
.a-h1--xl{font-size:100px;max-width:1160px}
.a-vlead{margin-top:24px;max-width:420px}
.a-steps{display:grid;gap:32px}
.a-steps li{border-top:2px solid currentColor;padding-top:14px}
.a-pt{font-family:var(--body);font-size:13px;line-height:1.4;font-weight:600;margin-bottom:8px}
.a-ex{font-family:var(--body);font-size:19px;line-height:1.3;font-weight:500}

/* write this, not that: two slides side by side, rows aligned */
.a-wt{display:grid;grid-template-columns:1fr 1fr}
.a-wl{background:var(--dark);color:var(--dark-ink);padding:0 var(--m)}
.a-wr{background:var(--panel);color:var(--ink);padding:0 var(--m)}
.a-wh{display:flex;flex-direction:column;justify-content:flex-end;gap:10px;padding-bottom:20px}
.a-wtitle{font-size:44px;line-height:1}
.a-w{display:flex;align-items:center;font-family:var(--body);font-size:22px;line-height:1.25;font-weight:500;border-top:1px solid var(--quiet)}
.a-wr:not(.a-wh){display:flex;flex-direction:column;justify-content:center;gap:4px;border-top:1px solid var(--quiet)}
.a-n{font-family:var(--body);font-size:16px;line-height:1.35;color:var(--ink)}
.a-b{font-family:var(--body);font-size:13px;line-height:1.4;color:var(--soft)}

/* messaging: the name, the lines as panels, the rules and boilerplate along the foot */
.a-msg{bottom:auto;height:400px;display:grid}
.a-mname{display:flex;flex-direction:column;justify-content:flex-end;gap:10px;padding:0 40px 40px var(--m)}
.a-nm{font-size:80px;line-height:1}
.a-ml{position:relative;display:flex;flex-direction:column;justify-content:flex-end;padding:0 24px 40px;font-family:var(--body);font-size:20px;line-height:1.25;font-weight:600}
.a-mlab{position:absolute;left:24px;top:36px;margin:0}
.a-mrow{position:absolute;left:0;right:0;top:400px;bottom:0;padding:36px var(--m) 72px;background:var(--ground);color:var(--ink);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px;align-items:start}
.a-mrow>div{border-top:2px solid var(--ink);padding-top:14px}
.a-mrow .h3{margin-bottom:8px}

/* logo, clear space: the logo alone on its ground, the construction drawn full size */
.a-lg{display:flex;align-items:center;justify-content:center}
.a-lg--zone{padding-bottom:60px}
.a-zone{position:relative;background:var(--panel);flex:none}
.a-zin{position:absolute;background:var(--ground)}
.a-unit{position:absolute;box-sizing:border-box;border:1px dashed var(--quiet-panel)}
.a-dim{position:absolute;display:block;background:var(--ink)}
.a-dim--v{width:1px;transform:translateX(-0.5px)}
.a-dim--h{height:1px;transform:translateY(-0.5px)}
.a-dim b{position:absolute;font-size:12px;font-weight:500;line-height:1;color:var(--ink)}
.a-dim--v b{left:8px;top:50%;transform:translateY(-50%)}
.a-dim--h b{left:50%;top:8px;transform:translateX(-50%)}

/* minimum size: one half per measure, each drawn at actual size */
.a-halves{display:grid;grid-template-columns:1fr 1fr}
.a-half{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:100px var(--m) 72px;margin:0}
.a-half .lead{max-width:360px}
.a-mslogo{display:flex;flex-direction:column;align-items:flex-start;gap:10px;align-self:center}
.a-ruler{display:block;height:6px;border:1px solid var(--ink);border-top:0;box-sizing:border-box}

/* a strip of lead copy over a run of full-height panels: logo on grounds, misuse, palette */
.a-glead{position:absolute;left:var(--m);top:72px;width:880px}
.a-ggrid,.a-mgrid,.a-pal{position:absolute;left:0;right:0;bottom:0;display:grid;border-top:1px solid var(--hair)}

/* logo on grounds */
.a-ggrid{top:132px;grid-template-columns:repeat(4,minmax(0,1fr)) 2fr}
.a-gcell{display:flex;flex-direction:column;min-height:0;margin:0}
.a-gart{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.a-gart--photo{display:block}
.a-gcell .cap{padding:16px 24px 72px}
.a-gcell:first-child .cap{padding-left:var(--m)}

/* logo misuse: six slides in a mosaic, each caption over its example */
.a-mgrid{top:112px;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))}
.a-mt{position:relative;display:flex;flex-direction:column;min-height:0;margin:0}
.a-mt .cap{flex:none;padding:20px 64px 0 24px}
.a-art{flex:1;min-height:0;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.a-art--photo{display:block}
.a-boxed{border:2px solid var(--ink);padding:12px 18px;line-height:0}

/* palette: one panel per colour, edge to edge */
.a-pal{top:132px}
.a-pt-tile{display:flex;flex-direction:column;justify-content:space-between;padding:28px 24px 72px;margin:0;min-height:0;font-family:var(--body)}
.a-p0{padding-left:var(--m)}
.a-ptext{font-size:44px;line-height:1.05}
.a-ptext2{font-size:15px;line-height:1.45;font-weight:500}
.a-pn{display:block;font-size:24px;line-height:1.1;margin-bottom:8px}
.a-p0 .a-pn{font-size:36px}

/* proportion: the slide is the page, split by area */
.a-pg{display:grid}
.a-pgcol,.a-pgrow{display:grid;min-height:0;min-width:0}
.a-pb{position:relative;min-height:0;min-width:0;padding:28px 32px 36px;display:flex;flex-direction:column;justify-content:flex-end}
.a-pgb{padding:96px var(--m) 72px;justify-content:space-between}
.a-pgtxt{display:flex;flex-direction:column;gap:20px;max-width:440px}
.a-pcl{display:flex;flex-direction:column;gap:4px}
.a-pctn{font-size:72px;line-height:1}
.a-pctn--xl{font-size:144px}
.a-pcn{font-family:var(--body);font-size:15px;font-weight:500}

/* colour values: one slide per colour, the ramp as a build strip across its top edge, the values along its foot */
.a-vgrid{display:grid;grid-template-rows:repeat(2,minmax(0,1fr))}
.a-vcell{position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:16px;padding:0 28px 64px;min-height:0;min-width:0}
.a-vcell--note{justify-content:flex-start;padding-top:104px;background:var(--ground)}
.a-vcell--tones{justify-content:flex-end;gap:12px}
.a-vcell--tones .h3{margin:0}
.a-vramp{position:absolute;left:0;right:0;top:0;display:grid;grid-template-columns:repeat(10,minmax(0,1fr))}
.a-chip{position:relative;display:block;height:44px}
.a-chip em{position:absolute;left:6px;top:100%;margin-top:14px;font-style:normal;font-size:11px;line-height:1}
.a-vv .a-mono{font-size:13px}
.a-chip--base::after{content:'';position:absolute;left:0;right:0;top:100%;margin-top:4px;height:4px;background:var(--ci)}
.a-vnote{position:absolute;left:28px;top:16px;font-size:12px}
.a-vn{font-size:44px;line-height:1}
.a-vv{display:grid;grid-template-columns:52px minmax(0,1fr);gap:4px 0;margin:0;align-items:baseline}
.a-vv dt{font-size:11px}
.a-vv dd{margin:0}
.a-tones{display:flex;flex-direction:column;gap:10px}
.a-tones li{display:flex;gap:12px;align-items:center}
.a-tones .a-sw{width:20px;height:20px}
.a-tones li span{display:flex;flex-direction:column;gap:2px;font-size:12px;color:inherit}
.a-tones b{font-weight:500}
`;
}
