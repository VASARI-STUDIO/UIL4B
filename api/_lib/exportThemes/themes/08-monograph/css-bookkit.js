import { cssNum } from '../../engine/escape.js';
// Styles for the brand kit PDF pages (read me, palette sheet, specimen, photography) and the pack boards, theme 08 (Riso).
// Imported by css-book.js: cssBook returns cssBookKit(ctx), so the export name stays. The kit pages are open pages of the paper
// with the gate's running head (css-r.js); every figure is a printed sheet (.r-sheet) with crosses at its corners and a job line.
// Classes start rk-; the gate's r- classes are used, never restyled. Page 794 x 1123, margin 72, spacing on a 4 px base.
// Roles and faces come from the custom properties set in index.js; no hex is written here.
export function cssBookKit(ctx) {
  const d = ctx.brand.fonts.display;
  return `
/* pack boards: the engine's markup (a running head, .pk, an empty .fo) in the guidelines frame */
.pg--std[data-page^="pack-"]{display:flex;flex-direction:column;padding:160px var(--m) 72px}
.pg--std[data-page^="pack-"] .pk{flex:1;min-height:0;columns:2;column-gap:48px;margin-top:0}
.pg--std[data-page^="pack-"] .pk-d h3{font-family:var(--chrome);font-style:normal;font-weight:600;font-size:18px;line-height:1.3;margin-bottom:8px;color:var(--ink)}
.pg--std[data-page^="pack-"] .pk-d h3 span{font-family:var(--chrome);font-style:normal;font-weight:400;font-size:12px;color:var(--quiet)}
.pg--std[data-page^="pack-"] .pk-d li{padding:4px 0}
.pg--std[data-page^="pack-"] .pk-r{margin-top:16px}

/* the kit page: the flow between the margins, under the running head */
.rk-pg .rk-in{position:absolute;left:72px;right:72px;top:96px;bottom:64px;display:flex;flex-direction:column}
.rk-pg .rk-q{color:var(--quiet)}
.rk-pg .rk-fig{margin:0}
.rk-pg .rk-sh{--xi:6px;padding:28px 32px}
.rk-pg .rk-f__l{font-weight:600;font-size:12px;line-height:1.4;color:var(--quiet)}
.rk-pg .rk-f__v{margin-top:2px;font-size:14px;line-height:1.45;color:var(--ink)}
.rk-pg .rk-note{margin-top:8px;max-width:62ch;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}
.rk-pg .rk-sw{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px}

/* the job line under a sheet: the run sheet's small print */
.rk-pg .rk-job{margin-top:8px;max-width:72ch;font-size:13px;line-height:1.45;color:var(--ink)}
.rk-pg .rk-jn{font-weight:600}
.rk-pg .rk-jd b{font-weight:600}

/* read me 1: the kit's name large, the docket sheet, the three steps across the foot */
.rk-pg .rk-h1{font-family:var(--chrome);font-weight:700;font-size:64px;line-height:1;letter-spacing:-0.025em;color:var(--ink);max-width:11ch;text-wrap:balance}
.rk-pg .rk-fs{display:flex;flex-wrap:wrap;gap:12px 48px;margin-top:20px}
.rk-pg .rk-fig--dk{margin-top:32px}
.rk-pg .rk-dk{display:grid;gap:16px}
.rk-pg .rk-dk li{display:grid;grid-template-columns:64px minmax(0,1fr);column-gap:8px}
.rk-pg .rk-dk__n{grid-row:span 2;font-weight:700;font-size:32px;line-height:1;letter-spacing:-0.02em}
.rk-pg .rk-dk__t{font-weight:600;font-size:18px;line-height:1.25;color:var(--ink)}
.rk-pg .rk-dk__d{margin-top:2px;max-width:58ch;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--quiet)}
.rk-pg .rk-how{margin-top:auto;padding-top:20px;border-top:1px solid var(--hair)}
.rk-pg .rk-how ol{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.rk-pg .rk-how__n{display:block;font-weight:700;font-size:20px;line-height:1.2;color:var(--ink)}
.rk-pg .rk-how__a{margin-top:4px;font-weight:600;font-size:15px;line-height:1.35;color:var(--ink)}
.rk-pg .rk-how__t{margin-top:4px;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}

/* read me 2: the composite sheet (logo and lines) beside the voice, the product and the faces; the colours at the foot */
.rk-pg .rk-r2{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 196px;gap:32px;margin:28px 0 40px;align-items:stretch}
.rk-pg .rk-fig--one{display:flex}
.rk-pg .rk-sh--one{flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:40px;padding:48px 44px 44px}
.rk-pg .rk-logo{line-height:0}
.rk-pg .rk-line{font-weight:${cssNum(d.weights[0])};font-size:48px;line-height:1.1;letter-spacing:-0.01em;color:var(--ink);text-wrap:balance}
.rk-pg .rk-lines{margin-top:16px}
.rk-pg .rk-lines li{font-weight:${cssNum(d.weights[0])};font-size:22px;line-height:1.3;color:var(--soft);margin-top:6px;text-wrap:balance}
.rk-pg .rk-side{display:flex;flex-direction:column;gap:20px}
.rk-pg .rk-traits span{display:block}
.rk-pg .rk-faces{display:flex;flex-direction:column;gap:16px;padding-top:16px;border-top:1px solid var(--hair)}
.rk-pg .rk-face{display:flex;flex-direction:column}
.rk-pg .rk-aa{font-size:56px;line-height:1;color:var(--ink)}
.rk-pg .rk-aa--body{font-family:var(--body);font-weight:500}
.rk-pg .rk-face__n{margin-top:6px;font-weight:600;font-size:14px;line-height:1.35;color:var(--ink)}
.rk-pg .rk-face__d{font-size:12px;line-height:1.45;color:var(--quiet)}
.rk-pg .rk-foot{margin-top:auto}
.rk-pg .rk-strip{display:flex;gap:4px}
.rk-pg .rk-strip i{display:block;height:72px;min-width:0}
.rk-pg .rk-names{display:flex;flex-wrap:wrap;gap:6px 28px;margin-top:12px;font-size:14px;line-height:1.4;color:var(--ink)}
.rk-pg .rk-names__n{font-weight:600}

/* palette: the ink order on one sheet: the colour bar down its edge (each colour as tall as its share), the drum bands, the paper */
.rk-pg .rk-fig--pal{margin-top:24px}
.rk-pg .rk-sh--pal{display:grid;grid-template-columns:24px minmax(0,1fr);gap:20px;padding:24px}
.rk-pg .rk-bar{display:flex;flex-direction:column}
.rk-pg .rk-bar i{display:block;min-height:0}
.rk-pg .rk-bands{display:flex;flex-direction:column;gap:4px}
.rk-pg .rk-band{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;padding:16px 20px 18px}
.rk-pg .rk-band__d{font-weight:600;font-size:13px;line-height:1.3}
.rk-pg .rk-band__n{margin-top:2px;font-family:var(--chrome);font-weight:700;font-size:28px;line-height:1.1;letter-spacing:-0.01em;overflow-wrap:anywhere}
.rk-pg .rk-band__l{margin-top:6px;max-width:40ch;font-family:var(--body);font-size:13px;line-height:1.45}
.rk-pg .rk-band__r{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.rk-pg .rk-band__s{font-weight:700;font-size:28px;line-height:1}
.rk-pg .rk-vals div{display:grid;grid-template-columns:48px minmax(0,1fr);align-items:baseline}
.rk-pg .rk-vals dt{font-weight:600;font-size:12px;line-height:1.5}
.rk-pg .rk-vals dd{margin:0;line-height:1.5;white-space:nowrap}
.rk-pg .rk-pp{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;padding:28px 20px 4px;color:var(--ink)}
.rk-pg .rk-pp .r-ps__d{color:var(--quiet)}
.rk-pg .rk-pp .rk-vals{margin-top:12px}
.rk-pg .rk-pp .rk-vals dt{color:var(--quiet)}
.rk-pg .rk-pp__s{font-weight:700;font-size:120px;line-height:0.85;letter-spacing:-0.04em;color:var(--ink)}
.rk-pg .rk-pal-foot{margin-top:auto}
.rk-pg .rk-tones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.rk-pg .rk-tones__n{font-weight:600;font-size:14px;line-height:1.4;color:var(--ink)}
.rk-pg .rk-tones__n .r-mono{font-weight:400}
.rk-pg .rk-tones__l{margin-top:2px;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}

/* typefaces: the display face very large, then the body face beside the sample as a one-drum test print */
.rk-pg .rk-dface{margin-top:20px}
.rk-pg .rk-dface__aa{font-size:168px;line-height:1;letter-spacing:-0.02em;color:var(--ink);white-space:nowrap}
.rk-pg .rk-dface__aa .it{font-style:italic}
.rk-pg .rk-dface__m{display:grid;grid-template-columns:220px minmax(0,1fr);column-gap:32px;margin-top:12px}
.rk-pg .rk-dface__m .rk-al{grid-column:2;grid-row:1 / span 2;margin-top:0}
.rk-pg .rk-face__nn{font-family:var(--chrome);font-weight:700;font-size:24px;line-height:1.15;letter-spacing:-0.01em;color:var(--ink)}
.rk-pg .rk-face__dd{margin-top:6px;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--quiet)}
.rk-pg .rk-al{margin-top:12px;font-size:20px;line-height:1.4;color:var(--ink)}
.rk-pg .rk-al--body{font-family:var(--body);font-size:15px;line-height:1.5}
.rk-pg .rk-trow{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px;margin-top:24px;padding-top:24px;border-top:1px solid var(--hair);align-items:start}
.rk-pg .rk-bface__aa{font-family:var(--body);font-weight:500;font-size:88px;line-height:1;color:var(--ink)}
.rk-pg .rk-bface .rk-face__nn{margin-top:8px}
.rk-pg .rk-sh--spec{padding:24px 24px 28px}
.rk-pg .rk-spec__h{font-size:30px;line-height:1.12;color:var(--ink);text-wrap:balance}
.rk-pg .rk-spec__p{margin-top:12px;font-family:var(--body);font-size:15px;line-height:1.55;color:var(--ink)}
.rk-pg .rk-spec__c{margin-top:10px;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet)}
.rk-pg .rk-mono-rule{margin-top:20px;padding-top:12px;border-top:1px solid var(--hair);font-size:13px;line-height:1.5;color:var(--quiet)}

/* photography 1: the subject large, the other four calls in two columns, do and do not as a two-drum sheet */
.rk-pg .rk-call--lead{margin-top:28px}
.rk-pg .rk-call__big{margin-top:6px;max-width:32ch;font-size:26px;line-height:1.2;letter-spacing:-0.005em;color:var(--ink);text-wrap:pretty}
.rk-pg .rk-calls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 32px;margin-top:28px}
.rk-pg .rk-call__t{margin-top:4px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}
.rk-pg .rk-fig--dd{margin-top:auto;padding-top:28px}
.rk-pg .rk-sh--dd{padding:24px 28px}
.rk-pg .rk-dd__h,.rk-pg .rk-dd li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px}
.rk-pg .rk-dd__h .r-tg__h{margin-bottom:0}
.rk-pg .rk-dd li{margin-top:12px;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink)}

/* photography 2: the frames imposed on one press sheet, one large, then two, then three; each slot marked with its drums */
.rk-pg .rk-fig--shots{margin-top:24px}
.rk-pg .rk-sh--shots{display:flex;flex-direction:column;gap:20px;padding:24px}
.rk-pg .rk-imp{display:grid;gap:16px}
.rk-pg .rk-shot{min-width:0}
.rk-pg .rk-shot__f{display:flex;height:160px}
.rk-pg .rk-imp--0 .rk-shot__f{height:256px}
.rk-pg .rk-imp--1 .rk-shot__f{height:196px}
.rk-pg .rk-shot__f--pl{padding:10px}
.rk-pg .rk-shot__ph{display:flex;flex:1;min-width:0;width:100%;height:100%;object-fit:cover}
.rk-pg .rk-shot__c{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:baseline;margin-top:8px;font-size:13px;line-height:1.4;color:var(--ink)}
.rk-pg .rk-shot__n{font-weight:700}
.rk-pg .rk-shot__d{display:flex;gap:8px;font-size:12px}
.rk-pg .rk-dm{display:inline-flex;align-items:center}
`;
}
