// Styles for theme 08's brand book site (bookCss: the engine shell classes bk-*, and the Riso book classes rb-) and for the brand kit
// pages (cssBook, scoped under .pg: appended to css() in index.js; the kit styles come from css-bookkit.js, another lane's file).
// The riso press as a site: the page is Wall (the drum room, an Ink ground, in dark); every figure is a sheet of the paper, Wall in
// both editions, with crosses at its corners. A sheet resets the --bk-* roles to the light ones, so anything on it reads as print.
// Familjen Grotesk is the chrome, as on the gate pages. Roles only; spacing on a 4 px base. Elevation is none: hairlines only.
import { cssBookKit } from './css-bookkit.js';
import { drums, drumNo } from './guidelines-r.js';
import { cssStr } from '../../engine/escape.js';

const vars = (r) => `--bk-ground:${r.surface};--bk-raised:${r.raised};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const bw = B.ui.border, plate = (B.colours.find((c) => c.role === 'accent') || {}).hex || L.action;
  const chrome = (ctx.theme && ctx.theme.chrome && ctx.theme.chrome.family) || 'Familjen Grotesk';
  // a separation of the logo: only the paths in that drum's ink print
  const only = drums(ctx).map((c) => `.rb-only--${drumNo(ctx, c)} svg path:not([fill="${c.hex}" i]){fill:none}`).join('\n');
  return `:root,.bk--board{${vars(L)}--rb-plate:${plate};
--chrome:'${cssStr(chrome)}',sans-serif;--display:'${cssStr(d.family)}',serif;--body:'${cssStr(b.family)}',sans-serif;--mono:'${cssStr(m.family)}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
.bk{font-family:var(--chrome);font-size:14px;line-height:1.5;color:var(--bk-ink);background:var(--bk-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh;position:relative;isolation:isolate}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0;font-weight:inherit}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .num{font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk ::selection{background:var(--rb-plate);color:${L.text}}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.rb-roles.bk-for-dark{display:none}[data-theme="dark"] .rb-roles.bk-for-dark{display:grid}[data-theme="dark"] .rb-roles.bk-for-light{display:none}

/* the rail: the logo, the sections, the switch */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:40px;padding:40px 28px 28px;border-right:1px solid var(--bk-hair);background:var(--bk-ground)}
.bk-brand{display:block;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font-weight:700;font-size:22px;line-height:1.2}
.bk-menu{display:none}
.bk-nav{flex:1;min-height:0;overflow:auto}
.bk-nav a{display:flex;gap:12px;align-items:center;padding:8px 0;font-weight:500;font-size:16px;line-height:1.3;color:var(--bk-quiet);text-decoration:none;transition:color 120ms ease-out}
.bk-nav .bk-n{width:20px;flex:none;font-size:12px;font-variant-numeric:tabular-nums}
.bk-nav a::after{content:"";width:10px;height:10px;margin-left:auto;background:transparent}
.bk-nav a[aria-current]{color:var(--bk-ink);font-weight:700}
.bk-nav a[aria-current]::after{background:var(--rb-plate)}
@media (hover:hover){.bk-nav a:hover{color:var(--bk-ink)}}
.bk-mode{display:inline-flex;align-self:flex-start;border:${bw}px solid var(--bk-ink)}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);height:36px;padding:0 16px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}
.bk main{min-width:0}
.bk main:focus{outline:none}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:32px 72px;border-top:1px solid var(--bk-hair);font-size:13px;color:var(--bk-quiet)}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;background:var(--bk-ink);color:var(--bk-ground);font:500 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* sections and their furniture */
.rb-sec{padding:112px 72px 96px;border-top:1px solid var(--bk-hair);scroll-margin-top:0}
.rb-sec:first-of-type{border-top:0;padding-top:72px}
.rb-sec>*{max-width:1040px}
.rb-head{margin-bottom:72px}
.rb-h2{font-weight:700;font-size:56px;line-height:1.02;letter-spacing:-0.02em}
.rb-lead{margin-top:16px;max-width:56ch;font-family:var(--body);font-size:18px;line-height:1.55;color:var(--bk-quiet)}
.rb-h3{font-weight:600;font-size:17px;line-height:1.3;color:var(--bk-ink)}
.rb-note{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--bk-quiet);max-width:62ch}
.rb-body{font-family:var(--body);font-size:16px;line-height:1.6;color:var(--bk-ink);max-width:62ch}
.rb-part{margin-top:96px}
.rb-head+.rb-part{margin-top:0}
.rb-part__h{margin-bottom:24px}
.rb-part__h .rb-note{margin-top:4px}

/* the sheet: the paper, a hairline edge, a cross at each corner; light roles inside in both editions */
.rb-sheet{${vars(L)}position:relative;isolation:isolate;background:var(--bk-ground);color:var(--bk-ink);box-shadow:inset 0 0 0 1px var(--bk-hair);--xi:6px}
[data-theme="dark"] .rb-sheet{box-shadow:none}
.rb-xc{position:absolute;line-height:0;z-index:2;pointer-events:none}
.rb-xc svg{display:block}.rb-xc svg *{vector-effect:non-scaling-stroke}
.rb-xc--tl{left:var(--xi);top:var(--xi)}.rb-xc--tr{right:var(--xi);top:var(--xi)}.rb-xc--bl{left:var(--xi);bottom:var(--xi)}.rb-xc--br{right:var(--xi);bottom:var(--xi)}
.rb-sw{display:inline-block;width:12px;height:12px;flex:none;vertical-align:-1px}
.rb-sw.is-paper,.rb .is-paper,.is-paper{box-shadow:inset 0 0 0 1px ${L.divider}}
.rb-job{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:12px;font-family:var(--body);font-size:13px;line-height:1.5;color:var(--bk-ink);max-width:80ch}
.rb-job__n{font-weight:600}
.rb-job__d{display:inline-flex;align-items:baseline;gap:6px}
.rb-job__k{font-weight:600}
.rb-dm{display:inline-flex;align-items:center;gap:4px;font-size:12px}
.rb-sep__d{display:block;font-size:12px;line-height:1.3;color:var(--bk-quiet)}
.rb-sep__n{display:block;font-weight:600;font-size:14px;line-height:1.3}

/* controls */
.rb-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 16px;border:${bw}px solid var(--bk-ink);border-radius:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.rb-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.rb-btn--copy{height:32px;padding:0;border-color:transparent;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.rb-btn--copy.is-copied{background:transparent;color:var(--bk-ink);text-decoration-style:double}
.rb-btn--primary{height:48px;padding:0 24px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-size:15px;font-weight:600}
@media (hover:hover){.rb-btn:hover{background:var(--bk-panel)}.rb-btn--copy:hover{background:transparent;text-decoration-thickness:2px}.rb-btn--primary:hover{background:var(--bk-action-hover);color:var(--bk-action-ink)}.rb-btn.is-copied:hover{background:var(--bk-ink)}.rb-btn--copy.is-copied:hover{background:transparent}}
.rb-btn:active{transform:scale(0.97)}
.rb-copies{display:flex;flex-wrap:wrap;gap:0 16px;margin-top:4px}
.rb-dls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
.rb-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 10px;border:1px solid var(--bk-edge);font:500 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.rb-dl:hover{background:var(--bk-panel)}}
.rb-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--body);font-style:italic;font-size:13px;line-height:1.5;background:var(--bk-panel);color:var(--bk-quiet-panel)}

/* overview: the cover as separations, the composite largest, its run line in the margin */
.rb-cover{display:grid;grid-template-columns:112px minmax(0,460px) minmax(0,1fr);gap:32px;align-items:stretch}
.rb-seps{display:flex;flex-direction:column;justify-content:space-between;gap:16px}
.rb-sep{margin:0}
.rb-sep figcaption{margin-top:6px}
.rb-cv{position:relative;container-type:inline-size;background:${L.surface};box-shadow:inset 0 0 0 1px ${L.divider}}
[data-theme="dark"] .rb-cv{box-shadow:none}
.rb-cv__in{position:relative;aspect-ratio:500/707;--xi:1.6cqw}
.rb-cv .rb-xc svg{width:5cqw;height:5cqw}
.rb-l{position:absolute;inset:0}
.rb-cv-plate{position:absolute;display:block}
.rb-cv-logo{position:absolute;line-height:0}
.rb-cv-logo svg{display:block;width:100%;height:auto}
.rb-cv-logo .logo-slot{width:100%!important;height:auto!important;aspect-ratio:var(--ar)}
.rb-cv-line{position:absolute;left:8cqw;top:83.2cqw;width:84cqw;font-family:var(--display);font-weight:${d.weights[0]};font-size:8.8cqw;line-height:1.08;letter-spacing:-0.01em;text-wrap:balance}
.rb-cv-t{position:absolute;left:8cqw;top:120cqw;font-weight:700;font-size:5.6cqw;line-height:1.1;letter-spacing:-0.01em}
.rb-cv-v{position:absolute;left:8cqw;top:128cqw;font-size:2.8cqw;line-height:1.4}
.rb-cover__m{align-self:end;display:flex;flex-direction:column;gap:16px}
.rb-cover__o{font-family:var(--display);font-weight:${d.weights[0]};font-style:italic;font-size:30px;line-height:1.2}
.rb-cover__c{font-size:15px;font-weight:600}
.rb-cover__m .rb-job{flex-direction:column;margin-top:0}
@keyframes rb-land{from{opacity:0}}
@media (prefers-reduced-motion:no-preference){.rb-cv--comp .rb-l{animation:rb-land 160ms cubic-bezier(0.23,1,0.32,1) backwards;animation-delay:calc(var(--i) * 160ms)}}
.rb-who{display:grid;grid-template-columns:160px minmax(0,1fr);gap:24px;margin-top:112px}
.rb-who__h{padding-top:8px}
.rb-who__d{font-family:var(--body);font-size:26px;line-height:1.4;max-width:34ch;text-wrap:pretty}
.rb-room{margin-top:72px}
.rb-room .rb-ph{aspect-ratio:21/9;height:auto}
.rb-room .rb-note{margin-top:8px}
.rb-facts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;margin-top:56px;padding-top:24px;border-top:1px solid var(--bk-hair)}
.rb-facts .rb-h3{margin-bottom:8px}
.rb-traits{display:flex;flex-direction:column;gap:32px}
.rb-traits li{margin-left:calc(var(--s) * 18%);max-width:520px;padding-left:16px;border-left:${bw}px solid var(--bk-ink)}
.rb-trait{font-weight:700;font-size:40px;line-height:1.05;letter-spacing:-0.02em;margin-bottom:8px}

/* voice */
.rb-prin{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px 48px}
.rb-prin li{padding-top:16px;border-top:${bw}px solid var(--bk-ink)}
.rb-prin__t{font-weight:600;font-size:15px;line-height:1.35}
.rb-prin__e{margin-top:12px;font-family:var(--display);font-weight:${d.weights[0]};font-size:28px;line-height:1.2;text-wrap:balance}
.rb-lines{display:flex;flex-direction:column;gap:8px}
.rb-lines li{font-family:var(--display);font-weight:${d.weights[0]};font-size:52px;line-height:1.08;letter-spacing:-0.01em}
.rb-lines li+li{font-style:italic;font-size:34px}
.rb-wtn{display:flex;flex-direction:column;gap:24px}
.rb-wtn__r{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,4fr);gap:32px;align-items:center}
.rb-wtn__r.is-r{grid-template-columns:minmax(0,4fr) minmax(0,7fr)}
.rb-wtn__r.is-r .rb-wtn__sh{order:2}
.rb-wtn__r.is-r .rb-wtn__n{text-align:right}
.rb-wtn__sh{padding:28px 32px}
.rb-wtn__k{font-size:12px;font-weight:600;line-height:1.3;color:var(--bk-quiet);margin-bottom:6px}
.rb-wtn__w{font-family:var(--body);font-size:22px;line-height:1.35}
.rb-wtn__b{margin-top:8px;font-family:var(--body);font-size:14px;line-height:1.45}
.rb-wtn__x{font-family:var(--body);font-size:16px;line-height:1.5;color:var(--bk-quiet)}
.rb-part--wtn .rb-job{margin-top:24px}
.rb-part--wtn>.rb-note{margin-top:4px}
.rb-bps{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:48px;margin-top:96px}
.rb-bp{padding-top:16px;border-top:1px solid var(--bk-hair)}
.rb-bp__t{margin-top:16px}
.rb-bp .rb-btn{margin-top:8px}
.rb-name{font-size:18px}

/* logo: the separations at the left, the composite large; the gang sheet; clear space and size; the faults */
.rb-lseps{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.4fr);grid-template-rows:auto auto;gap:24px 32px}
.rb-lsep{grid-column:1}
.rb-lcomp{grid-column:2;grid-row:1/span 2}
.rb-lsep__sh{display:flex;align-items:center;justify-content:center;padding:28px 16px;--xi:4px}
.rb-lsep figcaption{margin-top:8px}
.rb-lay{line-height:0}.rb-lay svg,.rb-lay .logo-slot{display:block;max-width:100%;height:auto}
.rb-lay--pale .logo-slot{color:${L.text}!important}
${only}
.rb-lcomp__sh{display:flex;align-items:center;justify-content:center;aspect-ratio:3/2;padding:40px}
.rb-lcomp__pr svg{display:block;max-width:100%;height:auto}
.rb-lcomp figcaption,.rb-gc figcaption,.rb-clear figcaption,.rb-min figcaption,.rb-mu figcaption{margin-top:12px}
.rb-lcomp figcaption .rb-job,.rb-gc .rb-job{margin-top:4px}
.rb-gang__sh{padding:40px 36px;--xi:8px}
.rb-gang{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:40px 24px;align-items:start}
.rb-gc{grid-column:span 2;min-width:0}
.rb-gc--horizontal{grid-column:span 4}
.rb-gc--symbol,.rb-gc--stacked{grid-column:span 1}
.rb-gd{display:flex;align-items:center;justify-content:center;aspect-ratio:2/1;padding:12px}
.rb-gc--horizontal .rb-gd{aspect-ratio:4/1}
.rb-gc--symbol .rb-gd{aspect-ratio:3/4}
.rb-gc--stacked .rb-gd{aspect-ratio:1/1}
.rb-gd svg,.rb-gd .logo-slot{display:block;max-width:100%;height:auto}
.rb-gc .rb-job{flex-direction:column;gap:2px}
.rb-slotnote{margin-top:24px}
.rb-cm{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:32px;margin-top:96px;align-items:start}
.rb-clear__sh{display:flex;justify-content:center;padding:56px 24px}
.rb-clear__z{position:relative;outline:1px dashed ${L.text};outline-offset:-1px;max-width:100%}
.rb-clear__in{outline:1px solid ${L.divider}}
.rb-clear__in svg,.rb-clear__in .logo-slot{display:block;max-width:100%;height:auto}
.rb-clear__x{position:absolute;font-family:var(--display);font-style:italic;font-weight:${d.weights[0]};font-size:16px;line-height:1;color:${L.text}}
.rb-clear__x--t{left:50%;top:-24px}
.rb-clear__x--l{left:-20px;top:50%}
.rb-min__sh{display:flex;align-items:center;justify-content:center;min-height:200px;padding:32px}
.rb-mus{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
.rb-mu__sh{display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;padding:24px}
.rb-mu__pr svg{display:block;max-width:100%;height:auto}
.rb-no{position:absolute;right:16px;bottom:16px}
.rb-off{position:relative;line-height:0}
.rb-off__b{position:absolute;left:10px;top:6px}
.rb-tint{position:relative;padding:20px}
.rb-scr{position:absolute;inset:0;width:100%;height:100%}
.rb-tint__l{position:relative;line-height:0}
.rb-never{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 48px;margin-top:40px;counter-reset:nv}
.rb-never li{display:flex;gap:12px;font-family:var(--body);font-size:15px;line-height:1.5;padding-top:8px;border-top:1px solid var(--bk-hair)}
.rb-never li::before{counter-increment:nv;content:counter(nv);font-family:var(--chrome);font-weight:600;font-size:13px;width:16px;flex:none;color:var(--bk-quiet);font-variant-numeric:tabular-nums}

/* colour: tint charts, Ink full width, the next drums half; the paper; the tones; the test prints; the roles */
.rb-charts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}
.rb-chart--full{grid-column:1/-1}
.rb-chart__sh{padding:32px;--xi:6px}
.rb-chart__top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:start}
.rb-chart--half .rb-chart__top{grid-template-columns:minmax(0,1fr)}
.rb-solid{appearance:none;display:block;border:0;padding:0;border-radius:0;cursor:pointer;width:calc(var(--f) * 100%);aspect-ratio:3/2}
.rb-solid:focus-visible{outline-offset:4px}
@media (hover:hover){.rb-solid:hover{outline:1px solid ${L.text};outline-offset:4px}}
.rb-cname{font-weight:700;font-size:34px;line-height:1.05;letter-spacing:-0.015em;margin:2px 0 6px}
.rb-lands{margin-top:8px;font-family:var(--body);font-size:14px;line-height:1.5;max-width:44ch}
.rb-vals{margin-top:16px}
.rb-vals div{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:baseline}
.rb-vals dt{font-weight:600;font-size:12px;line-height:1.6;color:var(--bk-quiet)}
.rb-vals dd{font-family:var(--mono);font-size:12px;line-height:1.6;overflow-wrap:anywhere}
.rb-ramp{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px;margin-top:32px}
.rb-chart--half .rb-ramp{grid-template-columns:repeat(5,minmax(0,1fr));row-gap:16px}
.rb-ramp li{min-width:0}
.rb-ramp i{display:block;aspect-ratio:1}
.rb-ramp li.is-base i{outline:${bw}px solid ${L.text};outline-offset:2px}
.rb-ramp__k{display:block;margin-top:8px;font-size:12px;font-weight:600;line-height:1.3}
.rb-ramp__h{display:block;font-family:var(--mono);font-size:11px;line-height:1.4;color:var(--bk-quiet)}
.rb-ramp__n{margin-top:16px}
.rb-paper{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;margin-top:24px;padding:32px;--xi:6px}
.rb-tones{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px}
.rb-tones li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:20px}
.rb-tones i{display:block;aspect-ratio:1}
.rb-tps{display:grid;gap:24px;margin-bottom:24px}
.rb-tps--0{grid-template-columns:minmax(0,1fr)}
.rb-tps--1{grid-template-columns:repeat(2,minmax(0,1fr))}
.rb-tps--2{grid-template-columns:repeat(3,minmax(0,1fr))}
.rb-tp{min-width:0}
.rb-tp__sh{padding:16px;--xi:2px}
.rb-tp__pr{padding:16px 20px}
.rb-tps--0 .rb-tp__pr{padding:28px 32px}
.rb-tp__c{font-family:var(--body);font-size:15px;line-height:1.5;max-width:64ch}
.rb-tps--0 .rb-tp__c{font-size:18px}
.rb-tp__r{margin-top:8px;font-weight:700;font-size:16px;line-height:1.3}
.rb-tp__s{font-weight:400;font-size:13px;color:var(--bk-quiet)}
.rb-never-t{margin-top:16px;padding-top:16px;border-top:1px solid var(--bk-hair)}
.rb-runl{columns:3;column-gap:24px;margin-top:8px;font-family:var(--body);font-size:13px;line-height:1.6;color:var(--bk-quiet)}
.rb-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 24px}
.rb-role{appearance:none;font:inherit;width:100%;display:grid;grid-template-columns:20px minmax(0,1fr);gap:2px 12px;align-items:center;padding:12px 0;border:0;border-top:1px solid var(--bk-hair);border-radius:0;background:transparent;color:var(--bk-ink);text-align:left;cursor:pointer;transition:background-color 120ms ease-out}
.rb-role i{grid-row:1/3;width:20px;height:20px;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.rb-role__n{font-weight:600;font-size:14px;line-height:1.3}
.rb-role__h{font-family:var(--mono);font-size:12px;color:var(--bk-quiet)}
@media (hover:hover){.rb-role:hover{background:var(--bk-raised)}}

/* typography */
.rb-faces{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px}
.rb-word{font-family:var(--display);font-weight:${d.weights[0]};font-size:clamp(88px,10vw,152px);line-height:0.95;white-space:nowrap}
.rb-word--i{font-style:italic;font-size:clamp(56px,6vw,96px);margin:12px 0 24px}
.rb-word--b{font-family:var(--body);font-weight:400;font-size:clamp(72px,8vw,120px);margin-bottom:32px}
.rb-face .rb-note{margin-top:6px}
.rb-al{margin-top:20px;padding-top:12px;border-top:1px solid var(--bk-hair);font-family:var(--body);font-size:16px;line-height:1.5;overflow-wrap:anywhere}
.rb-al--d{font-family:var(--display);font-weight:${d.weights[0]}}
.rb-scale{display:grid;grid-template-columns:120px minmax(0,1fr);gap:32px;align-items:start}
.rb-tseps{display:grid;grid-auto-rows:1fr;gap:20px}
.rb-tsep{display:flex;flex-direction:column;container-type:inline-size}
.rb-tsep__sh{flex:1 0 auto;aspect-ratio:3/4;padding:10cqw 8cqw;--xi:2px}
.rb-tsep figcaption{margin-top:6px}
.rb-tsep__ls{margin-top:6cqw}
.rb-tsep__s{font-size:calc(var(--size) * 0.19);overflow-wrap:anywhere;color:${L.text};margin-bottom:2cqw}
.rb-poster__sh{padding:56px 48px 48px;--xi:10px}
.rb-poster__plate{display:block;height:48px}
.rb-tsep .rb-poster__plate{height:9cqw}
.rb-poster__plate.is-blank{background:transparent}
.rb-pss{margin-top:32px;display:flex;flex-direction:column}
.rb-ps{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:32px;align-items:baseline;padding:14px 0}
.rb-ps+.rb-ps{border-top:1px solid ${L.divider}}
.rb-ps__s{font-size:var(--size);color:${L.text};overflow-wrap:anywhere;max-width:30ch}
.rb-ps__m{padding-left:16px;border-left:1px solid ${L.divider};font-family:var(--body);font-size:12px;line-height:1.5;color:${L.quiet}}
.rb-ps__t{display:block;font-family:var(--mono);font-size:12px;color:${L.text}}
.rb-part--scale>.rb-job{margin-top:16px}
.rb-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px;margin-bottom:24px}
.rb-field{display:flex;flex-direction:column;gap:8px}
.rb-field label{font-size:13px;font-weight:600;color:var(--bk-ink)}
.rb-field output{font-weight:400;color:var(--bk-quiet);margin-left:8px}
.rb-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--bk-edge);border-radius:0;background:var(--bk-ground);color:var(--bk-ink);font:400 16px/1 var(--body)}
.rb-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.rb-proof{padding:48px 40px;--xi:6px}
.rb-tester__d{font-family:var(--display);font-weight:${d.weights[0]};font-size:min(var(--tester-size,64px),12vw);line-height:1.1;min-height:1.1em;overflow-wrap:anywhere}
.rb-tester__b{margin-top:16px;font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),9vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.rb-use{max-width:720px;padding-left:24px;border-left:${bw}px solid var(--bk-ink)}
.rb-use__h{font-family:var(--display);font-weight:${d.weights[0]};font-size:44px;line-height:1.12;margin-bottom:16px}
.rb-use__p{font-family:var(--body);font-size:16px;line-height:1.6;max-width:60ch;margin-bottom:12px}
.rb-use__c{font-family:var(--body);font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.rb-rules li{padding:14px 0;border-top:1px solid var(--bk-hair);display:grid;gap:6px;break-inside:avoid}
.rb-rules--cols{columns:2;column-gap:48px}
.rb-rules p,.rb-irules li p{font-family:var(--body);font-size:15px;line-height:1.5;display:grid;grid-template-columns:56px minmax(0,1fr)}
.rb-dk{font-family:var(--chrome);font-size:13px;font-weight:600;padding-top:1px}
.rb-dont{color:var(--bk-quiet)}

/* imagery: the brief in one drum; the print plan; the good pull beside the waste */
.rb-brief__sh{padding:40px;--xi:6px}
.rb-dir{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px 48px}
.rb-dir dt{font-weight:600;font-size:13px;color:${L.quiet};margin-bottom:6px}
.rb-dir dd{font-family:var(--body);font-size:18px;line-height:1.5}
.rb-plan{padding:40px;--xi:8px}
.rb-shots{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:40px 24px;align-items:start}
.rb-shot{grid-column:span 2;min-width:0}
.rb-shot__f{aspect-ratio:3/4}
.rb-shot__f.is-plated{padding:12px}
.rb-shot--0,.rb-shot--3{grid-column:span 4}.rb-shot--0 .rb-shot__f,.rb-shot--3 .rb-shot__f{aspect-ratio:3/2}
.rb-shot--2 .rb-shot__f{aspect-ratio:1}
.rb-shot--4,.rb-shot--5{grid-column:span 3}.rb-shot--4 .rb-shot__f,.rb-shot--5 .rb-shot__f{aspect-ratio:4/3}
.rb-shot .photo-slot{height:100%}
.rb-shot figcaption{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-top:10px}
.rb-shot__n{font-weight:700;font-size:16px}
.rb-shot__t{font-weight:600;font-size:14px}
.rb-shot__d{display:inline-flex;gap:8px;margin-left:auto}
.rb-shot__cr{flex-basis:100%;font-family:var(--body);font-size:13px;color:${L.quiet}}
.rb-irules__h{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;font-weight:700;font-size:20px;padding-bottom:12px}
.rb-irules li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;padding:14px 0;border-top:1px solid var(--bk-hair)}
.rb-irules li p{grid-template-columns:minmax(0,1fr)}
.rb-irules .rb-dk{display:none}

/* layout */
.rb-lay3{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:56px;align-items:start}
.rb-lay3 .rb-part,.rb-lay3__r .rb-part{margin-top:0}
.rb-lay3__r{display:flex;flex-direction:column;gap:64px}
.rb-pgw{display:grid;grid-template-columns:minmax(0,1fr) 128px;gap:24px;align-items:start}
.rb-pgf__sh{padding:24px;--xi:4px}
.rb-page{display:grid;box-shadow:inset 0 0 0 1px ${L.text}}
.rb-page__g{display:grid}
.rb-page__g i{display:block}
.rb-meas div{padding:10px 0;border-top:1px solid var(--bk-hair)}
.rb-meas div:first-child{border-top:0;padding-top:0}
.rb-meas dt{font-size:12px;font-weight:600;color:var(--bk-quiet)}
.rb-meas dd{font-weight:700;font-size:22px;line-height:1.2}
.rb-space{display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap}
.rb-space li{display:flex;flex-direction:column;gap:6px;align-items:flex-start;font-size:12px;color:var(--bk-quiet)}
.rb-space i{display:block;background:var(--bk-ink)}
.rb-shape{display:flex;gap:24px;flex-wrap:wrap}
.rb-shape li{display:flex;flex-direction:column;gap:8px}
.rb-shape i{display:block;width:120px;height:72px;border:${bw}px solid var(--bk-ink)}

/* applications */
.rb-cards__sh{padding:48px;--xi:8px}
.rb-cards{display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
.rb-card{position:relative;width:340px;max-width:100%;aspect-ratio:90/55;overflow:hidden;flex:none;font-family:var(--body)}
.rb-card--back{background:${L.surface};color:${L.text};box-shadow:inset 0 0 0 1px ${L.divider}}
.rb-card__logo{position:absolute;left:24px;top:50%;transform:translateY(-50%)}
.rb-card__mark{position:absolute;right:24px;top:24px}
.rb-card__who{position:absolute;left:24px;bottom:24px}
.rb-card__nm{font-size:19px;font-weight:500;line-height:1.2}
.rb-card__rl{font-size:13px;color:${L.quiet};margin-top:2px}
.rb-card__ct{font-size:13px;line-height:1.5;margin-top:8px}
.rb-cardf figcaption{display:flex;flex-direction:column}
.rb-cardf .rb-job+.rb-job{margin-top:4px}
.rb-posts{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
.rb-post{position:relative;overflow:hidden;flex:none;padding:20px;height:300px}
.rb-post--sq{width:300px}
.rb-post--pt{width:240px}
.rb-post--st{width:170px;padding:0;display:flex;flex-direction:column;background:${L.surface};color:${L.text};box-shadow:inset 0 0 0 1px ${L.divider}}
.rb-post__l{position:relative;font-family:var(--display);font-weight:${d.weights[0]};font-size:30px;line-height:1.08}
.rb-post__l--i{font-style:italic}
.rb-post--st .rb-post__l{font-size:14px;line-height:1.3;padding:12px}
.rb-post__lg{position:absolute;left:20px;bottom:20px}
.rb-post__ph{flex:1;min-height:0}
.rb-post__ph .photo-slot{height:100%;padding:0;background:${L.sunken}}
.rb-apps2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;margin-top:96px;align-items:start}
.rb-apps2 .rb-part{margin-top:0}
.rb-sign__w{display:inline-flex;flex-direction:column;gap:8px;max-width:100%}
.rb-sign__r{display:flex;gap:12px;align-items:stretch}
.rb-wall{position:relative;width:280px;max-width:100%;aspect-ratio:2/3;padding:24px;background:${L.sunken};color:${L.text}}
.rb-wall__l{font-family:var(--display);font-weight:${d.weights[0]};font-size:36px;line-height:1.08}
.rb-wall__lg{position:absolute;left:24px;bottom:24px}
.rb-dim{position:relative;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--bk-quiet)}
.rb-dim::before{content:"";position:absolute;background:var(--bk-quiet)}
.rb-dim span{position:relative;padding:0 8px;background:var(--bk-ground)}
.rb-dim--w{height:16px;width:280px;max-width:100%;border-left:1px solid var(--bk-quiet);border-right:1px solid var(--bk-quiet)}
.rb-dim--w::before{left:0;right:0;top:50%;height:1px}
.rb-dim--h{width:16px;border-top:1px solid var(--bk-quiet);border-bottom:1px solid var(--bk-quiet)}
.rb-dim--h::before{top:0;bottom:0;left:50%;width:1px}
.rb-dim--h span{writing-mode:vertical-rl;padding:8px 0}
.rb-sign .rb-note{margin-top:12px}
.rb-email{width:min(100%,480px);padding:24px;background:${L.surface};color:${L.text};box-shadow:inset 0 0 0 1px ${L.divider};font-family:var(--body)}
.rb-email__n{font-size:16px;font-weight:500}
.rb-email__r{font-size:14px;color:${L.quiet}}
.rb-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.rb-email__l{margin-top:20px;padding-top:16px;border-top:1px solid ${L.divider}}
.rb-device{width:min(100%,390px);border:${bw}px solid var(--bk-ink);overflow:hidden}
.rb-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.rb-scr__top{display:flex;justify-content:space-between;align-items:center}
.rb-scr__time{font-size:13px;font-weight:500}
.rb-scr__eta{margin:0;font-size:30px;line-height:1.1;font-weight:${d.weights[0]}}
.rb-scr__note{margin:0;font-size:13px;color:var(--text-soft)}
.rb-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}

/* downloads: the run sheet */
.rb-run{padding:48px;--xi:8px}
.rb-run__h{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding-bottom:20px;border-bottom:${bw}px solid ${L.text}}
.rb-run__t{font-weight:700;font-size:32px;line-height:1.1;letter-spacing:-0.015em}
.rb-job-g{display:grid;grid-template-columns:220px minmax(0,1fr);gap:32px;padding:28px 0;border-bottom:1px solid ${L.divider}}
.rb-job-g:last-child{border-bottom:0;padding-bottom:0}
.rb-job-g__n{font-size:12px;font-weight:600;color:${L.quiet}}
.rb-job-g__h .rb-note{margin-top:4px}
.rb-rl{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto;gap:8px 20px;align-items:center;padding:10px 0;border-top:1px solid ${L.divider}}
.rb-rl:first-child{border-top:0;padding-top:0}
.rb-rl__f{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere}
.rb-rl__f--v{display:flex;align-items:center;gap:12px;font-family:var(--chrome);font-size:14px;font-weight:600}
.rb-rl__dr{display:inline-flex;gap:8px;font-weight:400}
.rb-rl__m{font-family:var(--body);font-size:13px;color:${L.quiet}}
.rb-rl--logo{grid-template-columns:minmax(0,1fr) auto}
.rb-rl--logo .rb-dls{margin-top:0}
.rb-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:8px}
.rb-pngs__k{font-size:12px;color:${L.quiet}}
.rb-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:4px 0;margin-bottom:16px}
.rb-icon{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;font-family:var(--body);font-size:12px;text-decoration:none;color:${L.text};transition:background-color 120ms ease-out}
@media (hover:hover){.rb-icon:hover{background:${L.raised}}}
.rb-colo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;margin-top:64px;align-items:end}
.rb-colo .rb-body{margin-top:8px}
.rb-zip{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.rb-zip__n{font-family:var(--mono);font-size:14px}
.rb-zip .rb-btn{margin-top:12px}

/* medium: the rail narrows */
@media (max-width:1100px){
.bk{grid-template-columns:200px minmax(0,1fr)}
.bk-top{padding:32px 20px 24px}
.rb-sec{padding:96px 40px 72px}
.bk-foot{padding:32px 40px}
.rb-cover{grid-template-columns:96px minmax(0,1fr)}
.rb-cover__m{grid-column:1/-1}
.rb-lay3,.rb-apps2{grid-template-columns:minmax(0,1fr)}
}

/* narrow: a top bar and a menu; one column, separations stacked above their composite */
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;gap:12px;padding:8px 16px;min-height:60px;border-right:0;border-bottom:1px solid var(--bk-hair)}
.bk-brand{flex:1;width:auto}.bk-brand svg{width:112px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--bk-ink);border-radius:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 16px;background:var(--bk-ground);border-bottom:1px solid var(--bk-hair);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{min-height:44px;font-size:18px}
.rb-sec{padding:56px 20px 56px;scroll-margin-top:60px}
.rb-sec:first-of-type{padding-top:32px}
.rb-sec>*{max-width:none}
.rb-head{margin-bottom:40px}
.rb-h2{font-size:40px}
.rb-lead{font-size:17px}
.rb-part{margin-top:64px}
.bk-foot{padding:24px 20px;flex-direction:column}
.rb-cover{grid-template-columns:minmax(0,1fr);gap:20px}
.rb-seps{flex-direction:row;gap:12px}
.rb-sep{flex:1;min-width:0}
.rb-cover__o{font-size:24px}
.rb-who{grid-template-columns:minmax(0,1fr);gap:8px;margin-top:64px}
.rb-who__d{font-size:21px}
.rb-room{margin-top:40px}
.rb-room .rb-ph{aspect-ratio:4/3}
.rb-facts,.rb-prin,.rb-bps,.rb-never,.rb-tones,.rb-faces,.rb-dir,.rb-paper,.rb-chart__top,.rb-colo{grid-template-columns:minmax(0,1fr);gap:28px}
.rb-traits li{margin-left:calc(var(--s) * 8%)}
.rb-trait{font-size:30px}
.rb-lines li{font-size:36px}.rb-lines li+li{font-size:26px}
.rb-prin__e{font-size:24px}
.rb-wtn__r,.rb-wtn__r.is-r{grid-template-columns:minmax(0,1fr);gap:12px}
.rb-wtn__r.is-r .rb-wtn__sh{order:0}
.rb-wtn__r.is-r .rb-wtn__n{text-align:left}
.rb-wtn__sh{padding:24px 20px}
.rb-wtn__w{font-size:19px}
.rb-bps{margin-top:64px}
.rb-lseps{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.rb-lsep{grid-column:auto}
.rb-lcomp{grid-column:1/-1;grid-row:auto}
.rb-lcomp__sh{padding:24px}
.rb-gang__sh,.rb-plan,.rb-run,.rb-brief__sh,.rb-cards__sh,.rb-chart__sh,.rb-paper,.rb-proof{padding:24px 16px}
.rb-gang{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 16px}
.rb-gc,.rb-gc--horizontal{grid-column:1/-1}
.rb-gc--symbol,.rb-gc--stacked{grid-column:span 1}
.rb-cm{grid-template-columns:minmax(0,1fr);margin-top:64px}
.rb-clear__sh{padding:40px 24px}
.rb-mus{grid-template-columns:minmax(0,1fr)}
.rb-charts{grid-template-columns:minmax(0,1fr)}
.rb-ramp{grid-template-columns:repeat(5,minmax(0,1fr));row-gap:16px}
.rb-copies{gap:0 20px}
.rb-copies .rb-btn{height:44px}
.rb-tps--1,.rb-tps--2{grid-template-columns:minmax(0,1fr)}
.rb-runl{columns:1}
.rb-roles{grid-template-columns:minmax(0,1fr)}
.rb-role{min-height:44px}
.rb-word{font-size:88px}.rb-word--i{font-size:56px}.rb-word--b{font-size:72px}
.rb-scale{grid-template-columns:minmax(0,1fr);gap:20px}
.rb-tseps{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:auto;gap:16px}
.rb-poster__sh{padding:36px 20px 24px}
.rb-ps{grid-template-columns:minmax(0,1fr);gap:6px}
.rb-ps__s{font-size:min(var(--size),11vw)}
.rb-ps__m{padding-left:0;border-left:0}
.rb-tester__c{grid-template-columns:minmax(0,1fr)}
.rb-use__h{font-size:32px}
.rb-rules--cols{columns:1}
.rb-shots{grid-template-columns:minmax(0,1fr);gap:28px}
.rb-shot,.rb-shot--0,.rb-shot--3,.rb-shot--4,.rb-shot--5{grid-column:auto}
.rb-shot .rb-shot__f{aspect-ratio:4/3}
.rb-irules__h{display:none}
.rb-irules li{grid-template-columns:minmax(0,1fr);gap:6px}
.rb-irules li p{grid-template-columns:56px minmax(0,1fr)}
.rb-irules .rb-dk{display:block}
.rb-pgw{grid-template-columns:minmax(0,1fr)}
.rb-meas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
.rb-meas div,.rb-meas div:first-child{border-top:1px solid var(--bk-hair);padding:8px 0 0}
.rb-cards{flex-direction:column;align-items:center}
.rb-card{width:100%}
.rb-posts{gap:12px}
.rb-post--sq{width:100%;height:auto;aspect-ratio:1}
.rb-post--pt{width:calc(55% - 6px);height:260px}
.rb-post--st{width:calc(45% - 6px);height:260px}
.rb-post__l{font-size:26px}
.rb-post--pt .rb-post__l{font-size:22px}
.rb-wall{width:240px}.rb-dim--w{width:240px}
.rb-wall__l{font-size:30px}
.rb-run__h{flex-direction:column;gap:4px}
.rb-job-g{grid-template-columns:minmax(0,1fr);gap:16px}
.rb-rl{grid-template-columns:minmax(0,1fr) auto;gap:4px 12px}
.rb-rl__f{grid-column:1;grid-row:1}
.rb-rl__m{grid-column:1;grid-row:2}
.rb-rl .rb-btn{grid-column:2;grid-row:1/3;min-height:44px}
.rb-rl--logo{grid-template-columns:minmax(0,1fr)}
.rb-rl--logo .rb-dls{grid-row:2}
.rb-pngs{margin-left:0}
.rb-dl{min-height:44px}
.rb-icon{min-height:44px}
.rb-btn--primary{width:100%}
.rb-zip{align-items:stretch}
}

@media (prefers-reduced-motion:reduce){.bk *{transition:none!important;animation:none!important}.rb-btn:active{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}

@media print{
:root,[data-theme="dark"]{${vars(L)}}
.bk{display:block}
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.rb-btn,.rb-dls,.rb-dl,.rb-copies,.rb-tester__c,.rb-icons,.rb-zip,.rb-rls,.bk-foot .bk-n{display:none!important}
.rb-sec{padding:0 0 24px;border-top:0;break-before:page}
.rb-sec:first-of-type{break-before:auto}
.rb-sec>*{max-width:none}
figure,li,.rb-sheet,.rb-part{break-inside:avoid}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js
export const cssBook = (ctx) => cssBookKit(ctx);
