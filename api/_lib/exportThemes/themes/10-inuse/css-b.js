// Theme 10 stylesheet part, wave 2 run B (classes start b-). Appended to css() in index.js; uses the .pg custom properties.
import { componentsCss } from '../../engine/components.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

export function cssB(ctx) {
  const L = ctx.roles.light, mono = ctx.brand.fonts.mono, g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  // product screens on the digital page use the UI kit's components, so they carry the kit's light tokens
  const uiScope = `.pg .ui{${decl(colourMap(ctx, 'light'))};${decl(g.space)};${decl(g.radius)};${decl(g.width)};${decl(g.font)};${decl(g.text)};${decl(g.shadow)}}`;
  return `
.pg{--pool:${L.success.bg};--ok:${L.success.fg};--bad:${L.danger.fg};--bmono:'${mono.family}',monospace}
.pg :where(b){font-weight:600}
.b-mono{font-family:var(--bmono);font-size:14px;line-height:1.4}
.b-lead{font-size:14px;line-height:1.6;color:var(--soft);max-width:520px;margin-top:8px}
.b-sc{position:relative;flex:none;overflow:hidden}
.b-sc__in{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}

/* notes beside a phone: markers sit level with what they name */
.b-two{display:flex;align-items:flex-start;margin-top:28px}
.b-pw{position:relative;width:420px;height:740px;flex:none}
.b-pw--r{width:420px}
.b-m{position:absolute;left:376px}
.b-m::before{content:'';position:absolute;right:100%;top:11.5px;width:12px;border-top:1px solid var(--ink)}
.b-m--l{left:20px}
.b-m--l::before{right:auto;left:100%}
.b-side{flex:1;min-width:0}
.b-notes li{display:grid;grid-template-columns:34px minmax(0,1fr);padding:14px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.6;color:var(--quiet)}
.b-notes li:first-child{padding-top:0;border-top:0}
.b-notes li b{display:block;color:var(--ink);font-size:14px;line-height:1.4;margin-bottom:2px}
.b-spec{display:block;font-size:30px;line-height:1.1;color:var(--ink);margin:6px 0 8px}
.b-monorow{display:flex;flex-direction:column;gap:8px;margin-top:20px;padding:16px;border-radius:12px;background:var(--card);box-shadow:inset 0 0 0 1px var(--hair)}
.b-monorow .b-mono{font-size:20px;line-height:1.2;color:var(--ink)}
.b-lic{margin-top:auto;max-width:520px}

/* a phone whose screen carries its own notes: the marker belongs to an item on the screen and leads out to the page */
.b-vp{overflow:visible}
.b-vp .sb{justify-content:space-between}
.b-pi{position:relative}
.b-pm{position:absolute;left:calc(100% + var(--pmx,36px));top:0}
.b-pm::before{content:'';position:absolute;right:100%;top:11.5px;width:calc(var(--pmx,36px) - 6px);border-top:1px solid var(--ink)}
.b-pm--l{left:auto;right:calc(100% + var(--pmx,36px))}
.b-pm--l::before{right:auto;left:100%}
.b-pm--d{--pmx:27px;top:50%;margin-top:-12px}
.b-pm--d::after{content:'';position:absolute;left:100%;top:11.5px;width:21px;border-top:1px solid var(--ink)}
.b-side--l{padding-right:0}
.b-key .num{display:block;color:var(--soft)}

/* hierarchy: six styles on one screen */
.b-tscr{padding:12px 20px 0;display:flex;flex-direction:column}
.b-ti{padding:14px 0;border-top:1px solid var(--hair)}
.b-ti:first-child{padding-top:0;border-top:0}
.b-ti__s{color:var(--ink);white-space:normal;margin:0}

/* type in use: the welcome sheet over a screen, a Float bar across its top */
.b-bsheet{position:absolute;left:12px;right:12px;top:92px;bottom:12px;box-sizing:border-box;padding:44px 24px 24px;display:flex;flex-direction:column;gap:28px;background:var(--card);border-radius:20px;box-shadow:inset 0 0 0 1px var(--hair)}
.b-bsheet__bar{position:absolute;left:0;right:0;top:0;height:12px;background:var(--float);border-radius:20px 20px 0 0}
.b-it--foot{margin-top:auto}
.b-sh{white-space:normal;color:var(--ink)}
.b-sp{font-family:var(--body);color:var(--soft)}
.b-sc3{font-family:var(--body);color:var(--quiet)}

/* two phones side by side: the rule followed on the left, broken on the right; notes in the gap */
.b-duo{position:relative;width:682px;margin-top:28px}
.b-rowsw{padding:8px 20px 0;display:flex;flex-direction:column}
.b-drow{display:flex;align-items:center;box-sizing:border-box;border-top:1px solid var(--hair);font-size:12px}
.b-drow:first-child{border-top:0}
.b-drow>.b-ill{flex:1;min-width:0}
.b-d{font-family:var(--body);white-space:nowrap}
.b-dd{white-space:nowrap}
.b-rows{margin-top:8px}
.b-rows p{display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid var(--hair);font-size:15px;line-height:1.4}
.b-rows p:last-child{border-bottom:1px solid var(--hair)}
.b-foot{position:absolute;left:0;right:0;bottom:0;padding:16px 20px 36px;background:var(--ground);border-top:1px solid var(--hair)}
.b-pill{display:flex;align-items:center;justify-content:center;height:44px;border-radius:999px;background:var(--card);box-shadow:inset 0 0 0 1.5px var(--ink);font:700 16px/1 var(--body);color:var(--ink)}
.b-kr{margin-top:28px}
.b-kr li{display:grid;grid-template-columns:24px minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start;padding:12px 0;border-top:1px solid var(--hair)}
.b-kr li:first-child{border-top:1px solid var(--ink)}
.b-kr .cap{display:flex;gap:8px;align-items:flex-start;line-height:1.5;color:var(--soft)}
.b-tk{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;flex:none;color:var(--card)}
.b-tk--ok{background:var(--ok)}
.b-tk--no{background:var(--bad)}
.b-bars{display:flex;flex-direction:column;gap:8px}
.b-bars i{display:block;height:8px;border-radius:4px;background:var(--hair)}

/* photo direction: the photo full bleed on a phone; shot list: three shots on each of two phones */
.b-pfull{position:absolute;left:0;right:0;top:44px;bottom:0;width:100%;height:auto;box-sizing:border-box;border-radius:0 0 28px 28px;padding:16px 164px 16px 16px;font-size:12px;line-height:1.5;object-fit:cover}
.b-rowsw--shots{height:648px;justify-content:space-between}
.b-shot{display:flex;flex-direction:column;gap:10px;min-width:0;align-items:stretch}
.b-drow--shot{border-top:0}
.b-shp{height:170px;flex:none;border-radius:12px;box-sizing:border-box;padding:12px;overflow:hidden}
.b-shot figcaption{display:flex;gap:10px;align-items:center;font-size:14px}

/* imagery rules: flat drawings of the rule, built from the palette roles */
.b-ill{position:relative;height:92px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.b-ill--pool{background:var(--pool)}
.b-ill--wash{background:var(--float)}
.b-ill--wash .b-lanes i{border-color:var(--card)}
.b-ill--wall{background:var(--panel)}
.b-ill--flat,.b-ill--ui{background:var(--card);box-shadow:inset 0 0 0 1px var(--hair)}
.b-ill--stock span{font-size:14px;font-weight:600;color:var(--quiet)}
.b-ill--ui{justify-content:flex-start;padding:0 16px}
.b-lanes{position:absolute;inset:0}
.b-lanes i{position:absolute;top:8px;bottom:8px;border-left:2px dashed var(--card)}
.b-swim{position:relative;width:28px;height:28px;border-radius:50%;background:var(--float)}
.b-ill--wall .b-swim{box-shadow:none}
.b-ill--wash .b-swim{background:var(--ink);box-shadow:none}
.b-sym{position:relative;display:block}
.b-ab{position:absolute}
.b-room{position:absolute;right:12px;top:60px;width:136px;height:280px;box-sizing:border-box;border:1.5px dashed var(--ink);border-radius:12px;padding:12px;font-size:12px;line-height:1.5;color:var(--ink)}

/* grid: the page at half size, columns tinted */
.b-two--grid{margin-top:32px;gap:48px}
.b-gw{position:relative;padding-top:44px;flex:none}
.b-mini{position:relative;background:var(--card);box-shadow:inset 0 0 0 1px var(--hair)}
.b-mini .b-col{position:absolute;top:0;bottom:0;background:var(--pool)}
.b-md{position:absolute;top:0}
.b-md::after{content:'';position:absolute;left:11.5px;top:100%;height:20px;border-left:1px solid var(--ink)}
.b-base{display:block;margin-top:12px}

/* layouts: three pages drawn at full size and scaled, the columns behind each */
.b-lays{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 24px;margin-top:28px}
.b-lcell{position:relative}
.b-thumb{border-radius:8px;box-shadow:0 0 0 1px var(--hair)}
.b-lay{position:absolute;inset:0;background:var(--card);overflow:hidden}
.b-gc{position:absolute;top:0;bottom:0;background:var(--pool)}
.b-bar{position:absolute;border-radius:999px;background:var(--quiet)}
.b-stripe{position:absolute;top:0;bottom:0;background:var(--float)}
.b-lh{font-size:58px;line-height:1.05;white-space:normal;color:var(--ink)}
.b-pbtn{display:inline-flex;align-items:center;height:44px;padding:0 20px;border-radius:999px;background:var(--accent);color:var(--card);font:700 16px/1 var(--body)}
.b-lcap{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-content:start;padding-top:4px}
.b-lcap li{display:grid;grid-template-columns:36px minmax(0,1fr);font-size:13px;line-height:1.6;color:var(--quiet)}
.b-lcap li b{display:block;font-size:14px;line-height:1.4;color:var(--ink);margin-bottom:2px}

/* social: three posts drawn at their real size, scaled */
.b-soc{display:flex;gap:38px;margin-top:28px;align-items:flex-start}
.b-soc__c{display:flex;flex-direction:column;gap:12px;width:322px}
.b-pc{display:grid;grid-template-columns:34px minmax(0,1fr);font-size:12px;line-height:1.6;color:var(--quiet);margin-bottom:12px}
.b-pc b{display:block;font-size:14px;line-height:1.4;color:var(--ink);margin-bottom:2px}
.b-post{position:absolute;inset:0;overflow:hidden}
.b-post--float{background:var(--float);color:var(--ink)}
.b-post--ink{background:var(--ink)}
.b-post--ground{background:var(--ground)}
.b-ph1{position:absolute;font-size:132px;line-height:1;white-space:normal;margin:0;color:var(--ink)}
.b-pchip{display:inline-flex;align-items:center;height:96px;padding:0 44px;border-radius:999px;background:var(--float);color:var(--ink);font:600 48px/1 var(--body)}
.b-ppill{display:inline-flex;align-items:center;height:120px;padding:0 64px;border-radius:999px;background:var(--accent);color:var(--card);font:700 48px/1 var(--body)}

/* signage: the sign on a wall, 0.6 px to the millimetre */
.b-two--sign{margin-top:32px;gap:26px}
.b-pw--wall{width:456px;height:700px}
.b-wall{position:absolute;left:0;top:0;width:456px;height:700px;border-radius:20px;background:var(--panel)}
.b-wall .b-m{left:420px}
.b-sign{position:absolute;left:48px;top:88px;border-radius:12px;background:var(--float);color:var(--ink);overflow:hidden;box-shadow:0 0 0 1px var(--hair)}
.b-screw{position:absolute;top:18px;width:10px;height:10px;border-radius:50%;background:var(--ink)}
.b-sign__h{position:absolute;left:32px;top:232px;width:296px;font-size:48px;line-height:1.04;white-space:normal;color:var(--ink)}
.b-sign__n{position:absolute;left:32px;right:32px;bottom:36px;padding-top:16px;border-top:1.5px solid var(--ink);font:400 16px/1.5 var(--body);color:var(--ink)}
.b-dim{position:absolute;display:flex;align-items:center;justify-content:center}
.b-dim--w{height:0;border-top:1px solid var(--ink)}
.b-dim--h{width:0;border-left:1px solid var(--ink)}
.b-dim::before,.b-dim::after{content:'';position:absolute}
.b-dim--w::before,.b-dim--w::after{top:-5px;height:9px;border-left:1px solid var(--ink)}
.b-dim--w::before{left:0}.b-dim--w::after{right:0}
.b-dim--h::before,.b-dim--h::after{left:-5px;width:9px;border-top:1px solid var(--ink)}
.b-dim--h::before{top:0}.b-dim--h::after{bottom:0}
.b-dim em{position:relative;font:600 12px/1 var(--chrome);color:var(--ink);background:var(--panel);padding:4px 8px}
.b-dim--h em{writing-mode:vertical-rl;transform:rotate(180deg);padding:8px 4px}

/* email signature: the message open on a phone, three notes down its left edge */
.b-mail{background:var(--card)}
.b-mail__h{position:relative;padding:12px 20px 12px;border-bottom:1px solid var(--hair);background:var(--panel)}
.b-mail__h p{display:flex;gap:12px;font-size:13px;line-height:1.4;padding:3px 0;color:var(--ink)}
.b-mail__h p span{width:48px;flex:none;color:var(--quiet)}
.b-mail__t{display:block;padding-left:60px;font-size:12px;color:var(--quiet)}
.b-mail__h .b-mail__t{padding-left:60px}
.b-mail__b{padding:20px 20px 0;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--ink)}
.b-mail__b>p{margin-bottom:10px}
.b-sig{margin-top:16px;padding-top:16px;border-top:1px solid var(--hair);display:flex;flex-direction:column;gap:12px}
.b-sg{position:relative}
.b-sig__n{font-size:16px;font-weight:600;line-height:1.3}
.b-sig__r{font-size:12px;line-height:1.5;color:var(--quiet)}
.b-sig__c{font-size:12px;line-height:1.6;color:var(--ink)}
.b-plain{margin-top:28px;padding:16px 0 0;border-top:1px solid var(--ink)}
.b-plain__h{font-size:14px;font-weight:600;margin-bottom:8px}
.b-plain__t{display:flex;flex-direction:column;font:400 12px/1.6 var(--body);color:var(--ink);margin-bottom:12px}
.b-plain__t span:first-child{font-weight:600}

/* digital: two screens at 0.88, notes in the gap and below */
.b-dg{position:relative;width:682px;margin-top:32px}
.b-dm{position:absolute;left:329px}
.b-dm::before{content:'';position:absolute;top:11.5px;width:12px;border-top:1px solid var(--ink)}
.b-dm--l::before{right:100%}
.b-dm--r::before{left:100%}
.b-app{display:block}
.b-app__in{display:flex;flex-direction:column;gap:20px;padding:12px 20px 0}
.b-app__t{font-size:30px;line-height:1.05;color:var(--ink)}
.b-app__h{font:700 22px/1.2 var(--body);color:var(--ink)}
.b-app__foot{position:absolute;left:0;right:0;bottom:0;padding:16px 20px 36px;background:var(--ground);border-top:1px solid var(--hair)}
.b-nav{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-around;padding:12px 20px 32px;background:var(--ground);border-top:1px solid var(--hair)}
.b-notes--2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;margin-top:28px}
.b-notes--2 li{padding:14px 0;border-top:1px solid var(--hair)}
.b-notes--2 li:first-child{padding-top:14px;border-top:1px solid var(--hair)}

/* summary: the brand on one screen, each colour noted where it lives */
.b-sfl{position:absolute;left:0;right:0;top:0;height:384px;background:var(--float);border-radius:28px 28px 0 0;color:var(--ink)}
.b-sfl__h{position:absolute;left:24px;bottom:24px;width:312px;line-height:1.05;white-space:normal;color:var(--ink)}
.b-sbody{position:absolute;left:0;right:0;top:384px;bottom:0;box-sizing:border-box;padding:20px;display:flex;flex-direction:column;gap:16px}
.b-scard{display:flex;flex-direction:column;gap:16px;padding:20px;border-radius:16px;background:var(--card);box-shadow:inset 0 0 0 1px var(--hair)}
.b-scard__t{font-size:30px;line-height:1.05;white-space:normal;color:var(--ink)}
.b-sbtn{display:flex}
.b-ckey li div{min-width:0}
.b-ckey .num{color:var(--soft);margin-right:8px}
.b-sh2{font-size:12px;font-weight:600;padding-bottom:8px;margin-top:24px}
.b-lst li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.5;color:var(--quiet)}
.b-lst li:last-child{border-bottom:1px solid var(--hair)}
.b-lst li b{font-size:14px;font-weight:600;color:var(--ink)}
.b-rules3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:24px}
.b-rules3 li{display:flex;flex-direction:column;gap:8px}
.b-rh{font-size:14px;line-height:1.4;font-weight:600}
.b-rp{font-size:12px;line-height:1.6;color:var(--quiet)}

/* contact and scope: three list screens side by side */
.b-ask{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:32px;align-items:end;margin-top:40px;padding-bottom:32px}
.b-ask__h{font-size:72px;line-height:1;white-space:normal;color:var(--ink)}
.b-ask__p{font-size:14px;line-height:1.6;color:var(--soft)}
.b-mail2{display:block;margin-top:12px;padding:12px 16px;border-radius:12px;background:var(--card);box-shadow:inset 0 0 0 1px var(--hair)}
.b-mail2 .b-mono{font-size:14px;color:var(--ink)}
.b-cs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:16px;align-items:stretch}
.b-lp{box-sizing:border-box;min-height:460px;padding:14px 18px 24px;border-radius:28px;background:var(--ground);box-shadow:0 0 0 1px var(--hair);min-width:0}
.b-lp__n{display:block;width:48px;height:4px;margin:0 auto 24px;border-radius:2px;background:var(--hair)}
.b-cs__k{font-size:14px;font-weight:600;color:var(--ink);margin:0 0 12px}
.b-vt{width:100%;border-collapse:collapse;font-size:12px;line-height:1.5;color:var(--quiet)}
.b-vt td{padding:8px 8px 8px 0;border-top:1px solid var(--hair);vertical-align:top}
.b-in li{display:grid;grid-template-columns:28px minmax(0,1fr);padding:10px 0;border-top:1px solid var(--hair);font-size:14px;line-height:1.4;color:var(--ink)}
.b-in li:last-child{border-bottom:1px solid var(--hair)}
.b-sn{color:var(--quiet);font-size:12px}
.b-not li{padding:12px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.6;color:var(--quiet)}
.b-not li:first-child{padding-top:0;border-top:0}
.b-not li b{display:block;font-size:14px;line-height:1.4;font-weight:600;color:var(--ink)}

/* run G: layouts as one large drawing with its parts pinned; photo direction guides */
.b-lrow{display:flex;gap:16px;margin-top:24px;align-items:flex-start}
.b-lcol{display:flex;flex-direction:column;gap:16px}
.b-lpin{position:absolute;z-index:1}
.b-lgs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:24px}
.b-lh2{font-size:14px;line-height:1.4;font-weight:600;padding-bottom:8px;border-bottom:1px solid var(--ink);margin-bottom:12px}
.b-lg li{display:grid;grid-template-columns:34px minmax(0,1fr);padding:6px 0;font-size:12px;line-height:1.6;color:var(--quiet)}
.b-gd{position:absolute;box-sizing:border-box;border:1.5px dashed var(--ink);border-radius:12px}
.b-gdm{position:absolute;left:-12px;top:-12px}
.b-cap4{position:absolute;left:40px;top:214px;width:28px;height:28px;border-radius:50%;background:var(--float);box-shadow:0 0 0 1.5px var(--ink)}
` + uiScope + '\n' + componentsCss(ctx);
}
