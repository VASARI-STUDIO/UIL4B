import { cssNum } from '../../engine/escape.js';
// Styles for theme 07, run A (guidelines-a.js). Every class starts a-. Spacing steps: 4, 8, 12, 16, 24, 32, 40, 48.
// The pages are a standards document: hanging clause numbers, ledger tables, numbered figures, a conformance matrix.
export function cssA(ctx) {
  return `
.pg .hairline{box-shadow:inset 0 0 0 1px var(--rule)}
.a-body{font-family:var(--body);font-size:16px;line-height:1.5;color:var(--ink);max-width:560px}
.a-measure{max-width:520px}
.a-h2{font-size:14px;line-height:1.3;font-weight:600;color:var(--ink);margin:40px 0 12px}
.a-h2 .num{color:var(--quiet);font-weight:400;margin-right:8px}
.a-h3{font-size:13px;line-height:1.3;font-weight:600;color:var(--ink);margin-bottom:8px}
.a-ch{display:inline-block;flex:none;width:12px;height:12px;border-radius:2px;margin-right:8px;vertical-align:-1px}

/* a clause: its number hangs in the left column */
.a-clauses{margin-top:32px;border-top:1px solid var(--ink)}
.a-cl{display:grid;grid-template-columns:56px minmax(0,1fr);padding:16px 0;border-bottom:1px solid var(--hair)}
.a-t+.a-cl,.a-fig+.a-cl{margin-top:32px;border-top:1px solid var(--ink)}
.a-cn{font-size:13px;line-height:1.5;color:var(--quiet);padding-top:2px}
.a-lead{font-size:36px;line-height:1.15;text-wrap:balance;max-width:600px}
.a-cl .a-h3{color:var(--quiet);font-weight:400}
.a-cl .a-lead+.a-lead{margin-top:8px}

/* a ledger: header ruled in ink, a hairline under every row */
.st.a-t{margin-top:32px}
.a-h2+.st.a-t{margin-top:0}
.st.a-t td,.st.a-t tbody th{padding:16px 16px 16px 0;vertical-align:top;border-bottom:1px solid var(--hair);font-size:13px;line-height:1.5}
.st.a-t tbody th{text-align:left;color:var(--ink);font-weight:600}
.st.a-t td.a-no{color:var(--quiet);padding-top:17px}
.st.a-bl td,.st.a-bl tbody th{vertical-align:baseline;padding-top:20px;padding-bottom:20px}
.st.a-bl td.a-no{padding-top:20px}
.a-def{font-family:var(--body);font-size:15px;line-height:1.5}
.st.a-t td.a-def--line{font-family:var(--display);font-weight:${cssNum(ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1])};font-size:28px;line-height:1.2}
.st.a-t th.a-term--big{padding:8px 16px 8px 0}
.a-term--big .disp{display:block;font-size:32px;line-height:1.15;font-weight:${cssNum(ctx.brand.fonts.display.weights[0])}}
.st.a-t .a-wc{font-size:12px;color:var(--quiet);text-align:right;padding-right:0;white-space:nowrap}

/* 2.2 write this, not that */
.a-st td{padding-top:16px}
.st.a-t td.a-w{font-family:var(--body);font-weight:500;font-size:16px;line-height:1.4}
.st.a-t td.a-n{font-family:var(--body);font-size:16px;line-height:1.4;color:var(--quiet);text-decoration:line-through}
.st.a-t td.a-because{font-size:13px;color:var(--soft)}
.a-fig--msg{margin-top:auto}
.a-msg{width:420px;box-sizing:border-box;border-radius:var(--rc);box-shadow:inset 0 0 0 1px var(--rule);padding:16px 20px;font-family:var(--body);font-size:16px;line-height:1.5}
.a-msg span{display:block;font-weight:500;margin-bottom:4px}

/* numbered figures: the picture, then "Figure 3.3" */
.a-fig{margin-top:32px}
.a-fc{margin-top:12px;font-size:12px;line-height:1.5;color:var(--soft);max-width:560px}
.a-fc b{font-weight:600;color:var(--ink);margin-right:4px}

/* 3.1 the logo */
.a-stage{display:flex;align-items:center;justify-content:center;border-radius:var(--r)}

/* 3.3 clear space: the zone is x on every side */
.a-fig--mid{margin-top:32px}
.a-zonewrap{display:flex;justify-content:center;margin-bottom:0}
/* a mechanical: HTML logo and labels, SVG geometry on top; every line in ink */
.a-mech{position:relative;isolation:isolate;flex:none}
.a-zone{position:absolute;background:var(--panel)}
.a-zin{position:absolute}
.a-mslogo{position:absolute}
.a-msvg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:1}
.a-msvg line,.a-msvg rect{fill:none;stroke:var(--ink);vector-effect:non-scaling-stroke}
.a-zl{stroke-width:1}
.a-ll{stroke-width:.75;stroke-dasharray:4 3}
.a-xs{stroke-width:1}
.a-dm line{stroke-width:.75}
.a-tk line{stroke-width:1.5}
.a-el line{stroke-width:.5}
.a-dl{position:absolute;z-index:2;transform:translate(-50%,-50%);white-space:nowrap;font-size:11.5px;line-height:1;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}
.a-dl--x{font-weight:400;font-style:italic;font-size:13px}
.a-dl--v{transform:translate(-50%,-50%) rotate(-90deg)}
.a-tb{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:32px;align-items:end;margin-top:24px;border-top:1px solid var(--ink)}
.a-tb .st.a-t{margin-top:0}
.a-sch td,.a-sch tbody th{padding:6px 16px 6px 0!important}
.a-sch td.num,.a-sch thead th:not(:first-child){text-align:right}
.a-dns{font-size:12px;line-height:1.3;font-weight:600;color:var(--ink);padding:8px 0;white-space:nowrap}
.a-tb .a-dns{border-bottom:1px solid var(--hair)}

/* 3.4 minimum size, at actual size */
.a-ms2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:32px}
.a-ms2 .a-fig{margin-top:0}
.a-msbox{display:flex;align-items:center;justify-content:center;border-radius:var(--r);box-shadow:inset 0 0 0 1px var(--rule)}
.a-dns--ms{margin-top:16px;padding:0}

/* 3.5 grounds: one row per ground, a small render in the first column */
.a-gt{position:relative;display:flex;align-items:center;justify-content:center;height:88px;border-radius:var(--r);overflow:hidden}
.a-gtab .a-gt{width:160px}
.a-gtab td,.a-gtab tbody th,.a-mtab td,.a-mtab tbody th,.a-dt td{vertical-align:middle!important}
.a-gphoto{margin-top:32px}
.a-gt--photo{height:240px}
/* the roof-plan crop that stands in for a photograph */
.a-rp{position:absolute;inset:0;width:100%;height:100%}
.a-rp rect,.a-rp line{fill:none;stroke:var(--rp);vector-effect:non-scaling-stroke}
.a-rp-h{stroke-width:2.5}
.a-rp-m,.a-rp-m line{stroke-width:1.25}
.a-rp-l,.a-rp-l line{stroke-width:.5;stroke-opacity:.6}
.a-rp-f{fill:var(--rp)}
.a-onphoto{position:absolute;left:24px;top:24px;display:block}

/* 3.6 misuse: each one crossed corner to corner */
.st.a-mtab td,.st.a-mtab tbody th{padding:12px 16px 12px 0}
.a-mt{position:relative;width:208px;height:96px;display:flex;align-items:center;justify-content:center;border-radius:var(--r);box-shadow:inset 0 0 0 1px var(--rule);overflow:hidden}
.a-cross{position:absolute;inset:0;width:100%;height:100%}
.a-boxed{display:block;border:2px solid var(--ink);padding:16px}
.a-busy{position:absolute;inset:0;width:100%;height:100%}
.a-onbusy{position:relative;display:block}

/* 4.1 definitions, then the conformance matrix */
.st.a-dt td{padding:12px 16px 12px 0}
.a-dt .a-def{font-family:var(--chrome);font-size:13px}
.a-dt .a-def b{font-weight:600}
.a-val{color:var(--soft)}
.a-ex{display:flex;align-items:flex-end;height:64px;padding:8px 12px;box-sizing:border-box;border-radius:var(--r)}
.a-ex span{font-size:15px;line-height:1.2}
.st.a-mxt{table-layout:fixed;margin-top:0}
.st.a-mxt th{font-size:12px;font-weight:600;color:var(--ink);padding:0 8px 8px 0;vertical-align:bottom;line-height:1.3}
.st.a-mxt tbody th{padding:0 8px 0 0;border-bottom:1px solid var(--hair);vertical-align:middle;white-space:nowrap}
.st.a-mxt .a-mxc{width:112px;color:var(--quiet);font-weight:500}
.st.a-mxt td.a-mx{height:52px;padding:0 8px;border-bottom:1px solid var(--hair);border-left:1px solid var(--hair);vertical-align:middle;white-space:nowrap}
.st.a-mxt td.is-used{outline:2px solid var(--ink);outline-offset:-2px}
.st.a-mxt td.a-mx--same{background:var(--panel);color:var(--quiet);font-size:11.5px}
.a-mxi{display:flex;align-items:center;gap:8px}
.a-pair{display:flex;flex:none;flex-direction:column;justify-content:center;gap:3px;width:28px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:2px}
.a-pair i{display:block;height:2px;background:currentColor}
.a-pair i+i{width:60%}
.a-r{display:block;font-size:12px;line-height:1.3;font-weight:600}
.a-lv{display:block;font-size:11.5px;line-height:1.3;color:var(--soft)}
.is-low .a-r,.is-low .a-lv{color:var(--quiet);font-weight:400}
.a-key{margin-top:12px;font-size:12px;line-height:1.5;color:var(--soft);max-width:560px}
.a-keybox{display:inline-block;width:16px;height:10px;margin-right:8px;box-shadow:inset 0 0 0 2px var(--ink)}

/* 4.2 proportion: a table beside one figure */
.a-prop{display:grid;grid-template-columns:minmax(0,1fr) 307px;gap:32px;align-items:start}
.a-prop .st.a-t{margin-top:32px}
.a-prop .a-fig{margin-top:32px}
.a-prop .a-fc{max-width:307px}
.a-waffle{display:grid;grid-template-columns:repeat(10,28px);gap:3px}
.a-waffle i{display:block;width:28px;height:28px;border-radius:2px}
.st.a-t td.a-pct{font-size:24px;line-height:1.1;text-align:right;padding-right:0}
.a-prop .st.a-t th:last-child{text-align:right;padding-right:0}
.a-prop .st.a-t td,.a-prop .st.a-t tbody th{vertical-align:middle}

/* 4.4 values: formats in a table, tint ramps as step by colour */
.st.a-vt td,.st.a-vt tbody th{padding:10px 16px 10px 0;vertical-align:middle}
.st.a-rt{table-layout:fixed;margin-top:0}
.st.a-rt th{font-size:12px;font-weight:600;color:var(--ink);padding:0 8px 8px;vertical-align:bottom}
.st.a-rt thead th.a-rs{padding-left:0;color:var(--quiet);font-weight:500}
.st.a-vt td,.st.a-vt tbody th{padding:5px 16px 5px 0}
.st.a-vt td.a-no{padding-top:5px}
.st.a-vt td.a-tone{font-size:12px;color:var(--soft)}
[data-page="colour-values"] .st.a-vt{margin-top:24px}
[data-page="clear-space"] .a-clauses{margin-top:24px}
[data-page="clear-space"] .a-cl{padding:12px 0}
.st.a-rt td,.st.a-rt tbody th{height:22px;padding:0 8px;border-bottom:1px solid var(--hair);white-space:nowrap;vertical-align:middle}
.st.a-rt tbody th.a-rs{padding-left:0;font-weight:400;color:var(--quiet);font-size:12px;width:56px}
.st.a-rt td.is-base{background:var(--panel)}
.a-rc .a-ch{margin-right:8px}
.a-bs{margin-left:8px;font-size:11.5px;color:var(--soft)}
.a-h2--annex{margin-top:24px}
.a-h2--annex .num{color:var(--ink);font-weight:600}
/* the lightness plot: L up (0 to 1, to scale), step across; axis titles and key in HTML */
.a-fig--plot{margin-top:24px}
.a-plw{display:grid;grid-template-columns:16px minmax(0,1fr) 152px;gap:8px 12px;align-items:start}
.a-ply{writing-mode:vertical-rl;transform:rotate(180deg);align-self:center;font-size:11.5px;line-height:1;color:var(--soft);white-space:nowrap}
.a-plx{margin-top:2px;text-align:center;font-size:11.5px;line-height:1;color:var(--soft)}
.a-plot{display:block;width:100%;height:auto;overflow:visible}
.a-pl-a{stroke:var(--ink);stroke-width:1}
.a-pl-g{stroke:var(--hair);stroke-width:1}
.a-pl-t{font-family:var(--chrome);font-size:11px;fill:var(--soft);font-variant-numeric:tabular-nums}
.a-pl-c{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.a-pl-d{stroke:var(--ink);stroke-width:.75}
.a-pl-b{stroke:var(--ink);stroke-width:1.5}
.a-plk{list-style:none;margin:0;padding:4px 0 0;display:grid;gap:10px}
.a-plk li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;align-items:start;font-size:12px;line-height:1.3}
.a-pk{width:24px;height:8px;margin-top:4px;overflow:visible}
.a-plk b{display:block;font-weight:600;color:var(--ink)}
.a-pkv{display:block;color:var(--soft);font-variant-numeric:tabular-nums}
`;
}
