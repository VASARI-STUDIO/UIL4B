// Styles for theme 02's gate pages (gate.js): cover, palette, colour-values, contrast. Classes start tk-.
// Every page stands on Stock (the light surface) and prints in Night. Colours come from the brand roles; no hex is written here.
import { cssStr, cssNum } from '../../engine/escape.js';
export function cssGate(ctx, meta) {
  const L = ctx.roles.light, B = ctx.brand, d = B.fonts.display;
  return `
.pg.tk{--ground:${L.surface};--ink:${L.text};--soft:${L.textSoft};--quiet:${L.quiet};--hair:${L.divider};--edge:${L.border};
  --cond:'${cssStr(meta.chrome.family)}',sans-serif;--chrome:'${cssStr(B.fonts.body.family)}',sans-serif;--display:'${cssStr(d.family)}',sans-serif;
  background:var(--ground);color:var(--ink);display:flex;flex-direction:column;padding:36px var(--m) 40px;gap:20px}
.pg.tk .disp{font-family:var(--display);font-weight:${cssNum(d.weights[0])};font-stretch:${cssNum(d.stretch || 100)}%;letter-spacing:-0.015em;line-height:0.9}
/* chrome heads: the condensed face is tight at 26 px, so it is set at 34 px with a little tracking; the expanded face stays for names */
.tk-hd{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--cond);font-weight:700;font-size:34px;line-height:36px;letter-spacing:0.03em}
.tk-sn{font-family:var(--cond);font-weight:700;font-size:20px;line-height:22px;letter-spacing:0.02em;font-variant-numeric:tabular-nums}
.tk-mono,.tk-ff dd.tk-mono{font-family:'${cssStr(B.fonts.mono.family)}',monospace;font-size:13px;line-height:18px;white-space:pre}
.tk-lead{font-size:15px;line-height:1.5;color:var(--soft);max-width:68ch}
.tk-h3{font-family:var(--cond);font-weight:700;font-size:26px;line-height:28px;letter-spacing:0.03em;margin-bottom:8px}
.tk-edge{box-shadow:inset 0 0 0 1px var(--hair)}
/* the slot label takes the condensed face (700 is the weight the engine asks of the chrome) at the size of the stub serials, as the engine's
   13 px reads too small in a face this narrow; placeholders take the body face through --chrome */
.pg.tk .logo-slot{font-family:var(--cond)!important;font-size:22px!important;letter-spacing:0.03em}
/* the condensed face is Anybody at its pinned width; everything set in --cond asks for that stretch (the expanded .disp asks for its own) */
.tk-hd,.tk-sn,.tk-h3,.pg.tk .logo-slot,.tk-cv__stubname,.tk-ff--stub dd,.tk-vt,.tk-ct__names{font-stretch:${meta.chrome.stretch}%}

/* the perforation: drawn holes on the left edge of the ticket it opens */
.tk-perf{position:absolute;left:calc(var(--d) / -2);top:0;height:100%;overflow:visible}
.tk-perf--h{left:0;top:calc(var(--d) / -2);width:100%;height:auto}
.tk-perf--edge-r{left:auto;right:calc(var(--d) / -2)}
.tk-perf--edge-l{left:calc(var(--d) / -2)}

/* fact fields: label over value */
.tk-ff{display:flex;gap:0 40px;margin:0}
.tk-ff div{display:flex;flex-direction:column;gap:2px;min-width:0}
.tk-ff dt{font-size:13px;line-height:16px;font-weight:500}
.tk-ff dd{margin:0;font-size:20px;line-height:24px;font-weight:600}

/* cover: one hard ticket, the stub torn off and resting 12 px lower, turned 2 degrees */
.pg.tk--cover{justify-content:center;padding:0 var(--m)}
.tk-cv{display:flex;gap:12px;align-items:flex-start}
.tk-cv__body,.tk-cv__stub{position:relative;overflow:hidden;flex:none;display:flex;flex-direction:column;border-radius:${B.ui.radius.card}px}
.tk-cv__body{justify-content:space-between;padding:32px 48px 36px 44px;border-top-right-radius:0;border-bottom-right-radius:0}
.tk-cv__stub{padding:32px 32px 36px 36px;justify-content:space-between;border-top-left-radius:0;border-bottom-left-radius:0;transform:translateY(12px) rotate(2deg);transform-origin:0 0}
.tk-cv__top{display:flex;justify-content:space-between}
.tk-cv__mid{display:flex;flex-direction:column;gap:20px}
.tk-cv__logo{margin-left:-4px}
.tk-cv__slot{margin-bottom:4px}
.tk-cv__name{font-size:132px;white-space:nowrap;margin-left:-6px}
.tk-cv__line{font-size:28px;line-height:32px;font-weight:600}
.tk-ff--cover{gap:0 48px}
.tk-cv__stubname{font-family:var(--cond);font-weight:700;font-size:64px;line-height:0.95}
.tk-ff--stub{flex-direction:column;gap:14px}
.tk-ff--stub dd{font-family:var(--cond);font-weight:700;font-size:26px;line-height:28px}

/* palette: rolls that come in off the left edge and unwind across the page */
.tk-rolls{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;margin-left:calc(-1 * var(--m))}
.tk-roll{display:flex;flex:none}
.tk-roll.tk-edge{box-shadow:inset 0 1px 0 var(--hair),inset 0 -1px 0 var(--hair),inset -1px 0 0 var(--hair)}
.tk-pt{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:14px 18px 12px}
.tk-pt--face{padding-left:calc(var(--m) + 4px)}
.tk-roll--sm .tk-pt--face{flex:0 0 auto!important;flex-direction:row;align-items:center;gap:28px;justify-content:flex-start}
.tk-roll--sm .tk-pt--text{flex:0 1 300px}
.tk-roll--sm .tk-pt:last-child{flex:1 0 96px}
.tk-roll--sm .tk-pt__sn{margin-left:auto}
.tk-pn{white-space:nowrap}
.tk-pl{font-size:15px;line-height:1.45;max-width:46ch}
.tk-roll--sm .tk-pl{flex:1;min-width:0}
.tk-pr{font-weight:600}
.tk-ps{font-size:15px;line-height:1.4;font-weight:600}
.tk-roll--big .tk-pt__sn{align-self:flex-end;margin-top:auto}
.tk-roll--sm .tk-pt:not(.tk-pt--face){flex-direction:row;align-items:center;gap:16px}
.tk-roll--sm .tk-pt:not(.tk-pt--face) .tk-pt__sn{flex:none}
/* slot edition: rolls as tall as their descriptor boxes, the spare height by share; copy tickets wider so the boxes wrap less */
.tk-rolls--slot{justify-content:flex-start;gap:12px}
.tk-rolls--slot .tk-roll--sm .tk-pt--text{flex:0 1 400px}
.tk-rolls--slot .tk-roll--big .tk-pt--text{flex:2 1 0}

/* colour values: four runs of ten tickets, the base step wide at its place in the run */
.tk-runs{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px}
.tk-run{flex:1;min-height:0;display:flex}
.tk-vt{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:10px 8px 10px 10px;font-family:var(--cond);font-weight:700}
.tk-vt__k{font-size:22px;line-height:24px;letter-spacing:0.02em;white-space:nowrap}
.tk-vt--base{flex:0 0 500px;padding:12px 16px 12px 18px;font-family:var(--body);font-weight:400;font-stretch:100%}
.tk-vt__hd{display:flex;justify-content:space-between;align-items:baseline}
.tk-vn{font-size:30px;white-space:nowrap}
.tk-ff--vals{gap:0 22px}
.tk-ff--vals dt{font-size:12px}
.tk-ff--vals dd{font-weight:400}
.tk-run--flat{align-items:center;gap:24px;padding:0 18px}
.tk-vbot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:start}
.tk-tones{display:flex;gap:28px}
.tk-tones li,.tk-nu li{display:flex;gap:10px;align-items:center}
.tk-tones b{display:block;font-size:14px;line-height:18px;font-weight:600}
.tk-sw{flex:none;width:24px;height:24px;border-radius:${B.ui.radius.control}px;display:grid;place-items:center}
.tk-sw i{display:block;width:12px;height:12px;border-radius:1px}

/* contrast: one ticket per pair in its own colours, three runs that step down in scale */
.tk-ctrows{display:flex;flex-direction:column;gap:12px}
.tk-cts{display:flex;gap:12px}
.tk-ct{display:flex;min-width:0;border-radius:${B.ui.radius.card}px;overflow:hidden}
.tk-ct__body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:12px 14px 10px 16px}
.tk-ct__use{font-size:15px;line-height:1.35;font-weight:600}
.tk-ct--lead .tk-ct__use{font-size:17px}
.tk-price{margin:0}
.tk-price dt{font-size:13px;line-height:16px;font-weight:500}
.tk-price dd{margin:0;white-space:nowrap;line-height:1}
.tk-ct__stub{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:12px 12px 10px 14px;min-width:0}
.tk-ct__names{font-family:var(--cond);font-weight:700;font-size:20px;line-height:22px;letter-spacing:0.02em}
.tk-cbot{display:grid;grid-template-columns:420px minmax(0,1fr);gap:48px;align-items:start}
.tk-cbot .tk-lead{font-size:14px}
.tk-nu ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 32px}
.tk-nu li span:last-child{font-size:13px;line-height:18px}
.tk-nu b{font-weight:600}
`;
}
