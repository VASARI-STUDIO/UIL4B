// Styles for guidelines-b.js. Appended to css() in index.js; uses the .pg custom properties. Every class starts b-.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { cssStr } from '../../engine/escape.js';

export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono;
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page uses the UI kit's components, so it carries the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--bmono:'${cssStr(mono.family)}',monospace}
.b-mono{font-family:var(--bmono);font-size:13px;line-height:1.4}
.rn--gap{transform:translateX(-50%);padding:0 6px;line-height:12px}
.rn--vgap{transform:translate(-50%,-50%);padding:6px 0;line-height:12px}
.b-xx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.b-xx path{fill:none;stroke:var(--accent);stroke-width:1px}
.b-xx.b-xs{inset:auto;right:20px;top:50%;width:20px;height:20px;margin-top:-10px}

/* lettering sheets: guide lines drawn from the font's own metrics */
.b-sheet{position:relative}
.b-lt{position:absolute;white-space:nowrap;color:var(--ink)}
.b-g{position:absolute;display:block;height:0;border-top:1px solid color-mix(in srgb,var(--quiet) 60%,var(--ground));pointer-events:none}
.b-g--base{border-top-color:var(--ink)}
.b-g--dn{border-top-style:dashed}
.b-gt{position:absolute;white-space:nowrap;font:500 11px/12px var(--chrome);color:var(--quiet)}
.b-wl{position:absolute;left:0;width:132px}
.b-wl b,.b-wl .num{display:block}

/* typefaces */
.b-faces{margin-top:32px;display:flex;flex-direction:column}
.b-ftb{margin-top:8px}
.b-gap{margin-top:16px}
.b-fhead{margin-top:24px;border-top:1px solid var(--ink);padding-top:12px;margin-bottom:8px}
.b-fname--body{font-family:var(--body);font-weight:600;font-size:24px;line-height:32px}
.b-fhead .cap{margin-top:0}
.b-licence{margin-top:12px;max-width:480px}

/* hierarchy */
.b-scale{margin-top:24px;border-top:1px solid var(--ink)}
.b-sch{position:relative;height:28px;border-bottom:1px solid var(--hair)}
.b-sch span{position:absolute;top:8px;white-space:nowrap;font:500 11px/12px var(--chrome);color:var(--quiet)}
.b-sc{position:relative;border-bottom:1px solid var(--hair)}
.b-sc__k{position:absolute;left:0;top:16px;width:136px}

/* type in use */
.b-uses{margin-top:32px}
.b-uph .photo-slot{border-radius:0}
.b-nt{position:absolute;width:186px}
.b-nt .cap{padding-left:12px;border-left:1px solid var(--accent)}

/* type rules */
.b-rulehead{margin-top:32px;display:grid;grid-template-columns:32px repeat(2,minmax(0,1fr));gap:0 24px;border-bottom:1px solid var(--ink);padding-bottom:8px}
.b-h3{font-size:13px;line-height:18px;font-weight:600}
.b-rules{display:flex;flex-direction:column}
.b-rule{display:grid;grid-template-columns:32px repeat(2,minmax(0,1fr));gap:0 24px;padding:20px 0 0;border-top:1px solid var(--hair)}
.b-rule:first-child{border-top:0}
.b-rule__c{min-width:0}
.b-bubble.b-nb{position:static;flex:none}
.b-demo{position:relative;height:72px;display:flex;align-items:center;padding:0 16px;overflow:hidden;white-space:nowrap}
.b-d{color:var(--ink);font-family:var(--body);position:relative}
.b-demo .disp{font-family:var(--display)}
.b-two{display:flex;flex-direction:column}
.b-col{display:flex;flex-direction:column;width:96px;font-family:var(--body);font-size:16px;line-height:20px;font-weight:500;position:relative}
.b-demo--no .b-col{width:96px}
.b-none{white-space:normal;font-size:11px;line-height:16px;color:var(--quiet);max-width:240px;position:relative}
.b-mono.b-d{font-family:var(--bmono)}
.b-rt{display:flex;gap:8px;margin-top:8px;font-family:var(--body);font-size:13px;line-height:18px;color:var(--ink)}
.b-rt .ui-icon{flex:none;margin-top:1px}
.b-rt--no .ui-icon{color:var(--accent)}

/* photography */
.b-pdw{margin-top:32px}
.b-pd{position:relative}
.b-pd__img{position:absolute;inset:0}
.b-pd__img .photo-slot{border-radius:4px}
.b-tag{position:absolute;display:block;padding:4px 8px;background:var(--card);color:var(--accent);font:600 12px/16px var(--chrome);border-radius:2px;box-shadow:0 0 0 1px var(--hair)}
.b-typezone{position:absolute;border:1px solid var(--accent);display:block}
.b-pdd{position:relative;height:36px}
.b-pdc{margin-top:0;max-width:560px}
.b-pdtb{margin-top:16px}
.b-pdtb .cell{font-family:var(--body);font-size:14px;line-height:20px}
.b-pdtb .k{font-family:var(--chrome)}

/* shot list: a drawing register */
.b-regs{margin-top:28px;border-top:1px solid var(--ink)}
.b-reg{display:grid;grid-template-columns:32px 180px minmax(0,1fr) 150px;gap:0 24px;align-items:start;padding:12px 0;border-bottom:1px solid var(--hair)}
.b-reg--h{padding:8px 0;align-items:center;border-bottom-color:var(--ink);font:500 11px/14px var(--chrome);color:var(--quiet)}
.b-reg__f{position:relative;height:112px}
.b-reg__f .photo-slot{height:100%;border-radius:0;padding:0}
.b-reg__h{font:600 15px/22px var(--body);color:var(--ink)}
.b-reg__t p{margin-top:4px;font-family:var(--body);font-size:14px;line-height:21px;color:var(--ink)}
.b-reg__s{padding-top:2px}
/* an empty photo slot is drawn as a frame to be filled: a dashed safe-area line, as on a layout sheet */
.b-reg .photo-slot,.b-pd__img .photo-slot{position:relative}
.b-reg .photo-slot::before,.b-pd__img .photo-slot::before{content:'';position:absolute;inset:8px;border:1px dashed var(--quiet-panel);border-radius:2px;opacity:.5;pointer-events:none}
.b-bubble{position:absolute;left:12px;top:12px;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:var(--card);color:var(--accent);box-shadow:0 0 0 1px var(--accent);font:600 13px/1 var(--chrome)}
.b-bubble--s{width:24px;height:24px;font-size:12px}

/* imagery rules */
.b-irs{margin-top:32px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 24px}
.b-dt{min-width:0;border-top:1px solid var(--ink);padding-top:10px}
.b-dt__h{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.b-dt__n{font:600 12px/16px var(--chrome);color:var(--ink)}
.b-dt .b-ir__cap{margin:8px 0 12px}
.b-dt .b-ir__cap:last-child{margin-bottom:0}
.b-ir__tile{position:relative;height:124px;overflow:hidden;background:var(--panel)}
.b-ir__tile .photo-slot{border-radius:0}
.b-ir__cap{display:flex;gap:8px;align-items:flex-start;margin-top:8px}
.b-ir__cap .ui-icon{flex:none;margin-top:1px}
.b-ir__tile--no+.b-ir__cap .ui-icon{color:var(--accent)}
.b-ir__cap b{display:inline;margin-right:6px}
.b-wall{position:absolute;left:22%;top:0;bottom:0;width:0;border-left:1px solid var(--quiet)}
.b-bench{position:absolute;left:22%;right:0;top:62%;height:0;border-top:1px solid var(--quiet)}
.b-tilt{position:absolute;inset:0}
.b-wash{position:absolute;inset:0}
.b-onph{position:absolute;color:var(--ink)}
.b-flat{position:absolute;inset:0;display:grid;place-items:center;background:var(--dark)}
.b-busy{position:absolute;top:0;bottom:0;width:20px;background:var(--accent)}
.b-busy--t{background:var(--dark)}

/* grid */
.b-gd{position:relative;margin-top:32px}
.b-gpage{position:absolute;background:var(--card);box-shadow:0 0 0 1px var(--hair)}
.b-gcol{position:absolute;background:var(--ground)}
.b-gh{position:absolute;color:var(--ink);letter-spacing:-0.01em}
.b-gph{position:absolute}
.b-gph .photo-slot{border-radius:0}
.b-box{position:absolute;display:block;border:1px solid var(--accent)}
.b-meas{position:absolute;width:189px;border-top:1px solid var(--ink)}
.b-meas p{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid var(--hair)}
.b-meas b{display:inline}
.b-meas span{color:var(--ink);font-size:12px}
.b-gn{position:absolute;width:189px}
.b-det{position:absolute;width:430px;height:150px}
.b-det .b-gcol{background:var(--panel)}
/* shared absolute pieces */
.b-ab{position:absolute}
.b-th{display:block;margin:0;color:inherit;letter-spacing:-0.01em}
.b-thumb{position:relative;overflow:hidden;background:var(--card);box-shadow:0 0 0 1px var(--hair)}
.b-lays{position:relative;margin-top:48px}
.b-lay{position:absolute;top:0;margin:0}
.b-socials{position:relative;margin-top:56px}
.b-sfig{position:absolute;top:36px;margin:0;width:194px}
.b-post{position:relative;overflow:hidden;box-shadow:0 0 0 1px var(--hair)}
.b-sfig .cap{margin-top:12px}
.b-post .photo-slot{border-radius:0}

/* signage */
.b-sg{position:relative;margin-top:24px}
.b-board{position:absolute;background:var(--dark);color:var(--dark-ink)}
.b-bh{position:absolute;margin:0;color:var(--dark-ink);letter-spacing:-0.01em}
.b-bu{position:absolute;color:var(--dark-ink);font-family:var(--body);font-weight:500;line-height:1}
.b-sp{position:absolute;width:20px;border:1px solid var(--ink);border-top:0;display:block}
.b-gl{position:absolute;display:block;border-top:1px solid var(--ink);height:0}
.b-sgtb{margin-top:48px}

/* email signature */
.b-mailwrap{position:relative;margin-top:40px}
.b-mail{background:var(--card);border-radius:4px;box-shadow:0 0 0 1px var(--hair);padding:24px 32px 40px;font-family:var(--body)}
.b-mail__h{position:relative;padding-bottom:16px;border-bottom:1px solid var(--hair);display:grid;gap:4px;font-size:13px;line-height:18px}
.b-mail__h span{display:inline-block;width:64px;color:var(--quiet)}
.b-mail__h b{font-weight:600}
.b-mail__t{position:absolute;right:0;top:0;color:var(--quiet)}
.b-mail__b{padding-top:24px;font-size:15px;line-height:24px;display:grid;gap:12px}
.b-sig{margin-top:24px;padding-top:24px;border-top:1px solid var(--hair);display:grid;gap:2px}
.b-sig__logo{position:relative;margin-bottom:12px}
.b-sig__n{font-size:16px;font-weight:600;line-height:22px}
.b-sig__r,.b-sig__c,.b-sig__l{font-size:13px;line-height:18px;color:var(--quiet)}
.b-sig__c{margin-top:6px;color:var(--ink)}
.b-sig__l{margin-top:6px}
.b-specs3{margin-top:32px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}

/* digital */
.b-digi{margin-top:48px;padding-left:40px}
.b-digi__w{position:relative}
.b-bar__logo{display:flex}

/* summary */
.b-sum{display:flex;flex-direction:column;gap:28px;margin-top:32px}
.b-sum__row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:48px;align-items:start}
.b-lines{display:flex;flex-direction:column;gap:12px}
.b-lines li{font-family:var(--body);font-size:16px;line-height:24px;color:var(--ink)}
.b-lines li:first-child{font-family:var(--display);font-weight:800;font-size:26px;line-height:32px;letter-spacing:-0.01em}
.b-faces2{display:flex;flex-direction:column;gap:16px}
.b-faces2 p{display:flex;align-items:center;gap:16px}
.b-aa2{font-size:56px;line-height:56px;width:96px}
.b-aa2--body{font-family:var(--body);font-weight:500}
.b-strip{display:flex;gap:4px}
.b-strip li{min-width:0}
.b-strip i{display:block;height:72px;border-radius:2px}
.b-leg{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:12px}
.b-leg b{display:block}
.b-rules3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}
.b-rules3 li{border-top:1px solid var(--hair);padding-top:12px}
.b-rn{display:block;color:var(--accent);font:600 12px/16px var(--chrome)}
.b-rh{font-size:14px;line-height:20px;font-weight:600;margin:4px 0 6px}
.b-rp{font-family:var(--body);font-size:14px;line-height:21px;color:var(--ink)}

/* contact and scope */
.b-cs{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px 48px}
.b-cs__2{grid-column:1 / 3;border-top:1px solid var(--ink);padding-top:10px}
.b-cs__p{margin-top:12px;font-family:var(--body);font-size:15px;line-height:24px}
.b-vt{margin-top:12px;border-collapse:collapse;width:100%;font-family:var(--body);font-size:13px;text-align:left;border:1px solid var(--ink)}
.b-vt th{font:600 12px/16px var(--chrome);padding:8px 12px;border-bottom:1px solid var(--ink);border-right:1px solid var(--hair);color:var(--ink);text-align:left}
.b-vt td{padding:10px 12px;border-right:1px solid var(--hair)}
.b-in{margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,auto);grid-auto-flow:column;gap:0 24px}
.b-in li{display:grid;grid-template-columns:32px minmax(0,1fr);padding:10px 0;border-top:1px solid var(--hair);font-family:var(--body);font-size:15px;line-height:22px}
.b-sn{color:var(--quiet)}
.b-not{margin-top:12px}
.b-not li{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:start;font-family:var(--body);font-size:14px;line-height:21px;padding:10px 0;border-top:1px solid var(--hair)}
.b-not b{font-weight:500}

/* summary zones */
.b-z{border-top:1px solid var(--ink);padding-top:10px}
.b-zh{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.b-zh__t{font:600 12px/16px var(--chrome);color:var(--ink)}

/* digital screen, from the UI kit's components */
.b-win{border:1px solid var(--hair);overflow:hidden}
.b-win__url{height:36px;display:flex;align-items:center;padding:0 16px;background:var(--panel);font-family:var(--chrome);font-size:12px;color:var(--quiet-panel)}
.b-win__url span{background:var(--ground);padding:4px 16px;border-radius:2px}
.b-win__body{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:24px;padding:24px;font-family:var(--body);background:var(--surface)}
.b-trk{display:flex;flex-direction:column;gap:12px;min-width:0}
.b-trk__top{display:flex;gap:12px;align-items:center}
.b-trk__t{font-size:13px;color:var(--quiet)}
.b-trk__eta{margin:0;font-size:32px;line-height:36px}
.b-trk__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}
.b-trk__p{font-size:13px;color:var(--soft)}
.b-trk__rider{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--divider);border-bottom:1px solid var(--divider)}
.b-trk__rider .ui-btn{margin-left:auto}
.b-trk__rn{font-size:15px;font-weight:600;line-height:1.3}
.b-trk__rs{font-size:13px;color:var(--quiet)}
.b-trk__facts{display:flex;gap:32px}
.b-trk__fl{font-size:12px;color:var(--quiet)}
.b-trk__fv{font-size:15px;font-weight:500}
.b-dl{display:flex;flex-direction:column;gap:8px;min-width:0}
.b-dl__h{font-size:13px;font-weight:600}
${uiScope}
${componentsCss(ctx)}
`;
}
