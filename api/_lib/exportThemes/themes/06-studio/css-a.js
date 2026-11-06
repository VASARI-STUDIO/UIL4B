// Styles for guidelines-a.js (theme 06, Studio). Appended to css() in index.js; reads the .pg custom properties. Every class starts a-.
// Studio's vocabulary here: Steel panels that hold the brand's real UI (White cards, chips, buttons), hairline-ruled lists, drawn dimension marks.
export function cssA(ctx) {
  const mono = ctx.brand.fonts.mono;
  return `
.pg{--mono:'${mono.family}',monospace}
.a-mono{font-family:var(--mono);font-size:12px;line-height:1.4;font-weight:400;color:var(--ink);white-space:nowrap}
.a-fill{flex:1;min-height:0}
.a-h2{font-size:38px;line-height:1.12;text-wrap:balance;max-width:640px}
.a-body{font-family:var(--body);font-size:15px;line-height:1.6;color:var(--soft);max-width:520px}
.a-hair{box-shadow:inset 0 0 0 1px var(--hair)}
.a-fillimg{position:absolute;inset:0;width:100%;height:100%}
.a-pn{font-family:var(--body);font-size:15px;line-height:1.5;font-weight:500}

/* Steel panel and the real UI inside it */
.a-panel{background:var(--panel);border-radius:var(--rk);padding:32px;display:flex;flex-direction:column;gap:12px}
.a-ui{font-family:var(--body);color:var(--ink)}
.a-card{background:var(--ground);border-radius:var(--rk);padding:20px 24px;font-family:var(--body)}
.a-card h3{font-family:var(--display);font-weight:700;font-size:22px;line-height:1.1;letter-spacing:-0.01em}
.a-btn{display:inline-flex;align-items:center;justify-content:center;height:44px;box-sizing:border-box;padding:0 20px;border-radius:var(--rc);background:var(--accent);color:var(--accent-ink);font-family:var(--body);font-size:16px;font-weight:600;line-height:1;white-space:nowrap}
.a-btn--out{height:36px;padding:0 14px;background:var(--ground);color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink);font-size:14px}
.a-chip2{display:inline-flex;align-items:center;font-family:var(--body);font-size:14px;line-height:1.3;font-weight:500;white-space:nowrap}
.a-toast{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:14px 16px;border-radius:var(--rk);background:var(--dark);color:var(--dark-ink);font-family:var(--body);font-size:15px;line-height:20px;white-space:nowrap}
.a-toast u{font-weight:600;text-decoration:underline;text-underline-offset:3px}
.a-notice{background:var(--ground);border-radius:var(--rk);padding:12px 14px;font-family:var(--body)}
.a-notice .t{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;line-height:18px;color:var(--quiet)}
.a-notice .t .disp{font-size:13px;color:var(--ink)}
.a-notice .b{margin-top:4px;font-size:15px;line-height:20px;font-weight:400}
.a-r{display:grid;grid-template-columns:minmax(0,1fr) 150px 90px;align-items:center;gap:0 12px;min-height:70px;padding:0 24px;border-top:1px solid var(--hair);font-family:var(--body)}
.a-r:first-child{border-top:0}
.a-r .a-chip2{justify-self:start}
.a-card--row{padding:0}
.a-r b{display:block;font-size:16px;line-height:22px;font-weight:600}
.a-r i{display:block;font-style:normal;font-size:14px;line-height:20px;color:var(--quiet);white-space:nowrap}
.a-amt{text-align:right;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.a-r--solo{grid-template-columns:minmax(0,1fr) auto auto;padding:0 16px;min-height:64px}
.a-tg{font-size:12px;line-height:1.5;color:var(--quiet)}
.a-tg b{display:block;font-weight:600;color:var(--ink)}
.a-field{display:flex;flex-direction:column;gap:2px;padding:12px 0;border-top:1px solid var(--hair)}
.a-field span{font-size:13px;line-height:18px;font-weight:500;color:var(--quiet)}
.a-field b{font-size:16px;line-height:22px;font-weight:500}
.a-tot{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--hair);padding:14px 0 18px}
.a-tot span:first-child{font-size:14px;font-weight:500;color:var(--quiet)}
.a-tot .disp{font-size:32px;line-height:1;font-variant-numeric:tabular-nums}
.a-mark{flex:none;display:block}

/* intro */
.a-intro{display:flex;flex-direction:column;gap:32px}
.a-intro-top{display:flex;flex-direction:column;gap:20px}
.a-intro-panel{align-items:flex-start;padding:56px 32px 64px}
.a-intro-panel .a-field{padding:20px 0}
.a-intro-panel .a-tot{padding:22px 0 26px}
.a-intro-panel .a-pl{white-space:normal;width:226px;font-size:13px;line-height:18px}
.a-intro-panel .a-pl b{font-size:14px}
.a-intro-panel .a-card{width:330px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px}
.a-intro-panel .a-btn{margin-top:22px;width:100%}
.a-intro-panel .a-tg{align-self:flex-start;margin-top:8px}

/* personality */
.a-lines{display:flex;flex-direction:column;gap:4px}
.a-lines .disp{font-size:34px;line-height:1.12}
.a-lines .a-2{font-family:var(--body);font-size:20px;line-height:1.3;font-weight:500;margin-top:8px}
.a-traits{display:flex;flex-direction:column;flex:1;min-height:0}
.a-traits li{flex:1;display:grid;grid-template-columns:400px minmax(0,1fr);gap:56px;padding:10px 0;align-items:stretch}
.a-trait{display:flex;flex-direction:column;justify-content:center;gap:10px}
.a-trait .disp{font-size:26px;line-height:1.15}
.a-trait p{font-family:var(--body);font-size:14px;line-height:1.55;color:var(--soft)}
.a-proof{background:var(--panel);border-radius:var(--rk);padding:20px;display:flex;flex-direction:column;justify-content:center;gap:10px}
.a-btns{display:flex;flex-wrap:wrap;gap:10px}

/* voice */
.a-voice-big{font-size:58px;line-height:1.08;white-space:nowrap}
.a-voice-cap{margin-top:12px}
.a-vpanel{padding:64px 32px;gap:56px;align-items:flex-start}
.a-vw{position:relative;width:330px;flex:none}
.a-vw .a-pl{white-space:normal;width:190px}

/* write this: a White card to write, a ghost card for the line it replaces, a leader to the reason */
.a-wt{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px}
.a-wt-r{display:grid;grid-template-columns:250px 170px minmax(0,1fr);gap:0 14px;align-items:center}
.a-wt-r:not(.a-wt-h){flex:1}
.a-wt-h{padding:0 0 4px;font-size:12px;font-weight:600;color:var(--ink)}
.a-wt-h span:nth-child(-n+2){padding-left:16px}
.a-wt-h span:last-child{padding-left:46px}
.a-wc,.a-wg{display:flex;gap:10px;align-items:flex-start;padding:14px 16px;border-radius:var(--rk);box-sizing:border-box}
.a-wc{background:var(--ground)}
.a-wg{position:relative;border:1.5px dashed var(--quiet-panel)}
.a-wc svg,.a-wg svg{flex:none;margin-top:3px}
.a-w{font-family:var(--body);font-size:19px;line-height:1.3;font-weight:500;color:var(--ink)}
.a-n{font-family:var(--body);font-size:15px;line-height:1.45;color:var(--soft)}
.a-b{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--quiet-panel);padding-left:46px}

/* messaging */
.a-msg{display:flex;flex-direction:column;gap:40px}
.a-msg-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:stretch}
.a-mcol{display:flex;flex-direction:column;gap:12px}
.a-lp{flex:1;justify-content:center;gap:12px;padding:24px}
.a-lc{background:var(--ground);border-radius:var(--rk);padding:18px 20px;font-family:var(--body);font-size:17px;line-height:1.3;font-weight:500}
.a-lc.a-first{font-family:var(--display);font-weight:700;font-size:24px;line-height:1.15;letter-spacing:-0.01em;padding:26px 20px}
.a-names{flex:1;justify-content:center;gap:8px;padding:20px}
.a-nrow{display:flex;align-items:center;gap:12px;background:var(--ground);border-radius:var(--rc);padding:0 14px;height:48px;box-sizing:border-box;font-family:var(--body);font-size:16px;font-weight:500;line-height:1}
.a-nrow.bad{background:transparent;border:1.5px dashed var(--quiet-panel);color:var(--soft);font-weight:400}
.a-nrow svg{flex:none}
.a-bp{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px}
.a-bpc{display:flex;flex-direction:column;gap:12px}
.a-bpp{flex:1;padding:16px}
.a-bpcard{flex:1;display:flex;flex-direction:column;gap:20px;padding:20px}
.a-bpcard p{font-family:var(--body);font-size:16px;line-height:1.55;color:var(--soft)}
.a-bpcard .a-dimf{margin-top:auto}

/* logo: the hero with its width and height drawn, then the real contexts, each measured */
.a-lrow{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:24px;align-items:start}
.a-lhero{padding:20px;gap:0}
.a-lstage{border-radius:var(--rc);padding:32px 20px 56px 28px;display:flex;justify-content:flex-start}
.a-hw,.a-cw{position:relative}
.a-hw{flex:none}
.a-gate-notes{display:flex;flex-direction:column;justify-content:center;gap:24px}
.a-gate-notes li{border-top:1px solid var(--hair);padding-top:12px;display:flex;flex-direction:column;gap:4px}
.a-gate-notes p{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--soft)}
.a-ctx{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 16px}
.a-ctx-w{grid-column:1/-1}
.a-ctx figure{display:flex;flex-direction:column}
.a-lctx{flex:1;padding:20px;gap:0;align-items:stretch}
.a-cw{padding-bottom:44px}
.a-hbar{display:flex;align-items:center;justify-content:space-between;padding:0 24px;box-sizing:border-box}
.a-btn--s{height:36px;padding:0 14px;font-size:14px}
.a-iconcard{height:120px;box-sizing:border-box;padding:16px}
.a-tile{border-radius:20px;display:flex;align-items:center;justify-content:center}
.a-inv{height:120px;box-sizing:border-box;padding:16px;display:flex;flex-direction:column;gap:8px}
.a-invr{font-size:12px;line-height:16px;color:var(--quiet)}
.a-invt{display:flex;justify-content:space-between;align-items:baseline;margin-top:auto;padding-top:6px;border-top:1px solid var(--hair);font-size:12px;line-height:16px;color:var(--quiet)}
.a-invt b{font-size:14px;color:var(--ink);font-weight:600}
.a-tab{display:flex;align-items:center;gap:8px;height:36px;box-sizing:border-box;padding:0 14px;background:var(--ground);border-radius:var(--rc) var(--rc) 0 0;font-size:13px;line-height:1;color:var(--ink);white-space:nowrap}
.a-tab svg,.a-tab .logo-slot{flex:none}

/* clear space */
.a-zonewrap{align-items:center;padding:56px 32px}
.a-zone{position:relative;background:var(--ground);flex:none;box-shadow:inset 0 0 0 1px var(--hair)}
.a-zin{position:absolute;box-shadow:0 0 0 1px var(--line)}
.a-unit{position:absolute;box-sizing:border-box;border:1px dashed var(--quiet-panel)}
.a-dim{position:absolute;display:block;background:var(--ink)}
.a-dim::before,.a-dim::after{content:'';position:absolute;background:var(--ink)}
.a-dim--h{height:1px;transform:translateY(-0.5px)}
.a-dim--h::before,.a-dim--h::after{top:-4px;width:1px;height:9px}
.a-dim--h::before{left:0}.a-dim--h::after{right:0}
.a-dim--v{width:1px;transform:translateX(-0.5px)}
.a-dim--v::before,.a-dim--v::after{left:-4px;height:1px;width:9px}
.a-dim--v::before{top:0}.a-dim--v::after{bottom:0}
.a-dim b{position:absolute;font-size:11px;line-height:14px;font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.a-dim--h b{left:50%;top:-20px;transform:translateX(-50%)}
.a-dim--v b{left:10px;top:50%;transform:translateY(-50%)}
.a-zrow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.a-zrow figure{display:flex;flex-direction:column;gap:10px}
.a-zsm{align-items:center;justify-content:center;padding:20px 12px;min-height:170px;box-sizing:border-box}

/* minimum size: one panel of two White cells, a spec table, a ladder of dimensioned widths */
.a-ms2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:20px}
.a-msbox{position:relative;height:200px;border-radius:var(--rc);background:var(--ground);display:flex;align-items:center;justify-content:center}
.a-mn{left:12px;top:12px}
.a-mslogo{position:relative;display:block;line-height:0;box-shadow:0 0 0 1px var(--line)}
.a-tbl .a-tr--s{grid-template-columns:22px 90px 110px 110px minmax(0,1fr);align-items:center;min-height:48px;color:var(--ink)}
.a-tbl .a-tr--s b{font-size:14px;font-weight:600}
.a-sv{font-size:14px;line-height:20px;font-variant-numeric:tabular-nums;color:var(--ink)}
.a-ladder{flex-direction:row;align-items:flex-end;gap:24px;padding:28px 20px 20px}
.a-ladder figure{display:flex;flex-direction:column;gap:10px;flex:none}
.a-ladder figure>svg,.a-ladder figure>.logo-slot{display:block}

/* logo on grounds: the photo is key 1, the flat grounds follow as rows */
.a-phw{padding:16px}
.a-gt{box-sizing:border-box;border-radius:var(--rc);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.a-gt--photo{display:block;height:184px}
.a-gt--photo .photo-slot{position:absolute;inset:0;background:var(--dark);color:var(--dark-ink);align-items:flex-end;padding:14px 16px}
.a-gt--photo .a-onphoto{position:absolute;left:28px;top:28px;display:block;line-height:0}
.a-gt--photo .a-mn{left:auto;right:12px;top:12px}
.a-grs{display:flex;flex-direction:column}
.a-gr{display:grid;grid-template-columns:300px minmax(0,1fr);gap:24px;align-items:center;padding:12px 0;border-top:1px solid var(--hair)}
.a-gr:last-child{border-bottom:1px solid var(--hair)}
.a-gs{height:84px;border-radius:var(--rc);display:flex;align-items:center;justify-content:center}
.a-gx{display:flex;gap:16px;align-items:flex-start}
.a-gx>div{display:flex;flex-direction:column;gap:2px}
.a-gx b{font-size:14px;line-height:20px;font-weight:600;color:var(--ink)}
.a-gx span{font-size:12px;line-height:18px;color:var(--quiet)}

/* logo misuse: two columns of crossed specimens, numbered to their captions */
.a-mgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 24px}
.a-mf{display:flex;flex-direction:column;gap:10px}
.a-mt{height:176px;position:relative;overflow:hidden;border-radius:var(--rk);background:var(--panel);display:flex;align-items:center;justify-content:center}
.a-mt--busy svg.bg{position:absolute;inset:0;width:100%;height:100%}
.a-mt--busy .a-lg{position:relative}
.a-x{position:absolute;inset:0;width:100%;height:100%}
.a-x path{fill:none;stroke:var(--ink);stroke-width:1;stroke-dasharray:5 5}
.a-mt .a-mn{z-index:1}
.a-mt--slot:not(.a-mt--busy) .logo-slot{background:var(--panel)}
.a-mt--slot>:not(.a-x):not(.a-pd):not(.a-cross):not(svg.bg){position:relative;z-index:1}
.a-cross{position:absolute;right:12px;top:12px;color:var(--ink);z-index:1}
.a-boxed{border:2px solid var(--ink);padding:12px 18px;line-height:0}
.a-mc{display:grid;grid-template-columns:22px minmax(0,1fr);gap:0 12px;align-items:start}

/* annotation devices: pins (leader line plus numbered disc), keys, flow dimensions, token tables */
.pg :has(>.a-pin){position:relative}
.a-pin{position:absolute;display:block;z-index:2;background:var(--ink)}
.a-pin::before{content:'';position:absolute;width:7px;height:7px;border-radius:50%;background:var(--ink);box-shadow:0 0 0 1.5px var(--ground)}
.a-pin--r{left:calc(100% + var(--ox,0px));top:var(--y,50%);width:var(--len);height:1px}
.a-pin--r::before{left:-3px;top:-3px}
.a-pin--l{right:calc(100% + var(--ox,0px));top:var(--y,50%);width:var(--len);height:1px}
.a-pin--l::before{right:-3px;top:-3px}
.a-pin--b{top:calc(100% + var(--oy,0px));left:var(--x,50%);height:var(--len);width:1px}
.a-pin--b::before{top:-3px;left:-3px}
.a-pin--t{bottom:calc(100% + var(--oy,0px));left:var(--x,50%);height:var(--len);width:1px}
.a-pin--t::before{bottom:-3px;left:-3px}
.a-pd{position:absolute;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--ink);color:var(--ground);font-family:var(--chrome);font-size:11px;line-height:1;font-weight:600;font-style:normal;text-decoration:none;font-variant-numeric:tabular-nums}
.a-pin--r .a-pd{left:100%;top:-11px}
.a-pin--l .a-pd{right:100%;top:-11px}
.a-pin--b .a-pd{top:100%;left:-11px}
.a-pin--t .a-pd{bottom:100%;left:-11px}
.a-pd--in{position:static;flex:none}
.a-pl{position:absolute;display:flex;flex-direction:column;gap:1px;font-weight:400;letter-spacing:0;font-variant-numeric:normal;font-family:var(--body);font-size:12px;line-height:16px;font-style:normal;text-decoration:none;color:var(--quiet-panel);white-space:nowrap;text-align:left}
.a-pl b{font-size:13px;font-weight:600;color:var(--ink)}
.a-pin--r .a-pl{left:calc(100% + 30px);top:-17px}
.a-pin--l .a-pl{right:calc(100% + 32px);top:-17px;text-align:right}
.a-pin--b .a-pl{top:calc(100% + 28px);left:0;transform:translateX(-50%);align-items:center;text-align:center}
.a-key{display:flex;flex-direction:column}
.a-key li{display:grid;grid-template-columns:22px 170px minmax(0,1fr);gap:0 16px;align-items:baseline;padding:12px 0;border-top:1px solid var(--hair)}
.a-key li:last-child{border-bottom:1px solid var(--hair)}
.a-key .a-pd{align-self:start}
.a-key p{font-family:var(--body);font-size:14px;line-height:1.55;color:var(--soft)}
.a-dimf{display:flex;align-items:center;gap:8px;height:9px;font-size:11px;line-height:14px;font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}
.a-dimf i{flex:1;height:9px;position:relative}
.a-dimf i::after{content:'';position:absolute;left:0;right:0;top:4px;height:1px;background:var(--ink)}
.a-dimf i:first-child{border-left:1px solid var(--ink)}
.a-dimf i:last-child{border-right:1px solid var(--ink)}
.a-dimf b{font-weight:500;white-space:nowrap}
.a-tbl{display:flex;flex-direction:column;font-family:var(--body)}
.a-tr{display:grid;grid-template-columns:150px 190px 70px minmax(0,1fr);gap:0 16px;align-items:center;min-height:52px;padding:8px 0;border-top:1px solid var(--hair);font-size:12px;line-height:1.45;color:var(--quiet)}
.a-tr:last-child{border-bottom:1px solid var(--hair)}
.a-tr--h{min-height:0;padding:0 0 8px;border-top:0;font-weight:600;color:var(--ink)}
.a-tc{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:var(--ink)}
.a-tc .a-sw{width:28px;height:28px}
.a-tk{display:flex;flex-direction:column;gap:2px}
.a-ln{font-size:12px;line-height:1.45;color:var(--quiet)}

/* palette */
.a-pal-panel{padding:24px;align-items:flex-start;gap:0}
.a-pal-panel .a-card{padding:0}
.a-pcard{width:476px;flex:none}
.a-pcard .a-r{grid-template-columns:minmax(0,1fr) auto 76px;gap:0 8px}
.a-pcard .a-r b{white-space:nowrap}
.a-pal-head{display:flex;justify-content:space-between;align-items:center;height:76px;padding:0 24px}
.a-pal-head h3{font-size:22px}
.a-steelpt{display:block;width:476px;height:20px;flex:none}
.a-pcap{font-size:12px;line-height:1.5;color:var(--quiet)}
.a-pcap b{display:block;font-size:13px;font-weight:600;color:var(--ink);margin-bottom:2px}
.a-pchips{display:flex;align-items:center;gap:16px;flex-wrap:nowrap}
.a-pchips .a-pcap{margin-left:12px;flex:1;min-width:0}

/* proportion */
.a-prop{align-items:center;padding:64px 28px 76px}
.a-pgw{position:relative;flex:none}
.a-pg{position:absolute;inset:0;display:grid;border-radius:var(--rc);overflow:hidden}
.a-pg::after{content:'';position:absolute;inset:0;border-radius:var(--rc);box-shadow:inset 0 0 0 1px var(--line);pointer-events:none}
.a-pgcol,.a-pgrow{display:grid;min-height:0;min-width:0}
.a-pgcol>div,.a-pgrow>div,.a-pgb{min-height:0;min-width:0}
.a-pin--b .a-pl{top:calc(100% - 3px);left:30px;transform:none}
.a-pin--b.a-pin--bl .a-pl{left:auto;right:30px;transform:none;align-items:flex-end;text-align:right}
.a-pl .a-pc{font-family:var(--display);font-weight:700;font-size:18px;line-height:22px;letter-spacing:-0.01em;color:var(--ink)}
.a-prt{display:flex;flex-direction:column}
.a-pr{display:grid;grid-template-columns:22px 28px 110px minmax(0,1fr) 64px;gap:0 14px;align-items:center;height:44px;border-top:1px solid var(--hair);font-family:var(--body);font-size:14px;font-weight:600}
.a-pr:last-child{border-bottom:1px solid var(--hair)}
.a-pr .a-sw{width:28px;height:28px}
.a-pct{text-align:right;font-family:var(--display);font-weight:700;font-size:20px;line-height:1;letter-spacing:-0.01em;font-variant-numeric:tabular-nums}
.a-bar{display:block;height:10px;border-radius:2px}

/* colour values */
.a-sw{display:block;flex:none;width:32px;height:32px;border-radius:var(--rc)}
.a-sw.a-hair,.a-chip.a-hair{box-shadow:inset 0 0 0 1px var(--line)}
.a-insp{padding:16px;gap:8px;flex:none}
.a-icols,.a-irow{display:grid;grid-template-columns:12px 24px 64px 112px 46px 112px minmax(0,1fr);gap:0 18px;align-items:center}
.a-insp .a-mono{font-size:11px}
.a-icols{padding:0 14px 4px;font-family:var(--body);font-size:12px;line-height:16px;font-weight:600;color:var(--ink)}
.a-ic{background:var(--ground);border-radius:var(--rc);padding:12px 14px 12px;display:flex;flex-direction:column;gap:12px}
.a-irow{min-height:28px;font-family:var(--body)}
.a-irow b{font-size:14px;font-weight:600;white-space:nowrap}
.a-irow .a-sw{width:24px;height:24px;border-radius:4px}
.a-itk{display:block}
.a-caret{display:block}
.a-scale{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));align-items:end}
.a-scale div{display:flex;flex-direction:column;font-variant-numeric:tabular-nums}
.a-scale i{display:block;height:36px}
.a-scale span{display:block;margin-top:4px;padding-left:4px;border-left:1px solid var(--ink);font-size:11px;line-height:14px;color:var(--quiet)}
.a-scale .a-base i{height:44px}
.a-scale .a-base span{color:var(--ink);font-weight:600;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.a-scale i.a-hair{box-shadow:inset 0 0 0 1px var(--line)}
.a-rampnote{margin:0;display:flex;align-items:center;font-size:13px;line-height:1.4;color:var(--quiet)}
.a-ic--t{gap:8px}
.a-ic--t .h3{font-size:12px;line-height:16px}
.a-irow--t .a-sw{width:20px;height:20px}
`;
}
