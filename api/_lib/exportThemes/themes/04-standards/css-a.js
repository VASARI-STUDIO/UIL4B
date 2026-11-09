// Theme 04 css for run A pages (classes start a-). The work area is 721 x 634 px at the right of the title column.
import { cssStr } from '../../engine/escape.js';
export const cssA = (ctx) => {
  const mono = ctx.brand.fonts.mono, dw = ctx.brand.fonts.display.weights.at(-1);
  return `
.pg{--mono:'${cssStr(mono.family)}',monospace}
.pg .hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.pg figure{margin:0}
.a-sw{display:block;flex:none;width:28px;height:28px;border-radius:2px}
.a-mono{font-family:var(--mono);font-size:12px;line-height:1.3;color:var(--ink)}
.a-no{font-family:var(--chrome);font-size:12px;font-weight:400;line-height:1.4;color:var(--quiet)}
.a-fc{display:grid;grid-template-columns:44px minmax(0,1fr);margin-top:10px}
.a-fc .num{color:var(--quiet)}
.pg .a-dim line{stroke:var(--quiet);stroke-width:1}
.pg .a-dim line.g{stroke-dasharray:3 3}
.pg .a-dim text{font:400 11px var(--chrome);fill:var(--quiet);stroke:var(--ground);stroke-width:3px;paint-order:stroke}

/* registration marks at the corners of a plate */
.a-plate{position:relative;padding:14px}
.a-reg{position:absolute;width:10px;height:10px;border:0 solid var(--ink)}
.a-r1{left:0;top:0;border-left-width:1px;border-top-width:1px}
.a-r2{right:0;top:0;border-right-width:1px;border-top-width:1px}
.a-r3{left:0;bottom:0;border-left-width:1px;border-bottom-width:1px}
.a-r4{right:0;bottom:0;border-right-width:1px;border-bottom-width:1px}
.a-plate .a-fc{margin-top:14px}

/* a plate with a ruled header: clause number, title, note */
.a-plh{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:0 12px;align-items:baseline;border-top:1px solid var(--ink);padding:8px 0 12px;font-size:12px}
.a-plh .num{color:var(--quiet)}
.a-plh b{font-weight:600}
.a-plh span:last-child{color:var(--quiet)}

/* departures board */
.a-board li{display:grid;grid-template-columns:124px minmax(0,1fr) 150px 110px;align-items:center;height:64px;padding:0 14px;border-top:1px solid var(--hair);font-family:var(--body)}
.a-board--slot li,.a-bdim.a-bdim--slot{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 110px}
.a-board li:last-child{border-bottom:1px solid var(--hair)}
.a-board li.a-bd--on{background:var(--buoy);color:var(--buoy-ink);border-top-color:var(--buoy);border-bottom-color:var(--buoy)}
.a-bt{font-size:44px;line-height:1}
.a-bto{font-size:22px;font-weight:600;line-height:1.2}
.a-bw{font-size:15px;font-weight:500;color:var(--quiet)}
.a-bs{font-size:15px;font-weight:600;text-align:right}
.a-bd--on .a-bw{color:inherit}
.a-bdim{display:grid;grid-template-columns:124px minmax(0,1fr) 150px 110px;padding:0 14px;margin-bottom:10px}
.a-bdim span{position:relative;margin:0 3px;padding-top:6px;border-top:1px solid var(--quiet);text-align:center;font-size:11px;line-height:1.3;color:var(--quiet)}
.a-bdim span::before{content:'';position:absolute;left:-1px;right:-1px;top:-4px;height:7px;border-left:1px solid var(--quiet);border-right:1px solid var(--quiet)}

/* intro */
.a-intro{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.a-i1{display:grid;grid-template-columns:44px minmax(0,1fr);border-top:1px solid var(--ink);padding-top:12px}
.a-h1{font-size:76px;line-height:.95;max-width:640px;text-wrap:balance}

/* personality */
.a-pers{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.a-traits{display:grid}
.a-traits li{display:flex;flex-direction:column;gap:8px;padding:12px 18px 8px 18px;border-top:1px solid var(--ink);border-left:1px solid var(--hair)}
.a-traits li:first-child{padding-left:0;border-left:0}
.a-trait{font-size:66px;line-height:.95}
.a-means{font-family:var(--body);font-size:16px;line-height:1.4;max-width:30ch}
.a-lines{flex:none;min-height:250px;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:14px 28px 28px;background:var(--buoy);color:var(--buoy-ink)}
.a-lines .a-no{color:inherit;margin-bottom:auto}
.a-lines .disp{font-size:44px;line-height:1}

/* voice */
.a-vlist{height:100%;display:grid;grid-template-rows:repeat(4,minmax(0,1fr))}
.a-vlist li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:0 20px;align-items:center;border-top:1px solid var(--ink)}
.a-vlist li:last-child{border-bottom:1px solid var(--ink)}
.a-vn{font-size:26px;line-height:1;color:var(--quiet)}
.a-vlist li:first-child .a-vn{align-self:center;justify-self:start;padding:6px 8px;background:var(--buoy);color:var(--buoy-ink)}
.a-vb{display:block;margin-bottom:8px;font-size:13px;font-weight:600}
.a-vx{font-size:46px;line-height:.95;text-wrap:balance}
.a-vlist li:last-child .a-vx{color:var(--accent)}

/* write this, not that */
.a-wt{height:100%;display:flex;flex-direction:column}
.a-th,.a-wt li{display:grid;grid-template-columns:44px minmax(0,1.55fr) minmax(0,1fr);gap:0 24px}
.a-th{padding-bottom:8px;border-bottom:1px solid var(--ink);font-size:12px;font-weight:600}
.a-wt ul{flex:1;min-height:0;display:grid;grid-template-rows:repeat(5,minmax(0,1fr))}
.a-wt li{align-items:center;border-top:1px solid var(--hair)}
.a-wt li:first-child{border-top:0}
.a-w{font-size:32px;line-height:1}
.a-n{display:flex;align-items:center;gap:8px;margin-top:8px;font-family:var(--body);font-size:15px;line-height:1.3;color:var(--quiet)}
.a-n s{min-width:0}
.a-nl{flex:none;font-family:var(--chrome);font-size:11px}
.a-sx{flex:none}
.a-b{font-family:var(--body);font-size:15px;line-height:1.4}

/* messaging */
.a-msg{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.a-msg .h3{margin:0 0 12px;border-top-color:var(--ink)}
.a-msg .h3 .a-no{display:inline-block;width:44px;font-weight:400}
.a-linelist li{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:baseline;padding:14px 0 16px;border-top:1px solid var(--hair)}
.a-linelist .disp{font-size:42px;line-height:1}
.a-linelist .a-first .disp{font-size:62px;line-height:.95;text-wrap:balance}
.a-bp{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.a-bpt{padding-left:44px;font-family:var(--body);font-size:16px;line-height:1.45}

/* logo: the construction sheet */
.a-lg{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.a-draw{position:relative;box-shadow:inset 0 0 0 1px var(--hair)}
.a-grid{position:absolute;left:0;top:0}
.a-grid pattern:first-child path{stroke:var(--hair);stroke-width:.5}
.a-grid pattern:last-child path{stroke:var(--hair);stroke-width:1.25}
.a-dlogo{position:absolute}
.a-draw .a-dim{position:absolute;left:0;top:0;overflow:visible}
.a-dim rect.zone{fill:none;stroke:var(--accent);stroke-width:1;stroke-dasharray:5 3}

/* clear space */
.a-cs{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.a-zone{position:relative;background:var(--panel)}
.a-zg{position:absolute;left:0;top:0}
.a-zg pattern path{stroke:var(--quiet-panel);stroke-width:.5}
.a-zin{position:absolute;background:var(--ground)}
.a-zm{position:absolute;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink)}
.a-zm b{font-weight:400;padding:0 3px;background:var(--panel)}

/* minimum size */
.a-ms2{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.a-msbox{height:200px;display:flex;align-items:center;padding:0 28px;background:var(--raised);box-shadow:inset 0 0 0 1px var(--hair)}
.a-mslogo{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.a-mslogo .a-dim{position:static;flex:none;overflow:visible}
.a-mslogo .a-ruler{margin-top:10px}

/* logo on colour and photos */
.a-ggrid{height:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:20px}
.a-g{display:flex;flex-direction:column;min-height:0}
.a-gt{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;border-radius:2px}
.a-gt--photo{position:relative;overflow:hidden}
.a-fillimg{position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box}
.a-onphoto{position:absolute;left:16px;top:16px}

/* misuse: crossed specimens */
.a-mgrid{height:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:14px 20px}
.a-m{display:flex;flex-direction:column;min-height:0}
.a-mt{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--raised);box-shadow:inset 0 0 0 1px var(--hair);border-radius:2px}
.a-m .a-fc{min-height:54px}

/* palette: the chip sheet */
.a-pal{height:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 30px;align-content:space-between}
.a-ch{aspect-ratio:1;display:flex;flex-direction:column;padding:14px;border-radius:2px;font-family:var(--body)}
.a-cno{font-family:var(--chrome);font-size:12px}
.a-ptext{margin-top:12px;font-size:17px;font-weight:500;line-height:1.3;max-width:20ch}
.a-ptext.disp{font-size:32px;line-height:1;font-weight:${dw}}
.a-pn{margin-top:auto;font-family:var(--chrome);font-size:12px}
.a-pal figcaption{margin-top:8px}
.a-ch--t{justify-content:center;gap:18px;padding:18px}
.a-ch--t>span{display:flex;align-items:center;gap:12px}
.a-ch--t>span>span{display:flex;flex-direction:column;gap:2px;font-family:var(--chrome);font-size:13px}
.a-ch--t b{font-weight:600}
.a-ch--t .a-sw{width:44px;height:44px}

/* proportion */
.a-prop{height:100%;display:grid;grid-template-columns:382px minmax(0,1fr);gap:0 36px}
.a-br{height:9px;margin-bottom:6px;border:1px solid var(--quiet);border-bottom:0}
.a-pg{height:520px;display:grid;border-radius:2px;overflow:hidden}
.a-pgcol,.a-pgrow{display:grid;min-height:0}
.a-pg>div,.a-pgcol>div,.a-pgrow>div{min-width:0;padding:8px}
.a-bn{font-family:var(--chrome);font-size:11px}
.a-prop figcaption{margin-top:10px}
.a-plist{display:flex;flex-direction:column;justify-content:space-between}
.a-plist li{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:8px 8px;padding-top:10px;border-top:1px solid var(--ink)}
.a-plist .a-sw{width:18px;height:18px}
.a-pcn{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600}
.a-pct{font-size:42px;line-height:1}
.a-bar{grid-column:2/4;height:10px;display:block;border-radius:1px;overflow:hidden}
.a-bar i{display:block;height:100%}

/* colour values: the tint table */
.a-vals{height:100%;display:flex;flex-direction:column;justify-content:space-between}
.a-vgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0 14px}
.a-vcol{display:flex;flex-direction:column;min-width:0}
.a-vchip{aspect-ratio:1;padding:10px;border-radius:2px;font-size:12px}
.a-vnm{display:block;margin:8px 0 8px;font-size:13px;font-weight:600}
.a-tint{display:flex;flex-direction:column}
.a-ts{position:relative;display:block;height:17px;padding:2px 0 0 4px;font-size:11px;font-style:normal;line-height:13px;border-bottom:1px dashed var(--ground)}
.a-ts span{display:inline-block;padding:0 4px;background:var(--ground);color:var(--ink)}
.a-ts:last-child{border-bottom:0}
.a-ts--base::before{content:'';position:absolute;left:-7px;top:0;bottom:0;width:4px;background:var(--ink)}
.a-vnote{display:flex;align-items:center;justify-content:center;height:170px;padding:0 8px;border:1px dashed var(--quiet);border-radius:2px;font-size:11px;line-height:1.4;text-align:center;color:var(--quiet)}
.a-spec{display:grid;margin:12px 0 0;padding-top:8px;border-top:1px solid var(--ink)}
.a-spec dt{margin-top:6px;font-size:11px;font-weight:600;color:var(--quiet)}
.a-spec dd{margin:0}
.a-ok{white-space:nowrap}
.a-vals .h3{margin:0 0 10px;border-top-color:var(--ink)}
.a-tones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
.a-tones li{display:flex;align-items:center;gap:10px}
.a-tones li>span{display:flex;flex-direction:column;gap:2px;font-size:13px}
.a-tones b{font-weight:600}
.a-tones .a-sw{width:24px;height:24px}
`;
};
