// Styles for p-front.js (theme 08, Riso): contents, intro, personality, voice, write-this, messaging. Classes start rf-.
// Page 794 x 1123, margin 72 (the foot margin ends content at 1051), spacing on a 4 px base. Sheets use the gate's r-sheet (paper
// edged by a hairline) and its crosses; mono only on literal values (none here).
export const cssPFront = () => `
.rf-q{color:var(--quiet)}
.rf-body{position:absolute;left:72px;right:72px;top:200px}
.rf-h2{font-family:var(--chrome);font-weight:600;font-size:14px;line-height:1.3;color:var(--ink)}
.rf-p{margin-top:8px;max-width:62ch;font-family:var(--body);font-size:15px;line-height:1.55;color:var(--ink)}
/* the job line, one form across the theme: under the sheet, flush with its left edge, small and quiet, two lines at most */
.rf-job{margin-top:12px;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet)}
.rf-job b{font-weight:600}
.rf-jn{color:var(--quiet)}
.rf-jd{white-space:normal}
.rf-sw{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:0}

/* contents: two columns of sections split by page count, each number large in the action drum, both running to the foot margin */
.rf-toc{position:absolute;left:72px;right:72px;top:192px;bottom:72px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:48px}
.rf-tc{display:flex;flex-direction:column;gap:48px}
.rf-tc:first-child{justify-content:space-between}
.rf-cs{display:grid;grid-template-columns:64px minmax(0,1fr);column-gap:12px}
.rf-cs__n{font-family:var(--chrome);font-weight:700;font-size:48px;line-height:1;letter-spacing:-0.02em;overflow:visible}
.rf-cs__t{padding-top:4px;font-family:var(--chrome);font-weight:700;font-size:20px;line-height:1.2;color:var(--ink)}
.rf-cs__p{margin-top:8px;font-family:var(--body);font-size:14px;line-height:1.6;color:var(--ink)}

/* intro: the statement is the page's one big thing, two unequal columns under it, the key to the drums on the foot margin */
.rf-in{bottom:72px}
.rf-in__d{font-size:56px;line-height:1.1;letter-spacing:-0.015em;color:var(--ink);text-wrap:pretty}
.rf-in__two{display:grid;grid-template-columns:5fr 7fr;gap:40px;margin-top:32px;padding-top:20px;border-top:1px solid var(--hair)}
.rf-key{position:absolute;left:0;right:0;bottom:0;padding-top:20px;border-top:1px solid var(--hair)}
.rf-key__t{max-width:60ch;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}
.rf-key__d{display:flex;flex-wrap:wrap;gap:12px 32px;margin-top:16px;font-size:14px;line-height:1.4;color:var(--ink)}
.rf-key__d li{display:inline-flex;align-items:center;gap:8px}
.rf-key__d i{display:block;width:20px;height:20px}
.rf-key__n{font-weight:600}

/* personality: three ruled rows down to the slip, each trait roman flush left, its meaning hung from the trait's cap height */
.rf-pe{bottom:72px;display:flex;flex-direction:column}
.rf-trs{flex:1;display:grid;grid-auto-rows:minmax(min-content,1fr);row-gap:40px;min-height:0}
.rf-tr{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);column-gap:32px;align-items:start;padding-top:20px;border-top:1px solid var(--hair)}
.rf-tr__w{font-size:72px;font-style:normal;font-weight:500;line-height:1;letter-spacing:-0.02em;color:var(--ink);overflow-wrap:anywhere;text-box:trim-both cap alphabetic}
.rf-tr__m{margin-top:0;font-size:15px;line-height:1.5;text-box:trim-start cap alphabetic}
/* slot: the statement and the traits are compact placeholders set at their own size; the dashed outline needs about 1.3 em between lines */
.rf-slot .rf-tr__w{font-size:48px}
.rf-in--slot .rf-in__d{font-size:72px;line-height:1.05}
.rf-slot .rf-trs{row-gap:24px}
/* slot intro: the key follows the copy with a 96 px gap, so the spare space collects at the foot where the real copy will fill it */
.rf-in--slot .rf-key{position:static;margin-top:96px}
.rf-in__d .ph-c,.rf-tr__w .ph-c{font-size:1em}
.rf-in__d .ph-n,.rf-tr__w .ph-n{white-space:normal!important}
.rf-in__d .ph-c,.rf-tr__w .ph-c{display:inline-block;max-width:100%;vertical-align:top}
.rf-slip{width:430px;margin-top:40px}
.rf-slip__sh{padding:16px;--xi:2px}
.rf-slip__pr{padding:24px 28px 28px}
.rf-slip__l1{font-size:32px;line-height:1.15;letter-spacing:-0.01em;text-wrap:balance}
.rf-slip__l2{margin-top:12px;font-size:24px;line-height:1.2;text-wrap:balance}
.rf-slip figcaption{margin-top:12px}
.rf-slip .rf-job{margin-top:4px}

/* voice: equal labels stepped and repeated two to a row on one sheet that runs to the foot margin. The sheet's margin is 44 px; each
   cut line gets one mark at each end, 8 px off the trim and 14 px long, inside that margin. The habit under each label takes 28 px. */
.rf-vb{top:232px;bottom:72px;display:flex;flex-direction:column}
.rf-vo{flex:1;display:flex;flex-direction:column;min-height:0}
.rf-vo__sh{flex:1;padding:44px 44px 44px;--xi:6px}
.rf-lbs{height:100%;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:repeat(var(--r),minmax(0,1fr));column-gap:24px;row-gap:16px}
.rf-vb{--nh:28px}
.rf-vb.rf-slot{--nh:80px}
.rf-lb{display:grid;grid-template-rows:minmax(0,1fr) var(--nh);min-height:0}
.rf-lb__c{position:relative;padding:20px}
.rf-lb__x{font-family:var(--body);font-weight:500;font-size:28px;line-height:1.2;color:var(--ink);text-wrap:pretty}
.rf-lb__h{padding-top:8px;font-family:var(--chrome);font-weight:600;font-size:12px;line-height:1.3;color:var(--ink)}
.rf-tk{position:absolute;background:var(--ink);pointer-events:none}
.rf-tk--t,.rf-tk--b{width:1px;height:14px}
.rf-tk--l,.rf-tk--r{width:14px;height:1px}
.rf-tk--t{top:-22px}.rf-tk--b{top:calc(100% + var(--nh) + 8px)}
.rf-tk--tl,.rf-tk--bl{left:0}.rf-tk--tr,.rf-tk--br{left:calc(100% - 1px)}
.rf-tk--l{left:-22px}.rf-tk--r{left:calc(100% + 8px)}
.rf-tk--lt,.rf-tk--rt{top:0}.rf-tk--lb,.rf-tk--rb{top:calc(100% - 1px)}
.rf-vo figcaption{flex:none}

/* write this: one two-drum sheet at 60% of the measure holds the rewrites; the rejected lines run beside it on the open page, each on
   its pair's first baseline. The sheet sits behind its column and runs to the foot margin. */
.rf-wrs{top:224px;bottom:72px;display:flex;flex-direction:column}
.rf-wt__g{flex:1;min-height:0;isolation:isolate;display:grid;grid-template-columns:392px minmax(0,1fr);grid-template-rows:auto repeat(var(--n),minmax(auto,1fr));column-gap:32px;row-gap:28px;align-items:first baseline}
.rf-wt__sh{grid-column:1;grid-row:1 / -1;align-self:stretch;z-index:0;--xi:2px}
.rf-wt__g>ol{display:contents}
.rf-wr{grid-column:1 / -1;display:grid;grid-template-columns:subgrid;align-items:first baseline;z-index:1}
.rf-wr__p{padding:0 24px}
.rf-wr__k{font-family:var(--chrome);font-weight:600;font-size:12px;line-height:1.3;color:var(--quiet);z-index:1}
.rf-wt__k1{grid-column:1;grid-row:1;padding:28px 24px 0}
.rf-wt__k2{grid-column:2;grid-row:1}
.rf-wr__w{font-family:var(--body);font-weight:500;font-size:20px;line-height:1.3;color:var(--ink);text-wrap:pretty}
.rf-wr__b{margin-top:6px;font-family:var(--body);font-size:13px;line-height:1.45}
.rf-wr__t{font-family:var(--body);font-size:15px;line-height:1.45;color:var(--quiet);text-wrap:pretty}
.rf-wrs>.rf-job{flex:none}
.rf-slot .rf-wt__g{row-gap:8px}
.rf-slot .rf-wt__k1{padding-top:16px}
.rf-slot .rf-wr__w{font-size:16px}
.rf-slot .rf-wr__b{margin-top:4px}

/* messaging: the poster, the two boilerplates, the name */
.rf-mg{top:192px}
.rf-ms__sh{padding:28px;--xi:6px}
.rf-ms__pl{padding:40px 40px 48px}
.rf-ms__l1{max-width:12ch;font-size:72px;line-height:1.02;letter-spacing:-0.02em;text-wrap:balance}
.rf-ms__l2{margin:24px 12px 4px;font-size:32px;line-height:1.15;letter-spacing:-0.01em}
.rf-ms figcaption{margin-top:0}
/* slot: each line's placeholder is set at the line's own size, its dashed outline round the whole placeholder, so the poster keeps its one big thing */
.rf-ms__l1 .ph-c,.rf-ms__l2 .ph-c{font-size:1em;display:inline-block;max-width:100%;vertical-align:top;text-align:left;white-space:normal!important}
.rf-mg__bp{display:grid;grid-template-columns:4fr 7fr;gap:40px;margin-top:40px}
.rf-mg__nm{margin-top:32px;padding-top:20px;border-top:1px solid var(--hair)}
`;
