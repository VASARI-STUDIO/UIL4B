// Styles for theme 05's brand kit pages (kit.js: read-me, palette, typefaces, photography), classes start kk-.
// Wired through cssBook in css-book.js (cssBookKit(ctx) + ...). Every rule is scoped under .kk-pg, the kit sheet's own class, so it
// never touches the gate's k- classes or the book. The frame (call number, title, run head, rod hole, folio) is the gate's k-sheet.
// One elevation language, as the gate: 1 px and 1.5 px Rod lines for drawers, tabs, card edges and holders; no shadows that lift.
// Roles come from the brand through the gate's custom properties (--rod, --face, --plum, --kmono); no hex is written here.
export function cssBookKit(ctx) {
  return `
.kk-pg .kk-body{flex:1;min-height:0;display:flex;flex-direction:column;padding-bottom:64px}
.kk-pg .kk-mono{font-family:var(--kmono);font-weight:400;letter-spacing:0}
.kk-pg .kk-lead{font-family:var(--body);font-size:17px;line-height:26px;max-width:600px;flex:none}
.kk-pg .kk-small{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);max-width:620px;margin-top:16px;flex:none}
.kk-pg .kk-trace{font-family:var(--body);font-size:13px;line-height:19px;color:var(--rod);margin-top:auto;padding-top:20px;max-width:620px;flex:none}
/* the drawer label holder: a Rod frame, two screws, the label slip in White */
.kk-pg .kk-hold{display:inline-flex;align-items:center;gap:8px;padding:3px 8px;border:1.5px solid var(--rod);background:var(--ground);flex:none}
.kk-pg .kk-screw{display:block;width:5px;height:5px;border-radius:50%;border:1.5px solid var(--rod);flex:none}
.kk-pg .kk-lab{display:flex;align-items:baseline;gap:12px;min-height:24px;padding:2px 12px;background:var(--face);font-family:var(--body);font-size:15px;line-height:20px;color:var(--ink)}
.kk-pg .kk-lab b{font-weight:600}
.kk-pg .kk-lab .kk-mono{font-weight:400;font-size:13px}

/* read me 1: the kit's cabinet, one drawer per folder; the steps at the card's indentions */
.kk-rm1 .kk-big{font-size:72px;line-height:1.05;padding-bottom:.12em;margin:2px 0 calc(16px - .12em);flex:none}
.kk-rm1 .kk-lead{margin-bottom:28px}
.kk-rm1 .kk-cab{flex:none;border:1.5px solid var(--rod);padding:8px 8px 0;background:var(--ground)}
.kk-rm1 .kk-drs{display:flex;flex-direction:column;gap:6px}
.kk-rm1 .kk-dr{display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 12px 7px;border:1.5px solid var(--rod)}
.kk-rm1 .kk-dr .kk-lab{width:600px;max-width:100%}
.kk-rm1 .kk-fold{flex:none;font-size:13px;line-height:20px}
.kk-rm1 .kk-fdesc{font-size:14px;line-height:20px}
.kk-rm1 .kk-plinth{display:block;height:14px;margin:8px -8px 0;border-top:1.5px solid var(--rod)}
.kk-rm1 .kk-steps{display:flex;flex-direction:column;gap:14px;margin-top:30px;flex:none}
.kk-rm1 .kk-step{display:grid;grid-template-columns:56px minmax(0,1fr);align-items:baseline}
.kk-rm1 .kk-sn{font-size:30px;line-height:1;color:var(--plum)}
.kk-rm1 .kk-st{font-family:var(--body);font-size:15px;line-height:22px;max-width:580px}
.kk-rm1 .kk-st b{font-weight:600}

/* read me 2: the main entry (logo, the lines at the first and second indention), the faces under their labels, the colour drawer */
.kk-rm2 .kk-entry{flex:none;margin-top:6px}
.kk-rm2 .kk-lines{margin:26px 0 0 56px}
.kk-rm2 .kk-l1{font-size:40px;line-height:1.12;padding-bottom:.12em;margin-bottom:calc(8px - .12em)}
.kk-rm2 .kk-l2{font-size:24px;line-height:32px;margin-left:40px}
.kk-rm2 .kk-faces{flex:none;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:0 36px;margin-top:40px}
.kk-rm2 .kk-fc{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
.kk-rm2 .kk-fspec{font-family:var(--body);font-size:13px;line-height:18px;color:var(--rod);margin:10px 0 8px}
.kk-rm2 .kk-fsd{font-size:40px;line-height:1.12;padding-bottom:.12em}
.kk-rm2 .kk-fsb{font-family:var(--body);font-size:17px;line-height:26px}
.kk-rm2 .kk-cdrw{flex:none;margin-top:auto;position:relative;isolation:isolate}
.kk-rm2 .kk-cts{display:flex;align-items:flex-end;gap:4px;height:212px;padding:0 14px}
.kk-rm2 .kk-ct{position:relative;z-index:1;height:var(--h);min-width:0;display:flex;flex-direction:column;gap:2px;padding:9px 8px;border-radius:8px 8px 0 0;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod);overflow:hidden}
.kk-rm2 .kk-ct b{font-family:var(--body);font-weight:600;font-size:15px;line-height:20px;white-space:nowrap}
.kk-rm2 .kk-ct .kk-mono{font-size:11px;line-height:14px;white-space:nowrap}
.kk-rm2 .kk-cfront{position:relative;z-index:2;margin-top:-44px;height:104px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1.5px solid var(--rod);background:var(--ground)}

/* palette: the colour drawer from above, printed cards filed back to front, the action colour whole at 5 : 3 in front */
.kk-pal .kk-pdrw{flex:none;margin-top:4px;padding:16px 22px 22px;border:1.5px solid var(--rod);border-top:0;isolation:isolate}
.kk-pal .kk-pcs{display:flex;flex-direction:column}
.kk-pal .kk-pc{position:relative;flex:none;height:100px;padding:12px 18px;display:grid;grid-template-columns:200px minmax(0,1fr);grid-template-rows:auto 1fr auto;column-gap:16px;align-content:start;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod);overflow:hidden}
.kk-pal .kk-callno{display:flex;flex-direction:column;font-size:12px;line-height:16px}
.kk-pal .kk-pch{min-width:0}
.kk-pal .kk-pcn{font-size:34px;line-height:1.05;padding-bottom:.12em;margin:-2px 0 -.12em}
.kk-pal .kk-pcl{font-family:var(--body);font-size:13px;line-height:18px;margin-top:4px;max-width:46ch}
.kk-pal .kk-pc--front{height:auto;aspect-ratio:5 / 3;padding:22px 26px;grid-template-columns:270px minmax(0,1fr);box-shadow:inset 0 0 0 1px var(--rod)}
.kk-pal .kk-pc--front .kk-callno{font-size:14px;line-height:20px}
.kk-pal .kk-pc--front .kk-pcn{font-size:88px;line-height:1;margin-top:-6px}
.kk-pal .kk-pc--front .kk-pcl{font-size:17px;line-height:26px;margin-top:12px;max-width:34ch}
.kk-pal .kk-pct{grid-column:1/-1;grid-row:3;font-family:var(--body);font-size:13px;line-height:18px;margin-bottom:36px}
.kk-pal .kk-pchole{position:absolute;left:50%;bottom:12px;transform:translateX(-50%)}

/* typefaces: the type drawer, a guide card per face with its family on the tab; the scale against the indention rule */
.kk-tf .kk-tdrw{flex:none;position:relative;isolation:isolate;padding:38px 14px 0;border-left:1.5px solid var(--rod);border-right:1.5px solid var(--rod)}
.kk-tf .kk-gd{position:relative;background:var(--face);color:var(--ink);box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.kk-tf .kk-gd--d{padding-bottom:44px}
.kk-tf .kk-gd--b{z-index:1}
.kk-tf .kk-gtab{position:absolute;bottom:100%;margin-bottom:-1px;height:36px;width:33.333%;display:flex;align-items:center;padding:1px 16px 0;background:var(--face);border-radius:8px 8px 0 0;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod);font-size:20px;line-height:1;white-space:nowrap;overflow:hidden}
.kk-tf .kk-gd--d .kk-gtab{left:0}
.kk-tf .kk-gd--b .kk-gtab{left:33.333%}
.kk-tf .kk-gface{display:flex;align-items:flex-end;gap:28px;padding:18px 24px 22px}
.kk-tf .kk-aa{flex:none;line-height:.92;padding-bottom:.06em}
.kk-tf .kk-gd--d .kk-aa{font-size:180px}
.kk-tf .kk-gd--b .kk-aa{font-size:128px}
.kk-tf .kk-gtx{min-width:0;padding-bottom:6px}
.kk-tf .kk-al{font-size:18px;line-height:25px;overflow-wrap:anywhere}
.kk-tf .kk-al span{display:block}
.kk-tf .kk-gnote{font-family:var(--body);font-size:13px;line-height:18px;color:var(--rod);margin-top:10px}
.kk-tf .kk-scale{flex:none;display:flex;flex-direction:column;gap:10px;margin-top:30px;padding-left:22px;border-left:1.5px solid var(--rod)}
.kk-tf .kk-scale li{line-height:1.12;min-width:0;overflow-wrap:anywhere}
.kk-tf .kk-ss{padding-bottom:.1em}
.kk-tf .kk-sp{font-family:var(--body);font-size:13px;line-height:18px;color:var(--rod);white-space:nowrap;margin-left:6px}

/* photography 1: the subject as the main entry, its notes at the second indention; the rules as entries with See references */
.kk-ph1 .kk-ent{flex:none;margin-top:4px}
.kk-ph1 .kk-flab{font-family:var(--body);font-size:13px;line-height:18px;font-weight:600;color:var(--rod)}
.kk-ph1 .kk-subj{font-size:30px;line-height:38px;max-width:640px;margin-top:4px}
.kk-ph1 .kk-notes{display:flex;flex-direction:column;gap:10px;margin:22px 0 0 56px;max-width:560px}
.kk-ph1 .kk-note{font-family:var(--body);font-size:15px;line-height:23px}
.kk-ph1 .kk-note b{font-weight:600}
.kk-ph1 .kk-hold--h{align-self:flex-start;margin-top:40px}
.kk-ph1 .kk-rlead{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);max-width:560px;margin:12px 0 18px;flex:none}
.kk-ph1 .kk-rules{display:flex;flex-direction:column;gap:18px;flex:none}
.kk-ph1 .kk-rule{display:grid;grid-template-columns:56px minmax(0,1fr);align-items:baseline}
.kk-ph1 .kk-rn{grid-row:1 / span 2;font-size:30px;line-height:1;color:var(--plum)}
.kk-ph1 .kk-do{font-family:var(--body);font-weight:500;font-size:17px;line-height:24px;max-width:580px}
.kk-ph1 .kk-see{grid-column:2;font-family:var(--body);font-size:14px;line-height:21px;margin:4px 0 0 40px;max-width:540px}
.kk-ph1 .kk-see b{font-style:italic;font-weight:600}

/* photography 2: the shelf list, shots standing on shelves in shelf order, a label holder on the shelf edge under each */
.kk-ph2 .kk-shelves{flex:1;min-height:0;display:flex;flex-direction:column;gap:26px;margin-top:6px}
.kk-ph2 .kk-shelf{flex:1;min-height:0;position:relative;display:flex;gap:18px}
.kk-ph2 .kk-shelf::after{content:'';position:absolute;left:-10px;right:-10px;bottom:56px;border-top:1.5px solid var(--rod)}
.kk-ph2 .kk-shot{min-width:0;margin:0;display:flex;flex-direction:column}
.kk-ph2 .kk-sl{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:1.5px}
.kk-ph2 .kk-sh{min-height:0;display:flex}
.kk-ph2 .kk-sh .photo-slot{flex:1;width:100%;height:100%;min-height:0}
.kk-ph2 .kk-scap{flex:none;height:56px;display:flex;align-items:flex-start;gap:10px;padding-top:10px}
.kk-ph2 .kk-scap .kk-lab{min-height:20px;line-height:18px;font-size:13px;padding:1px 8px}
.kk-ph2 .kk-scapt{font-family:var(--body);font-size:13px;line-height:18px;padding-top:3px}
.kk-ph2 .kk-scapt b{font-weight:600}
`;
}
