// Styles for guidelines-b.js (classes start b-). Appended to css() in index.js; uses the .pg custom properties.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { cssStr } from '../../engine/escape.js';

export function cssB(ctx) {
  const mono = ctx.brand.fonts.mono, g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // the product screens on the digital and layout pages use the UI kit's components, so they carry the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--bmono:'${cssStr(mono.family)}',monospace}
.pg :where(b){font-weight:600}
.b-mono{font-family:var(--bmono);font-weight:400;font-size:12px}
.b-mono--l{font-size:15px}
.b-panel{background:var(--panel);border-radius:var(--rk);padding:28px 32px;color:var(--ink);min-width:0}
.b-strike{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.b-strike line{stroke:var(--accent);stroke-width:3px}

/* typefaces */
.b-fp{display:flex;flex-direction:column;gap:12px;flex:none;padding:18px 28px}
.b-fp__spec{position:relative;flex:none}
.b-fp__aa{position:absolute;left:0;margin:0;line-height:1;white-space:nowrap;color:var(--ink)}
.b-gl{position:absolute;left:0;right:0;height:0;border-top:1px solid var(--quiet-panel)}
.b-gl--dash{border-top-style:dashed}
.b-gl--base{border-top-color:var(--ink)}
.b-gl span{position:absolute;right:0;bottom:3px;font-style:normal;font-size:11px;line-height:14px;color:var(--quiet-panel)}
.b-fp__row{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;align-items:start}
.b-fp__n{font-size:26px;line-height:1.15;color:var(--ink)}
.b-fp__n--body{font-family:var(--body);font-weight:600}
.b-fp__d{margin-top:8px;font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft);max-width:300px}
.b-fp__d--w{max-width:380px}
.b-fp__gl{display:flex;flex-direction:column;gap:4px;font-size:15px;line-height:1.15;letter-spacing:0.02em;color:var(--ink)}
.b-ws{display:flex;flex-direction:column;gap:12px}
.b-ws li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;align-items:baseline;border-top:1px solid var(--line);padding-top:10px}
.b-ws li:first-child{border-top:0;padding-top:0}
.b-ws__w{font-size:12px;color:var(--quiet-panel)}
.b-ws__t{font-family:var(--body);font-size:16px;line-height:1.4;color:var(--ink)}
.b-fm{display:flex;justify-content:space-between;align-items:center;gap:24px;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);padding:8px 0}
.b-fm__s{display:flex;gap:20px;align-items:baseline;color:var(--ink)}
.b-lic{margin-top:auto}

/* hierarchy: each sample sits in its own line box, drawn in Steel */
.b-hrs{display:flex;flex-direction:column}
.b-hr{display:flex;flex-direction:column;gap:8px;padding:14px 0;border-top:1px solid var(--hair)}
.b-hr:first-child{border-top:0;padding-top:0}
.b-ht{display:flex;gap:16px;align-items:baseline;font-size:12px;line-height:16px;color:var(--quiet)}
.b-ht b{color:var(--ink)}
.b-hs{margin:0;width:fit-content;max-width:100%;background:var(--panel);color:var(--ink)}

/* type in use: one sheet, built from stacked cells, with a leader from each to its note */
.b-tu{display:grid;grid-template-columns:464px minmax(0,1fr);align-content:start;padding:32px 28px}
.b-tu__s{background:var(--ground);padding:14px 24px;min-width:0}
.b-tu__s:nth-child(1){border-radius:var(--rc) var(--rc) 0 0;padding-top:28px}
.b-tu__s:nth-last-child(2){border-radius:0 0 var(--rc) var(--rc);padding-bottom:28px}
.b-tu__a{position:relative;margin:0;padding-left:34px;padding-right:0;font-size:12px;line-height:1.5;color:var(--quiet-panel);align-self:start}
.b-tu__a b{display:block;color:var(--ink);font-weight:600}
.b-tu__a::before{content:"";position:absolute;left:0;top:calc(var(--lt,0px) + 8px);width:24px;height:1px;background:var(--ink)}
.b-tu__h{margin:0}
.b-u__p{margin:0;font-family:var(--body);color:var(--soft)}
.b-u__t{margin:0}
.b-u__c{margin:0;font-family:var(--body);color:var(--quiet)}
.b-lis{margin:0;font-family:var(--body);color:var(--ink)}
.b-li{display:grid;grid-template-columns:minmax(0,1fr) 40px 96px;gap:8px;padding:6px 0;border-bottom:1px solid var(--hair)}
.b-li span:nth-child(2),.b-li span:nth-child(3){text-align:right}
.b-li--h{color:var(--quiet)}

/* type rules */
.b-trh,.b-tr{display:grid;grid-template-columns:96px minmax(0,1fr) minmax(0,1fr);gap:0 20px}
.b-trh{padding-bottom:6px}
.b-trs{display:flex;flex-direction:column}
.b-tr{padding:14px 0;border-top:1px solid var(--hair)}
.b-tr__n{margin:0;font-size:13px;line-height:20px;font-weight:600}
.b-tr__c{display:flex;flex-direction:column;gap:8px;min-width:0}
.b-demo{position:relative;height:64px;display:flex;align-items:center;gap:12px;padding:0 20px;border-radius:var(--rc);background:var(--ground);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden;color:var(--ink);font-family:var(--body)}
.b-fig{font-family:var(--body);font-size:18px;line-height:1.35;font-weight:400}
.b-fig2{font-size:13px;line-height:1.35}
.b-sw{flex:none;width:44px;height:44px;border-radius:var(--rc);box-shadow:inset 0 0 0 1px var(--hair2)}
.b-ic{display:flex;gap:8px;align-items:flex-start;margin:0;font-family:var(--body);font-size:13px;line-height:1.45;color:var(--soft)}
.b-ic svg{margin-top:2px;color:var(--ink)}
.b-ic--no svg{color:var(--accent)}
${uiScope}
${componentsCss(ctx)}
.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}
.b-fill{width:100%;height:100%;box-sizing:border-box}
img.b-fill{display:block}

/* photo direction: the wide slot with thirds drawn, then five ruled rows */
.b-pd{position:relative;height:336px;border-radius:var(--rk);overflow:hidden}
.b-pd .photo-slot{font-size:12px;line-height:1.45;padding:20px;border-radius:0}
.b-pd .photo-slot span{max-width:190px}
.b-th{position:absolute;background:var(--ground)}
.b-th--v{top:0;bottom:0;width:2px;margin-left:-1px}
.b-th--h{left:0;right:0;height:2px;margin-top:-1px}
.b-pd__tag{position:absolute;left:20px;top:16px;padding:4px 10px;border-radius:var(--rc);background:var(--ground);color:var(--ink);font-size:12px;line-height:16px;font-weight:500}
.b-prs{display:flex;flex-direction:column}
.b-pr{display:grid;grid-template-columns:110px minmax(0,1fr);gap:0 20px;padding:12px 0;border-top:1px solid var(--hair)}
.b-pr h3{line-height:22px}
.b-pr p{font-family:var(--body);font-size:15px;line-height:22px;color:var(--soft);max-width:520px}

/* shot list: six slots in two rows of different widths */

/* imagery rules: do and don't tiles */
.b-irh,.b-ir{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 20px}
.b-irh{padding-bottom:6px}
.b-irs{display:flex;flex-direction:column}
.b-ir{padding:12px 0;border-top:1px solid var(--hair)}
.b-ir__c{display:flex;flex-direction:column;gap:8px;min-width:0}
.b-tilebox{position:relative;height:120px;border-radius:var(--rc);overflow:hidden;box-shadow:inset 0 0 0 1px var(--line)}
.b-tile{border-radius:0;font-size:11px;line-height:1.4}
.b-wrap{position:absolute;inset:0;overflow:hidden}
.b-logo{display:flex;align-items:center;justify-content:center}
.b-wash{position:absolute;inset:0;background:var(--accent);mix-blend-mode:multiply}
.b-line{position:absolute;left:14px;top:12px;font-size:19px;line-height:1.2;color:var(--ink);max-width:200px}
.b-line--mid{left:0;right:0;top:50%;transform:translateY(-50%);max-width:none;padding:0 14px;background:var(--ground);text-align:center}
.b-bg{position:absolute;inset:0;width:100%;height:100%}
.b-onbusy{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:8px 12px;display:block}
/* sheets drawn at their own size and scaled, and absolute marks */
.b-sc{position:relative;flex:none;overflow:hidden}
.b-sc__in{position:absolute;left:0;top:0;transform-origin:0 0;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--ink)}
.b-ab{position:absolute}
.b-sheet{border-radius:4px;box-shadow:0 0 0 1px var(--line)}
.b-lb{font-family:var(--chrome);font-size:15px;line-height:20px;color:var(--quiet)}
.b-lb--on{color:var(--dark-ink)}
.b-lv{margin-top:4px;font-size:24px;line-height:1.3}
.b-tt{display:flex;flex-direction:column;gap:8px;padding:24px 32px}

/* grid: the drawn page and its measures */
.b-grid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:20px;align-items:start}
.b-gp{padding:24px 24px 24px;flex:none}
.b-gr{position:relative;margin-top:22px;background:var(--ground)}
.b-gn{font-size:10px;line-height:14px;color:var(--ink)}
.b-dm{border:0 solid var(--ink)}
.b-dm--h{border-top-width:1px}
.b-dm--v{border-left-width:1px}
.b-dm--h::before,.b-dm--h::after{content:"";position:absolute;top:-4px;width:1px;height:9px;background:var(--ink)}
.b-dm--h::before{left:0}
.b-dm--h::after{right:0}
.b-dm--v::before,.b-dm--v::after{content:"";position:absolute;left:-4px;height:1px;width:9px;background:var(--ink)}
.b-dm--v::before{top:0}
.b-dm--v::after{bottom:0}
.b-dm span{position:absolute;white-space:nowrap;font-size:10px;line-height:12px;color:var(--ink);background:var(--ground);padding:0 2px}
.b-dm--h span{left:50%;top:-6px;transform:translateX(-50%)}
.b-dm--v span{left:6px;top:50%;transform:translateY(-50%)}
.b-gm{display:flex;flex-direction:column;gap:20px}
.b-ms li{display:grid;gap:0;padding:10px 0;border-top:1px solid var(--hair)}
.b-ms li:first-child{border-top:0;padding-top:0}
.b-ms span{font-size:12px;line-height:16px;color:var(--quiet)}
.b-ms b{font-family:var(--body);font-size:17px;line-height:24px;font-weight:600}
.b-ms i{font-style:normal;font-size:12px;line-height:16px;color:var(--quiet)}
.b-gk{display:flex;flex-direction:column;gap:8px;font-size:12px;line-height:16px;color:var(--quiet)}
.b-gk li{display:flex;align-items:center;gap:10px}
.b-gk__s{flex:none;display:block;width:20px;height:12px}

/* layouts and social: scaled sheets on a Steel panel */
.b-ly{display:flex;gap:16px;align-items:flex-start;padding:24px}
.b-ly__r{display:flex;flex-direction:column;gap:16px;width:198px;flex:none}
.b-ly>.b-lf{width:420px;flex:none}
.b-ly__r .b-lf{width:198px}
.b-lf{display:flex;flex-direction:column;gap:8px;min-width:0}
.b-so{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px}
.b-sf{display:flex;flex-direction:column;gap:10px;width:198px;min-width:0}
.b-sf .cap span{display:block;color:var(--quiet-panel)}
.b-rl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.b-rl li{border-top:1px solid var(--hair);padding-top:12px}
.b-rl p{margin-top:4px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft)}
/* signage */
.b-sgp{display:flex;justify-content:center;padding:24px 28px 28px}
.b-sg{position:relative;flex:none}
.b-sg .b-dm span{background:var(--panel)}

/* email signature */
.b-mp{padding:24px}
.b-mw{background:var(--ground);border-radius:var(--rc);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden}
.b-mw__h{margin:0;padding:14px 24px;border-bottom:1px solid var(--hair);display:flex;flex-direction:column;gap:4px}
.b-mw__h div{display:grid;grid-template-columns:64px minmax(0,1fr);font-size:13px;line-height:20px}
.b-mw__h dt{color:var(--quiet)}
.b-mw__h dd{margin:0;color:var(--ink)}
.b-mw__b{padding:22px 24px 24px;display:flex;flex-direction:column;gap:12px;font-family:var(--body);font-size:15px;line-height:1.55;color:var(--soft);max-width:520px}
.b-mw__s{margin-top:12px;padding-top:4px;border-top:1px solid var(--hair)}
.b-sig{position:relative;font-family:var(--body)}
.b-sig p{white-space:nowrap}
.b-sig__n{font-size:14px;line-height:20px;font-weight:600;color:var(--ink)}
.b-sig__r{font-size:13px;line-height:20px;color:var(--soft)}
.b-sig__c{font-size:13px;line-height:20px;color:var(--quiet)}
.b-mz{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;align-items:start}
.b-z2{padding:24px;background:var(--ground);border-radius:var(--rc);box-shadow:inset 0 0 0 1px var(--line);width:fit-content}
.b-z2 .b-dm span{font-size:7px;line-height:9px;padding:0 1px;white-space:nowrap}
.b-ms2 li{padding:9px 0;border-top:1px solid var(--hair)}
.b-ms2 li:first-child{border-top:0;padding-top:0}
.b-ms2 p{margin-top:2px;font-family:var(--body);font-size:13px;line-height:1.45;color:var(--soft)}

/* digital: a browser window holding the UI kit */
.b-dp{padding:16px}
.b-bw{background:var(--ground);border-radius:var(--rk);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden;font-family:var(--body);color:var(--ink)}
.b-bw__bar{padding:8px 16px;border-bottom:1px solid var(--hair)}
.b-bw__url{display:block;width:fit-content;min-width:260px;padding:3px 14px;border-radius:var(--rc);background:var(--panel);font-family:var(--chrome);font-size:12px;line-height:18px;color:var(--soft)}
.b-bw__nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:6px 20px;border-bottom:1px solid var(--hair)}
.b-bw__main{background:var(--panel);padding:12px 20px 16px;display:flex;flex-direction:column;gap:10px}
.b-bw__top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.b-bw__top h2{font-size:26px;line-height:1.15}
.b-bw__top p{margin-top:2px;font-size:14px;line-height:1.4;color:var(--soft)}
.b-pg{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center}
.b-pg__l{font-size:13px;line-height:18px;color:var(--soft)}
.b-pg__t{height:8px;border-radius:4px;background:var(--ground);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden}
.b-pg__t i{display:block;height:100%;background:var(--ink)}
.b-bw__list{background:var(--ground);border-radius:var(--rc)}
.b-bw__act{display:flex}
.b-bw .ui-row__end{flex-direction:row;align-items:center;gap:14px}
.b-bw .ui-row{padding-top:7px;padding-bottom:7px}
/* summary */
.b-su{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:32px}
.b-su__t{text-align:left}
.b-su__t .disp{font-size:30px;line-height:1.15}
.b-su__o{margin-top:8px;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--soft)}
.b-sh{margin-bottom:10px}
.b-st{display:flex;gap:0 4px}
.b-st li{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12px;line-height:16px;color:var(--quiet)}
.b-st b{color:var(--ink);margin-top:6px;font-size:13px}
.b-sg2{display:block;height:56px;border-radius:var(--rc)}
.b-fs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 20px}
.b-fs li{display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--hair);padding-top:10px;font-size:12px;line-height:16px;color:var(--quiet)}
.b-fs b{font-size:14px;line-height:20px;color:var(--ink)}
.b-fa{font-size:44px;line-height:1.1;color:var(--ink)}
.b-rs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 20px}
.b-rs li{border-top:1px solid var(--hair);padding-top:10px}
.b-rn{display:block;font-size:30px;line-height:1.1;color:var(--ink);margin-bottom:6px}
.b-rs p{margin-top:2px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft)}

/* contact and scope */
.b-ct{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}
.b-cn{display:flex;flex-direction:column;gap:8px;padding:24px 28px}
.b-cn__o{font-size:28px;line-height:1.15}
.b-cn__t{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--soft)}
.b-vh li,.b-in li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;padding:10px 0;border-top:1px solid var(--hair);font-size:13px;line-height:20px;color:var(--ink)}
.b-vh li{grid-template-columns:48px 120px minmax(0,1fr)}
.b-vh li span:last-child{color:var(--soft)}
.b-cs2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}
.b-in li span:first-child{color:var(--quiet)}
.b-in li span:last-child{color:var(--quiet)}
.b-not li{display:flex;flex-direction:column;padding:10px 0;border-top:1px solid var(--hair);font-family:var(--body);font-size:14px;line-height:1.45;color:var(--soft)}
.b-not b{font-family:var(--chrome);font-size:13px;line-height:20px;color:var(--ink)}
/* distinct pass (run B): numbered callouts, dimension marks, panels. These rules follow the page rules above and refine them. */
.b-nb{display:inline-grid;place-items:center;flex:none;width:18px;height:18px;margin-right:8px;border-radius:50%;background:var(--ink);color:var(--ground);font-family:var(--chrome);font-size:10px;line-height:1;font-weight:600;font-style:normal;font-variant-numeric:tabular-nums;vertical-align:1px}
.b-nb--w{width:auto;min-width:24px;padding:0 6px;border-radius:9px}
.b-nb--s{width:14px;height:14px;margin:0 0 0 6px;font-size:9px;vertical-align:-2px}
.b-nb--ab{position:absolute;margin:0;transform:translate(-50%,-50%);z-index:2}
.b-nb--l{width:22px;height:22px;font-size:11px;box-shadow:0 0 0 2px var(--ground)}
.b-nb--c{left:0;top:0;transform:translate(-35%,-35%)}
.b-nb--e{left:-12px;top:14px;transform:none}
.b-nb--t{left:auto;right:6px;top:6px;transform:none}
.pg .b-nb{background:var(--ink);color:var(--ground);font-family:var(--chrome);font-size:10px;line-height:1}
.pg .b-nb--s{font-size:9px}
.pg .b-gr .b-nb{font-size:9px}
.pg .b-nb--l{font-size:11px}
.pg .b-sig .b-nb{font-size:7px}
.pg .b-sg .b-nb{background:var(--ground);color:var(--ink)}
.b-gl span{display:flex;align-items:center}
.h3:has(>.b-nb),.b-tr__n,.b-ms span,.b-tu__a b,.cap b:has(>.b-nb){display:flex;align-items:center}
.b-tr__n .b-nb{margin-right:6px}

/* typefaces */
.b-fm{border:0;padding:12px 28px}
.b-lic{margin-top:0}
/* slots on a Steel panel are drawn white so the frame reads */
.b-shr .photo-slot,.b-ir .photo-slot{background:var(--ground)}
.b-pd{outline:1px solid var(--line);outline-offset:-1px}
.b-pr{grid-template-columns:150px minmax(0,1fr)}
.b-pgsum .bd{gap:14px}
.b-pgsum .b-su{padding:22px 28px}
.b-pgsum .b-sg2{height:44px}
.b-pgsum .b-sd{margin-top:8px}

/* hierarchy: one Steel panel, each line box white with its height measured beside it */
.b-hp{padding:20px 28px}
.b-hp .b-hr{padding:12px 0;border-top-color:var(--line)}
.b-hp .b-hr:first-child{padding-top:0}
.b-hp .b-ht{color:var(--quiet-panel)}
.b-hp .b-ht .b-nb{align-self:center}
.b-hw{display:flex;align-items:stretch;max-width:100%;padding-right:66px}
.b-hs{flex:0 1 auto;background:var(--ground)}
.b-vd{position:relative;flex:none;align-self:stretch;width:14px;margin-left:8px}
.b-hp .b-dm span{background:var(--panel);color:var(--ink)}

/* type in use */
.b-tu__a .b-nb{margin-right:8px}

/* type rules: a panel a rule */
.b-trh{padding:0 16px 6px}
.b-trh,.b-tr{grid-template-columns:92px minmax(0,1fr) minmax(0,1fr);gap:0 16px}
.b-trs{gap:10px}
.b-tr{padding:14px 16px;border-top:0;align-items:start}
.b-demo{padding:0 14px}

/* photo direction: the frame in a panel with five pins, keyed in the rows below */
.b-pp{padding:16px 16px 14px}
.b-pd{height:320px;border-radius:var(--rc)}
.b-pr h3{display:flex;align-items:center}

/* shot list: a project-panel list, one row a shot, each frame with viewfinder marks */
.b-shs{display:flex;flex-direction:column;gap:14px;padding:22px 28px}
.b-shr{display:grid;grid-template-columns:150px minmax(0,1fr);gap:0 24px;align-items:center;min-width:0}
.b-shr .cap b{display:flex;align-items:center;margin-bottom:2px}
.b-shr__f{position:relative;height:96px;margin:6px}
.b-shr__p{height:100%;border-radius:var(--rc)}
.b-shr .photo-slot{font-size:11px;line-height:1.4;padding:10px 14px}
.b-vf{position:absolute;z-index:1;width:10px;height:10px;border:0 solid var(--ink)}
.b-vf--a{left:-6px;top:-6px;border-top-width:1px;border-left-width:1px}
.b-vf--b{right:-6px;top:-6px;border-top-width:1px;border-right-width:1px}
.b-vf--c{left:-6px;bottom:-6px;border-bottom-width:1px;border-left-width:1px}
.b-vf--d{right:-6px;bottom:-6px;border-bottom-width:1px;border-right-width:1px}

/* imagery rules: four numbered panels, the right way over the wrong way */
.b-irs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 16px}
.b-ir{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px 16px 14px;border-top:0}
.b-tilebox{height:100px}
.b-tag{position:absolute;right:8px;top:8px;z-index:3;padding:1px 8px;border-radius:var(--rc);background:var(--ground);box-shadow:inset 0 0 0 1px var(--line);color:var(--ink);font-size:11px;line-height:16px;font-weight:600}

/* grid */
.b-gr .b-nb{width:16px;height:16px;font-size:9px}
.b-gr{margin-top:26px}

/* layouts and social */
.b-lf__s{position:relative}
.b-sf__d{position:relative;padding-top:22px}
.b-hd{position:absolute;left:0;top:10px;width:100%;height:0}
.b-so .b-dm span{background:var(--panel)}
.b-nb--ab.b-nb--c{transform:translate(-35%,-35%)}

/* signage and email signature: the pins sit on drawings that may be dark, so they carry a ring */
.b-sg .b-nb{background:var(--ground);color:var(--ink);box-shadow:0 0 0 1px var(--ink)}
.b-sig .b-nb{width:12px;height:12px;font-size:7px}
.b-ms2 h3{display:flex;align-items:center}

/* digital */
.b-bw__main,.b-bw__list{position:relative}
.b-bw__act{align-items:center}
.b-bw__act .b-nb{margin:0 0 0 10px}

/* summary: share dimensioned, faces as inspector rows, rules keyed */
.b-sp{padding:18px 24px 20px}
.b-sp .b-sh{margin-bottom:12px}
.b-sd{position:relative;display:block;height:0;margin:12px 0 8px}
.b-sp .b-dm span{background:var(--panel);color:var(--ink)}
.b-fs{display:flex;flex-direction:column;gap:0}
.b-fs li{display:grid;grid-template-columns:64px 170px minmax(0,1fr);gap:0 16px;align-items:center;border-top:1px solid var(--line);padding:6px 0}
.b-fs li:first-child{border-top:0}
.b-fa{font-size:34px;line-height:1.1}
.b-rs{display:flex;flex-direction:column}
.b-rs li{display:grid;grid-template-columns:18px 190px minmax(0,1fr);gap:0 14px;align-items:start;border-top:1px solid var(--hair);padding:10px 0}
.b-rs li:first-child{border-top:0;padding-top:0}
.b-rs .b-nb{margin:1px 0 0}
.b-rs p{margin-top:0}

/* contact and scope */
.b-ct{align-items:stretch}
.b-vp{padding:24px 28px}
.b-vp .b-vh li{border-top-color:var(--line)}
.b-cs2{gap:0;padding:24px 28px}
.b-cs2>div+div{border-left:1px solid var(--line);padding-left:28px}
.b-cs2>div:first-child{padding-right:28px}
.b-in{position:relative}
.b-in::before{content:"";position:absolute;left:6px;top:0;bottom:18px;width:1px;background:var(--ink)}
.b-in li{position:relative;grid-template-columns:28px minmax(0,1fr) auto;padding:8px 0 8px 24px;border-top:0}
.b-in li::before{content:"";position:absolute;left:6px;top:50%;width:14px;height:1px;background:var(--ink)}
.b-cs2 .b-not li{border-top-color:var(--line)}
.b-cs2 .b-not li:first-child{border-top:0;padding-top:0}
.b-not b{display:flex;align-items:center}
/*@@CSS*/
`;
}
