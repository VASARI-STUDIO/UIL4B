// Styles for theme 07, run B pages (classes start b-). Appended to css() in index.js; uses the .pg custom properties.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

export function cssB(ctx) {
  const cw = ctx.brand.logo.colourways;
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screen on the digital page uses the UI kit's components, so it carries the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--night:${cw.reversed.ground};--night-ink:${cw.reversed.name};--sun:${cw.colour.sun}}
.pg :where(b){font-weight:600}
.b-ab{position:absolute}
.b-sc{position:relative;flex:none;overflow:hidden}
.b-sc__in{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}
.pg--std .photo-slot{box-shadow:inset 0 0 0 1px var(--rule);border-radius:var(--r)}
.b-yes,.b-no{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--ink)}
.b-no{color:var(--mark)}

/* the spec table: a full rule under the heading, a hairline under every row */
.b-tb{margin-top:28px}
.b-tb th{padding-bottom:7px;font-weight:600}
.b-tb td{padding:8px 10px 8px 0;vertical-align:top;line-height:1.45}
.b-tb .b-r{color:var(--quiet)}
.b-tb .b-r .num{color:var(--quiet)}
.b-el{display:block;font-weight:600}
.b-ref{display:block;font-size:11.5px;color:var(--quiet)}
.b-ref .num{color:var(--quiet)}
.b-h3{margin-top:32px;margin-bottom:0}
.b-h3+.b-tb{margin-top:10px}
.b-req{margin-top:12px;border-top:1px solid var(--ink)}
.b-req li{display:grid;grid-template-columns:56px minmax(0,1fr);padding:8px 0;border-top:1px solid var(--hair);font-size:13px;line-height:1.5}
.b-req li:first-child{border-top:0}
.b-req .num{color:var(--quiet)}
.b-h3+.b-req{margin-top:10px}
.b-tbl+.b-req,.b-fgr+.b-req{margin-top:24px}
.b-fgr{margin:28px 0 0}
.b-fcap{display:block;margin:10px 0 0;font-size:12px;line-height:1.5;color:var(--quiet);max-width:560px}
.b-fcap b{color:var(--ink)}
.b-fside{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;margin-top:28px;align-items:start}
.b-fside .b-fgr{margin:0}
.b-fside .b-tb{margin-top:0}
.b-after{margin-top:12px}

/* typefaces */
.b-fam{display:block;font-size:14px;font-weight:600;line-height:1.3;margin-bottom:2px}
.b-fam--s{font-size:12.5px}
.b-alpha{margin:0;line-height:1.35;letter-spacing:0}

/* hierarchy */
.b-fgr--wide .b-fcap{max-width:none}
.b-fs{display:flex;flex-direction:column;gap:32px;padding:18px 32px;box-sizing:border-box}
.b-fr{display:grid;grid-template-columns:200px minmax(0,1fr);align-items:start}
.b-fl{font-size:22px;line-height:1;font-weight:500;color:var(--quiet)}
.b-spc{margin:0}

/* type in use */
.b-mkc{padding-top:13px}
.b-mk{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--mark);color:var(--ground);font-size:11px;font-weight:600;line-height:1}

/* type rules */
.b-req1{font-size:13px;line-height:1.5;padding-top:14px}
.b-demo{min-height:76px;display:flex;flex-direction:column;justify-content:center;gap:4px;padding:8px 14px;border-radius:var(--r);background:var(--panel)}
.b-demo--no{box-shadow:inset 0 0 0 1.5px var(--mark)}
.b-dont{margin-top:8px}
.b-dm{font-family:var(--display);line-height:1.15;white-space:nowrap}
.b-dm--b{font-family:var(--body);font-weight:500;font-size:22px}
.b-mono20{font-family:var(--mono);font-size:20px;letter-spacing:-0.02em;font-weight:400}
.b-demo .m{font-size:16px}
.b-chip{display:block;width:56px;height:26px;border-radius:4px;box-shadow:inset 0 0 0 1px var(--rule)}

/* photo direction and shot list */
.b-fside--p{grid-template-columns:320px minmax(0,1fr)}
.b-dir__v{display:block;font-size:13.5px;line-height:1.5}
.b-tb--shots td{padding:14px 10px 14px 0}
.b-tb--shots .b-dw{box-shadow:inset 0 0 0 1px var(--rule)}
.b-tb--shots .b-el{margin-bottom:2px}

/* imagery rules: tiles drawn in flat shapes */
.b-rules{margin-top:28px}
.b-rr{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(0,1fr);gap:0 20px;padding:16px 0 18px;border-top:1px solid var(--hair)}
.b-rr--h{padding:0 0 8px;border-top:0;border-bottom:1px solid var(--ink)}
.b-rr--h>span:first-child{font-size:12px;font-weight:600}
.b-rr__n{font-size:12px;color:var(--quiet);padding-top:2px}
.b-rr--i{grid-template-columns:44px 299px 299px}
.b-t{position:relative;width:299px;height:120px;overflow:hidden;border-radius:var(--r);background:var(--ground);box-shadow:inset 0 0 0 1px var(--rule)}
.b-t .b-dw{position:absolute;inset:0}
.b-rr--i .b-rr__c .cap{margin-top:8px}
.b-rr--i .b-rr__c .cap b{display:block}
.b-rr--i .b-rr__c--no .b-t{box-shadow:0 0 0 1.5px var(--mark)}

/* the drawing set that stands in for photographs: one house, in plan, elevation or detail */
.b-dw{position:relative;overflow:hidden;flex:none}
.b-dw svg{display:block}
.b-dw__t{position:absolute;font-family:var(--chrome);font-weight:500;line-height:1.3;color:currentColor;white-space:nowrap}
.b-k{display:inline-grid;place-items:center;flex:none;width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1.2px var(--ink);font:600 9px/1 var(--chrome);color:var(--ink)}
.b-kl{display:flex;flex-wrap:wrap;gap:6px 24px;margin:20px 0 0;padding:0;list-style:none;font-size:13px;line-height:1.4}
.b-kl li{display:flex;align-items:center;gap:8px}
.b-kl+.b-tb{margin-top:16px}
.b-kc{display:block;margin-top:6px}
.b-set{display:flex;flex-direction:column;gap:8px}
.b-set .b-dw{box-shadow:inset 0 0 0 1px var(--rule)}

/* a real line set in a face or a style */
.b-line{margin:0;line-height:1.15;color:var(--ink);text-wrap:balance}
.b-line__w{margin-top:6px}

/* signage: dimension lines in ink, as on every drawing */
.b-sg .dh,.b-sg .dv,.b-sg .dh::before,.b-sg .dh::after,.b-sg .dv::before,.b-sg .dv::after{border-color:var(--ink)}
.b-sg .dn{color:var(--ink)}

/* grid */
.b-tb--h td{padding-top:9px}
.b-grid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;margin-top:20px;align-items:start}
.b-grid .b-fgr{margin:0}
.b-gw{position:relative;margin-top:22px}
.b-gw .b-sc{position:absolute;left:0;top:0}
.b-gn{position:absolute;top:-20px;font-size:12px;text-align:center;color:var(--quiet)}
.b-gm{position:absolute;font-size:11px;color:var(--mark);z-index:1;font-weight:600}
.b-gside{padding-top:22px}
.b-gside .b-fcap{margin:0 0 18px}
.b-gside .b-req li{grid-template-columns:44px minmax(0,1fr)}

/* layouts */
.b-mx{table-layout:fixed;margin-top:28px}
.b-mx th{padding-bottom:10px}
.b-mx td{border-bottom:0}
.b-mx .b-mx__f{padding:14px 10px 10px 0;border-bottom:0}
.b-mx .b-sc{margin:0;border-radius:2px}
.b-mx__c{padding-top:4px;border-bottom:1px solid var(--hair)}
.b-mx__c b{display:block}

/* social */
.b-tb--posts td{padding:12px 10px 12px 0}
.b-pf{display:block;width:fit-content}
.b-pf .b-sc{display:block}

/* signage */
.b-sgrid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;margin-top:28px;align-items:start}
.b-sgrid .b-fgr{margin:0}
.b-sgrid .b-tb{margin-top:0}
.b-sgrid .b-fcap{max-width:420px;margin-left:62px}
.b-sg{padding:44px 0 0 62px}
.b-sg__w{position:relative}
.b-sg__w .b-sc{position:absolute;left:0;top:0}
.b-spec{font-size:12.5px;line-height:1.45}

/* email signature */
.b-mail{border:1px solid var(--rule);border-radius:var(--rc);overflow:hidden}
.b-mail__h{padding:20px 28px 16px;background:var(--panel);display:flex;flex-direction:column;gap:2px}
.b-mail__s{font-size:16px;font-weight:600;line-height:1.4;margin-bottom:6px}
.b-mail__m{font-size:12.5px;line-height:1.5;color:var(--quiet);display:flex;gap:12px}
.b-mail__m span{width:36px;flex:none}
.b-mail__m span.b-mail__v{width:auto;flex:0 1 auto}
.b-mail__b{padding:28px;font-family:var(--body);font-size:16px;line-height:1.5;display:flex;flex-direction:column;gap:14px}
.b-mail__b>p{max-width:480px}
.b-sig{margin-top:12px;padding-top:20px;border-top:1px solid var(--hair)}
.b-sig__logo{margin-bottom:16px}
.b-sig__n{font-size:16px;line-height:1.3;font-weight:500}
.b-sig__r{font-size:14px;line-height:1.45;color:var(--quiet)}
.b-sig__c{font-size:14px;line-height:1.5;margin-top:10px}

/* digital: the product screen carries the kit's components */
.b-win{border:1px solid var(--rule);border-radius:var(--rc);overflow:hidden}
.b-win__url{height:36px;display:flex;align-items:center;padding:0 16px;background:var(--panel);font-family:var(--chrome);font-size:12px;color:var(--quiet)}
.b-win__url span{background:var(--ground);padding:4px 16px;border-radius:var(--r)}
.b-win__body{display:flex;flex-direction:column;gap:20px;padding:20px 32px 24px;font-family:var(--body)}
.b-trk{display:flex;flex-direction:column;gap:12px;min-width:0}
.b-trk__top{display:flex;gap:12px;align-items:center}
.b-trk__t{font-size:14px;color:var(--quiet)}
.b-trk__eta{margin:0;font-size:56px;line-height:1.02;font-weight:700}
.b-trk__ft{display:flex;justify-content:space-between;font-size:14px;color:var(--quiet)}
.b-trk__p{font-size:14px;color:var(--soft);margin:0}
.b-trk__rider{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.b-trk__rider .ui-btn{margin-left:auto}
.b-trk__rn{margin:0;font-size:16px;font-weight:500;line-height:1.3}
.b-trk__rs,.b-trk__fl{margin:0;font-size:14px;color:var(--quiet)}
.b-trk__fv{margin:0;font-size:16px;font-weight:500}
.b-trk__facts{display:flex;align-items:center;gap:40px}
.b-trk__facts .ui-btn{margin-left:auto}
.b-dl{display:flex;flex-direction:column;gap:8px}
.b-dl__h{margin:0;font-size:14px;font-weight:500}

/* summary */
.b-tb--sum td{padding:14px 10px 14px 0}
.b-sws{display:flex;flex-direction:column;gap:6px;max-width:300px}
.b-sws li{display:grid;grid-template-columns:20px 84px minmax(0,1fr);gap:10px;align-items:center;font-size:12.5px}
.b-sw{display:block;width:20px;height:14px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--rule)}
.b-strip{display:flex;height:10px;margin-top:14px;max-width:300px;border-radius:2px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--rule)}
.b-sfs{display:flex;flex-direction:column;gap:4px}
.b-sfs li{display:grid;grid-template-columns:44px 140px minmax(0,1fr);gap:10px;align-items:baseline;font-size:12.5px}
.b-sf{font-size:24px;line-height:1.2}
.b-ln{margin:0;font-size:14px;line-height:1.5;color:var(--soft)}
.b-ln--1{font-family:var(--display);font-weight:700;font-size:24px;line-height:1.2;color:var(--ink);margin-bottom:4px}
.b-rl{display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:1.5}
.b-rl li{display:grid;grid-template-columns:24px minmax(0,1fr)}
.b-rl .num{color:var(--quiet)}

/* contact and scope */
.b-csg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px}
.b-h3--c{font-size:14px;margin-top:28px}
.b-h3--c .num{color:var(--quiet);font-weight:400}
${uiScope}
${componentsCss(ctx)}
`;
}
