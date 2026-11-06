// Styles for p-type.js (classes start kt-). Page 794 x 1123, margin 56, so the sheet is 682 wide.
// The gate's one elevation language: 1 px and 1.5 px Rod lines, White card faces, no shadows. Goudy Bookletter 1911 at 24 px and
// over only, except where a type rule shows the fault on purpose.
// The catalogue card's two indentions, measured from the page margin: the first at margin + 40 (96 px from the page edge), the
// second at margin + 80 (136 px). Text on the open pages starts on the margin or one of these, nowhere else.
export const kIndent1 = 40, kIndent2 = 80;
export const cssPType = (ctx) => `
.kt-pg-prop,.kt-pg-tf,.kt-pg-hy,.kt-pg-use,.kt-pg-rules{isolation:isolate;--kt-i1:${kIndent1}px;--kt-i2:${kIndent2}px}
.kt-body{font-family:var(--body)}

/* proportion: the drawer from the side is the page's one big object, the entries filed under it in the drawer's order */
.kt-dr{margin:4px 0 0;flex:none}
.kt-dbox{position:relative;isolation:isolate;box-sizing:border-box;padding:0 10px;border:1.5px solid var(--rod);border-top:0;height:420px}
.kt-runs{display:flex;gap:4px;box-sizing:border-box;height:100%;align-items:flex-end;padding-bottom:10px}
.kt-run{position:relative;display:flex;flex-direction:column;justify-content:flex-end;height:100%;min-width:0}
.kt-edges{display:flex;align-items:flex-end;gap:2px;height:calc(100% - 24px)}
.kt-e{display:block;flex:1 1 0;min-width:0;height:86%;background:var(--c);box-shadow:inset 0 0 0 1px var(--rod)}
.kt-e--ten{height:calc(86% + 4px)}
.kt-e--guide{height:100%}
.kt-dtab{position:absolute;left:0;top:0;height:24px;display:flex;align-items:center;padding:0 6px;background:var(--c);border-radius:6px 6px 0 0;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod);font-size:12px;line-height:16px;white-space:nowrap}
.kt-rod{position:absolute;left:0;right:0;bottom:56px;height:3px;background:var(--rod);z-index:2}
.kt-dcap{font-family:var(--body);font-size:14px;line-height:20px;color:var(--rod);margin-top:10px;max-width:600px}
.kt-pes{display:flex;flex-direction:column;gap:14px;flex:none;margin-top:32px}
.kt-pe{display:grid;grid-template-columns:var(--kt-i1) minmax(0,1fr);align-items:stretch}
.kt-pedge{display:block;justify-self:end;width:10px;margin-right:16px;background:var(--c);box-shadow:inset 0 0 0 1px var(--rod)}
.kt-pn{font-weight:400;font-size:24px;line-height:24px;color:var(--ink);margin-right:6px}
.kt-pt{font-family:var(--body);font-size:13px;line-height:20px;color:var(--ink);max-width:620px;padding:2px 0}

/* typefaces: one guide card per face, tabs cut first, second and third */
.kt-tlead{margin-bottom:32px}
.kt-tfs{display:flex;flex-direction:column;gap:36px;flex:none}
.kt-tf{position:relative;border-top:1.5px solid var(--rod);padding-top:14px}
.kt-ftab{position:absolute;bottom:100%;display:flex;align-items:center;margin-bottom:-1.5px;padding:0 14px;background:var(--face);border:1.5px solid var(--rod);border-bottom:0;border-radius:8px 8px 0 0;font-weight:400;color:var(--ink);white-space:nowrap}
.kt-tf--1 .kt-ftab{left:0;height:40px;font-size:28px;line-height:1;padding-bottom:3px}
.kt-tf--2 .kt-ftab{left:50%;transform:translateX(-50%);height:32px;font-family:var(--body);font-weight:500;font-size:19px;line-height:1}
.kt-tf--3 .kt-ftab{right:0;height:28px;font-family:var(--body);font-weight:500;font-size:16px;line-height:1}
.kt-tf--1{margin-top:12px}
.kt-frole{font-family:var(--body);font-size:14px;line-height:20px;color:var(--rod);margin-bottom:12px}
.kt-wf{display:flex;flex-direction:column;gap:4px}
.kt-wf li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:0 12px;align-items:baseline}
.kt-wsz{font-size:12px;line-height:16px;color:var(--rod);white-space:nowrap}
.kt-wt{display:block;white-space:nowrap;min-width:0}
.kt-dspec{display:flex;flex-direction:column;gap:14px}
.kt-cs p{white-space:nowrap}
.kt-cs--d{padding-left:56px;font-size:24px;line-height:30px}
.kt-bspec{display:grid;grid-template-columns:320px minmax(0,1fr);gap:0 24px;align-items:start}
.kt-bspec .kt-wt{line-height:1.25}
.kt-ws{display:flex;flex-direction:column;gap:10px}
.kt-ws li{display:flex;flex-direction:column}
.kt-w{display:block;font-family:var(--body);margin-top:2px}
.kt-cs--b{font-family:var(--body);font-size:14px;line-height:20px;margin:12px 0 0 56px}
.kt-tfoot{margin:auto 0 72px;padding-top:32px;flex:none}
.kt-trc{font-size:13px;line-height:18px;color:var(--rod)}
.kt-lic{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);max-width:620px;margin-top:6px}

/* hierarchy: the guide card behind, the printed card at 5 : 3 in front of it, every step's number in one column at the printed
   card's right edge + 12 (the printed card is 620 wide, so the column stands at 632 across both cards) */
.kt-hy{position:relative;isolation:isolate;flex:none;margin-top:38px}
.kt-hg{position:relative;z-index:1;box-sizing:border-box;background:var(--face);box-shadow:inset 0 0 0 1px var(--rod);padding:22px 28px 82px}
.kt-htab{position:absolute;bottom:100%;right:48px;height:30px;display:flex;align-items:center;padding:0 16px;background:var(--plum);color:var(--plum-ink);border-radius:8px 8px 0 0;font-family:var(--body);font-weight:500;font-size:15px;line-height:1}
.kt-hwm{position:relative;display:inline-block;margin-bottom:14px}
.kt-hwm .logo-slot{border-color:var(--rod)}
.kt-hkey{display:grid;grid-auto-flow:column;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 28px}
.kt-hkey li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:0 6px;font-family:var(--body);font-size:13px;line-height:18px}
.kt-kn{font-family:var(--body);font-weight:600}
.kt-kt{font-weight:600}
.kt-hc{position:relative;z-index:2;box-sizing:border-box;width:620px;height:372px;margin:-66px 0 0;background:var(--face);box-shadow:inset 0 0 0 1px var(--rod);padding:20px 24px 0 0;display:flex;flex-direction:column;gap:6px}
.kt-hcall{position:absolute;left:16px;top:22px;font-size:13px;line-height:18px;color:var(--ink)}
.kt-hp{position:relative}
.kt-hp--1{margin-left:70px;padding-bottom:4px}
.kt-hp--2{margin-left:94px}
.kt-hp p{max-width:500px;padding-bottom:.1em;margin-bottom:-.1em}
.kt-hp--headline p{text-wrap:balance}
.kt-hp--caption p{color:var(--rod)}
.kt-hn{position:absolute;left:calc(100% + 36px);top:2px;font-style:normal;font-family:var(--body);font-size:14px;line-height:18px;font-weight:600;color:var(--ink)}
.kt-hp--1 .kt-hn{top:14px}
.kt-hn--wm{left:604px;top:auto;bottom:40px}
.kt-hc .k-hole{position:absolute;left:50%;bottom:16px;transform:translateX(-50%)}

/* type in use: the piece, each part named in a plain caption directly under it */
.kt-use{display:flex;flex-direction:column;gap:30px;flex:none;margin-top:8px}
.kt-uh h2{max-width:640px;text-wrap:balance;padding-bottom:.1em;margin-bottom:-.1em}
.kt-ucap{font-family:var(--body);font-weight:400;font-size:12px;line-height:16px;color:var(--rod);margin-top:10px;max-width:400px}
.kt-ub{display:grid;grid-template-columns:400px minmax(0,1fr);gap:0 30px;align-items:start}
.kt-uf{display:flex;flex-direction:column;align-items:flex-start}
.kt-uf>:first-child{width:400px;height:540px}
.kt-uf figcaption{display:block;color:var(--rod);margin-top:10px;max-width:400px}
.kt-ucap b{font-weight:500;color:var(--ink)}
.kt-uf .kt-ucap{margin-top:14px}
.kt-up{display:flex;flex-direction:column;align-items:flex-start;padding-top:2px}
.kt-up>p{max-width:252px}
.kt-up .kt-ucap{max-width:252px;margin-top:14px}

/* type rules: each rule behind a guide tab, cut left, centre, right in turn; the do at the first indention, the don't as a note
   at the second. The two indentions are ruled lines behind the text: each text line sits on a ground-coloured run, so a line
   shows between the text lines and never through a word */
.kt-rul{position:relative;isolation:isolate;flex:none;margin-top:40px}
.kt-ind{position:absolute;top:-28px;bottom:0;width:1px;background:var(--rod);z-index:0}
.kt-ind--1{left:calc(var(--kt-i1) - 1px)}
.kt-ind--2{left:calc(var(--kt-i2) - 1px)}
.kt-res{position:relative;z-index:1;display:flex;flex-direction:column;gap:44px}
.kt-re{position:relative;border-top:1.5px solid var(--rod);padding-top:12px}
.kt-rtab{position:absolute;bottom:100%;height:28px;display:flex;align-items:center;margin-bottom:-1.5px;padding:0 14px;background:var(--face);border:1.5px solid var(--rod);border-bottom:0;border-radius:8px 8px 0 0;font-family:var(--body);font-weight:500;font-size:16px;line-height:1;color:var(--ink);white-space:nowrap}
.kt-re--l .kt-rtab{left:0}
.kt-re--c .kt-rtab{left:50%;transform:translateX(-50%)}
.kt-re--r .kt-rtab{right:0}
.kt-rdo,.kt-rnot{display:grid;gap:0 24px;align-items:center}
.kt-rdo{grid-template-columns:330px minmax(0,1fr);margin-left:var(--kt-i1)}
.kt-rnot{grid-template-columns:290px minmax(0,1fr);margin:8px 0 0 var(--kt-i2)}
.kt-rdm{display:flex;align-items:center;min-height:34px;min-width:0;color:var(--ink)}
.kt-rdm>*{background:var(--ground)}
.kt-demo{display:block;max-width:100%}
.kt-rtx{font-family:var(--body);font-size:15px;line-height:21px;color:var(--ink)}
.kt-rnot .kt-rtx{font-size:14px;line-height:20px}
.kt-rtx>span{background:var(--ground);-webkit-box-decoration-break:clone;box-decoration-break:clone}
.kt-not{font-weight:500}
.kt-re--first .kt-rdo{grid-template-columns:minmax(0,1fr);row-gap:4px}
.kt-re--first .kt-rtx{max-width:560px}
`;
