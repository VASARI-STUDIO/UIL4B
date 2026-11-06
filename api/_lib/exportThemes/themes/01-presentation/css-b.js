// Styles for guidelines-b.js. Appended to css() in index.js; use the same custom properties (.pg vars). Every class starts b-.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono;
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page uses the UI kit's components, so it carries the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--bmono:'${mono.family}',monospace}
.b-mono{font-family:var(--bmono);font-size:13px;line-height:1.4}
.b-wide{flex:1;min-height:0;padding:28px 0 24px;display:flex;flex-direction:column}
/* a bleed slide: its bands and pictures reach the slide's edges, the running head and folio keep the margins */
.pg--std.b-x{padding:40px 0 0}
.b-x .hd{padding:0 var(--m)}
.b-x .fo{padding:0 var(--m) 40px}
/* a dark slide */
.b-dk{background:var(--dark);color:var(--dark-ink)}
.b-dk .hd,.b-dk .fo,.b-dk .lead,.b-dk .cap,.b-dk .cap b{color:var(--dark-ink)}

/* typefaces: the display face's name set huge in itself, the body face and the mono in the footer */
.b-tf{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:20px 0 8px}
.b-tf__top{display:flex;justify-content:space-between;align-items:flex-start;gap:48px}
.b-tf__top .lead{max-width:360px}
.b-tf__top .cap{max-width:300px}
.b-tf__name{font-size:176px;line-height:0.9;letter-spacing:-0.02em;margin-left:-6px;white-space:nowrap}
.b-glyphs{font-size:20px;line-height:1.3;margin-top:20px}
.b-tf__foot{display:grid;grid-template-columns:200px minmax(0,1fr) 200px;gap:32px;padding-top:16px;border-top:1px solid var(--dark-ink);align-items:start}
.b-fname{font-family:var(--body);font-weight:600;font-size:24px;line-height:1.1;letter-spacing:-0.01em;margin-bottom:6px}
.b-weights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.b-weights li{font-family:var(--body);font-size:17px;line-height:1.4}
.b-wn{display:block;font-family:var(--chrome);font-weight:400;font-size:12px;line-height:1.4;margin-bottom:4px}
.b-monosample{display:block;font-size:24px;line-height:1.2;margin-bottom:6px}
.b-licence{max-width:760px}

/* hierarchy: six small slides, one style on each at its true size */
.b-hr{flex:1;min-height:0;display:flex;flex-direction:column;gap:16px;padding:20px 0 14px}
.b-hr .lead{max-width:560px}
.b-hsg{flex:1;min-height:0;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-template-rows:minmax(0,1.1fr) minmax(0,1fr);gap:12px}
.b-hs{grid-column:span 3;min-height:0;display:flex;flex-direction:column;justify-content:space-between;gap:12px;padding:20px;background:var(--panel);border-radius:2px;overflow:hidden}
.b-hs:nth-child(1){grid-column:span 4;background:var(--dark);color:var(--dark-ink)}
.b-hs:nth-child(2){grid-column:span 8}
.b-hs .cap{color:var(--quiet-panel)}
.b-hs:nth-child(1) .cap,.b-hs:nth-child(1) .cap b{color:var(--dark-ink)}
.b-hs__s{color:inherit;text-wrap:balance}
.b-hs:nth-child(1) .b-hs__s{white-space:nowrap}

/* type in use: the page, with the photo bleeding off the right and bottom edges */
.b-uz{flex:1;min-height:0;max-width:640px;display:flex;flex-direction:column;justify-content:space-between;padding:20px 0 8px}
.b-uz .lead{max-width:360px}
.b-uz__t{display:flex;flex-direction:column;gap:24px}
.b-h{max-width:620px;text-wrap:balance;color:var(--ink)}
.b-p{font-family:var(--body);color:var(--soft);max-width:480px}
.b-uz__specs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding-top:12px;border-top:1px solid var(--ink)}
.b-uz__fig{position:absolute;right:0;top:72px;bottom:0;width:480px;display:flex;flex-direction:column;background:var(--ground)}
.b-uz__fig figcaption{padding:10px var(--m) 40px 16px}

/* type rules: five columns, a "do" slide on White over a "don't" slide on Asphalt */
.b-tr{flex:1;min-height:0;display:flex;flex-direction:column;gap:16px;padding:20px 0 8px}
.b-tr .lead{max-width:540px}
.b-trs{flex:1;min-height:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.b-trc{display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:8px;min-height:0}
.b-tile{display:flex;flex-direction:column;justify-content:space-between;gap:8px;padding:14px 16px;min-height:0;overflow:hidden;border-radius:2px;background:var(--panel);color:var(--ink)}
.b-tile--no{background:var(--dark);color:var(--dark-ink)}
.b-tile .h3{display:flex;align-items:center;gap:6px;margin:0;color:inherit}
.b-demo{flex:1;min-height:0;display:flex;align-items:center;font-family:var(--body);color:inherit}
.b-rt{font-family:var(--body);font-size:13px;line-height:1.4;color:inherit}

/* photo direction: one photograph edge to edge, the five lines under it */
.b-pd{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px;padding-top:16px}
.b-pd__img{flex:1;min-height:0;overflow:hidden}
.b-pd__band{padding:0 var(--m) 16px}
.b-pd__band .lead{max-width:640px;margin-bottom:16px}
.b-dirs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px}
.b-dir{border-top:1px solid var(--ink);padding-top:10px}
.b-dir b{display:block;font-size:13px;font-weight:600;line-height:1.5;margin-bottom:2px}
.b-dir p{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--soft)}

/* shot list: one frame, then the rest of the roll as a strip */
.b-sh{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px}
.b-sh__strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.b-shot{display:flex;flex-direction:column;min-height:0}
.b-shot__img{overflow:hidden;border-radius:2px;height:128px}
.b-shot--hero{flex:1}
.b-shot--hero .b-shot__img{flex:1;height:auto;min-height:0}
.b-shot .cap{margin-top:8px}
.b-shot .photo-slot,.b-ir .photo-slot{border:1.5px dashed var(--quiet-panel);font-size:12px;line-height:1.45}

/* imagery rules: a row of "do" slides on White, then a row of "don't" slides on Asphalt */
.b-irs{flex:1;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);margin-top:16px}
.b-irow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;min-height:0;padding:12px var(--m)}
.b-irow--no{background:var(--dark);color:var(--dark-ink)}
.b-irow--no .cap,.b-irow--no .cap b,.b-irow--no .ui-icon{color:var(--dark-ink)}
.b-ir{display:flex;flex-direction:column;gap:8px;min-height:0}
.b-ir__tile{position:relative;overflow:hidden;flex:1;min-height:0;border-radius:2px}
.b-ir__cap{display:flex;gap:8px;align-items:flex-start}
.b-ir__cap .ui-icon{margin-top:1px;color:var(--ink)}
.b-onphoto{position:absolute;color:var(--dark-ink)}
.b-onphoto--mid{left:14px;right:14px;top:50%;transform:translateY(-50%)}
.b-wash{position:absolute;inset:0}
.b-flat{position:absolute;inset:0;background:var(--dark);display:flex;align-items:center;justify-content:center}
.b-studio{width:100%;height:100%;align-items:center}

/* grid: the page drawn on a panel, the five measurements across the foot */
.b-gr{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding-top:16px}
.b-gr__band{background:var(--panel);display:flex;justify-content:space-between;align-items:flex-start;gap:48px;padding:24px var(--m)}
.b-gr__lead{max-width:360px}
.b-gpage{position:relative;flex:none;background:var(--ground);overflow:hidden}
.b-gpage::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none}
.b-gcol{position:absolute;top:0;bottom:0;background:var(--panel)}
.b-gm{position:absolute;top:50%;transform:translateY(-50%);text-align:center;font-size:12px;color:var(--quiet);font-variant-numeric:tabular-nums}
.b-gh,.b-gc,.b-gph{position:absolute}
.b-gh{color:var(--ink)}
.b-gc{color:var(--quiet-panel)}
.b-gph{overflow:hidden}
.b-meas{display:grid;grid-template-columns:1.5fr 1fr 1.4fr 1fr 1fr;gap:16px;padding:0 var(--m) 12px}
.b-mv{font-size:22px;line-height:1.1;margin-top:2px;color:var(--ink);white-space:nowrap}

/* layouts: the poster drawn large, the other two small beside it */
.b-lays{flex:1;min-height:0;display:grid;grid-template-columns:780px 332px;justify-content:space-between;gap:32px;align-content:center;align-items:center}
.b-lays__side{display:flex;flex-direction:column;gap:20px}
.b-lay{display:flex;flex-direction:column;gap:10px}
.b-thumb,.b-post{position:relative;flex:none;overflow:hidden;background:var(--ground)}
.b-thumb::after,.b-post::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none}
.b-ab{position:absolute}
.b-th{display:block;margin:0;color:inherit;letter-spacing:-0.01em}

/* social: three formats at one height, like frames on a film strip */
.b-socials{flex:1;min-height:0;display:flex;justify-content:center;align-items:center;gap:32px}
.b-sfig{display:flex;flex-direction:column;gap:12px;flex:none}

/* signage */
.pg--sign{background:var(--ground)}
.b-scene{position:absolute;left:0;top:-100px;width:1280px;height:853px;object-fit:cover}
.b-frame{position:absolute;left:594px;top:44px;width:76px;height:26px;background:var(--quiet)}
.b-poster{position:absolute;left:495px;top:64px;width:277px;height:490px;clip-path:polygon(0% 1%,100% 0%,100% 100%,1.4% 97.1%)}
.b-poster__ink{position:absolute;inset:0;background:var(--accent);mix-blend-mode:multiply}
.b-glass{position:absolute;inset:0;background-size:1280px 853px;background-position:-495px -164px;mix-blend-mode:screen;opacity:0.22}
.b-poster__in{position:absolute;inset:0;padding:24px 20px 22px;display:flex;flex-direction:column;justify-content:space-between}
.b-poster__h{font-size:47px;line-height:0.95;letter-spacing:-0.015em;color:var(--accent-ink)}
.b-poster__b{display:flex;flex-direction:column;gap:14px}
.b-poster__l{font-family:var(--body);font-weight:500;font-size:12px;line-height:1.4;color:var(--accent-ink)}
.b-sfoot{position:absolute;left:0;right:0;bottom:0;height:56px;background:var(--ground);padding:0 var(--m);display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--quiet)}
.b-sfoot b{font-weight:400;color:var(--ink);margin-right:12px}
.b-sfoot i{font-style:normal;margin-left:12px}

/* email signature: the message fills a panel, the lead and three specs along its foot */
.b-em{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px;padding-top:16px}
.b-em__band{flex:1;min-height:0;background:var(--panel);display:flex;align-items:center;justify-content:center;padding:24px var(--m)}
.b-em__foot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px;padding:0 var(--m) 12px}
.b-mail{width:100%;max-width:760px;background:var(--ground);font-family:var(--body);color:var(--ink);box-shadow:0 0 0 1px var(--hair)}
.b-mail__h{position:relative;padding:18px 28px 14px;border-bottom:1px solid var(--hair);font-family:var(--chrome);font-size:12px;line-height:1.4;display:flex;flex-direction:column;gap:6px}
.b-mail__h span{display:inline-block;width:60px;color:var(--quiet)}
.b-mail__h b{font-weight:600}
.b-mail__h .b-mail__t{position:absolute;right:28px;top:18px;color:var(--quiet)}
.b-mail__b{padding:20px 28px 24px;font-size:15px;line-height:1.6}
.b-mail__b>p+p{margin-top:10px}
.b-sig{display:grid;grid-template-columns:200px minmax(0,1fr);gap:0 28px;margin-top:20px;padding-top:18px;border-top:1px solid var(--hair)}
.b-sig__n{font-size:15px;font-weight:600;line-height:1.3}
.b-sig__r{font-size:13px;line-height:1.4;color:var(--soft)}
.b-sig__c{font-size:13px;line-height:1.5;margin-top:8px}
.b-sig__l{font-size:13px;line-height:1.4;color:var(--quiet);margin-top:8px}

/* digital */
${uiScope}
.b-win{flex:1;min-height:0;display:flex;flex-direction:column;border:1px solid var(--hair);overflow:hidden}
.b-win__url{height:36px;flex:none;display:flex;align-items:center;padding:0 16px;background:var(--panel);font-family:var(--chrome);font-size:12px;color:var(--quiet-panel)}
.b-win__url span{background:var(--ground);padding:4px 16px;border-radius:2px}
.b-win__body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:56px;padding:28px 32px;font-family:var(--body)}
.b-trk{display:flex;flex-direction:column;gap:14px;min-width:0}
.b-trk__top{display:flex;gap:12px;align-items:center}
.b-trk__t{font-size:13px;color:var(--quiet)}
.b-trk__eta{margin:0;font-size:54px;line-height:1.02;font-stretch:125%}
.b-trk__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}
.b-trk__p{font-size:13px;color:var(--soft)}
.b-trk__rider{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--divider);border-bottom:1px solid var(--divider)}
.b-trk__rider .ui-btn{margin-left:auto}
.b-trk__rn{font-size:15px;font-weight:600;line-height:1.3}
.b-trk__rs{font-size:13px;color:var(--quiet)}
.b-trk__facts{display:flex;align-items:center;gap:40px}
.b-trk__fl{font-size:12px;color:var(--quiet)}
.b-trk__fv{font-size:15px;font-weight:500}
.b-trk__facts .ui-btn{margin-left:auto}
.b-dl{display:flex;flex-direction:column;gap:8px;min-width:0}
.b-dl__h{font-size:13px;font-weight:600}
${componentsCss(ctx)}

/* summary: colour proportions across the top edge, three rules, the identity on a dark foot */
.b-sum{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding-top:16px}
.b-strip{display:flex;margin-top:8px}
.b-strip li{min-width:0;padding-right:8px}
.b-strip li:first-child .cap{padding-left:var(--m)}
.b-strip i{display:block;height:64px;margin-bottom:8px}
.b-rules3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px;padding:0 var(--m)}
.b-rules3 li{border-top:1px solid var(--ink);padding-top:14px}
.b-rh{font-size:26px;line-height:1.15;color:var(--ink);margin-bottom:8px}
.b-rp{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--soft)}
.b-sum__foot{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:center;padding:28px var(--m);margin-bottom:12px}
.b-lines{display:flex;flex-direction:column;gap:8px}
.b-ln{font-family:var(--body);font-size:15px;line-height:1.4;color:var(--dark-ink)}
.b-ln--first{font-family:var(--display);font-stretch:${ctx.brand.fonts.display.stretch || 100}%;font-weight:800;font-size:26px;line-height:1.15;letter-spacing:-0.01em}
.b-faces2{display:flex;flex-direction:column;gap:12px}
.b-faces2 p{display:flex;align-items:center;gap:16px}
.b-aa2{font-size:56px;line-height:1;width:92px;color:var(--dark-ink)}
.b-aa2--body{font-family:var(--body);font-weight:500;letter-spacing:-0.02em}
.b-sum__foot .b-mono{color:var(--dark-ink)}

/* contact and scope: "who to ask" huge on Signal, the contents and what is left out on White */
.b-cs{flex-direction:row;justify-content:flex-start;padding:0}
.pg--std.b-x.b-cs{padding:0}
.b-cs__a{position:absolute;left:0;top:0;bottom:0;width:640px;background:var(--accent);color:var(--accent-ink);padding:40px var(--m);display:flex;flex-direction:column;justify-content:space-between}
.b-cs__a .hd,.b-cs__a .fo,.b-cs__a .h3{color:var(--accent-ink);padding:0}
.b-cs__a .fo{display:block;padding:0;margin-top:20px}
.b-cs__h{font-size:104px;line-height:0.92;letter-spacing:-0.02em;color:var(--accent-ink)}
.b-cs__p{font-family:var(--body);font-size:15px;line-height:1.6;color:var(--accent-ink);margin-top:28px;max-width:440px}
.b-vt{border-collapse:collapse;width:100%;font-family:var(--body);font-size:13px}
.b-vt td{padding:10px 16px 10px 0;border-top:1px solid var(--accent-ink);border-bottom:1px solid var(--accent-ink)}
.b-cs__b{position:absolute;left:640px;right:0;top:0;bottom:0;padding:40px var(--m);display:flex;flex-direction:column;justify-content:space-between}
.b-cs__brand{justify-content:flex-end;padding:0}
.b-in{columns:2;column-gap:32px}
.b-in li{display:grid;grid-template-columns:32px minmax(0,1fr);padding:9px 0;border-top:1px solid var(--hair);font-family:var(--body);font-size:15px;line-height:1.4;break-inside:avoid}
.b-sn{color:var(--quiet)}
.b-not li{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--soft);padding:10px 0;border-top:1px solid var(--hair)}
.b-not b{font-weight:500;color:var(--ink)}
`;
}
