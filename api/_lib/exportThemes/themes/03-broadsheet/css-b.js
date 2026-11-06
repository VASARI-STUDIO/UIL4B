// Styles for guidelines-b.js (theme 03, Broadsheet). Appended to css() in index.js; same custom properties (.pg vars). Every class starts b-.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { cssStr } from '../../engine/escape.js';

export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono;
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--bmono:'${cssStr(mono.family)}',monospace}
.b-mono{font-family:var(--bmono);font-size:13px;line-height:1.4}
.b-fill{flex:1;min-height:0;display:flex;flex-direction:column;gap:18px}
.b-hl{font-family:var(--display);font-weight:400;font-size:56px;line-height:1.02;letter-spacing:-0.01em}
.b-fh{font-family:var(--body);font-size:18px;font-weight:700;line-height:1.2}

/* typefaces: the specimen sheet. The display face is the lead story, body and literal faces are briefs down the right */
.b-tf{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:0 48px}
.b-tf__lead{display:flex;flex-direction:column;gap:8px;min-height:0;border-top:3px solid var(--ink);padding-top:10px}
.b-fh--lead{font-size:14px}
.b-tf__name{font-size:124px;line-height:1.02;letter-spacing:-0.01em;margin:4px 0 4px;white-space:nowrap}
.b-tf__set{display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 36px;align-items:center;margin-top:auto;padding-top:14px;border-top:1px solid var(--hair)}
.b-aa{font-size:168px;line-height:.9;margin:0 0 -8px}
.b-glyphs{font-size:20px;line-height:1.4}
.b-tf__side{display:flex;flex-direction:column;padding-left:32px;border-left:1px solid var(--hair);min-height:0}
.b-tf__brief{padding:10px 0 20px;border-top:3px solid var(--ink)}
.b-tf__brief+.b-tf__brief{margin-top:auto;border-top-width:1px}
.b-tf__brief .b-fh{margin-bottom:12px;font-size:14px}
.b-tf__row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 16px;align-items:center}
.b-aa2{font-size:64px;line-height:1;width:96px;color:var(--ink);font-family:var(--display)}
.b-aa2--body{font-family:var(--body);font-weight:500;letter-spacing:-0.02em}
.b-fname{font-size:26px;line-height:1.1}
.b-fname--body{font-family:var(--body);font-weight:700;font-size:22px;margin-bottom:2px}
.b-weights{margin-top:14px}
.b-weights li{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:baseline;font-family:var(--body);font-size:15px;line-height:1.9;color:var(--soft);border-top:1px solid var(--hair)}
.b-wn{font-family:var(--chrome);font-weight:400;font-size:12px;color:var(--quiet)}
.b-monosample{font-size:26px;line-height:1.2;min-width:96px}
.b-licence{flex:none;border-top:1px solid var(--ink);padding-top:10px;max-width:820px}

/* hierarchy: a mock front page, each style labelled in the margin with a leader rule */
.b-front{flex:1;min-height:0;align-content:space-between;display:grid;grid-template-columns:190px minmax(0,1fr) 300px;grid-template-rows:auto auto auto auto auto auto;gap:14px 24px;
  grid-template-areas:"l1 n in" "l2 h ph" "l3 t ph" "l4 d ph" "l5 b ph" "l6 l6 c"}
.b-lb{display:flex;align-items:flex-start;gap:10px;min-width:0}
.b-lb .cap{flex:none;width:150px}
.b-ld{flex:1;height:1px;margin-top:7px;background:var(--ink)}
.b-fp{min-width:0;margin:0}
.b-fp--np{white-space:nowrap;border-bottom:3px solid var(--ink);padding-bottom:6px;letter-spacing:-0.01em}
.b-fp--cols{columns:2;column-gap:24px;column-rule:1px solid var(--hair);color:var(--soft)}
.b-hlead{align-self:end;color:var(--soft)}
.b-fp__ph{min-height:0;display:flex}
.b-fp__ph .photo-slot{flex:1;min-height:0}
.b-ch{font-family:var(--chrome);color:var(--quiet)}
.b-bd{color:var(--ink)}

/* type in use: an article, the specs as notes in the margin */
.b-art{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:0 40px}
.b-art__main{display:flex;flex-direction:column;gap:16px;min-height:0}
.b-h{max-width:820px;text-wrap:balance;color:var(--ink);margin:0}
.b-art__txt{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:0 32px;padding-top:12px;border-top:3px solid var(--ink)}
.b-dk{font-family:var(--body);font-weight:500;color:var(--ink)}
.b-p{font-family:var(--body);color:var(--soft)}
.b-art__fig{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.b-art__fig .photo-slot{flex:1;min-height:0;align-items:flex-end;padding:12px}
.b-art__notes{display:flex;flex-direction:column;padding-left:32px;border-left:1px solid var(--hair)}
.b-art__notes .cap{padding:12px 0;border-top:1px solid var(--hair)}
.b-art__notes .cap:first-child{border-top:3px solid var(--ink)}

/* type rules: five ruled columns, do above the rule and don't below; the margin names the row */
.b-trh{flex:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 48px;align-items:end;padding-bottom:12px;border-bottom:3px solid var(--ink)}
.b-tr{flex:1;min-height:0;display:grid;grid-template-columns:70px minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr)}
.b-trk{margin:0;padding-top:12px;font-size:14px}
.b-trk--no{border-top:1px solid var(--ink)}
.b-trrow{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));min-height:0}
.b-trrow--no{border-top:1px solid var(--ink)}
.b-trc{display:flex;flex-direction:column;justify-content:space-between;gap:12px;padding:12px 20px 12px;border-left:1px solid var(--hair);min-height:0}
.b-trc:first-child{border-left:0;padding-left:0}
.b-trc:last-child{padding-right:0}
.b-demo{min-height:30px;display:flex;align-items:flex-start;font-family:var(--body);color:var(--ink)}
.b-rt{display:flex;gap:8px;align-items:flex-start;font-family:var(--body);font-size:14px;line-height:1.4;color:var(--ink)}
.b-rt .ui-icon{flex:none;margin-top:1px}
.b-rt--no{color:var(--soft)}

/* photo direction: the five directions run as ruled text columns beside the picture */
.b-photo{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:0 48px}
.b-photo__text{display:flex;flex-direction:column;gap:20px;min-height:0}
.b-dirs{columns:2;column-gap:36px;column-rule:1px solid var(--hair);flex:1;min-height:0;border-top:3px solid var(--ink);padding-top:14px}
.b-dir{break-inside:avoid;margin-bottom:28px}
.b-dir b{display:block;font-family:var(--display);font-size:26px;font-weight:400;line-height:1.1;color:var(--ink);margin-bottom:6px}
.b-dir p{font-family:var(--body);font-size:16px;line-height:1.55;color:var(--soft)}
.b-photo__img{min-height:0;display:flex;flex-direction:column;gap:8px;padding-left:32px;border-left:1px solid var(--hair)}
.b-photo__img .photo-slot{flex:1;min-height:0;align-items:flex-end;padding:12px}

/* shot list: the picture page, ruled columns of pictures of different weights */
.b-shots{flex:1;min-height:0;display:grid;grid-template-columns:1.45fr 1fr 1fr 1.2fr}
.b-shotc{display:flex;flex-direction:column;gap:16px;min-height:0;padding:0 20px;border-left:1px solid var(--hair)}
.b-shotc:first-child{padding-left:0;border-left:0}
.b-shotc:last-child{padding-right:0}
.b-shot{flex:1;display:flex;flex-direction:column;min-height:0}
.b-shot__img{flex:1;min-height:0;overflow:hidden}
.b-shot .cap{margin-top:8px}
.b-shot .photo-slot{align-items:flex-end;padding:12px}

/* imagery rules: the work column, then the corrections column ruled off */
.b-irc{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 56px}
.b-irs{min-height:0;display:flex;flex-direction:column;justify-content:space-between;border-top:3px solid var(--ink)}
.b-irs--no{border-top:3px double var(--ink);padding-left:28px;border-left:1px solid var(--hair)}
.b-ir{display:grid;grid-template-columns:220px minmax(0,1fr);gap:20px;align-items:center;padding:10px 0;border-bottom:1px solid var(--hair)}
.b-ir:last-child{border-bottom:0}
.b-ir__tile{position:relative;overflow:hidden;width:220px;height:112px;background:var(--panel)}
.b-ir__cap{display:flex;gap:8px;align-items:flex-start;font-family:var(--body);font-size:14px;line-height:1.45;color:var(--ink)}
.b-ir__cap b{display:block;font-weight:700}
.b-ir__cap .ui-icon{flex:none;margin-top:2px}
.b-lab{position:absolute;left:10px;bottom:8px;font-size:12px;line-height:1.3;color:var(--quiet-panel)}
.b-lab--acc{color:var(--accent-ink)}
.b-wash{position:absolute;inset:0;background:var(--accent)}
.b-edge{position:absolute;left:0;right:0;top:70%;height:3px;background:var(--ink)}
.b-hands{position:absolute;background:var(--hair)}
.b-onp{position:absolute;color:var(--ink)}
.b-flat{position:absolute;inset:0;background:var(--ground);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px var(--hair);color:var(--ink)}
.b-studio{width:100%;height:100%;align-items:center;font-size:12px}
.b-bz{position:absolute;background:var(--hair)}
.b-bz--d{background:var(--ground)}

/* grid: headline and deck across the top, the drawn page as the figure, the measures in a narrow column */
.b-grid{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px}
.b-gtop{flex:none;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,4fr);gap:0 40px;align-items:end;padding-bottom:12px;border-bottom:3px solid var(--ink)}
.b-gt{max-width:520px}
.b-gbody{flex:1;min-height:0;display:grid;grid-template-columns:845px minmax(0,1fr);gap:0 40px;align-items:start}
.b-meas{border-top:1px solid var(--ink)}
.b-meas li{display:flex;flex-direction:column;gap:2px;padding:10px 0;border-bottom:1px solid var(--hair);font-size:13px}
.b-meas li span:first-child{color:var(--quiet)}
.b-meas li span:last-child{font-family:var(--body);font-size:20px;line-height:1.2;color:var(--ink)}
.b-gpage{position:relative;flex:none;background:var(--ground);overflow:hidden}
.b-gpage::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none}
.b-gcol{position:absolute;top:0;bottom:0;background:var(--panel)}
.b-gm{position:absolute;top:50%;transform:translateY(-50%);text-align:center;font-size:12px;color:var(--quiet);font-variant-numeric:tabular-nums}
.b-gh,.b-gc,.b-gph,.b-gb{position:absolute}
.b-gh{color:var(--ink);margin:0}
.b-gc{color:var(--quiet-panel)}
.b-gph{overflow:hidden}
.b-gph .photo-slot{width:100%;height:100%}
.b-gb{background:var(--hair)}

/* layouts: the front page as the lead with its name as a headline, two briefs under it */
.b-lays{flex:1;min-height:0;display:flex;flex-direction:column;gap:24px}
.b-lay{display:grid;gap:0 32px;align-items:start}
.b-lay--lead{grid-template-columns:563px minmax(0,1fr);padding-bottom:20px;border-bottom:3px solid var(--ink)}
.b-lays__r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 0}
.b-lay--sm{grid-template-columns:384px minmax(0,1fr);gap:0 20px}
.b-lay--sm:last-child{padding-left:20px;border-left:1px solid var(--hair)}
.b-lay__cap{display:flex;flex-direction:column;gap:6px}
.b-lay--lead .b-lay__cap{padding-left:0;gap:14px}
.b-lay__n{font-size:26px;line-height:1.1}
.b-lay__cap .cap,.b-lay__cap .lead{max-width:420px}
.b-thumb,.b-post{position:relative;flex:none;overflow:hidden;background:var(--ground)}
.b-thumb::after,.b-post::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none}
.b-ab{position:absolute}
.b-ab .photo-slot{width:100%;height:100%;align-items:flex-end}
.b-th{display:block;margin:0;color:inherit;letter-spacing:-0.01em}

/* social: three ads pasted on one baseline, keyed by figure number to a ruled column of captions */
.b-socials{flex:1;min-height:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 40px;align-items:stretch}
.b-posts{display:flex;align-items:flex-end;gap:24px;border-bottom:3px solid var(--ink);padding-bottom:0}
.b-sfig{display:flex;flex-direction:column;gap:0;align-items:stretch}
.b-sfig__n{margin-top:6px;font-size:12px;color:var(--quiet)}
.b-skey{display:flex;flex-direction:column;border-left:1px solid var(--hair);padding-left:32px;border-top:3px solid var(--ink)}
.b-skey li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:0 8px;padding:14px 0;border-bottom:1px solid var(--hair)}
.b-skey li:last-child{border-bottom:0}
.b-sk{font-family:var(--display);font-size:26px;line-height:1.1;color:var(--accent)}
.b-sh{font-size:26px;line-height:1.1;margin-bottom:6px}

/* signage: the sign as the lead picture on the right, the board photo wide with the specs as four briefs on the left */
.b-sg{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 396px;gap:0 40px}
.b-sg__l{display:flex;flex-direction:column;gap:20px;min-height:0}
.b-sg__a{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding-left:40px;border-left:1px solid var(--hair)}
.b-dim{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--quiet)}
.b-dim span{flex:1;border-top:1px solid var(--ink)}
.b-dim b{font-weight:400}
.b-sign{background:var(--dark);color:var(--dark-ink);padding:26px 24px 24px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;flex:none}
.b-sign__h{font-size:56px;line-height:0.98;letter-spacing:-0.01em;color:var(--dark-ink)}
.b-sign__l{font-family:var(--body);font-size:15px;line-height:1.4;border-top:1px solid var(--dark-ink)}
.b-sign__l li{display:flex;justify-content:space-between;padding:6px 0}
.b-scene{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}
.b-scene__img{flex:1;min-height:0}
.b-scene__img .photo-slot{width:100%;height:100%}
.b-spec{flex:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:3px solid var(--ink)}
.b-spec li{padding:12px 20px 0;border-left:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft);display:flex;flex-direction:column;gap:2px}
.b-spec li:first-child{padding-left:0;border-left:0}
.b-spec li:last-child{padding-right:0}
.b-spec b{font-weight:700;color:var(--ink)}

/* email signature: the headline across the page, the letter beneath, notes in a narrow ruled column */
.b-em{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px}
.b-em__h{flex:none;padding-bottom:12px;border-bottom:3px solid var(--ink)}
.b-em__b{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:0 48px;align-items:start}
.b-em__m{min-width:0;display:flex}
.b-specs{display:flex;flex-direction:column;border-top:1px solid var(--ink)}
.b-specs .cap{padding:12px 0;border-bottom:1px solid var(--hair)}
.b-mail{width:100%;max-width:720px;background:var(--ground);font-family:var(--body);color:var(--ink);box-shadow:0 0 0 1px var(--ink)}
.b-mail__h{position:relative;padding:20px 28px 16px;border-bottom:1px solid var(--hair);font-family:var(--chrome);font-size:12px;line-height:1.4;display:flex;flex-direction:column;gap:6px}
.b-mail__h p{margin:0}
.b-mail__h span{display:inline-block;width:60px;color:var(--quiet)}
.b-mail__h b{font-weight:600}
.b-mail__h .b-mail__t{position:absolute;right:28px;top:20px;color:var(--quiet)}
.b-mail__b{padding:24px 28px 28px;font-size:15px;line-height:1.6}
.b-mail__b>p+p{margin-top:12px}
.b-sig{margin-top:24px;padding-top:20px;border-top:1px solid var(--hair)}
.b-sig__logo{margin-bottom:14px;color:var(--ink)}
.b-sig__n{font-size:15px;font-weight:700;line-height:1.3}
.b-sig__r{font-size:14px;line-height:1.4;color:var(--soft)}
.b-sig__c{font-size:14px;line-height:1.5;margin-top:10px}
.b-sig__l{font-size:14px;line-height:1.4;color:var(--quiet);margin-top:10px}

/* digital: the web edition, ruled top and foot instead of a browser box */
${uiScope}
.b-win{flex:1;min-height:0;display:flex;flex-direction:column;border-top:3px solid var(--ink);border-bottom:1px solid var(--ink);overflow:hidden}
.b-win__url{height:34px;flex:none;display:flex;align-items:center;padding:0;font-family:var(--chrome);font-size:12px;color:var(--quiet)}
.b-win__url span{background:transparent;padding:0}
.b-win__body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:0 48px;padding:20px 0;font-family:var(--body);overflow:hidden}
.b-site__h{font-size:44px;line-height:1.05;margin-bottom:12px;color:var(--ink)}
.b-site__f{display:flex;flex-direction:column;gap:14px;padding-left:32px;border-left:1px solid var(--divider)}
.b-site__t{font-size:26px;line-height:1.1;color:var(--ink)}
.b-site__tot{display:flex;justify-content:space-between;align-items:baseline;font-size:15px;border-top:1px solid var(--divider);padding-top:12px}
.b-site__tot b{font-size:22px;color:var(--accent)}
${componentsCss(ctx)}

/* summary: the nameplate between rules, three ruled columns, the rules across the foot */
.b-sum{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;gap:16px}
.b-sum__np{display:flex;justify-content:center;padding:22px 0 18px;border-top:3px solid var(--ink);border-bottom:1px solid var(--ink)}
.b-sum__cols{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr) minmax(0,4fr);gap:0}
.b-lines{display:flex;flex-direction:column;gap:6px;padding-right:32px}
.b-ln{font-family:var(--body);font-size:15px;line-height:1.4;color:var(--soft)}
.b-ln--first{font-family:var(--display);font-weight:400;font-size:30px;line-height:1.1;color:var(--ink);letter-spacing:-0.01em;margin-bottom:6px}
.b-sum__col{padding:0 32px;border-left:1px solid var(--hair);border-right:1px solid var(--hair)}
.b-bar{display:flex;height:14px;gap:2px;margin-bottom:8px}
.b-key{display:flex;flex-direction:column}
.b-key li{display:grid;grid-template-columns:20px minmax(0,1fr) 40px 76px;gap:0 10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.3}
.b-key li b{font-weight:700}
.b-shr{text-align:right;color:var(--soft)}
.b-sw{flex:none;width:14px;height:14px;box-shadow:inset 0 0 0 1px var(--hair)}
.b-sum__faces{display:flex;flex-direction:column;gap:14px;padding-left:32px;justify-content:center}
.b-sum__faces p{display:flex;align-items:center;gap:16px;margin:0}
.b-rules3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.b-rules3 li{border-top:3px solid var(--ink);padding:12px 24px 0}
.b-rules3 li:first-child{padding-left:0}
.b-rh{font-size:24px;line-height:1.1;margin-bottom:6px}
.b-rp{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--soft)}

/* contact and scope: the index left, the lead story, the "not in this document" brief ruled off right */
.b-cs{flex:1;min-height:0;display:grid;grid-template-columns:300px minmax(0,1fr) 320px;gap:0 40px}
.b-cs__c{min-height:0}
.b-cs__idx{border-top:3px solid var(--ink);padding-top:10px}
.b-cs__lead{padding:0 40px;border-left:1px solid var(--hair);border-right:1px solid var(--hair)}
.b-cs__h{font-size:60px;white-space:nowrap}
.b-cs__p{font-family:var(--body);font-size:16px;line-height:1.6;color:var(--soft);margin-top:20px;max-width:440px}
.b-cs__v{margin-top:36px}
.b-vt{border-collapse:collapse;width:100%;font-family:var(--body);font-size:14px}
.b-vt td{padding:10px 16px 10px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.b-in li{display:grid;grid-template-columns:32px minmax(0,1fr) 32px;padding:14px 0;border-top:1px solid var(--hair);font-family:var(--body);font-size:15px;line-height:1.4}
.b-sn{color:var(--quiet);font-size:12px}
.b-sp{text-align:right}
.b-cs__not{align-self:start;border-top:3px double var(--ink);border-bottom:3px double var(--ink);padding:12px 0 16px}
.b-not li{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--soft);padding:12px 0;border-top:1px solid var(--hair)}
.b-not b{font-weight:500;color:var(--ink)}
`;
}
