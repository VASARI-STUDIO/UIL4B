// Styles for p-image.js: photo-direction, shot-list, imagery-rules, grid, layouts. Classes start ti-. Colours come from the brand roles.
// The condensed face is asked for at font-stretch 50%, the width the theme pins it at (meta.chrome.stretch in index.js).
export const cssPImage = (ctx) => {
  const L = ctx.roles.light, D = ctx.roles.dark;
  return `
/* the page foot: the last line sits 56 px above the page's bottom edge, so it clears the trim (foot check 54 px) */
/* the imagery section: the queue at night. The gate's page vars, swapped to the Night roles */
.pg.tk.ti-night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
.ti-lab,.ti-sn,.ti-ff dt,.ti-gm{font-family:var(--cond);font-stretch:50%;font-weight:700;letter-spacing:0.02em}
.ti-lab{display:flex;align-items:center;gap:6px;font-size:20px;line-height:22px}
.ti-lab svg{flex:none}
.ti-sn{font-size:20px;line-height:22px;font-variant-numeric:tabular-nums}
.ti-cap{font-size:13px;line-height:18px;color:var(--quiet)}
.ti-ff{margin:0}
.ti-ff div{display:flex;flex-direction:column;gap:4px;min-width:0}
.ti-ff dt{font-size:20px;line-height:22px}
.ti-ff dd{margin:0}
/* the perforated rule: a row of holes across its box */
.ti-hr{position:relative;height:3px;flex:none}
.ti-ph{position:relative;overflow:hidden;min-height:0}
.ti-ph .photo-slot{border:1.5px dashed var(--quiet);color:var(--soft);font-size:12px;line-height:1.45;border-radius:0}

/* the page lead, under the title (D3): the gate's .tk-lead, held to 46ch */
.ti-lead{max-width:46ch}

/* photo-direction: the photo inside the margins, outlined on all four sides in Muted so it holds on Night, torn down its right edge */
.ti-pd{flex:1;min-height:0;display:grid;grid-template-columns:560px minmax(0,1fr);gap:0 48px}
.ti-pd__ph{overflow:visible}
.ti-pd__ph .photo-slot{border:1.5px solid var(--quiet);padding:24px 32px}
.ti-pd__stub{display:flex;flex-direction:column;justify-content:space-between;padding:8px 0 40px}
.ti-pd__subj{display:flex;flex-direction:column;gap:14px}
.ti-pd__subj p{font-size:30px;line-height:1.25;font-weight:600;max-width:24em;text-wrap:pretty}
.ti-ff--pd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 40px;padding-top:28px}
.ti-ff--pd dd{font-size:15px;line-height:1.45;color:var(--soft)}

/* shot-list: the lead shot is the body on the left; the pad of stubs beside it, past the one vertical perforation, a row per shot */
.ti-hr--row{position:absolute;left:0;right:0;top:0}
.ti-sl{flex:1;min-height:0;display:grid;grid-template-columns:380px minmax(0,1fr);gap:0 32px}
.ti-sl__lead{display:flex;flex-direction:column;gap:12px;min-height:0}
.ti-sl__lead .ti-sn{font-size:44px;line-height:44px}
.ti-sl__ph{flex:1}
.ti-sl__ph>.photo-slot,.ti-sl__ph>img{position:absolute;inset:0}
.ti-sl__brief{font-size:17px;line-height:1.45;font-weight:600;text-wrap:pretty}
.ti-sl__pad{position:relative;min-height:0;display:flex;flex-direction:column;margin:0;padding:0 0 0 32px;list-style:none}
.ti-slr{position:relative;flex:1 1 0;min-height:0;display:grid;grid-template-columns:72px 116px minmax(0,1fr);gap:0 20px;align-items:start;padding:10px 0}
.ti-slr:first-child{padding-top:0}
.ti-slr:last-child{padding-bottom:0}
.ti-slr__ph{aspect-ratio:4/3}
.ti-slr__ph>.photo-slot,.ti-slr__ph>img{position:absolute;inset:0}
.ti-slr__txt{display:flex;flex-direction:column;gap:6px;min-width:0}
.ti-slr__txt p:first-child{font-size:15px;line-height:1.45;max-width:48ch;text-wrap:pretty}

/* imagery-rules: photo-led, two by two on the 12 columns. Each rule its do slot and, beside it, a smaller don't slot */
.ti-irs{flex:1;min-height:0;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-template-rows:1.2fr 1fr;gap:32px 16px;margin:0;padding:0;list-style:none}
.ti-ir{min-height:0;display:grid;grid-template-columns:subgrid;column-gap:16px}
.ti-ir--1{grid-column:span 7}
.ti-ir--2{grid-column:span 5}
.ti-ir--3,.ti-ir--4{grid-column:span 6}
.ti-ir__do,.ti-ir__dont{display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0}
.ti-ir--1 .ti-ir__do,.ti-ir--3 .ti-ir__do,.ti-ir--4 .ti-ir__do{grid-column:span 4}
.ti-ir--2 .ti-ir__do{grid-column:span 3}
.ti-ir--1 .ti-ir__dont{grid-column:span 3}
.ti-ir--2 .ti-ir__dont,.ti-ir--3 .ti-ir__dont,.ti-ir--4 .ti-ir__dont{grid-column:span 2}
.ti-ir__do .ti-ir__tile{flex:1 1 0}
.ti-ir__dont .ti-ir__tile{flex:0 0 62%}
.ti-ir__tile>.photo-slot,.ti-ir__tile>img{position:absolute;inset:0}
.ti-ir__txt{display:flex;flex-direction:column;gap:6px;min-width:0}
.ti-ir__do .ti-ir__txt{min-height:76px}
.ti-ir__do .ti-ir__txt p{font-size:17px;line-height:1.4;max-width:36ch;text-wrap:pretty}
.ti-ir__dont .ti-ir__txt p{font-size:14px;line-height:1.45;color:var(--soft);text-wrap:pretty}
.ti-onph{position:absolute;left:12px;top:10px;right:12px;font-size:20px;line-height:1;color:var(--ink)}
.ti-ir--1 .ti-ir__do .ti-onph{font-size:26px}
.ti-onph--mid{top:50%;transform:translateY(-50%);font-size:18px}
.ti-redfield{position:absolute;inset:0;display:flex;align-items:flex-end;padding:10px 12px;font-size:12px;line-height:1.35}
.ti-flat{position:absolute;inset:0;background:var(--ground);display:flex;align-items:center;justify-content:center}
.ti-studio{width:100%;height:100%;align-items:center;font-size:11px!important;line-height:1.35!important}
.ti-bright{position:absolute;right:0;bottom:0;width:64%;height:56%;background:${L.surface};display:flex;align-items:center;justify-content:center}

/* grid: the page drawn 9 columns wide is the large thing; the measures stand on the stub beside it */
.ti-gr{flex:1;min-height:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 16px;align-items:start}
.ti-gside{position:relative;align-self:stretch;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding-left:24px}
.ti-gnote{font-size:15px;line-height:1.5;color:var(--soft);text-wrap:pretty}
.ti-gpage{position:relative;overflow:hidden;background:var(--ground);box-shadow:inset 0 0 0 1px var(--edge)}
.ti-gcol{position:absolute;top:0;bottom:0;background:${L.sunken}}
.ti-gm{position:absolute;top:8px;text-align:center;font-size:14px;line-height:16px;color:var(--soft)}
.ti-gh{position:absolute;margin:0;color:var(--ink)}
.ti-gbar{position:absolute;height:6px;background:var(--edge)}
.ti-gph{position:absolute}
.ti-gph .photo-slot{border-width:1px}
.ti-ff--grid{display:flex;flex-direction:column;gap:18px}
.ti-ff--grid dd{font-size:26px;line-height:30px;font-weight:600;white-space:nowrap}

/* layouts: the poster on the body, editorial and statement on the stub */
.ti-ly{flex:1;min-height:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 0}
.ti-ly__body{display:flex;flex-direction:column;gap:20px;padding-right:44px}
.ti-ly__stub{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding-left:44px}
.ti-ly__one{display:flex;flex-direction:column;gap:10px}
.ti-thumb{position:relative;overflow:hidden;flex:none}
.ti-thn{background:${D.surface};color:${D.text};--tb:${D.border}}
.ti-ths{background:${L.surface};color:${L.text};--tb:${L.border};box-shadow:inset 0 0 0 1px ${L.border}}
.ti-ab{position:absolute}
.ti-th{margin:0}
/* slot edition: the boxes drop their length line so the rows stay clear of the foot */
.ti--slot .ti-ir__txt .ph-m{display:none}
.ti--slot .ti-ir__dont .ti-ir__tile{flex:0 0 54%}
/* slot placeholders are dashed boxes: the lines set on a photo take open leading so the boxes stay apart */
.ti--slot .ti-onph{line-height:1.4}
/* a line set one sentence to a block, so a time never breaks from its "at" */
.ti-sent{display:block}
.ti-thumb .photo-slot{border:1px dashed ${D.quiet};border-radius:0}
.ti-ths .photo-slot{border-color:${L.quiet}}
.ti-lcap{display:flex;flex-direction:column;gap:4px}
.ti-lcap p{font-size:14px;line-height:1.45;color:var(--soft);max-width:52ch}
.ti-lcap--big{flex-direction:row;gap:28px;align-items:baseline}
.ti-lcap--big .ti-sn{font-size:34px;line-height:36px}
.ti-lcap--big p{font-size:17px;line-height:1.45;color:var(--ink);max-width:44ch}
`;
};
