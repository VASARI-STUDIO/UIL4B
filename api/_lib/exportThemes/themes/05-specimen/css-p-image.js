// Styles for p-image.js (classes start ki-). Uses the gate's custom properties (--rod, --face, --plum, --plum-ink) and its classes
// (k-lead, k-disp, k-holder) without restyling them. One elevation language, as the gate: 1 px and 1.5 px Rod lines, no shadows.
// Goudy Bookletter 1911 at 24 px and over only; everything smaller is the body face.
export const cssPImage = (ctx) => `
.ki-sc{position:relative;overflow:hidden;flex:none}
.ki-sc__in{position:absolute;left:0;top:0;transform-origin:0 0}
.ki-ab{position:absolute}
.ki-bar{background:var(--rule)}
.ki-holder{width:max-content}
.ki-see{margin:auto 0 76px;font-family:var(--body);font-size:13px;line-height:18px;color:var(--rod);flex:none}
.ki-see i{font-style:italic}

.ki-nw{white-space:nowrap}

/* photo direction: the first shot behind a guide card, its tab top right carrying the shelf mark, then five run-in entries in one
   column: the heading on the first indention, runovers on the second */
.ki-pd{position:relative;margin:30px 0 0;flex:none}
.ki-ptab{position:absolute;bottom:100%;right:40px;height:30px;min-width:56px;box-sizing:border-box;padding:0 18px;display:flex;align-items:center;justify-content:center;background:var(--plum);color:var(--plum-ink);border-radius:8px 8px 0 0;font-family:var(--body);font-size:16px;line-height:1}
.ki-pd__ph{height:420px;border:1px solid var(--rod)}
.ki-pd__ph .photo-slot{box-sizing:border-box;padding:16px 18px;font-size:12px;line-height:17px}
.ki-dirs{margin-top:28px;max-width:560px;flex:none}
.ki-dir{font-family:var(--body);font-size:16px;line-height:24px;padding-left:var(--hang);text-indent:calc(-1 * var(--hang));margin-bottom:12px}
.ki-dir b{font-weight:600}

/* shot list: two shelves, the slots standing on a shelf board, a label holder on the board under each slot */
.ki-shelves{display:flex;flex-direction:column;gap:26px;flex:none}
.ki-shelf{position:relative;isolation:isolate}
.ki-shelf::after{content:'';position:absolute;left:0;right:0;bottom:0;height:44px;box-sizing:border-box;border-top:1.5px solid var(--rod);border-bottom:1.5px solid var(--rod);z-index:-1}
.ki-shelves--cred .ki-shelf::after{bottom:34px}
.ki-bks{display:flex;align-items:flex-end;gap:12px;padding:0 16px}
.ki-bk{min-width:0;display:flex;flex-direction:column}
.ki-bk__ph{border:1px solid var(--rod);border-bottom:0}
.ki-bk__ph .photo-slot{box-sizing:border-box;align-items:flex-start;padding:12px 14px;font-size:12px;line-height:16px}
.ki-bk__lb{display:flex;flex-direction:column;align-items:center}
.ki-bk__lb .ki-holder{margin:6px 0}
.ki-cred{height:34px;padding-top:6px;box-sizing:border-box;font-family:var(--body);font-size:12px;line-height:14px;color:var(--rod);text-align:center}

/* imagery rules: one entry per rule in one column, each behind a guide tab cut left, centre or right. The Do frame on columns
   1 to 4, the rule and its See reference (the Don't, in a small frame) on columns 5 and 6 */
.ki-irs{display:flex;flex-direction:column;gap:20px;margin-top:22px;flex:none}
.ki-ir{position:relative;display:grid;align-items:start;padding-top:10px;border-top:1px solid var(--rod)}
.ki-itab{position:absolute;bottom:100%;width:44px;height:22px;box-sizing:border-box;display:grid;place-items:center;background:var(--face);border:1px solid var(--rod);border-bottom:0;border-radius:6px 6px 0 0;font-family:var(--body);font-size:13px;line-height:1;color:var(--ink)}
.ki-ir--l .ki-itab{left:0}
.ki-ir--c .ki-itab{left:calc(50% - 22px)}
.ki-ir--r .ki-itab{right:0}
.ki-fr{position:relative;isolation:isolate;overflow:hidden;background:var(--panel)}
.ki-fr::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--rod);z-index:3;pointer-events:none}
.ki-fr .photo-slot{box-sizing:border-box;align-items:center}
.ki-fr--dont .photo-slot{padding:6px 8px;font-size:12px;line-height:15px}
.ki-rt{display:flex;flex-direction:column;min-width:0}
.ki-do,.ki-dont{font-family:var(--body);color:var(--ink)}
.ki-do{font-size:15px;line-height:22px;margin-bottom:10px}
.ki-dont{font-size:13px;line-height:18px;margin-top:6px}
.ki-do b,.ki-dont b{font-weight:600}
.ki-sref{font-style:italic;color:var(--rod);white-space:nowrap}
.ki-split{display:grid;grid-template-columns:60% 40%;height:100%}
.ki-mt{align-self:center;padding:0 10px;font-size:24px;line-height:1.1;color:var(--ink)}
${ctx.edition === 'slot' ? '.ki-mt{padding-right:16px}\n' : ''}.ki-do .ph-c,.ki-dont .ph-c{white-space:nowrap}
.ki-fr--dont .ki-onslot{font-size:24px;line-height:1}
.ki-flat{height:100%;display:grid;place-items:center;background:var(--dark)}
.ki-wash{position:absolute;inset:0;background:var(--accent);opacity:.5}
.ki-onslot{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);padding:0 12px;font-size:28px;line-height:1.05;text-align:center;color:var(--ink)}
.ki-blk{position:absolute;display:block}
.ki-onbusy{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1}

/* grid: the page centred, a guide-card tab over each column, the measures as the collation line */
.ki-gdraw{position:relative;margin:4px auto 0;flex:none}
.ki-gtabs{position:relative;height:24px}
.ki-gtab{position:absolute;bottom:0;height:24px;box-sizing:border-box;display:grid;place-items:center;background:var(--face);border:1.5px solid var(--rod);border-bottom:0;border-radius:6px 6px 0 0;font-family:var(--body);font-size:13px;line-height:1;color:var(--ink)}
.ki-gpg{position:relative}
.ki-gpage{background:var(--ground);box-shadow:0 0 0 1px var(--rod)}
.ki-gcol{background:var(--panel)}
.ki-gml{background:var(--accent)}
.ki-gh{color:var(--ink)}
.ki-mt2{position:absolute;top:50%;height:24px;margin-top:-12px;display:grid;place-items:center;font-size:12px;color:var(--rod)}
.ki-coll{display:flex;justify-content:space-between;width:500px;margin:16px auto 0;flex:none}
.ki-coll dt{font-size:12px;line-height:16px;color:var(--rod)}
.ki-coll dd{margin:2px 0 0;font-family:var(--body);font-size:16px;line-height:22px;color:var(--ink)}

/* layouts: the cover large with its note in the text column beside it; the book page on the margin and the essay page on the text
   column underneath. Each has a plain caption under it */
.ki-lays{display:flex;flex-direction:column;gap:30px;flex:none}
.ki-lay{display:flex;margin:0;min-width:0}
.ki-lay--big figcaption{display:flex;flex-direction:column;padding-top:4px}
.ki-lay--big .ki-lay__c{margin-top:0;font-size:17px;line-height:26px;max-width:340px}
.ki-lay--big .ki-see{margin:20px 0 0}
.ki-lays__low{display:grid;gap:0}
.ki-lays__low .ki-lay{flex-direction:column}
.ki-lcap{margin-top:8px;font-family:var(--body);font-weight:400;font-size:12px;line-height:16px;color:var(--rod)}
.ki-lay__c{font-family:var(--body);font-size:14px;line-height:21px;margin-top:6px;max-width:280px;color:var(--ink)}
.ki-thumb{position:relative;width:794px;height:1123px;background:var(--ground)}
.ki-thumbs{box-shadow:0 0 0 1px var(--rod)}
.ki-th{color:var(--ink)}
`;
