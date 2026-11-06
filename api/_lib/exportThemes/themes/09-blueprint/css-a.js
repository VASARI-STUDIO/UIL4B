// Theme 09 Blueprint, run A styles (classes start a-). Sheets are 794 x 1123 with a 56 px margin, so the content column is 682 px.
// Every sheet ends in a ruled title block (.a-tb); key bubbles (.a-bub) are Brick rings; details (.a-detail) are ruled frames with a title strip.
export const cssA = (ctx) => {
  const mono = ctx.brand.fonts.mono;
  return `
.pg{--mono:'${mono.family}',monospace}
.pg--std .grow{flex:1;min-height:0}
.a-mono{font-family:var(--mono);font-size:12px;line-height:1.3;color:var(--ink);white-space:nowrap}
.a-h3{font-size:13px;line-height:18px;font-weight:600;margin-bottom:12px}
.a-sw2.hairline,.a-st i.hairline,.a-bd.hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.a-sheet .a-gap{flex:1 0 24px}

/* key bubble: a Brick ring with a letter or number, as a detail or finish key on a drawing */
.a-bub{display:inline-grid;place-items:center;flex:none;min-width:26px;height:26px;padding:0 4px;box-sizing:border-box;border:1px solid var(--accent);border-radius:13px;background:var(--ground);color:var(--accent);font:600 11px/1 var(--chrome);font-variant-numeric:tabular-nums}

/* title block that closes the sheet */
.a-tb{display:grid;grid-template-columns:1.2fr 1fr .9fr 1.4fr;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.a-tb>div{padding:10px 16px;border-left:1px solid var(--hair);font-size:13px;line-height:18px}
.a-tb>div:first-child{padding-left:0;border-left:0}
.a-tb b{font-weight:600}
.a-nh{margin:48px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px;font-weight:600}
.a-detail~.a-nh{margin-top:28px}

/* a drawn detail: the drawing, then a title strip with its bubble */
.a-detail{margin-top:32px;border:1px solid var(--ink)}
.a-dwg{position:relative;display:flex;align-items:center;justify-content:center}
.a-dt{display:flex;gap:12px;align-items:center;padding:10px 14px;border-top:1px solid var(--ink)}
.a-dt>span{font-size:12px;line-height:18px;color:var(--quiet)}
.a-dt b{font-weight:600;color:var(--ink)}

/* the one big line a sheet carries, with its redline */
.a-hero{position:relative;margin:48px 0 0 40px}
.a-big{font-size:56px;line-height:56px;max-width:600px}
.a-big span{display:block}
.a-big--i{font-size:72px;line-height:72px}
.a-big--n{max-width:none}
.a-big--v{font-size:72px;line-height:72px;max-width:none}
.a-hero--v{margin-top:40px}
.a-sub{margin:32px 0 0 40px;max-width:520px;font:500 24px/32px var(--body)}

/* general notes: bubble, key, text */
.a-notes{border-top:0}
.a-notes li{display:grid;grid-template-columns:32px 120px minmax(0,1fr);gap:0 12px;align-items:start;padding:26px 0;border-bottom:1px solid var(--hair)}
.a-notes .k{padding-top:6px;font-weight:600;color:var(--ink)}
.a-notes p{font:400 18px/26px var(--body)}

/* personality: columns inside one ruled frame */
.a-cols{display:grid;margin-top:48px;border:1px solid var(--ink)}
.a-cols li{min-height:460px;padding:20px 20px 28px;border-left:1px solid var(--hair)}
.a-cols li:first-child{border-left:0}
.a-trait{margin-top:56px;font-size:44px;line-height:48px}
.a-dash{display:block;width:32px;height:0;border-top:2px solid var(--accent);margin:20px 0 16px}
.a-means{font:400 18px/28px var(--body)}
.a-sayit{margin-top:40px;border-top:1px solid var(--ink);padding-top:12px}
.a-sayit p{margin-top:12px;font:800 32px/40px var(--display);letter-spacing:-0.01em}

/* voice: habits as a 2-up ruled grid */
.a-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:48px;border:1px solid var(--ink)}
.a-grid2 li{min-height:250px;padding:20px 20px 28px}
.a-grid2 li:nth-child(even){border-left:1px solid var(--hair)}
.a-grid2 li:nth-child(n+3){border-top:1px solid var(--hair)}
.a-pt{margin-top:16px;font-size:14px;line-height:20px;font-weight:600}
.a-ex{margin-top:8px;font:400 20px/28px var(--body)}

/* write this: the line, the line it replaces struck through in Brick, and why */
.a-wt{margin-top:32px;border-top:1px solid var(--ink)}
.a-wt li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:0 12px;align-items:start;padding:26px 0;border-bottom:1px solid var(--hair)}
.a-wt dl{margin:0;display:grid;gap:8px}
.a-wt dl>div{display:grid;grid-template-columns:88px minmax(0,1fr);gap:0 16px;align-items:baseline}
.a-wt dt{font-size:12px;line-height:16px;font-weight:600;color:var(--quiet)}
.a-wt .a-wr{color:var(--accent)}
.a-wt dd{margin:0}
.a-w{font:500 18px/26px var(--body)}
.a-nt{font:400 16px/24px var(--body);color:var(--quiet)}
.a-nt s{text-decoration-color:var(--accent);text-decoration-thickness:1px}
.a-bc{font-size:14px;line-height:20px}

/* messaging: a schedule, bubble, key, content */
.a-sched{margin-top:40px;border-top:1px solid var(--ink)}
.a-mr{display:grid;grid-template-columns:32px 150px minmax(0,1fr);gap:0 12px;align-items:start;padding:36px 0;border-bottom:1px solid var(--hair)}
.a-mh{padding-top:5px;font-size:12px;line-height:16px;font-weight:600}
.a-rule{margin-top:12px;max-width:480px;font:400 16px/24px var(--body)}
.a-ll{display:flex;flex-direction:column;gap:12px}
.a-ll li{font:500 24px/32px var(--body)}
.a-ll .a-first{font:800 32px/36px var(--display);letter-spacing:-0.01em}
.a-bp{max-width:480px;font:400 16px/24px var(--body)}

/* logo and clear space: one detail each */
.a-lead2{max-width:560px;font-size:16px;line-height:24px}
.a-detail--lg{margin-top:56px}
.a-fig,.a-zone,.a-msm{position:relative}
.a-detail--cs{margin-top:40px}
.a-zone{outline:1px dashed var(--accent);color:var(--quiet)}
.a-hatch{position:absolute;inset:0}
.a-zin{position:absolute;background:var(--ground)}

/* minimum size: Details C and D as stacked ruled rows, drawn at true size */
.a-mrows{margin-top:40px;border:1px solid var(--ink)}
.a-mrow{display:grid;grid-template-columns:230px minmax(0,1fr);height:320px}
.a-mrow+.a-mrow{border-top:1px solid var(--ink)}
.a-mk{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:20px;border-right:1px solid var(--hair)}
.a-mk b{font-size:13px;line-height:18px;font-weight:600}
.a-mdw{position:relative;display:flex;align-items:center;justify-content:center;color:var(--hair)}
.a-grid{position:absolute;inset:0;width:100%;height:100%}
.a-gl{position:absolute;right:14px;bottom:10px}
.a-msm{z-index:1}

/* logo on grounds: a ground schedule, one band a row */
.a-grs{margin-top:40px;border:1px solid var(--ink)}
.a-gr{display:grid;grid-template-columns:48px 300px minmax(0,1fr);height:104px}
.a-gr+.a-gr{border-top:1px solid var(--ink)}
.a-gr:last-child{height:160px}
.a-gr>.a-bub{align-self:center;justify-self:center}
.a-gt{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;border-left:1px solid var(--ink)}
.a-gr .cap{align-self:center;padding:0 20px;border-left:1px solid var(--ink)}
.a-gt--photo .photo-slot{position:absolute;inset:0;background:var(--dark);color:var(--dark-ink);border-radius:0}
.a-onphoto{position:absolute;right:16px;top:50%;transform:translateY(-50%)}
.a-gt--photo .photo-slot span{display:block;max-width:48%}

/* logo misuse: sheet zones, columns lettered, rows numbered, a revision triangle on each */
.a-zg{margin-top:24px}
.a-zh,.a-zr{display:grid;grid-template-columns:24px minmax(0,1fr) minmax(0,1fr)}
.a-zh span,.a-zn{display:grid;place-items:center;font-size:11px;line-height:14px;font-weight:600;color:var(--quiet)}
.a-zh span{padding-bottom:6px}
.a-zc{border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.a-zc:last-child{border-right:1px solid var(--ink)}
.a-zr:last-child .a-zc{border-bottom:1px solid var(--ink)}
.a-mt{position:relative;height:170px;display:grid;place-items:center;overflow:hidden;background:var(--card)}
.a-zc .cap{display:flex;gap:12px;align-items:flex-start;min-height:68px;padding:12px 14px;border-top:1px solid var(--ink)}
.a-tri{flex:none;width:26px;height:24px;color:var(--accent)}
.a-tri text{font:600 10px var(--chrome);fill:currentColor}
.a-x{position:absolute;inset:0;width:100%;height:100%;color:var(--accent)}
.a-busy{position:absolute;inset:0;width:100%;height:100%}
.a-onbusy{position:relative}
.a-boxed{padding:12px 16px;border:2px solid var(--ink)}

/* palette: the finishes elevation, then the keyed schedule */
.a-detail--el .a-dwg{display:block;height:auto!important}
.a-elev{display:block;width:100%;height:auto}
.a-el{stroke:var(--ink);stroke-width:1.5;stroke-linejoin:miter}
.a-el-h{fill:none;stroke:var(--hair);stroke-width:1}
.a-el-m{fill:none;stroke:var(--ink);stroke-width:1}
.a-ld{fill:none;stroke:var(--accent);stroke-width:1}
.a-ldd{fill:var(--accent)}
.a-bc2{fill:var(--ground);stroke:var(--accent);stroke-width:1}
.a-bt{font:600 11px var(--chrome);fill:var(--accent)}
.a-prh,.a-pr{display:grid;grid-template-columns:44px 170px minmax(0,1fr);gap:0 12px;align-items:center}
.a-prh{padding-bottom:8px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px;font-weight:600}
.a-pr{padding:10px 0;border-bottom:1px solid var(--hair)}
.a-pf{display:flex;align-items:center;gap:12px}
.a-pf b{font-size:18px;line-height:24px}
.a-pr p{font-size:13px;line-height:18px;color:var(--quiet)}
.a-prole{font-weight:600;color:var(--ink)}
.a-sw2{display:block;flex:none;width:28px;height:28px;border-radius:2px}

/* proportion: one page as a horizontal section, redlines across the top, key bubbles under */
.a-detail--pr .a-dwg{height:320px!important}
.a-bar{position:relative}
.a-bd{position:absolute;top:0;bottom:0}
.a-lv{position:absolute;height:22px;width:0;border-left:1px solid var(--accent)}
.a-kb{position:absolute;display:block}
.a-keys{border-top:0}
.a-keys li{display:grid;grid-template-columns:44px minmax(0,1fr) 64px 80px;align-items:center;gap:0 12px;padding:10px 0;border-bottom:1px solid var(--hair);font:500 16px/22px var(--body)}
.a-keys .num{text-align:right;font-weight:600}
.a-keys .a-kw{font-weight:500;color:var(--quiet)}

/* colour values: the finishes schedule with values, and each ramp as a stepped strip */
.a-cvl{margin-top:24px}
.a-cvcols,.a-cv{display:grid;grid-template-columns:44px 124px 216px minmax(0,1fr);gap:0 16px;align-items:center}
.a-cvcols{padding-bottom:8px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px;font-weight:600}
.a-cv{padding:18px 0;border-bottom:1px solid var(--hair)}
.a-cvn{display:flex;align-items:center;gap:10px}
.a-cvn b{font-size:14px;font-weight:600}
.a-vals{margin:0;display:grid;gap:4px}
.a-vals>div{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:baseline}
.a-vals dt{font-size:11px;line-height:14px;color:var(--quiet)}
.a-vals dd{margin:0}
.a-st{display:grid;gap:6px;align-items:end}
.a-st span{display:flex;flex-direction:column;justify-content:flex-end;gap:4px}
.a-st i{display:block}
.a-st em{display:block;font-style:normal;font-size:11px;line-height:14px;text-align:center;color:var(--quiet)}
.a-st .base i{outline:2px solid var(--accent);outline-offset:1px}
.a-st .base em{font-weight:600;color:var(--ink)}
.a-rampnote{font-size:13px;line-height:18px;color:var(--quiet)}
.a-vbot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;margin-top:32px}
.a-tones li{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.a-tones li>span{display:flex;flex-direction:column;gap:2px;font-size:13px}
.a-tones b{font-weight:600}
.a-note{display:flex;gap:12px;align-items:flex-start}
.a-note p{font-size:14px;line-height:22px;color:var(--quiet)}

/* base pages (run G): cover = title sheet, contents = drawing register, logo versions = Details A to G, contrast = ruled schedule, business card = dimensioned detail */
.g-cover{position:relative}
.g-cover .hd{position:relative}
.g-fr{position:absolute;inset:8px;border:1px solid var(--ink);pointer-events:none}
.g-fr2{position:absolute;inset:15px;border:1px solid var(--ink)}
.g-z{position:absolute;display:flex;font:500 11px/15px var(--chrome);color:var(--quiet)}
.g-z span{flex:1;display:grid;place-items:center}
.g-zt,.g-zb{left:15px;right:15px;height:15px}
.g-zt{top:0}.g-zb{bottom:0}
.g-zl,.g-zr{top:15px;bottom:15px;width:15px;flex-direction:column}
.g-zl{left:0}.g-zr{right:0}
.g-zt span+span,.g-zb span+span{border-left:1px solid var(--ink)}
.g-zl span+span,.g-zr span+span{border-top:1px solid var(--ink)}
.g-lg{position:relative;margin:236px 0 0 56px}
.g-ext{position:absolute;display:block;height:0;border-top:1px solid var(--accent)}
.g-line{margin:36px 0 0 56px;font:500 24px/32px var(--body)}
.g-grow{flex:1;min-height:0}
.g-tb{position:relative;display:grid;grid-template-columns:1fr 1.3fr 1fr;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.g-tbc{padding:10px 16px;border-left:1px solid var(--hair);border-top:1px solid var(--hair);font-size:13px;line-height:18px}
.g-tbc .cell{padding:0;border:0}
.g-tbc:nth-child(1),.g-tbc:nth-child(2){border-top:0}
.g-tbc:nth-child(1),.g-tbc:nth-child(3),.g-tbc:nth-child(6){padding-left:0;border-left:0}
.g-c1{grid-column:1 / span 2}
.g-sec{grid-column:1 / -1}
.g-sec ul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,auto);grid-auto-flow:column;gap:0 16px;margin-top:2px}
.g-sec li{font-size:13px;line-height:22px}
.g-sec li .num{display:inline-block;width:28px;color:var(--quiet)}
.g-bar{position:relative;box-sizing:content-box;width:200px;height:8px;margin:10px 0 24px;border:1px solid var(--ink)}
.g-bar i{position:absolute;top:0;width:50px;height:8px}

/* contents: the drawing register */
.g-reg{margin-top:28px}
.g-rh,.g-rg{display:grid;grid-template-columns:44px 148px minmax(0,1fr);gap:0 12px;align-items:start}
.g-rh{padding-bottom:8px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px;font-weight:600}
.g-rg{padding:9px 0;border-bottom:1px solid var(--hair)}
.g-rt h2{font:500 18px/26px var(--body)}
.g-rt .cap{display:block;margin-top:2px}
.g-rs{display:grid;grid-auto-flow:column;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}
.g-rs li{display:grid;grid-template-columns:28px minmax(0,1fr);font-size:13px;line-height:24px}
.g-rs .num{color:var(--quiet)}

/* logo versions: Details A to G, the drawing over a title strip, redlines print the drawn width */
.g-lds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:24px;border:1px solid var(--ink)}
.g-ld{margin:0;display:flex;flex-direction:column;min-width:0}
.g-ld+.g-ld{border-top:1px solid var(--ink)}
.g-ld:nth-child(odd):not(.g-ldA){border-left:1px solid var(--ink)}
.g-ldA{grid-column:1 / -1}
.g-dw{display:flex;align-items:center;justify-content:center;height:122px;padding-top:40px;box-sizing:border-box}
.g-ldA .g-dw{height:156px}
.g-dl{position:relative;flex:none}
.g-dk .rl{border-color:var(--dark-ink)}
.g-dk .rn{color:var(--dark-ink)}
.g-dt{display:flex;gap:12px;align-items:flex-start;min-height:56px;padding:8px 14px;box-sizing:border-box;border-top:1px solid var(--ink);background:var(--ground)}
.g-dt>span{font-size:11px;line-height:15px;color:var(--quiet)}
.g-dt b{display:block;font-size:12px;font-weight:600;color:var(--ink)}

/* contrast: a ruled schedule, the redline is drawn at 20 px to 1 : 1, dashed lines mark 3 : 1 and 4.5 : 1 */
.g-lead{max-width:682px}
.g-cs+.a-nh{margin-top:28px}
.g-cs{position:relative;margin-top:20px}
.g-ch,.g-cr{display:grid;grid-template-columns:44px 250px minmax(0,1fr);gap:0 12px;align-items:center}
.g-ch{padding-bottom:8px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px;font-weight:600}
.g-cm{justify-self:end}
.g-cr{height:44px;border-bottom:1px solid var(--hair)}
.g-cb{display:flex;flex-direction:column;justify-content:center;gap:0;height:36px;padding:0 12px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--hair);font-family:var(--body)}
.g-cb b{font-size:13px;line-height:17px;font-weight:600}
.g-cb span{font-family:var(--chrome);font-size:12px;line-height:15px}
.g-cl{position:relative;height:100%}
.g-th{position:absolute;top:0;bottom:0;left:calc(318px + var(--x));border-left:1px dashed var(--accent)}
.g-tl3,.g-tl45{top:0;font-size:11px;line-height:16px}
.g-tl3{left:calc(318px + 60px - 6px);transform:translateX(-100%)}
.g-tl45{left:calc(318px + 90px + 6px)}
.g-nus{position:relative;margin-top:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(6,auto);grid-auto-flow:column;gap:0 24px}
.g-nu{display:grid;grid-template-columns:24px 152px minmax(0,1fr);gap:0 10px;align-items:center;height:30px;border-bottom:1px solid var(--hair)}
.g-ns{display:grid;place-items:center;width:24px;height:24px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--hair)}
.g-ns i{display:block;width:12px;height:12px;border-radius:1px}
.g-nl{position:relative;height:100%}
.g-nl::after{content:'';position:absolute;left:60px;top:2px;bottom:2px;border-left:1px dashed var(--accent)}

/* business card: two details at 5 px to the millimetre, 90 and 55 mm in redline, numbered keys on the card */
.g-bc{margin:68px 0 0;display:grid;grid-template-columns:514px minmax(0,1fr);align-items:start}
.g-bc+.g-bc{margin-top:64px}
.g-bcd{position:relative}
.g-card{position:relative;overflow:hidden;border-radius:4px;box-shadow:0 0 0 1px var(--hair)}
.g-front{background:var(--dark);color:var(--dark-ink)}
.g-back{background:var(--card);color:var(--ink)}
.g-front .lg{position:absolute;left:44px;top:50%;transform:translateY(-50%)}
.g-front .ln{position:absolute;left:44px;bottom:32px;font:500 15px/1.3 var(--body)}
.g-back .mk{position:absolute;right:40px;top:36px}
.g-back .who{position:absolute;left:44px;bottom:36px;font-family:var(--body)}
.g-back .nm{font-size:22px;font-weight:500;line-height:1.2}
.g-back .rl{font-size:15px;color:var(--quiet);margin-top:2px}
.g-back .ct{font-size:15px;margin-top:16px;line-height:1.5}
.g-pin{position:absolute;z-index:1;display:block}
.g-bn{padding:0 0 0 16px}
.g-bh{display:flex;gap:10px;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--ink);font-size:12px;line-height:16px}
.g-bh b{font-weight:600}
.g-bn ol li{display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:12px;line-height:16px}
.g-bn ol li span:last-child{padding-top:5px}
`;
};
