// Styles for theme 08's Riso gate pages (guidelines-r.js): cover, palette, colour-values, contrast. Classes start r-.
// Page 794 x 1123, margin 72, spacing on a 4 px base. Elevation is none: every figure is a sheet of the paper, edged by a hairline,
// with a registration cross at each corner (--xi sets how far in). Familjen Grotesk is the chrome (700 headings, 600 and 400 labels);
// mono only on literal values.
export function cssR() {
  return `
.r-pg{isolation:isolate}
.r-pg .num{font-variant-numeric:tabular-nums}
.r-mono{font-family:var(--mono);font-size:12px;letter-spacing:0}
.r-hair{outline:1px solid var(--hair);outline-offset:-1px}
.r-x{display:block}
.r-xc{position:absolute;line-height:0;z-index:2}
.r-xc--tl{left:var(--xi,4px);top:var(--xi,4px)}.r-xc--tr{right:var(--xi,4px);top:var(--xi,4px)}
.r-xc--bl{left:var(--xi,4px);bottom:var(--xi,4px)}.r-xc--br{right:var(--xi,4px);bottom:var(--xi,4px)}
.r-hd{position:absolute;left:72px;right:72px;top:44px;display:flex;justify-content:space-between;font-size:13px;line-height:1.4;color:var(--quiet)}
.r-top{position:absolute;left:72px;right:72px;top:96px}
.r-h1{font-family:var(--chrome);font-weight:700;font-size:40px;line-height:1.05;letter-spacing:-0.015em;color:var(--ink)}
.r-lead{margin-top:12px;max-width:52ch;font-family:var(--body);font-size:16px;line-height:1.5;color:var(--quiet)}
.r-body{position:absolute;left:72px;right:72px;top:232px}
.r-role{margin-top:4px;font-size:13px;line-height:1.4;color:var(--quiet)}
.r-sheet,.r-paper,.r-ps,.r-ts,.r-tp__sh{position:relative;background:var(--ground);outline:1px solid var(--hair);outline-offset:-1px;isolation:isolate}
.r-tg__h{font-family:var(--chrome);font-weight:600;font-size:16px;line-height:1.3;margin-bottom:12px;color:var(--ink)}
.r-ps__d{display:block;font-family:var(--chrome);font-weight:600;font-size:13px;line-height:1.3}

/* cover: the separations in a column (each a whole sheet, scaled), spanning the composite's height; the composite; the colour bar */
.r-seps{position:absolute;display:flex;flex-direction:column;justify-content:space-between}
.r-sep{margin:0}
.r-sep__sh{position:relative;overflow:hidden;background:var(--ground);outline:1px solid var(--hair);outline-offset:-1px}
.r-sep figcaption{margin-top:8px}
.r-sep__d{display:block;font-size:12px;line-height:1.3;color:var(--quiet)}
.r-sep__n{display:block;font-weight:600;font-size:14px;line-height:1.3;overflow-wrap:anywhere}
.r-sep__c{display:block;font-size:12px;line-height:1.35;color:var(--quiet)}
.r-cvc{position:absolute;overflow:hidden;background:var(--ground);outline:1px solid var(--hair);outline-offset:-1px}
.r-cs{position:relative;width:500px;height:707px;isolation:isolate;transform-origin:0 0;--xi:8px}
.r-l{position:absolute;inset:0}
.r-cv-plate{position:absolute;display:block}
.r-cv-logo{position:absolute;line-height:0}
.r-cv-line{position:absolute;left:40px;top:416px;width:420px;font-weight:500;font-size:44px;line-height:1.08;letter-spacing:-0.01em;text-wrap:balance}
/* slot: the line's placeholder is set at the line's own size, its outline round the whole placeholder */
.r-cv-line .ph-c{font-size:1em;display:inline-block;max-width:100%;vertical-align:top;text-align:left;white-space:normal!important}
.r-cv-t{position:absolute;left:40px;top:600px;font-weight:700;font-size:28px;line-height:1.1;letter-spacing:-0.01em}
.r-cv-v{position:absolute;left:40px;top:640px;font-size:14px;line-height:1.4}
.r-bar{position:absolute;display:grid;gap:16px;padding-top:20px;border-top:1px solid var(--hair)}
.r-bar__c i{display:block;height:64px}
.r-bar__c p{margin-top:8px;font-size:13px;line-height:1.4;color:var(--ink)}
.r-bar__l{font-weight:600}

/* palette: the paper; on it the stack of pulled sheets, then each drum's note under its sheet, then the paper's own words */
.r-paper{--xi:6px}
.r-stack{position:relative}
.r-ps{position:absolute;--xi:2px}
.r-solid{position:absolute}
.r-solid__t{position:absolute;left:12px;right:10px;bottom:10px;font-family:var(--body);font-weight:500;font-size:15px;line-height:1.3}
/* slot: a swatch's placeholder is one outlined box at 12 px, not an outline per wrapped word */
.r-solid__t .ph-c{display:inline-block;max-width:100%;font-size:12px;text-align:left;white-space:normal!important}
.r-ps__m{position:absolute;bottom:16px}
.r-ps__n{display:block;font-family:var(--chrome);font-weight:700;font-size:28px;line-height:1.1;letter-spacing:-0.01em;overflow-wrap:anywhere}
.r-pns{display:grid;margin-top:16px}
.r-pn{padding-right:20px}
.r-pn .r-role{margin-top:0}
.r-lands{margin-top:8px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}
.r-pf{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;margin:16px 28px 0;padding:20px 0 32px;border-top:1px solid var(--hair)}
.r-pf .r-ps__d{color:var(--quiet)}
.r-dn{font-family:var(--chrome);font-weight:700;font-size:28px;line-height:1.1;letter-spacing:-0.01em;color:var(--ink)}
.r-pf__s{font-weight:500;font-size:26px;line-height:1.2;letter-spacing:-0.01em;color:var(--ink);text-wrap:balance}

/* colour values: a tint chart, one sheet per drum: margin words at the head, the stepped wedge, the values at the foot */
.r-body--cv{top:168px}
.r-tcs{display:grid;gap:20px}
.r-tc{padding:20px 16px;--xi:2px}
.r-tc__n{font-family:var(--chrome);font-weight:700;font-size:26px;line-height:1.1;letter-spacing:-0.01em;overflow-wrap:anywhere}
.r-wd{display:flex;flex-direction:column;gap:2px;margin-top:16px}
.r-wp{display:flex;align-items:center;gap:8px;height:30px}
.r-wp__k{flex:0 0 36px;font-size:12px;line-height:1.15;color:var(--quiet)}
.r-wp__k b{display:block;font-weight:600;color:var(--ink)}
.r-wp.is-base .r-wp__k{font-weight:700;color:var(--ink)}
.r-wp i{display:block;height:30px;flex:none}
.r-vals{margin-top:16px}
.r-vals.r-vals--st div{display:block;margin-top:6px}
.r-vals--st dt{line-height:1.3}
.r-vals--st dd{line-height:1.4}
.r-vals div{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:baseline}
.r-vals dt{font-weight:600;font-size:12px;line-height:1.5;color:var(--quiet)}
.r-vals dd{line-height:1.5;color:var(--ink);white-space:nowrap}
.r-tc--paper{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;margin-top:20px;padding:20px 20px}
.r-tc--paper .r-vals{margin-top:0}
.r-cvfoot{margin-top:28px;padding-top:20px;border-top:1px solid var(--hair)}
.r-tones{display:flex;flex-wrap:wrap;gap:8px 28px;font-size:14px;line-height:1.4}
.r-tone{display:inline-flex;align-items:center;gap:8px}
.r-tone i{display:block;width:16px;height:16px}
.r-print{margin-top:12px;max-width:62ch;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}

/* contrast: two-drum test prints, sheet sizes by how much the pair prints; the run sheet of unused pairs at the foot */
.r-body--ct{top:216px}
.r-tr{display:grid;gap:16px;align-items:start;margin-bottom:12px}
.r-tp{min-width:0}
.r-tp__sh{padding:14px;--xi:0px}
.r-tp__pr{padding:12px 14px}
.r-tr--0 .r-tp__pr{padding:16px 20px}
.r-tp__c{font-family:var(--body);font-weight:400;line-height:1.5;max-width:64ch}
.r-jb{margin-top:8px;font-size:13px;line-height:1.3;color:var(--ink)}
.r-jb__r{font-weight:700;font-size:16px}
.r-jb__u{margin-top:2px;font-family:var(--body);font-size:13px;line-height:1.4;color:var(--quiet)}
.r-run{padding-top:12px;border-top:1px solid var(--hair)}
.r-runl{columns:3;column-gap:24px;font-size:13px;line-height:1.5}
.r-runl li{break-inside:avoid}
`;
}
