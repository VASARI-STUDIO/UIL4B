// Styles for p-image.js: photo-direction, shot-list, imagery-rules, grid, layouts. Classes start ri-.
// Spacing on the gate's 4 px base; figures are the gate's sheets (r-sheet) with corner crosses. Text pairs: Ink and Quiet on the paper,
// the brand's own colourways inside the scaled layouts. No elevation: a hairline edges each sheet.
export const cssPImage = () => `
.ri-pg .photo-slot{width:100%;height:100%;box-sizing:border-box}
.ri-fig{margin:0}
.ri-k{font-weight:600;font-size:13px;line-height:1.3;color:var(--ink)}
/* the job line (review D1): one line under the figure, flush with the sheet's left edge, 12 px body face in the quiet grey */
.ri-job{margin-top:8px;max-width:72ch;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet);text-wrap:pretty}
.ri-jd,.ri-jn{white-space:normal}
.ri-sw{display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:0;outline:1px solid var(--hair);outline-offset:-1px}

/* photo direction: one sheet; the photograph in a margin of paper, the brief under it, the subject largest */
.ri-b--pd{top:192px}
.ri-pd{padding:28px;--xi:6px}
.ri-pd__ph{height:326px}
.ri-pd__ph .photo-slot{padding:16px;font-size:12px;line-height:1.5}
.ri-pd__br{margin-top:24px}
.ri-pd__lead{margin-top:8px;max-width:44ch;font-family:var(--body);font-size:20px;line-height:1.4;color:var(--ink);text-wrap:pretty}
.ri-pd__ls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px 32px;margin-top:24px;padding-top:20px;border-top:1px solid var(--hair)}
.ri-pd__ls dt{font-weight:600;font-size:13px;line-height:1.3;color:var(--ink)}
.ri-pd__ls dd{margin-top:4px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}

/* shot list: the shots imposed by shape, row for row: wide shots in the wider column, close ones in the narrower, each at its
   column's full width, so the two columns end on one line */
.ri-b--sl{top:232px}
.ri-im{padding:28px;--xi:6px}
.ri-im__l{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-rows:auto;gap:20px 28px}
.ri-im__l--by{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
.ri-sp{display:flex;flex-direction:column;min-width:0}
.ri-sp__f{height:192px;box-sizing:border-box}
.ri-sp--pl .ri-sp__f{padding:12px}
.ri-sp .photo-slot{padding:10px;font-size:12px;line-height:1.45;overflow:hidden}
.ri-sp__c{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin-top:8px;font-size:14px;line-height:1.3;color:var(--ink)}
.ri-sp__n{font-weight:700;font-size:16px}
.ri-sp__t{font-weight:600}
.ri-sp__d{display:inline-flex;flex-wrap:wrap;margin-left:auto;font-size:12px;line-height:1.3;color:var(--ink)}
.ri-sp__cm{white-space:pre}
.ri-dm{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}
.ri-dm .ri-sw{align-self:center;margin-right:0}
.ri-sp__cr{margin-top:2px;font-size:12px;line-height:1.4;color:var(--quiet)}

/* imagery rules: one grid holds the good pull and the waste; each row is one rule, its right way and its wrong way, at auto height,
   so the two sheets stay row for row whatever the copy's length. Each sheet sits behind its column's cells. */
.ri-b--ir{top:200px}
.ri-ir{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-rows:auto;column-gap:24px;isolation:isolate}
.ri-ir__sh{z-index:0;--xi:4px}
.ri-ir__h,.ri-ir__c{position:relative;z-index:1;padding:0 24px}
.ri-ir__h{padding-top:20px;padding-bottom:20px;font-family:var(--chrome);font-weight:700;font-size:28px;line-height:1.1;letter-spacing:-0.01em;color:var(--ink)}
.ri-ir__c{padding-bottom:24px}
.ri-ir__c.is-last{padding-bottom:28px}
.ri-dr{position:relative;width:100%;height:116px;overflow:hidden;background:var(--ground);outline:1px solid var(--hair);outline-offset:-1px;isolation:isolate}
.ri-dr i{position:absolute;display:block}
.ri-dr i .ri-sash{position:absolute;left:0;right:0;top:50%;height:1.5px;margin-top:-0.75px;background:currentColor}
.ri-dr .photo-slot{position:absolute;inset:0;padding:0}
.ri-ref{position:absolute;left:8px;bottom:8px;z-index:1;padding:2px 6px;background:var(--ground);font-size:12px;line-height:1.4;color:var(--ink)}
.ri-strike{position:absolute;inset:0;width:100%;height:100%;stroke:var(--ink);stroke-width:1px;fill:none}
.ri-lgw{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;line-height:0;z-index:1}
.ri-ir__t{margin-top:8px;max-width:44ch;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink);text-wrap:pretty}
.ri-ir__n{margin-right:8px;font-family:var(--chrome);font-weight:700;font-size:14px;color:var(--ink)}

/* grid: the page as a sheet, the measures called out on leaders at its right, the four-column span beneath */
.ri-b--gr{top:200px}
.ri-gr{position:relative}
.ri-gs{--xi:3px}
.ri-gc{position:absolute;display:block}
.ri-gm{position:absolute;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;color:var(--ink)}
.ri-ld{position:absolute;display:block;height:1px;background:var(--ink);z-index:3}
.ri-dot{position:absolute;display:block;width:5px;height:5px;border-radius:50%;background:var(--ink);z-index:3}
.ri-co{position:absolute;right:0}
.ri-co dt{font-weight:600;font-size:13px;line-height:1.4;color:var(--ink)}
.ri-co dd{margin-top:2px;font-size:14px;line-height:1.4;color:var(--ink)}
.ri-dim{position:relative;height:13px;margin-top:16px;border-left:1px solid var(--ink);border-right:1px solid var(--ink)}
.ri-dim i{position:absolute;left:0;right:0;top:6px;height:1px;background:var(--ink)}
.ri-dim__t{margin-top:6px;font-size:14px;line-height:1.4;color:var(--ink)}

/* layouts: three pulled pages, each trimmed out of a sheet, the cover largest */
.ri-b--ly{top:232px;display:grid;grid-template-columns:302px minmax(0,1fr);gap:28px;align-items:start}
.ri-ly__r{display:flex;flex-direction:column;gap:28px}
.ri-lp{margin:0}
.ri-lp__sh{display:inline-block;vertical-align:top;line-height:0}
.ri-lp--a .ri-lp__sh{padding:14px;--xi:2px}
.ri-lp--b .ri-lp__sh,.ri-lp--c .ri-lp__sh{padding:12px;--xi:1px}
.ri-sc{position:relative;overflow:hidden}
.ri-sc__in{position:absolute;left:0;top:0;transform-origin:0 0;isolation:isolate}
.ri-ab{position:absolute}
.ri-ab .photo-slot{padding:0}
.ri-bd{font-family:var(--body)}
.ri-lp figcaption{margin-top:10px}
.ri-lp__t{font-weight:600;font-size:14px;line-height:1.3;color:var(--ink)}
.ri-lp__d{margin-top:2px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}
.ri-lp .ri-job{margin-top:6px}
`;
