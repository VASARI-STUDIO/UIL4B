// Styles for theme 02's brand kit pages (kit.js): read me, palette sheet, type specimen, photography. Classes start tk2-, and every
// rule is scoped under the kit page's own class (.pg.tk2), so nothing here reaches the guidelines, the UI kit or the HTML book.
// The pages stand on the gate's frame (.pg.tk: Stock ground, Night ink, the condensed head); the photography pages are the queue at
// night (.tk2-night). Colours come from the roles; no hex is written here. css-book.js imports cssBookKit under this name.
import { cssStr } from '../../engine/escape.js';
export function cssBookKit(ctx) {
  const D = ctx.roles.dark, B = ctx.brand, mono = `'${cssStr(B.fonts.mono.family)}',monospace`;
  return `
/* the queue at night: the photography pages print Stock on Night */
.pg.tk2.tk2-night{--ground:${D.surface};--ink:${D.text};--soft:${D.textSoft};--quiet:${D.quiet};--hair:${D.divider};--edge:${D.border}}
.pg.tk2 .tk2-mono{font-family:${mono};font-size:13px;line-height:18px;font-weight:400;white-space:nowrap}
.pg.tk2 .tk2-lead{font-size:15px;line-height:1.5;color:var(--soft);max-width:60ch}
.pg.tk2 .tk2-cap{font-size:13px;line-height:1.4;color:var(--quiet)}
.pg.tk2 .tk2-title{font-size:56px;line-height:0.95;white-space:nowrap}
.pg.tk2 .tk2-hr{position:relative;flex:none;height:3px}
.pg.tk2 .tk2-ff{gap:0 32px}
.pg.tk2 .tk2-ff dd{font-size:17px;line-height:22px}
.pg.tk2 .tk2-ff dd.tk2-mono{font-size:12px;line-height:16px;font-weight:400}

/* read me 1: the kit's name on the body, the steps on the stub column, the folders as a pad of stubs under a torn edge */
.pg.tk2--rm .tk2-rm{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:0 48px}
.pg.tk2--rm .tk2-rm__body{display:flex;flex-direction:column;justify-content:flex-end;gap:24px;padding-bottom:28px}
.pg.tk2--rm .tk2-rm__name{font-size:92px;line-height:0.9;margin-left:-4px;white-space:nowrap}
.pg.tk2--rm .tk2-rm__body .tk2-lead{max-width:52ch}
.pg.tk2--rm .tk2-rm__stub{position:relative;display:flex;flex-direction:column;justify-content:flex-end;padding:0 0 20px 32px}
.pg.tk2--rm .tk2-steps li{position:relative;display:grid;grid-template-columns:28px minmax(0,1fr);gap:0 10px;padding:12px 0}
.pg.tk2--rm .tk2-steps li:first-child{padding-top:4px}
.pg.tk2--rm .tk2-steps .tk2-hr{position:absolute;top:0;left:0;right:0}
.pg.tk2--rm .tk2-step__n{font-size:32px;line-height:28px}
.pg.tk2--rm .tk2-steps p{font-size:14px;line-height:1.45;color:var(--soft)}
.pg.tk2--rm .tk2-steps b{font-weight:600;color:var(--ink)}
.pg.tk2--rm .tk2-padw{flex:none;display:flex;flex-direction:column}
.pg.tk2--rm .tk2-padw .tk-h3{margin:16px 0 10px}
.pg.tk2--rm .tk2-pad{display:flex}
.pg.tk2--rm .tk2-fold{position:relative;flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:8px;padding:2px 20px 0 22px}
.pg.tk2--rm .tk2-fold:first-child{padding-left:0}
.pg.tk2--rm .tk2-fold__n{font-family:var(--cond);font-stretch:50%;font-weight:700;font-size:44px;line-height:40px;letter-spacing:0.02em}
.pg.tk2--rm .tk2-fold__t{font-size:26px;line-height:1}
.pg.tk2--rm .tk2-fold p{font-size:13px;line-height:1.4;color:var(--soft);max-width:30ch}

/* read me 2: the brand's lines as event lines down the body, the logo and faces on the stub, the colours as one roll along the foot */
.pg.tk2--one .tk2-one{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:0 48px}
.pg.tk2--one .tk2-evs{display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:8px}
.pg.tk2--one .tk2-ev{position:relative;display:grid;grid-template-columns:76px minmax(0,1fr);align-items:baseline;gap:0 16px;padding:14px 0}
.pg.tk2--one .tk2-ev .tk2-hr{position:absolute;top:0;left:0;right:0}
.pg.tk2--one .tk2-ev p{font-size:32px;line-height:1.05}
.pg.tk2--one .tk2-ev--lead{padding-top:0}
.pg.tk2--one .tk2-ev--lead p{font-size:72px;line-height:0.95;text-wrap:balance}
.pg.tk2--one .tk2-one__stub{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding:4px 0 8px 32px}
.pg.tk2--one .tk2-faces{display:flex;flex-direction:column;gap:20px}
.pg.tk2--one .tk2-face{display:flex;align-items:center;gap:20px}
.pg.tk2--one .tk2-aa{flex:none;width:136px;font-size:64px;line-height:1}
.pg.tk2--one .tk2-aa--body{font-family:var(--body);font-weight:500;font-size:68px;letter-spacing:-0.02em}
.pg.tk2--one .tk2-face .tk2-ff{flex-direction:column;gap:8px}
.pg.tk2--one .tk2-strip{flex:none;display:flex;height:92px;margin:0 calc(-1 * var(--m))}
.pg.tk2--one .tk2-strip__c{position:relative;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:12px 16px}
.pg.tk2--one .tk2-strip__c:first-child{padding-left:var(--m)}
.pg.tk2--one .tk2-strip__c b{font-size:15px;line-height:20px;font-weight:600}
.pg.tk2--one .tk2-strip__c.tk-edge{box-shadow:inset 0 1px 0 var(--hair),inset 0 -1px 0 var(--hair)}

/* palette sheet: each colour a roll length on end, its values stub torn off across the foot */
.pg.tk2--pal .tk2-pal__top{display:flex;align-items:flex-end;justify-content:space-between;gap:48px}
.pg.tk2--pal .tk2-pal__top .tk2-lead{max-width:420px}
.pg.tk2--pal .tk2-cols{flex:1;min-height:0;display:flex;gap:12px}
.pg.tk2--pal .tk2-col{min-width:0;display:flex;flex-direction:column;justify-content:space-between}
.pg.tk2--pal .tk2-col__body{display:flex;flex-direction:column;gap:10px;padding:14px 16px 0}
.pg.tk2--pal .tk2-col__n{font-size:34px;line-height:0.95}
.pg.tk2--pal .tk2-col--lead .tk2-col__n{font-size:64px}
.pg.tk2--pal .tk2-col__l{font-size:14px;line-height:1.45;font-weight:500;max-width:34ch}
.pg.tk2--pal .tk2-col__stub{position:relative;padding:16px 16px 14px}
.pg.tk2--pal .tk2-ff--vals{flex-direction:column;gap:8px}
.pg.tk2--pal .tk2-ff--vals dt{font-size:12px}
.pg.tk2--pal .tk2-pal__foot{flex:none;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:0 48px;align-items:start}
.pg.tk2--pal .tk2-pal__foot .tk2-hr{grid-column:1 / -1;margin-bottom:12px}
.pg.tk2--pal .tk2-pal__foot .tk2-cap{padding-top:36px}
.pg.tk2--pal .tk2-tones{display:flex;gap:28px}
.pg.tk2--pal .tk2-tones li{flex:1 1 0;min-width:0;display:flex;gap:10px;align-items:flex-start}
.pg.tk2--pal .tk2-tones p{font-size:13px;line-height:1.4;color:var(--soft)}
.pg.tk2--pal .tk2-tones b{font-weight:600;color:var(--ink)}

/* type specimen: the display face on the body (its Aa the large thing), the body face on the stub beyond the perforation */
.pg.tk2--type .tk2-spec{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:0 40px}
.pg.tk2--type .tk2-spec__body{display:flex;flex-direction:column;justify-content:space-between;gap:20px;min-height:0}
.pg.tk2--type .tk2-ff--face{gap:0 36px}
.pg.tk2--type .tk2-spec__d{display:flex;align-items:flex-end;gap:48px}
.pg.tk2--type .tk2-spec__aa{font-size:196px;line-height:0.84;letter-spacing:-0.02em}
.pg.tk2--type.tk2--slot .tk2-spec__aa{font-size:150px}
.pg.tk2--type .tk2-spec__al{font-size:17px;line-height:1.2;letter-spacing:0;padding-bottom:4px}
.pg.tk2--type .tk2-spec__s{position:relative;display:flex;flex-direction:column;gap:12px;padding-top:22px}
.pg.tk2--type .tk2-spec__s .tk2-hr{position:absolute;top:0;left:0;right:0}
.pg.tk2--type .tk2-spec__h{font-size:38px;line-height:0.98;text-wrap:balance}
.pg.tk2--type .tk2-spec__p{font-size:15px;line-height:1.55;color:var(--soft);max-width:78ch}
.pg.tk2--type .tk2-spec__stub{position:relative;display:flex;flex-direction:column;gap:20px;padding-left:32px}
.pg.tk2--type .tk2-spec__stub .tk2-ff--face{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}
.pg.tk2--type .tk2-spec__stub .tk2-ff--face div:nth-child(2){grid-column:1 / -1;grid-row:2}
.pg.tk2--type .tk2-spec__aa2{font-family:var(--body);font-weight:500;font-size:120px;line-height:0.85;letter-spacing:-0.02em}
.pg.tk2--type .tk2-spec__al2{font-family:var(--body);font-weight:500;font-size:16px;line-height:1.4}
.pg.tk2--type .tk2-spec__note{margin-top:auto}

/* photography direction: the five calls as a run down the body; each rule a row, the don't beyond its perforation */
.pg.tk2--pd .tk2-pd__top{display:flex;flex-direction:column;gap:14px;padding-bottom:28px}
.pg.tk2--pd .tk2-pd__top .tk2-title{font-size:52px;white-space:normal}
.pg.tk2--pd .tk2-pd{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 560px;gap:0 56px}
.pg.tk2--pd .tk2-calls{display:flex;flex-direction:column}
.pg.tk2--pd .tk2-call{position:relative;display:flex;flex-direction:column;gap:6px;padding:16px 0 14px}
.pg.tk2--pd .tk2-call .tk2-hr{position:absolute;top:0;left:0;right:0}
.pg.tk2--pd .tk2-call--lead{padding-top:0}
.pg.tk2--pd .tk2-call p{font-size:15px;line-height:1.45;color:var(--soft);max-width:66ch}
.pg.tk2--pd .tk2-call--lead p{font-size:22px;line-height:1.35;font-weight:600;color:var(--ink)}
/* the slot edition's descriptor boxes run taller than the brand's copy: the calls close up there */
.pg.tk2--pd.tk2--slot .tk2-call{padding:10px 0 8px}
.pg.tk2--pd.tk2--slot .tk2-call--lead{padding-top:0}
.pg.tk2--pd .tk2-pd__rules{display:flex;flex-direction:column}
.pg.tk2--pd .tk2-rule{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.pg.tk2--pd .tk2-rule .tk2-hr{position:absolute;top:0;left:0;right:0}
.pg.tk2--pd .tk2-rule--hd h2{position:relative;margin:0;padding-bottom:4px}
.pg.tk2--pd .tk2-rule--hd h2+h2{padding-left:20px}
.pg.tk2--pd .tk2-rule__do{padding:16px 20px 18px 0;font-size:16px;line-height:1.45;font-weight:600}
.pg.tk2--pd .tk2-rule__dont{position:relative;padding:16px 0 18px 20px;font-size:16px;line-height:1.45;color:var(--soft)}

/* shot list: the lead shot large on the body, the other five as a run of serials down the stub column */
.pg.tk2--sl .tk2-sl{flex:1;min-height:0;display:grid;grid-template-columns:460px minmax(0,1fr);gap:0 40px}
.pg.tk2--sl .tk2-sl__lead{display:flex;flex-direction:column;gap:20px;min-height:0}
.pg.tk2--sl .tk2-sl__top{display:flex;flex-direction:column;gap:10px}
.pg.tk2--sl .tk2-sl__fig{flex:1;min-height:0;display:flex;flex-direction:column;gap:14px}
.pg.tk2--sl .tk2-sl__ph{flex:1;min-height:0}
.pg.tk2--sl .tk2-sl__fig figcaption{display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 16px;align-items:start}
.pg.tk2--sl .tk2-sl__n{font-size:44px;line-height:40px}
.pg.tk2--sl .tk2-sl__stub{position:relative;display:flex;flex-direction:column;min-height:0;padding-left:32px}
.pg.tk2--sl .tk2-shots{flex:1;min-height:0;display:flex;flex-direction:column}
.pg.tk2--sl .tk2-shot{position:relative;flex:1 1 0;min-height:0;display:grid;grid-template-columns:64px 148px minmax(0,1fr);gap:0 18px;padding:12px 0}
.pg.tk2--sl .tk2-shot:first-child{padding-top:0}
.pg.tk2--sl .tk2-shot .tk2-hr{position:absolute;top:0;left:0;right:0}
.pg.tk2--sl .tk2-shot__n{font-size:26px;line-height:26px}
.pg.tk2--sl .tk2-shot__ph{min-height:0}
.pg.tk2--sl .tk2-shot__c{font-size:13px;line-height:1.4;color:var(--quiet)}
.pg.tk2--sl .tk2-shot__c b{font-size:15px;font-weight:600;color:var(--ink);margin-right:6px}
.pg.tk2--sl .tk2-shot__b{font-size:13px;line-height:1.45;color:var(--soft);margin-top:4px;max-width:62ch}
.pg.tk2--sl .tk2-sl__fig .tk2-shot__b{font-size:14px}
.pg.tk2--sl .tk2-sl__ask{flex:none;padding-top:12px}
`;
}
