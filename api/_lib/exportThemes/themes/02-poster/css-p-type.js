// Styles for p-type.js (theme 02, Ticket): proportion, typefaces, hierarchy, type-in-use, type-rules. Classes start tt-.
// Pages stand on the gate frame (.pg.tk, Stock, Night ink); the gate's classes are used as they are and never restyled here.
// Colours come from the brand roles; no hex is written here.
export const cssPType = (ctx) => {
  const D = ctx.roles.dark, r = ctx.brand.ui.radius;
  return `
/* the page foot: the last line sits 56 px above the page's bottom edge, so it clears the trim (foot check 54 px) */
/* open-page perforations: a row rule in the flow, a rule along the top of a row, a rule down the left of a stub column */
.tt-perf.tt-perf--row{position:static;display:block;flex:none;width:100%;height:3px}
.tt-perf.tt-perf--top{top:-1.5px}
.tt-cap{font-size:13px;line-height:1.45;color:var(--soft);max-width:60ch}
.tt-cap b{display:block;font-size:15px;line-height:1.35;font-weight:600;color:var(--ink);margin-bottom:2px}
/* the page lead, under the title as on the gate's palette page: the gate's 15 px muted lead, held to 46ch */
.tt-lead{max-width:46ch}

/* proportion: one roll of twenty tickets, each colour's run its share in length; the percentages billed under it by share.
   The drawn page tops out level with the lead's first line, its right edge on the roll's right edge. */
.tt-ptop{display:flex;justify-content:space-between;align-items:flex-start;gap:48px}
.tt-ptop .tt-lead{margin-top:-2px}
.tt-pfig{display:flex;gap:20px;align-items:flex-end;margin:0}
.tt-pfig .tt-cap{max-width:34ch}
.tt-pg{display:grid;width:256px;height:144px;flex:none;box-shadow:inset 0 0 0 1px var(--hair)}
.tt-pgcol,.tt-pgrow{display:grid;min-width:0;min-height:0}
.tt-pb{display:block;min-width:0;min-height:0}
.tt-roll{flex:none;height:196px;display:flex;border-radius:${r.card}px;overflow:hidden}
.tt-run{display:flex;min-width:0}
.tt-run.tk-edge{box-shadow:inset 0 1px 0 var(--hair),inset 0 -1px 0 var(--hair),inset 1px 0 0 var(--hair)}
.tt-rt{position:relative;flex:1 1 0;min-width:0;padding:10px 0 0 9px}
.tt-rt .tk-sn{white-space:nowrap}
.tt-bill{flex:1;min-height:0;display:flex;margin:0}
.tt-bill li{min-width:0;display:flex;flex-direction:column;gap:4px;padding-right:12px}
.tt-pct{display:flex;align-items:flex-end;height:124px;white-space:nowrap;line-height:0.86}
.tt-pname{font-size:17px;line-height:1.3;font-weight:600;margin-top:8px}
.tt-prun{color:var(--soft)}

/* typefaces: the display face as the body you keep, a perforated rule, the body and mono faces in the stub column */
.tt-tf{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 3px 352px;grid-template-rows:minmax(0,1fr);gap:0 40px}
.tt-tfb{display:flex;flex-direction:column;justify-content:space-between;min-width:0}
.tt-fn{font-size:100px;white-space:nowrap;margin:4px 0 0 -4px}
.tt-ff dd{font-size:20px;line-height:24px;font-weight:600}
.tt-gl{font-size:26px;line-height:1.2;white-space:nowrap}
.tt-tfr{position:relative}
/* the stub column runs the full height: the body face's weights at a reading size at the head, the mono face under its tear at the foot, level with the licence line */
.tt-tfs{display:flex;flex-direction:column;gap:14px;min-width:0}
.tt-perf.tt-perf--tf{margin-top:auto}
.tt-tfs .tt-wts li{font-size:20px;line-height:1.35}
.tt-tfs .tt-wts{gap:14px}
.tt-tfs .tt-wn{font-size:13px}
.tt-fb,.tt-fm{font-size:30px;line-height:1.1;font-weight:600;margin:2px 0 4px}
.tt-wts{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.tt-wts li{display:flex;flex-direction:column;font-size:15px;line-height:1.4}
.tt-wn{font-size:13px;line-height:1.4;font-weight:500;color:var(--soft)}
.tt-ms{display:block;margin-bottom:4px}
.tt-glw{display:flex;flex-direction:column;gap:14px}

/* hierarchy: one hard ticket on Stage, the scale printed on its body at true size, specced on its stub */
.tt-ht{flex:none;display:flex;border-radius:${r.card}px;overflow:hidden}
.tt-hb{flex:none;display:flex;flex-direction:column;justify-content:space-between;padding:22px 36px 22px 40px;min-width:0}
.tt-hl{white-space:nowrap}
.tt-hl.disp{margin-left:-3px}
.tt-hb .tt-hl:nth-child(3){white-space:normal;text-wrap:balance}
.tt-hff{display:flex;gap:0 44px;margin:0}
.tt-hff div{display:flex;flex-direction:column;min-width:0}
.tt-hff dt{color:${D.quiet}}
.tt-hff dd{margin:0}
.tt-hl.tt-hcap{color:${D.quiet};max-width:260px;text-align:right;white-space:normal}
.tt-hfoot{display:flex;justify-content:space-between;align-items:flex-end;gap:32px}
.tt-hs{position:relative;flex:none;display:flex;flex-direction:column;gap:10px;padding:20px 24px 20px 30px;min-width:0}
.tt-hspecs{display:flex;flex-direction:column;gap:5px;margin:0}
.tt-hsn.tk-sn{font-size:16px;line-height:18px}
.tt-hsp,.tt-hsu{font-size:12px;line-height:16px}
.tt-hsu{color:${D.quiet}}
/* slot edition: the fields share the body's width and hold one line each (the slot's label, its example words hidden);
   the caption takes its own row under them, so neither hangs on the ticket's edge */
.tt--hier.tt--slot .tt-hfoot{flex-direction:column;align-items:stretch;gap:10px}
.tt--hier.tt--slot .tt-hff{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px}
.tt--hier.tt--slot .tt-hff dd{min-width:0;overflow:hidden}
.tt--hier.tt--slot .tt-hff .ph-w,.tt--hier.tt--slot .tt-hff .ph-m{display:none}
.tt--hier.tt--slot .tt-hff .ph-b,.tt--hier.tt--slot .tt-hff .ph-c{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt--hier.tt--slot .tt-hff .ph-l{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt--hier.tt--slot .tt-hl.tt-hcap{max-width:none;text-align:left}
.tt--hier.tt--slot .tt-hcap .ph-m{display:none}
.tt--hier.tt--slot .tt-hb{padding-top:16px;padding-bottom:16px}
.tt--hier.tt--slot .tt-hfoot{gap:6px}
/* the engine caps a compact placeholder at 20 px: lift the cap so the display and headline slots hold the sizes set on their lines;
   the headline label may take two lines */
.tt--hier.tt--slot .tt-hl .ph-c{font-size:inherit}
.tt--hier.tt--slot .tt-hb .tt-hl:nth-child(2){white-space:normal;text-wrap:balance}
.tt--hier.tt--slot .tt-hb .tt-hl:nth-child(2) .ph-c{white-space:normal}
.tt-hbot{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:48px;align-items:start}
.tt-hbody{max-width:68ch}

/* type in use: the door photo leads at 7 of 12 columns on the left, the headline and its paragraph beside it on the right,
   three specs on a perforated foot rule. The grid's 16 px gutter, doubled between the two groups. */
.tt-u{flex:1;min-height:0;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-template-rows:minmax(0,1fr);gap:0 16px}
.tt-uf{grid-column:1 / span 6;display:flex;flex-direction:column;gap:8px;margin:0;min-height:0}
.tt-ut{grid-column:7 / -1;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-width:0;padding:0 0 4px 16px}
.tt-uh{text-wrap:balance}
.tt-up{max-width:44ch}
.tt-ucap{color:var(--soft)}
/* the slot takes the dark Stage ground of a door at night; its brief is set in the muted tone that passes on Stage */
.tt-uf .photo-slot{background:${D.raised};color:${D.quiet};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider}}
/* slot edition: the headline box sits at the head of the text column, the paragraph box at its foot */
.tt-u--slot .tt-ut{justify-content:flex-start}
.tt-u--slot .tt-up{margin-top:auto}
.tt-ufoot{display:flex;flex-wrap:wrap;gap:14px 48px;align-items:flex-start}
.tt-ufoot > div{display:flex;flex-direction:column;gap:2px}
.tt-us{font-size:13px;line-height:1.45;color:var(--soft)}
.tt-us b{display:block;font-size:15px;line-height:1.35;font-weight:600;color:var(--ink)}

/* type rules: a run of serials in two columns under one perforated rule (columns split by the 32 px group gutter, no vertical
   perforation). Each rule: its serial, the do specimen large over the do; a short perforation, a third of the rule's width,
   and the don't torn off below it in 15 px muted text, its small specimen after it. */
.tt-rules{flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;margin:-4px 0 0}
/* the two stacks stretch to the page's foot and each spreads its rules down it, so the columns end together */
.tt-rcol{display:flex;flex-direction:column;justify-content:space-between;gap:16px;min-width:0}
.tt-rr{display:grid;grid-template-columns:56px minmax(0,1fr);align-content:start;gap:8px 0;min-width:0}
.tt-rn{grid-row:1 / span 2;padding-top:6px}
.tt-rdo{display:flex;flex-direction:column;gap:8px;min-width:0}
.tt-rno{grid-column:2;display:flex;flex-direction:column;gap:6px;min-width:0}
.tt-perf.tt-perf--short{width:33.333%}
.tt-rnl{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;color:var(--soft)}
.tt-rnl .tt-rtx{font-size:15px;line-height:1.4}
.tt-rnl .tt-demo{min-height:0}
.tt-demo{min-height:34px;display:flex;align-items:flex-end;min-width:0}
.tt-rk{font-weight:600;color:var(--ink)}
/* slot edition: a rule's text boxes keep their label and drop the example words, so five rules stay on the page */
.tt--rules.tt--slot .tt-rtx .ph-w,.tt--rules.tt--slot .tt-rtx .ph-m{display:none}
.tt--rules.tt--slot .tt-rules{gap:16px 32px}
.tt--rules.tt--slot .tt-rcol{gap:8px}
.tt--rules.tt--slot .tt-demo .ph-m{display:none}
.tt--rules.tt--slot .tt-demo{min-height:0}
.tt-d{color:var(--ink)}
.tt-rtx{display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.4;max-width:62ch;min-width:0}
.tt-rtx > span{min-width:0;flex:1}
.tt-rtx svg{flex:none;margin-top:2px}
.tt-sw{display:flex;gap:10px;align-items:center;font-size:14px;line-height:1.4;color:var(--ink)}
.tt-sw.tt-sw--big{gap:14px;font-size:20px;line-height:1.2}
.tt-sw--big .tt-sw__t{width:56px;height:56px}
.tt-sw--big .tt-sw__t b{width:24px;height:24px}
.tt-sw__t{flex:none;width:28px;height:28px;border-radius:${r.control}px;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--hair)}
.tt-sw__t b{display:block;width:12px;height:12px;border-radius:1px}
`;
};
