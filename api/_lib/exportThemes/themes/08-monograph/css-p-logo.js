// Styles for p-logo.js (theme 08, Riso): logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse. Classes start rl-.
// Page 794 x 1123, margin 72, spacing on a 4 px base. Figures are the gate's sheets (r-sheet: paper edged by a hairline, crosses at
// the corners); nothing here restyles a gate class. Familjen Grotesk is the chrome, the body face carries the reasons; mono is unused.
import { drums, drumNo } from './guidelines-r.js';

export const cssPLogo = (ctx) => {
  // a separation: the real logo with every path not in this drum's ink left unprinted
  const only = drums(ctx).map((d) => `.rl-only--${drumNo(ctx, d)} svg path:not([fill="${d.hex}" i]){fill:none}`).join('\n');
  return `
${only}
.rl-pg .num{font-variant-numeric:tabular-nums}
.rl-body{position:absolute;left:72px;right:72px;top:216px}
.rl-lay{line-height:0}
.rl-lay svg,.rl-lay .logo-slot,.rl-v__pr svg,.rl-gc svg,.rl-m__pr svg,.rl-st svg,.rl-mp__l svg,.rl-zin svg,.rl-onph svg,.rl-pc__pr svg{display:block}
.rl-nolab .logo-slot{font-size:0 !important}
.rl-v .logo-slot{min-width:56px}
.rl-cap{margin-top:10px}
.rl-t{font-family:var(--chrome);font-weight:600;font-size:15px;line-height:1.3;color:var(--ink)}
.rl-use{margin-top:4px;max-width:62ch;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}
/* the job line, one form for the book: under the figure, flush with the sheet's left edge, 12 px body in the quiet grey */
.rl-job{margin-top:6px;max-width:66ch;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet)}
.rl-job b{font-weight:600}
.rl-jn{color:var(--quiet)}
.rl-jd{white-space:normal}
.rl-sw{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:0}
.rl-f{margin-top:12px}
.rl-f div{margin-top:8px}.rl-f div:first-child{margin-top:0}
.rl-f dt{font-weight:600;font-size:12px;line-height:1.4;color:var(--quiet)}
.rl-f dd{font-size:14px;line-height:1.4;color:var(--ink)}
.rl-f--row{display:flex;flex-wrap:wrap;gap:8px 32px}
.rl-f--row div{margin-top:0}

/* logo: the separations side by side, the composite large beneath */
.rl-idea{max-width:60ch}
.rl-body--logo{top:256px}
.rl-seps{display:grid;gap:16px}
.rl-sep{margin:0;min-width:0}
.rl-sep__sh{height:148px;display:flex;align-items:center;justify-content:center;--xi:3px}
.rl-sep__c{margin-top:8px}
.rl-sep__c .rl-job{margin-top:0}
.rl-comp{margin:32px 0 0}
.rl-comp__sh{height:436px;display:flex;align-items:center;justify-content:center;--xi:8px}
.rl-comp .rl-cap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 32px;margin-top:12px}
.rl-comp .rl-cap>p{grid-column:1}
.rl-comp .rl-f{grid-column:2;grid-row:1 / span 3;margin-top:0}

/* versions: a group per set of drums; the default large, the rest in a run as wide as each version's shape */
.rl-vg+.rl-vg{margin-top:28px}
.rl-vrow{display:flex;gap:16px;align-items:flex-start}
.rl-vrow+.rl-vrow{margin-top:20px}
.rl-v{margin:0;min-width:0;flex-basis:0}
.rl-v__sh{padding:10px;--xi:2px}
.rl-v__pr{height:84px;display:flex;align-items:center;justify-content:center}
.rl-v--big .rl-v__pr{height:168px}
.rl-v--big .rl-v__sh{padding:14px}

/* clear space: one sheet down to the foot margin, the zone hatched as the edge the drum cannot print; the rule and measures beneath */
.rl-cz{margin:0}
.rl-cz__sh{height:672px;display:flex;align-items:center;justify-content:center;--xi:8px}
.rl-cz .rl-cap{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:auto 1fr;gap:0 32px;margin-top:14px}
.rl-cz .rl-cap>p{grid-column:1}
.rl-cz2{grid-column:2;grid-row:1 / span 2}
.rl-cz3{grid-column:3;grid-row:1 / span 2}
.rl-cz3 .rl-f{margin-top:0}
.rl-cz2 .rl-use{margin-top:0}
.rl-zone{position:relative;outline:1px dashed var(--ink);outline-offset:0;isolation:isolate}
.rl-hatch{position:absolute;left:0;top:0;display:block;color:var(--hair)}
.rl-xb{position:absolute;display:flex;align-items:center;justify-content:center;font-family:var(--chrome);font-size:13px;line-height:1;color:var(--ink);z-index:1}
.rl-xb i{font-style:normal;padding:2px 4px;background:var(--ground)}
.rl-brk{position:absolute;display:block;color:var(--ink);z-index:1}
.rl-zin{position:absolute;line-height:0;outline:1px solid var(--hair);outline-offset:0}

/* min size: the ladder on one long sheet, then the print minimum on a short sheet beside its note */
.rl-ms{margin:0}
.rl-ms__sh{padding:56px 24px 36px;--xi:3px}
.rl-lad{display:flex;align-items:flex-end;justify-content:space-between}
.rl-st{display:flex;flex-direction:column;align-items:flex-start}
.rl-st__w{margin-top:10px;font-size:13px;line-height:1.3;color:var(--quiet)}
.rl-st.is-min .rl-st__w{color:var(--ink)}
.rl-st__w b{font-weight:600}
.rl-rl{display:block;margin-top:8px;color:var(--ink)}
.rl-msb{display:grid;grid-template-columns:288px minmax(0,1fr);gap:36px;margin-top:48px;align-items:start}
.rl-mp{margin:0}
.rl-mp__sh{height:216px;display:flex;align-items:center;justify-content:center;--xi:3px}
.rl-msn{padding-top:4px}
.rl-msn .rl-use{margin-top:0;font-size:14px}

/* grounds: the bare paper large at the left with the photo beneath, the solids stacked at the right, captions under each sheet */
.rl-body--gr{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}
.rl-gl{display:grid;gap:24px}
.rl-gr{display:grid;gap:16px}
.rl-gc{margin:0;min-width:0}
.rl-gc__sh{display:flex;aspect-ratio:16 / 10;padding:16px;--xi:2px}
.rl-gc--paper .rl-gc__sh{--xi:4px}
.rl-gc__solid{flex:1;min-width:0;display:flex;align-items:center;justify-content:center}
.rl-gc .rl-cap{margin-top:8px}
.rl-gc__h{font-family:var(--body);font-size:13px;line-height:1.4;color:var(--ink)}
.rl-gc__h b{font-weight:600}
.rl-gc .rl-job{margin-top:2px}
.rl-gp{margin:0}
.rl-gp__ph{position:relative;height:300px;overflow:hidden;background:var(--dark)}
.rl-fillimg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;display:block}
.rl-gp__ph .photo-slot{position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;background:var(--dark);color:var(--dark-ink)}
.rl-onph{position:absolute;left:20px;bottom:20px;line-height:0}

/* misuse: the press faults large, the first largest; the file faults imposed on one waste sheet with crop marks */
.rl-mp3{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start}
.rl-mcol{display:grid;gap:16px}
.rl-m{margin:0;min-width:0}
.rl-m__sh{padding:10px;--xi:2px}
.rl-m__pr{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;height:72px}
.rl-m--big .rl-m__pr{height:220px}
/* off register: the inset is wider than the shift, so the shifted Blush crosses stay on the sheet instead of falling past its edge */
.rl-m--big .rl-m__sh{--xi:26px}
.rl-reg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2}
.rl-reg path,.rl-reg circle{stroke-width:1.5}
.rl-mfile{margin-top:24px}
.rl-off{position:relative;line-height:0}
.rl-off__b{position:absolute;left:0;top:0}
.rl-tint{position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.rl-scr{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.rl-tint__l{position:relative;line-height:0}
.rl-ws{padding:24px 32px 20px;--xi:2px}
/* a row of pieces: the trims share a foot line, the captions start together under it */
.rl-ws__r{display:grid;grid-auto-flow:column;grid-template-rows:auto auto;justify-content:space-between;gap:10px 32px}
.rl-ws__r--3{grid-template-columns:216px 152px 152px}
.rl-ws__r--2{grid-template-columns:312px 200px}
.rl-ws__r+.rl-ws__r{margin-top:20px}
.rl-pc{display:contents}
.rl-pc__tr{position:relative;align-self:end;justify-self:start;width:100%}
.rl-pc__pr{position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.rl-pc--st .rl-pc__tr{height:68px}
.rl-pc--ro .rl-pc__tr{width:96px;height:96px}
.rl-pc--fx .rl-pc__tr{height:80px}
.rl-pc--bu .rl-pc__tr{height:112px}
.rl-pc--bx .rl-pc__tr{height:88px}
.rl-pc__c{font-family:var(--body);font-size:12px;line-height:1.45;color:var(--quiet)}
.rl-pc__c b{font-weight:600;color:var(--ink)}
.rl-cm{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
.rl-cm i{position:absolute;display:block;background:var(--ink)}
.rl-cm--tl-h,.rl-cm--tr-h,.rl-cm--bl-h,.rl-cm--br-h{width:8px;height:1px}
.rl-cm--tl-v,.rl-cm--tr-v,.rl-cm--bl-v,.rl-cm--br-v{width:1px;height:8px}
.rl-cm--tl-h{left:-12px;top:0}.rl-cm--tl-v{left:0;top:-12px}
.rl-cm--tr-h{right:-12px;top:0}.rl-cm--tr-v{right:0;top:-12px}
.rl-cm--bl-h{left:-12px;bottom:0}.rl-cm--bl-v{left:0;bottom:-12px}
.rl-cm--br-h{right:-12px;bottom:0}.rl-cm--br-v{right:0;bottom:-12px}
.rl-busy{position:absolute;left:0;top:0;width:100%;height:100%;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(6,1fr)}
.rl-busy i{display:block}
.rl-onbusy{position:relative;line-height:0}
.rl-onbusy--slot{background:var(--ground)}
.rl-boxed{border:1px solid var(--ink);padding:12px;line-height:0}
`;
};
