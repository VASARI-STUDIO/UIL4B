// Styles for u-comp.js (classes start ku2-). Page 794 x 1123, margin 56, on the gate's open sheet (.k-sheet, css-k.js).
// Same elevation language as the gate: 1 px and 1.5 px Rod lines, no shadows. Components keep the engine's own styles; these rules
// only place them, scale them (zoom) for the one large figure per page, and draw the furniture around them.
// The drawer interior (.ku2-dk) carries data-theme="dark", so text inside it uses the token names (--text, --quiet), never the page's --ink.
export const cssUComp = (ctx) => `
.ku2-pg{--i1:40px;--i2:80px;--k2-ink:var(--ink);--k2-face:var(--face);--k2-rod:var(--rod);--k2-ground:var(--ground)}
.ku2-body{flex:1;display:flex;flex-direction:column;min-height:0;margin-bottom:72px;background:transparent;font-family:var(--body)}
.ku2-mono{font-family:var(--kmono);font-weight:400;letter-spacing:0;font-size:.95em;white-space:nowrap}
.ku2-cap{font-family:var(--chrome);font-size:12px;line-height:17px;color:var(--text)}
.ku2-cap b{font-weight:600}
.ku2-cap .num{color:var(--quiet);font-weight:500}
.ku2-q{color:var(--quiet)}
.ku2-note{font-family:var(--chrome);font-size:12px;line-height:17px;color:var(--quiet);margin-top:2px}
.ku2-body15{font-family:var(--body);font-size:15px;line-height:23px;color:var(--text);max-width:560px}
.ku2-trace{font-family:var(--body);font-size:13px;line-height:19px;color:var(--quiet);max-width:640px}
.ku2-trace b{font-weight:600;color:var(--text)}
.ku2-see{font-family:var(--body);font-size:14px;line-height:21px;color:var(--text)}
.ku2-see b{font-weight:600;margin-right:4px}
.ku2-rules{display:flex;flex-direction:column;gap:10px;margin-top:auto;padding-left:var(--i1);max-width:600px}
.ku2-rules p{font-family:var(--body);font-size:15px;line-height:23px;color:var(--text)}
.ku2-rules p.ku2-see{font-size:14px;line-height:21px}
.ku2-ctl{display:flex;align-items:center;min-height:52px}
.ku2-z2{zoom:2}
.ku2-z15{zoom:1.5}
.ku2-z13{zoom:1.3}
.ku2-z12{zoom:1.2}

/* the drawer interior: dark roles, its own ground */
.ku2-dk{background:var(--surface);color:var(--text)}

/* drawer label holder: the frame, two screws, the label slid in (light card stock in either room) */
.ku2-hold{display:inline-flex;align-items:center;gap:7px;align-self:flex-start;height:30px;padding:0 7px;border:1.5px solid var(--k2-rod);background:var(--k2-ground)}
.ku2-screw{display:block;width:5px;height:5px;border-radius:50%;border:1.5px solid var(--k2-rod);flex:none}
.ku2-lab{display:flex;align-items:baseline;height:20px;padding:0 9px;background:var(--k2-face);font-family:var(--body);font-size:14px;line-height:20px;font-weight:600;color:var(--k2-ink);white-space:nowrap}

/* buttons: the one entry card across the page, its other states written as the card's tracings; the variants in the drawer interior below */
.ku2-entry{position:relative;margin-top:34px;padding:16px 28px 44px;background:var(--face);color:var(--ink);box-shadow:inset 0 0 0 1px var(--rod)}
.ku2-ftab{position:absolute;left:33.333%;bottom:calc(100% - 1px);width:calc(33.333% - 6px);height:24px;display:flex;align-items:center;gap:6px;padding:0 12px;background:var(--plum);color:var(--plum-ink);border-radius:8px 8px 0 0;font-family:var(--body);font-size:14px;line-height:18px;font-weight:600;white-space:nowrap}
.ku2-fhead{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.ku2-fcn{font-size:12px;line-height:17px;color:var(--rod)}
.ku2-fsub{font-family:var(--chrome);font-size:12px;line-height:17px;color:var(--quiet);text-align:right}
.ku2-fttl{font-family:var(--display);font-size:30px;line-height:1.15;font-weight:400;color:var(--ink);margin-top:8px}
.ku2-fbig{display:flex;align-items:flex-end;gap:24px;margin-top:16px}
.ku2-ftr{max-width:260px;color:var(--ink)}
.ku2-etr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:0 36px;margin-top:18px;padding-top:14px;border-top:1px solid var(--rod)}
.ku2-th{font-family:var(--body);font-size:13px;line-height:19px;font-weight:600;color:var(--ink);margin-bottom:4px}
.ku2-tl{display:flex;flex-direction:column;gap:5px;font-family:var(--body);font-size:13px;line-height:19px;color:var(--ink)}
.ku2-tl b{font-weight:600}
.ku2-esee{margin-top:8px;font-size:13px;line-height:19px}
.ku2-entry .k-hole--card{bottom:16px}
.ku2-vcol{display:flex;flex-direction:column;margin-top:22px;padding:18px 28px 22px}
.ku2-vas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 28px;margin-top:20px}
.ku2-va{display:flex;flex-direction:column;min-width:0}
.ku2-va .ku2-cap{margin-top:6px}
.ku2-pg-bt .ku2-rules{margin-top:auto;padding:24px 0 0;flex-direction:row;gap:28px;max-width:none}
.ku2-pg-bt .ku2-rules p{flex:1;font-size:14px;line-height:21px}

/* inputs: the error large in the drawer interior, then a column per control */
.ku2-errp{display:flex;align-items:flex-end;gap:32px;padding:22px 28px 24px;margin:4px 0 0}
.ku2-errbig{flex:none;width:420px}
.ku2-z15 .ui-field{width:280px}
.ku2-errside{display:flex;flex-direction:column;gap:14px;min-width:0;flex:1}
.ku2-fcs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-top:28px}
.ku2-pg-in--slot .ku2-fcs{grid-template-columns:minmax(0,1.8fr) minmax(0,1fr) minmax(0,1fr);gap:24px}
.ku2-fc{display:flex;flex-direction:column;gap:14px;min-width:0}
.ku2-fes{display:flex;flex-direction:column;gap:16px}
.ku2-fe .ku2-cap{margin-bottom:4px}
.ku2-in-foot{margin-top:auto;padding-top:20px;display:flex;flex-direction:column;gap:14px}
.ku2-rules--in{margin-top:0;padding-left:0;flex-direction:row;gap:28px;max-width:none}
.ku2-rules--in p{flex:1;font-size:14px;line-height:21px}

/* choices: the segmented control large, then third-cut guide tabs over three columns, the last in the drawer interior */
.ku2-seg{display:flex;align-items:flex-end;gap:36px;margin-top:12px}
.ku2-z2{flex:none}
.ku2-segs{display:flex;flex-direction:column;gap:18px;max-width:300px}
.ku2-segd{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.ku2-pg-ch{--chcols:minmax(0,.95fr) minmax(0,.8fr) minmax(0,1.25fr)}
.ku2-tabs{display:grid;grid-template-columns:var(--chcols);column-gap:9px;align-items:end;height:30px;margin-top:40px;border-bottom:1.5px solid var(--rod)}
.ku2-tab{position:relative;bottom:-1.5px;height:30px;margin-right:8px;display:flex;align-items:center;padding:0 14px;background:var(--face);border-radius:8px 8px 0 0;box-shadow:inset 1.5px 0 0 var(--rod),inset -1.5px 0 0 var(--rod),inset 0 1.5px 0 var(--rod);font-family:var(--body);font-size:15px;line-height:20px;font-weight:600;color:var(--ink)}
.ku2-chc{display:grid;grid-template-columns:var(--chcols);gap:0 8px;flex:none;zoom:1.1}
.ku2-chcol{padding:26px 0 26px 13px;min-width:0}
.ku2-chs{display:flex;flex-direction:column;gap:38px}
/* disabled and on: the box, its tick and the radio's dot step down to the disabled pair, as the switch does (the engine's on rule is stronger than its disabled one) */
.ku2-chc .ui-choice input:disabled:checked{background:var(--disabled-bg);border-color:transparent}
.ku2-chc .ui-choice input[type="checkbox"]:disabled:checked::after{border-color:var(--disabled-text)}
.ku2-chc .ui-choice input[type="radio"]:disabled:checked::after{background:var(--disabled-text)}
.ku2-che{display:flex;flex-direction:column}
.ku2-cap--s{font-size:11px;line-height:15px;margin-top:-2px}
.ku2-chline{font-size:34px;line-height:1.12;max-width:600px;margin-top:auto;color:var(--ink);padding-bottom:.12em;margin-bottom:-.12em}
.ku2-rules--two{margin-top:18px}

/* cards: the content card large, its anatomy beside it; the dark pair; the stats */
.ku2-cd-top{display:flex;gap:36px;align-items:flex-start;margin-top:8px}
.ku2-cbig{flex:none;width:340px}
.ku2-cover{display:flex;align-items:flex-end;padding:12px;font:400 11px/1.4 var(--chrome);color:var(--quiet-panel);background:var(--sunken)}
.ku2-cact{margin-top:8px}
.ku2-cact .ui-btn{align-self:flex-start}
.ku2-cside{display:flex;flex-direction:column;gap:14px;min-width:0;padding-top:4px}
.ku2-anat{display:flex;flex-direction:column;gap:8px;padding-left:var(--i1)}
.ku2-anat li{display:flex;gap:12px;align-items:baseline}
.ku2-an{flex:none;width:22px;height:22px;display:grid;place-items:center;border:1.5px solid var(--rod);border-radius:50%;font:600 11px/1 var(--chrome);color:var(--ink)}
.ku2-anat p{font-family:var(--body);font-size:15px;line-height:22px;color:var(--ink)}
.ku2-anat b{font-weight:600}
.ku2-rule1{font-family:var(--body);font-size:15px;line-height:23px;color:var(--ink);margin-top:6px}
.ku2-cbig{zoom:1.15}
.ku2-cdk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:40px 0 0;padding:26px 28px 26px}
.ku2-cdk .ui-card{zoom:1.2}
.ku2-dcell{display:flex;flex-direction:column;gap:8px;min-width:0}
.ku2-cd-foot{display:flex;gap:36px;align-items:flex-start;margin-top:auto;padding-top:24px}
.ku2-stats{display:flex;gap:16px;flex:none}
.ku2-stats .ui-stat{width:150px;zoom:1.15}
.ku2-cd-notes{display:flex;flex-direction:column;gap:10px;min-width:0}

/* navigation: the dark top bar across the page, the rule as the page's line, each pattern under its call number */
.ku2-topband{margin:4px calc(-1 * var(--m)) 0;padding:0 var(--m)}
.ku2-topband .ui-topbar{border-bottom:0;padding:0}
.ku2-logo{display:block}
.ku2-nh{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
.ku2-cn{font-size:12px;line-height:17px;color:var(--rod)}
.ku2-nv-cap{margin-top:10px}
.ku2-nline{font-size:40px;line-height:1.12;max-width:660px;margin-top:44px;color:var(--ink);padding-bottom:.12em;margin-bottom:-.12em}
.ku2-nsub{margin-top:10px;padding-left:var(--i1)}
.ku2-nv{margin-top:52px;display:flex;flex-direction:column;min-width:0}
.ku2-nv .ui-tabs{align-self:flex-start;zoom:1.15}
.ku2-nv .ui-crumbs{zoom:1.15}
.ku2-nv-foot{display:flex;gap:30px;align-items:flex-start;margin-top:auto}
.ku2-nv-foot .ku2-nv{margin-top:0}
.ku2-nv-foot .ui-sidebar,.ku2-phone{zoom:1.2}
.ku2-nv--ph{flex:1}
.ku2-phone{width:320px;border:1.5px solid var(--rod)}

/* lists: the shelf list large, its anatomy, the dark pair */
.ku2-cap--top{margin-top:12px}
.ku2-shelf{margin-top:10px}
.ku2-shelf .ui-list{width:568px}
.ku2-trace--ls{margin-top:18px;padding-left:var(--i1)}
.ku2-lsdk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;margin:36px 0 0;padding:28px 28px 30px}
.ku2-lcell{display:flex;flex-direction:column;gap:8px;min-width:0}
.ku2-pg-ls .ku2-rules{padding-top:32px}
`;
