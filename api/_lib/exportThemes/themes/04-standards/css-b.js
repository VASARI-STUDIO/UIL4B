// Styles for guidelines-b.js. Appended to css() in index.js and scoped to the .pg custom properties set there. Every class starts b-.
import { cssStr } from '../../engine/escape.js';
export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono;
  return `
.pg{--bmono:'${cssStr(mono.family)}',monospace}
.b-mono{font-family:var(--bmono);font-size:13px;line-height:1.4;font-weight:400}
.pg--std .photo-slot{border:1.5px dashed var(--quiet-panel)}

/* wide pages: a title strip, then the work across the whole page */
.b-tl{position:absolute;left:var(--m);right:var(--m);top:104px;display:grid;grid-template-columns:250px minmax(0,560px);gap:0 40px;align-items:start}
.b-tl h2{font-size:22px;font-weight:600;line-height:1.25}
.b-tl .b-lead{font-size:13px;line-height:1.5;color:var(--quiet);padding-top:3px}
.b-wk{position:absolute;left:var(--m);right:var(--m);top:182px;bottom:56px;display:flex;flex-direction:column}

/* the manual's drawn devices: clause numbers, type gauges with cap-height and x-height guides, end-tick brackets */
.b-n{font-size:12px;line-height:1.4;font-weight:400;color:var(--quiet);font-variant-numeric:tabular-nums}
.b-gs{display:block;overflow:visible}
.b-gg{stroke:var(--hair);stroke-width:1}
.b-gg--b{stroke:var(--quiet)}
.b-gg--d{stroke:var(--hair)}
.b-gb{stroke:var(--ink);stroke-width:1;fill:none}
.b-gt{fill:var(--ink)}
.b-gl{font-family:var(--chrome);font-weight:400;font-size:11px;fill:var(--quiet)}

/* typefaces: one clause per face, a gauge for the sample */
.b-faces{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.b-fc{border-top:1px solid var(--ink);padding-top:8px}
.b-fh{display:grid;grid-template-columns:44px 64px 140px 130px minmax(0,1fr);gap:0 8px;font-size:12px;line-height:1.4;color:var(--quiet)}
.b-fh b{font-size:13px;font-weight:600;color:var(--ink)}
.b-fc__w{display:flex;gap:24px;align-items:center;margin-top:8px}
.b-fc__r{flex:1;min-width:0}
.b-glyphs{font-size:22px;line-height:1.2;color:var(--ink)}
.b-glyphs--body{font-family:var(--body);font-weight:400;font-size:19px;line-height:1.4;letter-spacing:0}
.b-weights{margin-top:10px}
.b-weights li{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:baseline;font-size:20px;line-height:1.5;color:var(--soft);border-top:1px solid var(--hair)}
.b-wn{font-family:var(--chrome);font-weight:400;font-size:12px;color:var(--quiet)}
.b-xnote{display:grid;grid-template-columns:44px minmax(0,1fr);gap:0 8px;padding-top:8px;border-top:1px solid var(--hair)}
.b-xnote b{display:inline;font-weight:600;font-size:13px}
.b-fc--mono .b-fc__w{margin-top:2px}

/* hierarchy: one clause per style, the sample on its own gauge */
.b-scale{height:100%}
.b-sc{display:grid;grid-template-columns:44px minmax(0,1fr) 268px;align-items:center;gap:0 8px;height:86px;border-top:1px solid var(--hair)}
.b-sc:first-child{border-top-color:var(--ink)}
.b-sc:last-child{border-bottom:1px solid var(--hair)}

/* type in use: the piece on the left, its specification on a leader on the right */
.b-use{height:100%;display:grid;grid-template-columns:470px minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto auto;gap:28px 0}
.b-use__f{margin:0;display:flex;flex-direction:column;gap:8px;min-height:0}
.b-h{align-self:start;text-wrap:balance;color:var(--ink);margin:0}
.b-p{font-family:var(--body);font-weight:400;color:var(--soft);max-width:420px;align-self:start;margin:0}
.b-us{display:flex;gap:12px;align-items:flex-start;min-width:0}
.b-use__f+.b-us{align-self:end}
.b-us .cap{min-width:0}
.b-ld{flex:none;position:relative;width:40px;border-top:1px solid var(--ink);margin-top:9px}
.b-ld::before{content:'';position:absolute;left:0;top:-4px;height:7px;border-left:1px solid var(--ink)}
.b-use__f+.b-us .b-ld{margin-top:auto;align-self:flex-end;margin-bottom:9px}

/* type rules: one clause per rule, the right and the wrong specimen, the wrong one struck through */
.b-rules{height:100%;display:flex;flex-direction:column}
.b-rule{flex:1;min-height:0;display:grid;grid-template-columns:40px 262px minmax(0,1fr) minmax(0,1fr);gap:0 12px;align-items:center;border-top:1px solid var(--hair);padding:8px 0}
.b-rule:first-child{border-top-color:var(--ink)}
.b-rule:last-child{border-bottom:1px solid var(--hair)}
.b-rule__t{display:flex;flex-direction:column;gap:6px}
.b-rt{display:flex;gap:8px;align-items:flex-start;font-family:var(--body);font-size:13px;line-height:1.4;color:var(--ink)}
.b-rt b{font-weight:600;margin-right:6px}
.b-rt .ui-icon{margin-top:1px;flex:none}
.b-rt--no{color:var(--soft)}
.b-sp{position:relative;height:76px;display:flex;align-items:center;padding:0 10px;box-sizing:border-box;box-shadow:inset 0 0 0 1px var(--hair);overflow:hidden}
.b-sp--no{box-shadow:inset 0 0 0 1px var(--hair)}
.b-demo{display:flex;align-items:center;font-family:var(--body);font-weight:400;color:var(--ink)}
.b-tab{line-height:1.2}
.b-xx{position:absolute;inset:0;width:100%;height:100%}
.b-xx path{stroke:var(--ink);stroke-width:1;fill:none}

/* photo direction: the frame divided in thirds, then the five lines as clauses in two columns */
.b-photo{height:100%;display:flex;flex-direction:column;gap:28px}
.b-pdw{display:grid;grid-template-columns:34px minmax(0,1fr);gap:0 8px;height:250px;flex:none}
.b-th3{display:flex;flex-direction:column;border-right:1px solid var(--ink)}
.b-th3 span{flex:1;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;border-top:1px solid var(--ink);font-size:11px;line-height:1;color:var(--ink);font-variant-numeric:tabular-nums}
.b-th3 span:last-child{border-bottom:1px solid var(--ink)}
.b-pd{position:relative;margin:0;overflow:hidden;height:100%}
.b-pd .photo-slot{position:absolute;inset:0}
.b-pd__band{position:absolute;left:0;right:0;top:0;height:33.333%;border-bottom:1.5px dashed var(--ink)}
.b-pd__h{position:absolute;left:0;right:0;top:66.667%;border-top:1.5px solid var(--ink)}
.b-pd__l{position:absolute;right:12px;font-size:11px;line-height:1.3;color:var(--quiet-panel)}
.b-pd__l--top{top:12px}
.b-pd__l--mid{top:calc(66.667% + 6px)}
.b-dirs{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-rows:min-content;align-content:space-between;gap:0 32px}
.b-dir{display:grid;grid-template-columns:44px minmax(0,1fr);padding:10px 0;border-top:1px solid var(--hair)}
.b-dir:nth-child(-n+2){border-top-color:var(--ink)}
.b-dir b{display:block;font-size:13px;font-weight:600;line-height:1.5}
.b-dir p{font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft)}

/* shot list: an index, one clause per photograph */
.b-shots{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.b-shot{display:grid;grid-template-columns:44px 176px minmax(0,1fr);gap:0 16px;min-height:98px;padding-top:8px;box-sizing:border-box;border-top:1px solid var(--hair)}
.b-shot:first-child{border-top-color:var(--ink)}
.b-shot__img{height:90px;overflow:hidden}
.b-shot__n{font-size:15px;font-weight:600;line-height:1.3}
.b-shot__b{font-family:var(--body);font-size:14px;line-height:1.4;color:var(--soft);margin-top:2px}
.b-shot__t .cap{margin-top:4px}
.b-shot--slot{flex:none}
.b-shot--slot .b-shot__img{height:52px}
.b-shot--slot .cap{margin-top:4px}

/* imagery rules: one clause per rule, the right frame and the wrong one side by side */
.b-irs{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.b-ir{display:grid;grid-template-columns:40px minmax(0,1fr) minmax(0,1fr);gap:0 20px;height:146px;padding-top:8px;box-sizing:border-box;border-top:1px solid var(--hair)}
.b-ir:first-child{border-top-color:var(--ink)}
.b-ih{display:grid;grid-template-columns:168px minmax(0,1fr);gap:0 12px;min-height:0}
.b-ir__tile{position:relative;overflow:hidden;min-height:0}
.b-ir__cap{display:flex;gap:6px;align-items:flex-start}
.b-ir__cap b{display:block;font-weight:600}
.b-ir__cap .ui-icon{margin-top:1px;color:var(--ink);flex:none}
.b-tile{position:absolute;inset:0;font-size:12px;line-height:1.4;overflow:hidden}
.b-tile>span:first-child{position:relative;z-index:1;max-width:100%}
.b-tag{position:absolute;left:10px;top:10px;z-index:2;font-style:normal;font-size:11px;line-height:1.3;padding:2px 6px;background:var(--ground);color:var(--ink)}
.b-lvl{position:absolute;left:0;right:0;top:46%;border-top:1.5px solid var(--ink)}
.b-lvl--tilt{transform:rotate(-7deg)}
.b-buoyring{position:absolute;right:14px;top:30px;width:36px;height:36px;border-radius:50%;border:8px solid var(--buoy);box-sizing:border-box}
.b-wash{position:absolute;left:0;right:0;top:0;height:58%;background:var(--buoy);opacity:.55}
.b-lg{position:absolute;left:0;right:0;top:0;height:58%;display:flex;align-items:center;justify-content:center}
.b-lg--top{z-index:1}
.b-busy{position:absolute;inset:0;width:100%;height:100%;color:var(--quiet-panel);opacity:.55}

/* grid: a dimensioned drawing, the column spans drawn under it, the measures as clauses beside it */
.b-grid{height:100%}
.b-gd{display:flex;flex-direction:column}
.b-gd__l{display:flex;flex-direction:column}
.b-gd__r{display:flex;gap:6px}
.b-dims{position:relative;height:40px;margin-left:36px;flex:none}
.b-dim{position:absolute;bottom:2px;height:8px;border:1px solid var(--ink);border-top:0;box-sizing:border-box}
.b-dim em{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);font-style:normal;font-size:11px;line-height:1;color:var(--ink);white-space:nowrap;font-variant-numeric:tabular-nums}
.b-dim em.b-hi{bottom:24px}
.b-vdim{position:relative;flex:none;width:30px;box-sizing:border-box;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.b-vdim::before{content:'';position:absolute;top:0;bottom:0;right:4px;border-left:1px solid var(--ink)}
.b-vdim em{position:absolute;right:4px;top:50%;transform:translate(50%,-50%) rotate(90deg);background:var(--ground);padding:0 6px;font-style:normal;font-size:11px;line-height:1.2;color:var(--ink)}
.b-gpage{position:relative;flex:none;background:var(--ground);overflow:hidden}
.b-gpage::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none}
.b-gcol{position:absolute;top:0;bottom:0;background:var(--panel)}
.b-gh,.b-gc,.b-gph{position:absolute}
.b-gh{color:var(--ink)}
.b-gc{color:var(--quiet-panel)}
.b-gph{overflow:hidden}
.b-gph .photo-slot{border:1.5px dashed var(--quiet-panel)}
.b-sdims{position:relative;height:40px;margin:6px 0 0 36px;flex:none}
.b-sdim{position:absolute;top:0;height:8px;border:1px solid var(--ink);border-bottom:0;box-sizing:border-box}
.b-sdim em{position:absolute;top:12px;left:50%;transform:translateX(-50%);font-style:normal;font-size:11px;line-height:1.2;color:var(--ink);white-space:nowrap}
.b-meas{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0 20px;margin-top:4px}
.b-meas li{display:block;padding-top:8px;border-top:1px solid var(--hair)}
.b-meas li:first-child{border-top-color:var(--ink)}

/* layouts and social */
.b-lays{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.b-lay{display:grid;grid-template-columns:40px auto minmax(0,1fr);gap:0 20px;align-items:start;padding-top:8px;border-top:1px solid var(--hair)}
.b-lay:first-child{border-top-color:var(--ink)}
.b-lay__t{display:flex;flex-direction:column;gap:10px;min-width:0}
.b-thumb,.b-post{position:relative;flex:none;overflow:hidden;background:var(--ground)}
.b-thumb::after,.b-post::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none}
.b-ab{position:absolute}
.b-ab .photo-slot{border:1px dashed var(--quiet-panel)}
.b-th{display:block;margin:0;color:inherit;letter-spacing:0}
.b-lspec{border-bottom:1px solid var(--hair)}
.b-lspec li{display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.4;color:var(--ink)}
.b-lspec li span:first-child{color:var(--quiet)}
.b-socials{height:100%;display:flex;align-items:flex-start;justify-content:space-between}
.b-sfig{display:flex;flex-direction:column;gap:8px;width:229px}
.b-sfig__r{display:flex;gap:10px}
.b-sfig .cap{margin-top:4px}

/* dimension lines with end ticks, used on the drawings */
.b-dh{position:relative;height:14px;box-sizing:border-box;border-left:1px solid var(--ink);border-right:1px solid var(--ink)}
.b-dh::before{content:'';position:absolute;left:0;right:0;top:50%;border-top:1px solid var(--ink)}
.b-dh__l,.b-dv__l{position:absolute;background:var(--ground);padding:0 8px;font-size:11px;line-height:1.2;color:var(--ink)}
.b-dh__l{left:50%;top:50%;transform:translate(-50%,-50%)}
.b-dv{position:relative;flex:none;width:14px;box-sizing:border-box;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.b-dv::before{content:'';position:absolute;top:0;bottom:0;left:50%;border-left:1px solid var(--ink)}
.b-dv__l{left:50%;top:50%;transform:translate(-50%,-50%) rotate(90deg);white-space:nowrap}
/* a numbered tag: the clause that governs the part it sits on */
.b-tg{position:absolute;z-index:2;display:inline-flex;align-items:center;justify-content:center;height:18px;padding:0 5px;box-sizing:border-box;background:var(--ground);color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink);font-family:var(--chrome);font-style:normal;font-weight:400;font-size:11px;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:0;text-transform:none}
.b-tg--r{left:calc(100% + 44px);top:50%;margin-top:-9px}
.b-tg--r::before{content:'';position:absolute;right:100%;top:50%;width:44px;border-top:1px solid var(--ink)}
.b-lb{font-weight:600;color:var(--ink)}

/* signage: the sign drawn large, each part tagged with its clause */
.b-signw{padding-top:4px}
.b-sgd{display:flex;flex-direction:column;gap:10px}
.b-sgd__r{display:flex;gap:10px}
.b-sg{position:relative;flex:none;box-sizing:border-box;padding:28px 32px 24px;background:var(--dark);color:var(--dark-ink);display:flex;flex-direction:column;justify-content:space-between}
.b-sg__h{position:relative;font-size:52px;line-height:.95;color:var(--dark-ink);margin:0}
.b-sg__rows{display:flex;flex-direction:column}
.b-sg__r{display:grid;grid-template-columns:120px minmax(0,1fr) auto;align-items:baseline;gap:0 16px;padding:8px 0;border-top:1px solid var(--dark-ink);font-family:var(--body);font-weight:500;font-size:20px;line-height:1.2}
.b-sg__r:first-child{border-top:0}
.b-sg--slot .b-sg__r{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto}
/* a placeholder is set at 20 px whatever the cell, so in the slot edition the time cell's line box matches it */
.b-sg--slot .b-sg__t{font-size:20px;line-height:1.2}
.b-sg__r--hot{position:relative;background:var(--buoy);color:var(--buoy-ink);margin:0 -32px;padding:8px 32px;border-top:0}
.b-sg__t{position:relative;font-size:44px;line-height:1;font-variant-numeric:tabular-nums}
.b-sg__d{font-weight:600}
.b-sg__s{position:relative;font-size:16px;font-weight:500}
.b-sg__f{position:relative;display:flex}

/* email signature: the message, each part leadered to its clause */
.b-mailw{padding-top:4px}
.b-mail{width:600px;background:var(--raised);font-family:var(--body);color:var(--ink);box-shadow:0 0 0 1px var(--hair)}
.b-mail__h{position:relative;padding:20px 28px 16px;border-bottom:1px solid var(--hair);font-family:var(--chrome);font-size:12px;line-height:1.4;display:flex;flex-direction:column;gap:6px}
.b-mail__h p>span:first-child{display:inline-block;width:60px;color:var(--quiet)}
.b-mail__h .b-mail__t{position:absolute;right:28px;top:20px;color:var(--quiet)}
.b-mail__b{padding:24px 28px 28px;font-size:16px;line-height:1.5}
.b-mail__b>p+p{margin-top:12px}
.b-sig{margin-top:24px;padding-top:20px;border-top:1px solid var(--hair)}
.b-sig__logo{position:relative;margin-bottom:14px}
.b-sig__logo .b-dh{margin-bottom:8px}
.b-sig__n{position:relative;font-size:17px;font-weight:600;line-height:1.3}
.b-sig__r{font-size:14px;line-height:1.4;color:var(--soft)}
.b-sig__c{font-size:14px;line-height:1.5;margin-top:10px}
.b-sig__l{position:relative;font-size:14px;line-height:1.4;color:var(--quiet);margin-top:10px}

/* digital: the product screen uses the kit's components and tokens, scoped to .ui in css-kit.js */
.b-win{display:flex;flex-direction:column;box-shadow:inset 0 0 0 1px var(--hair);overflow:visible}
.b-win__url{height:34px;flex:none;display:flex;align-items:center;padding:0 16px;background:var(--panel);font-family:var(--chrome);font-size:12px;color:var(--quiet-panel)}
.b-win__url span{background:var(--ground);padding:3px 16px}
.b-win__body{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:28px;padding:20px 24px 28px;font-family:var(--body)}
.b-trk{display:flex;flex-direction:column;gap:14px;min-width:0}
.b-trk__top{display:flex;gap:12px;align-items:center}
.b-trk__t{font-size:13px;color:var(--quiet)}
.b-trk__e{position:relative}
.b-trk__eta{font-size:56px;line-height:1.02;color:var(--text)}
.b-trk__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}
.b-trk__p{font-size:14px;color:var(--text-soft,var(--text))}
.b-trk__rider{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--divider);border-bottom:1px solid var(--divider)}
.b-trk__rider .ui-btn{margin-left:auto}
.b-trk__rn{font-size:16px;font-weight:600;line-height:1.3}
.b-trk__rs{font-size:13px;color:var(--quiet)}
.b-trk__facts{display:flex;align-items:center;gap:24px}
.b-trk__fl{font-size:12px;color:var(--quiet)}
.b-trk__fv{font-size:16px;font-weight:500}
.b-tgw{position:relative;display:inline-flex;margin-left:auto}
.b-dl{display:flex;flex-direction:column;gap:8px;min-width:0}
.b-dl__h{font-size:13px;line-height:1.4;color:var(--text)}
.b-dl__l{position:relative}

/* summary: three clauses down the left, the faces and the proportion table down the right */
.b-sum{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:0 36px;align-items:start}
.b-sum__l,.b-sum__r{display:flex;flex-direction:column;gap:28px}
.b-sec{border-top:1px solid var(--ink);padding-top:8px}
.b-sec__h{display:flex;gap:12px;align-items:baseline;margin-bottom:14px;font-size:12px;line-height:1.4}
.b-sec__h b{font-size:13px;font-weight:600}
.b-lines{display:flex;flex-direction:column;gap:12px}
.b-ln{font-family:var(--body);font-weight:400;font-size:15px;line-height:1.4;color:var(--soft)}
.b-ln--first{font-family:var(--display);font-weight:700;font-size:30px;line-height:1.05;color:var(--ink);text-wrap:balance}
.b-faces2{display:flex;flex-direction:column;gap:14px}
.b-faces2 p{display:flex;align-items:center;gap:16px}
.b-aa2{font-size:64px;line-height:1;width:96px;color:var(--ink)}
.b-aa2--body{font-family:var(--body);font-weight:500}
.b-prt li{display:grid;grid-template-columns:16px 112px minmax(0,1fr) 36px;align-items:center;gap:0 10px;padding:8px 0;border-top:1px solid var(--hair)}
.b-prt li:first-child{border-top:0;padding-top:0}
.b-scw{width:16px;height:16px}
.b-prt .cap b{display:block}
.b-pr__bar{display:block;height:12px}
.b-pr__bar i{display:block;height:100%;min-width:3px}
.b-pr__v{text-align:right;font-size:12px;color:var(--ink)}

/* contact and scope */
.b-cs{height:100%;display:flex;flex-direction:column;gap:36px}
.b-cs__top{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:0 40px;border-top:1px solid var(--ink);padding-top:12px}
.b-cs .h3{border-top:0;padding-top:0;margin:0 0 8px}
.b-cs__h{font-size:44px;line-height:1.05;color:var(--ink)}
.b-cs__p{font-family:var(--body);font-weight:400;font-size:15px;line-height:1.6;color:var(--soft);margin-top:14px;max-width:380px}
.b-vt{border-collapse:collapse;width:100%;font-family:var(--body);font-size:13px}
.b-vt td{padding:10px 16px 10px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.b-cs__ix{border-top:1px solid var(--ink);padding-top:12px}
.b-in{columns:2;column-gap:40px}
.b-in li{break-inside:avoid;display:grid;grid-template-columns:32px minmax(0,1fr) 32px;padding:11px 0;border-top:1px solid var(--hair);font-family:var(--body);font-size:15px;line-height:1.4}
.b-sn{color:var(--quiet)}
.b-sp2{text-align:right;color:var(--quiet)}

/* the hull sheet (photo direction): the ferry drawn at x = 4 px across the page, the shot clauses keyed on it, then the clauses */
.b-hull{height:100%;display:flex;flex-direction:column;gap:18px}
.b-hs{margin:0;display:flex;flex-direction:column;gap:10px}
.b-hsf{position:relative;isolation:isolate;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.b-hd{position:absolute;left:0;top:0;overflow:visible}
.b-hd path{fill:none;stroke:var(--ink);stroke-width:1}
.b-hd .b-hd__b{stroke:var(--quiet);stroke-dasharray:4 3}
.b-hl{position:absolute;padding:0 4px;background:var(--ground);font-size:11px;line-height:14px;color:var(--ink);white-space:nowrap}
.b-hb{position:absolute;left:44px;top:40px;font-size:40px;line-height:1;color:var(--ink)}
.b-hsc{display:grid;grid-template-columns:300px minmax(0,1fr);gap:0 40px;align-items:start}
.b-hsd{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 16px;margin:0}
.b-hsd div{display:flex;flex-direction:column;padding:4px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.35}
.b-hsd dt{color:var(--quiet)}
.b-hsd dd{margin:0;color:var(--ink)}
.b-dirs--5{grid-template-columns:repeat(5,minmax(0,1fr));gap:0 20px;align-content:start}
.b-dirs--5 .b-dir{grid-template-columns:1fr;gap:2px}
.b-dirs--5 .b-dir:nth-child(-n+5){border-top-color:var(--ink)}
.b-dirs--5 .b-dir p{font-size:13px}

/* drawings standing in for photographs elsewhere */
.b-use__d{flex:1;min-height:0;box-shadow:inset 0 0 0 1px var(--hair)}
.b-tile--d{background:var(--ground);box-shadow:inset 0 0 0 1px var(--hair)}
.dr-wash{fill:var(--buoy);fill-opacity:.55}
.b-lt{margin:0;font-family:var(--body);font-weight:400;line-height:1.35;color:var(--ink)}
.b-lt--q{color:var(--quiet)}
`;
}
