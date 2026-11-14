// Styles for theme 01's brand book site (bookCss, scoped under .bk and the root custom properties) and for the
// brand kit pages: read-me, palette sheet, specimen, photography and the pack boards (cssBook, scoped under .pg).
// Everything reads colours from the brand's roles; no hex is written here.
import { cssBookKit } from './css-bookkit.js';

const vars = (r) => `--bk-ground:${r.surface};--bk-raised:${r.raised};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const rc = B.ui.radius.control, bw = B.ui.border;
  return `:root,.bk--board{${vars(L)}--fix-ground:${L.surface};--fix-ink:${L.text};--fix-soft:${L.textSoft};--fix-quiet:${L.quiet};--fix-hair:${L.divider};
--chrome:'Instrument Sans',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m.family}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
.bk{font-family:var(--chrome);font-size:13px;line-height:1.45;color:var(--bk-ink);background:var(--bk-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh;position:relative}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .disp{font-family:var(--display);font-stretch:${d.stretch || 100}%;font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-0.01em}
.bk .num{font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;border-radius:${rc}px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}

/* shell: the slide navigator. The section list reads as a filmstrip of 16:9 frames; the main column is the deck, slides edge to edge */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:32px;padding:28px 20px;border-right:1px solid var(--bk-hair);background:var(--bk-ground)}
.bk-brand{display:block;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font-family:var(--body);font-weight:600;font-size:20px;line-height:1.2}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-roles.bk-for-dark{display:none}[data-theme="dark"] .bk-roles.bk-for-dark{display:grid}[data-theme="dark"] .bk-roles.bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-height:0;overflow:auto}
.bk-nav ol{display:flex;flex-direction:column;gap:4px}
.bk-nav a{display:flex;gap:12px;align-items:center;padding:6px 8px;margin:0 -8px;border-radius:${rc}px;font-size:13px;font-weight:500;color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
.bk-nav .bk-n{flex:none;display:grid;place-items:center;width:40px;height:23px;border:1px solid var(--bk-edge);border-radius:2px;background:var(--bk-ground);color:var(--bk-ink);font-size:11px;font-weight:500;font-variant-numeric:tabular-nums}
.bk-nav a[aria-current]{background:var(--bk-panel);font-weight:600}
.bk-nav a[aria-current] .bk-n{background:var(--bk-ink);border-color:var(--bk-ink);color:var(--bk-ground)}
@media (hover:hover){.bk-nav a:hover{background:var(--bk-panel)}}
.bk-mode{display:inline-flex;align-self:flex-start;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;overflow:hidden}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}

/* main: the deck. Slides sit edge to edge on the panel, folios count them */
.bk main{min-width:0;background:var(--bk-panel);counter-reset:bk-s}
.bk main:focus{outline:none}
.bk-sec{display:flex;flex-direction:column;gap:12px;padding:0 0 12px;scroll-margin-top:0}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:20px 40px 28px;font-size:12px;color:var(--bk-quiet-panel);background:var(--bk-panel)}

/* a slide: 16:9, a body that holds the idea, a foot that holds the spec */
.bk-slide{box-sizing:border-box;position:relative;container-type:inline-size;counter-increment:bk-s;aspect-ratio:16/9;display:grid;grid-template-rows:minmax(0,1fr) auto;padding:3.4%;background:var(--bk-ground);color:var(--bk-ink)}
.bk-slide::after{content:counter(bk-s,decimal-leading-zero);position:absolute;top:2.4cqw;right:3.4cqw;font:500 12px/1 var(--chrome);font-variant-numeric:tabular-nums;color:var(--bk-quiet)}
.bk-sb{display:flex;flex-direction:column;justify-content:center;gap:1.6cqw;min-width:0}
.bk-sf{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:8px 32px;padding-top:2.4cqw;font-size:13px;line-height:1.45;color:var(--bk-quiet);min-width:0}
.bk-pt{font-family:var(--chrome);font-size:13px;font-weight:600;line-height:1.4;color:var(--bk-ink)}
.bk-slide--c .bk-pt,.bk-slide--title .bk-pt,.bk-slide--ground .bk-pt,.bk-slide--ink .bk-pt{color:inherit}
.bk-slide--title::after,.bk-slide--cover::after,.bk-slide--c::after,.bk-slide--ground::after,.bk-slide--ink::after{color:inherit}
.bk-slide--panel,.bk-slide--not,.bk-slide--tester{background:var(--bk-panel);box-shadow:inset 0 0 0 1px var(--bk-edge)}
.bk-slide--panel::after,.bk-slide--not::after,.bk-slide--tester::after{color:var(--bk-quiet-panel)}
.bk-slide--panel .bk-cap,.bk-slide--panel .bk-sf{color:var(--bk-quiet-panel)}
.bk-slide--panel .bk-pt{color:var(--bk-ink)}
.bk-slide--c .bk-sf,.bk-slide--title .bk-sf,.bk-slide--ground .bk-sf,.bk-slide--ink .bk-sf{color:inherit}
.bk-slide :focus-visible{outline-offset:3px}
.bk-slide--c :focus-visible,.bk-slide--ground :focus-visible,.bk-slide--ink :focus-visible{outline-color:currentColor}
.bk-slide--title :focus-visible{outline-color:var(--bk-ground)}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}

/* type on slides: sizes follow the slide's width, with a floor so a phone still reads */
.bk-giant{font-size:max(36px,9.6cqw);line-height:0.92;text-wrap:balance;overflow-wrap:anywhere}
.bk-hug{font-family:var(--body);font-size:max(28px,5.4cqw);font-weight:600;line-height:1.08;letter-spacing:-0.01em;text-wrap:balance;max-width:20em}
.bk-hug.disp{font-family:var(--display);font-size:max(30px,6.4cqw);line-height:0.98}
.bk-big{font-family:var(--body);font-size:max(18px,2.8cqw);font-weight:500;line-height:1.2;text-wrap:balance}
.bk-say{font-family:var(--body);font-size:max(20px,3cqw);font-weight:500;line-height:1.25;max-width:30em;text-wrap:pretty}
.bk-say+.bk-btn{align-self:flex-start;margin-top:1.6cqw}
.bk-txt{font-family:var(--body);font-size:max(16px,1.9cqw);line-height:1.5;color:var(--bk-soft);max-width:34em}
.bk-st{font-family:var(--display);font-stretch:${d.stretch || 100}%;font-weight:${d.weights[d.weights.length - 1]};letter-spacing:-0.01em;font-size:max(22px,2.6cqw);line-height:1.1;color:inherit;margin:0 0 1.2cqw}
.bk-lead{font-family:var(--body);font-size:max(16px,1.6cqw);line-height:1.55;color:inherit;max-width:44em;text-wrap:pretty}
.bk-cap,.bk .cap{font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-capt{display:block;font-size:12px;line-height:1.5}
.bk-capt b{display:block;font-size:13px;font-weight:600;color:inherit}

/* buttons and links */
.bk-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:36px;padding:0 14px;margin-top:16px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.bk-btn--primary{margin-top:0;height:48px;padding:0 24px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-size:15px;font-weight:600}
.bk-btn--quiet{margin-top:0;min-width:0;border-color:transparent;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
.bk-btn--val{min-width:0;height:auto;margin:0;padding:4px 0;border:0;border-radius:0;background:transparent;color:inherit;font:400 max(14px,1.7cqw)/1.25 var(--mono);text-align:left;white-space:normal;overflow-wrap:anywhere;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:0.25em}
.bk-btn--val.is-copied{background:transparent;color:inherit;text-decoration-style:double}
@media (hover:hover){.bk-btn:hover{background:var(--bk-panel)}.bk-btn--primary:hover{background:var(--bk-action-hover)}.bk-btn.is-copied:hover{background:var(--bk-ink)}.bk-btn.bk-btn--val:hover{background:transparent;text-decoration-thickness:2px}.bk-btn.bk-btn--val.is-copied:hover{background:transparent}}
.bk-btn:active{transform:scale(0.97)}
.bk-btn--val:active{transform:none}
.bk-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 10px;border:1px solid var(--bk-edge);border-radius:${rc}px;font:500 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out,box-shadow 120ms ease-out}
.bk-slide--ground .bk-dl{color:inherit;border-color:currentColor}
@media (hover:hover){.bk-dl:hover{background:var(--bk-panel)}.bk-slide--ground .bk-dl:hover{background:transparent;box-shadow:inset 0 0 0 1px currentColor}}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;border-radius:${rc}px;background:var(--bk-ink);color:var(--bk-ground);font:500 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* photos and slots: the photo fills the slide above a caption strip */
.bk-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--chrome);font-size:12px;line-height:1.5;background:var(--bk-panel);color:var(--bk-quiet-panel)}
.bk-slide--photo .photo-slot{padding:max(16px,2.4cqw);font-size:max(13px,1.2cqw);box-shadow:inset 0 0 0 1px var(--bk-edge)}
[data-theme="dark"] .bk-slide--photo .photo-slot{background:var(--bk-raised)}
.bk-slide--photo{padding:0;background:var(--bk-ground)}
.bk-slide--photo::after{display:none}
.bk-slide--photo .bk-sb{position:relative;display:block;overflow:hidden}
.bk-slide--photo .bk-ph,.bk-slide--photo .photo-slot{position:absolute;inset:0;width:100%;height:100%}
.bk-slide--photo .bk-sf{padding:1.2cqw 2.4cqw;align-items:flex-start;color:var(--bk-quiet)}

/* overview */
.bk-slide--cover .bk-sb{justify-content:space-between}
.bk-capcover{font-size:13px;line-height:1.4}
.bk-cover{font-size:max(40px,10.5cqw);line-height:0.88;text-wrap:balance}
.bk-slide--pair .bk-sb{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6cqw;align-content:center;align-items:start}
.bk-slide--pair .bk-txt{font-size:max(16px,2cqw)}
.bk-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3.4cqw;align-items:start}
.bk-trait{font-size:max(24px,3cqw);line-height:1;margin-bottom:1.6cqw;overflow-wrap:anywhere}
.bk-traits .bk-txt{font-size:max(15px,1.5cqw)}

/* section openers: the title huge on the ink, bottom left */
.bk-slide--title{background:var(--bk-ink);color:var(--bk-ground)}
.bk-slide--title .bk-sb{justify-content:flex-end}
.bk-slide--title .bk-sf{padding-top:2cqw}
.bk-slide--bar{padding:0}
.bk-slide--bar .bk-sb{padding:3.4% 3.4% 3cqw;justify-content:flex-start;gap:2cqw}
.bk-slide--bar .bk-sf{padding:0}

/* voice */
.bk-slide--ink{background:var(--bk-action);color:var(--bk-action-ink)}
.bk-wlist{display:flex;flex-direction:column;gap:1.8cqw}
.bk-wlist .w{font-weight:600;color:var(--bk-ink)}
.bk-wlist .b{margin-top:0.4cqw;color:var(--bk-soft);font-size:max(13px,1.2cqw)}
.bk-wlist .n{color:var(--bk-soft);text-decoration:line-through;text-decoration-thickness:1px}
.bk-slide--rule .bk-sb{gap:3cqw}
.bk-do,.bk-dont{display:grid;grid-template-columns:max(52px,7cqw) minmax(0,1fr);align-items:baseline}
.bk-do b,.bk-dont b{font-family:var(--chrome);font-size:13px;font-weight:600;color:var(--bk-ink)}
.bk-do{color:var(--bk-ink);font-size:max(22px,3.4cqw);font-weight:600}
.bk-dont{color:var(--bk-soft)}

/* logo: each version alone on its own ground */
.bk-slide--logo .bk-sb{align-items:center;justify-content:center}
.bk-lg{width:min(max(120px,var(--lw)),82%)}
.bk-lg>svg,.bk-lg>.logo-slot{display:block;width:100%!important;height:auto!important;aspect-ratio:inherit}
.bk-lg>.logo-slot{font-size:max(13px,1.4cqw)!important}
.bk-slide--construct .bk-sb{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:5cqw;align-items:center}
.bk-clear{--lw:36cqw;width:fit-content;max-width:100%;padding:calc(var(--lw) * var(--pad));background:var(--bk-panel);border:1.5px dashed var(--bk-ink);margin-bottom:1.6cqw;box-sizing:content-box}
.bk-clear__in{width:var(--lw);max-width:100%;background:var(--fix-ground);color:var(--fix-ink)}
.bk-clear__in>svg,.bk-clear__in>.logo-slot{display:block;width:100%!important;height:auto!important;aspect-ratio:inherit}
.bk-min__logo{color:var(--fix-ink);display:inline-flex;padding:24px;border-radius:2px;background:var(--fix-ground);box-shadow:inset 0 0 0 1px var(--fix-hair);margin-bottom:1.2cqw}
.bk-never{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2.6cqw 5cqw;align-content:center}
.bk-never li{font-size:max(17px,2.4cqw);line-height:1.25;padding-top:1.2cqw;border-top:1px solid var(--bk-edge);text-wrap:pretty}

/* colour: a slide per colour, its name huge bottom left, its values along the foot */
.bk-bar{display:flex;width:100%;height:max(220px,24cqw);gap:2px}
.bk-sw{appearance:none;border:0;border-radius:0;padding:max(14px,1.6cqw);flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;text-align:left;font-family:var(--chrome);cursor:pointer}
.bk-sw:focus-visible{outline-offset:3px}
.bk-sw__share{font-size:12px;font-variant-numeric:tabular-nums}
.bk-sw__name{font-size:max(15px,1.7cqw);font-weight:600;line-height:1.2;display:block}
.bk-sw__hex{font-family:var(--mono);font-size:13px;display:block;margin-top:4px}
.bk-slide--c .bk-sb{justify-content:space-between;gap:2cqw}
.bk-slide--c::after{top:max(18px,3cqw)}
.bk-slide--tone{background:var(--fix-ground);color:var(--fix-ink)}
.bk-slide--tone::after{color:var(--fix-quiet)}
.bk-ramp{position:absolute;left:0;right:0;top:0;height:max(10px,1.5cqw);display:flex}
.bk-ramp i{flex:1;display:block}
.bk-ramp .is-base{box-shadow:inset 0 -3px 0 currentColor}
.bk-clands{font-family:var(--body);font-size:max(15px,1.4cqw);line-height:1.5;max-width:34ch;margin-top:max(8px,1.2cqw)}
.bk-cname{overflow-wrap:anywhere}
.bk-vals{display:grid;grid-template-columns:repeat(3,minmax(0,max-content));gap:1.2cqw 5cqw;justify-content:start}
.bk-vals div{display:flex;flex-direction:column;gap:2px;min-width:0}
.bk-vals dt{font-size:12px;font-weight:600}
.bk-vals dd{min-width:0}
.bk-slide--data .bk-sb{justify-content:flex-start;gap:2cqw}
.bk-slide--data .bk-sf{padding-top:2cqw}
.bk-pairs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-auto-rows:1fr;gap:1cqw;flex:1 1 auto;min-height:0}
.bk-pair{display:flex;flex-direction:column;justify-content:flex-end;gap:4px;min-height:11cqw;padding:1.6cqw;border-radius:2px;font-family:var(--body)}
.bk-pair__r{font-family:var(--chrome);font-size:max(20px,3.4cqw);font-weight:500;line-height:1.1;font-variant-numeric:tabular-nums;white-space:nowrap}
.bk-pair__u{font-size:max(13px,1.15cqw);font-weight:500;line-height:1.3}
.bk-pair__n{font-family:var(--chrome);font-size:12px}
.bk-pair.is-large .bk-pair__r,.bk-pair.is-large .bk-pair__u{font-size:max(24px,2.6cqw);line-height:1.15}
.bk-roles{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:1fr;gap:2cqw 1.2cqw;flex:1 1 auto;min-height:0}
.bk-role{appearance:none;width:100%;height:100%;display:flex;flex-direction:column;gap:6px;align-items:stretch;padding:0;border:0;background:transparent;color:var(--bk-ink);font:500 max(13px,1.15cqw)/1.2 var(--chrome);text-align:left;cursor:pointer}
.bk-role__sw{display:block;flex:1 1 auto;min-height:max(48px,6cqw);border-radius:2px;box-shadow:inset 0 0 0 1px var(--bk-edge);transition:box-shadow 120ms ease-out}
.bk-role__h{font-family:var(--mono);font-weight:400;font-size:max(12px,1.05cqw);color:var(--bk-soft)}
@media (hover:hover){.bk-role:hover .bk-role__sw{box-shadow:inset 0 0 0 2px var(--bk-ink)}}

/* typography */
.bk-slide--face .bk-sf{flex-direction:column;align-items:flex-start;gap:0.8cqw}
.bk-face__n{font-weight:500}
.bk-face__al{font-size:max(14px,1.5cqw);line-height:1.45;overflow-wrap:anywhere;color:var(--bk-ink)}
.bk-slide--scale .bk-sf{flex-direction:column;align-items:flex-start;gap:2px}
.bk-scale__s{font-size:min(var(--size),12cqw);margin:0;color:var(--bk-ink);overflow-wrap:anywhere;max-width:100%}
.bk-slide--tester .bk-sb{justify-content:flex-start;gap:1.6cqw}
.bk-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:2.4cqw}
.bk-field{display:flex;flex-direction:column;gap:8px}
.bk-field label{font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-field output{font-weight:400;color:var(--bk-soft);margin-left:8px}
.bk-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-ground);color:var(--bk-ink);font:400 16px/1 var(--body)}
.bk-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.bk-tester__d{margin-top:1cqw;font-size:min(var(--tester-size,64px),15vw);line-height:1.05;min-height:1.05em;overflow-wrap:anywhere}
.bk-tester__b{font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.bk-use__h{font-size:max(30px,5.2cqw);line-height:1.02;text-wrap:balance}
.bk-use__p{font-family:var(--body);font-size:max(16px,1.9cqw);line-height:1.5;color:var(--bk-soft);margin-top:1.6cqw;max-width:42em}

/* layout */
.bk-slide--grid .bk-sb{align-items:center;justify-content:center}
.bk-pagebox{width:min(100%,var(--pw))}
.bk-page{display:grid;background:var(--bk-raised);box-shadow:inset 0 0 0 1px var(--bk-edge);border-radius:2px}
.bk-page__g{display:grid}
.bk-page__g i{display:block;background:var(--bk-panel)}
.bk-meas{display:flex;gap:2cqw 5cqw;flex-wrap:wrap}
.bk-meas div{display:flex;flex-direction:column;gap:2px}
.bk-meas dt{font-size:12px;color:var(--bk-quiet)}.bk-meas dd{font-size:max(20px,2.4cqw);font-weight:600;line-height:1.1;color:var(--bk-ink)}
.bk-space{display:flex;gap:2.4cqw;align-items:flex-end;flex-wrap:wrap}
.bk-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bk-space i{display:block;background:var(--bk-ink)}
.bk-shape{display:flex;gap:4cqw;flex-wrap:wrap}
.bk-shape div{display:flex;flex-direction:column;gap:8px}
.bk-shape i{display:block;width:max(72px,10cqw);height:max(48px,6.6cqw);border:${bw}px solid var(--bk-ink);background:var(--bk-ground)}

/* applications: each piece alone on the panel */
.bk-slide--panel .bk-sb{align-items:center;justify-content:center}
.bk-cards{display:flex;gap:24px;flex-wrap:wrap;justify-content:center}
.bk-card{position:relative;width:360px;max-width:100%;aspect-ratio:90/55;border-radius:3px;overflow:hidden;flex:none}
.bk-card--front{background:${ctx.brand.logo.colourways.reversed.ground};color:${ctx.brand.logo.colourways.reversed.name}}
.bk-card--back{background:var(--fix-ground);color:var(--fix-ink)}
.bk-card__logo{position:absolute;left:28px;top:44%;transform:translateY(-50%)}
.bk-card__line{position:absolute;left:28px;bottom:22px;font-size:12px}
.bk-card__mark{position:absolute;right:24px;top:22px}
.bk-card__who{position:absolute;left:28px;bottom:24px;font-family:var(--body)}
.bk-card__who .nm{font-size:17px;font-weight:600;line-height:1.2}
.bk-card__who .rl{font-size:13px;color:var(--fix-soft);margin-top:2px}
.bk-card__who .ct{font-size:13px;line-height:1.5;margin-top:12px}
.bk-posts{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;justify-content:center}
.bk-post{position:relative;overflow:hidden;border-radius:2px;max-width:100%;flex:none;padding:20px}
.bk-post--sq{width:280px;aspect-ratio:1}
.bk-post--pt{width:224px;aspect-ratio:4/5}
.bk-post--st{width:158px;aspect-ratio:9/16;padding:16px;color:${ctx.brand.logo.colourways.reversed.name}}
.bk-post .disp{position:relative;z-index:1;font-size:30px;line-height:0.98}
.bk-post--pt .disp{font-size:26px}.bk-post--st .disp{font-size:24px}
.bk-post__lg{position:absolute;left:20px;bottom:20px}
.bk-post__ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.bk-post__tint{position:absolute;inset:0}
.bk-sign{width:min(100%,60cqw)}
.bk-sign__crop{overflow:hidden;border-radius:2px;container-type:inline-size;position:relative}
.bk-stage{position:relative;container-type:inline-size;aspect-ratio:1280/853;background:var(--fix-hair)}
.bk-stage__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.bk-poster{--bk-poster-ink:${ctx.roles.light.actionLabel};position:absolute;left:64.45%;top:30.21%;width:23.06%;height:52.38%;clip-path:polygon(0.5% 0%,100% 0.4%,98.7% 100%,0% 99.9%)}
.bk-poster__ink{position:absolute;inset:0;background:${ctx.roles.light.action};mix-blend-mode:multiply}
.bk-poster__glass{position:absolute;inset:0;background-size:100cqw auto;background-position:-64.45cqw -20.14cqw;background-repeat:no-repeat;mix-blend-mode:screen;opacity:0.22}
.bk-poster__in{position:absolute;inset:0;padding:2cqw 1.66cqw 1.83cqw;display:flex;flex-direction:column;justify-content:space-between;color:var(--bk-poster-ink)}
.bk-poster__h{font-size:3.9cqw;line-height:0.95;letter-spacing:-0.015em}
.bk-poster__b{display:flex;flex-direction:column;gap:1.16cqw}
.bk-poster__l{font-family:var(--body);font-weight:500;font-size:1cqw;line-height:1.4}
.bk-poster__logo{width:15.8cqw}
.bk-poster__logo>svg,.bk-poster__logo>.logo-slot{display:block;width:100%!important;height:auto!important;aspect-ratio:inherit}
.bk-sign .cap{margin-top:12px;color:var(--bk-quiet-panel)}
.bk-card,.bk-post{box-shadow:0 0 0 1px var(--bk-edge)}
@media (min-width:1280px){
.bk-cards{zoom:1.25}.bk-posts{zoom:1.3}.bk-email{zoom:1.4}
.bk-device{zoom:.88}
}
.bk-email{width:min(100%,480px);padding:24px;background:var(--fix-ground);color:var(--fix-ink);border-radius:2px;box-shadow:inset 0 0 0 1px var(--fix-hair);font-family:var(--body)}
.bk-email__n{font-size:16px;font-weight:600}
.bk-email__r{font-size:14px;color:var(--fix-soft)}
.bk-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.bk-email__l{margin-top:20px;padding-top:16px;border-top:1px solid var(--fix-hair)}
.bk-device{width:min(100%,390px);border:${bw}px solid var(--bk-ink);border-radius:${ctx.brand.ui.radius.card}px;overflow:hidden;background:var(--bk-ground)}
.bk-screen{padding:20px;display:flex;flex-direction:column;gap:12px}
.bk-scr__top{display:flex;justify-content:space-between;align-items:center}
.bk-scr__time{font-size:13px;font-weight:600}
.bk-scr__eta{margin:0;font-size:32px;line-height:1.05;font-stretch:125%}
.bk-scr__note{margin:0;font-size:13px;color:var(--text-soft)}
.bk-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}

/* downloads: the slide sorter. Each folder is a thumbnail in a contact grid, its files listed under it */
.bk-sorter{counter-reset:bk-t;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:48px 24px;align-items:start;padding:32px 40px 48px;background:var(--bk-panel)}
.bk-fgroup{display:flex;flex-direction:column;gap:8px;min-width:0}
.bk-thumb{box-shadow:inset 0 0 0 1px var(--bk-edge);position:relative;container-type:inline-size;counter-increment:bk-t;aspect-ratio:16/9;display:flex;align-items:flex-end;padding:6%;border-radius:2px;box-sizing:border-box}
.bk-thumb::after{content:counter(bk-t,decimal-leading-zero);position:absolute;top:6%;right:6%;font:500 12px/1 var(--chrome);font-variant-numeric:tabular-nums;color:inherit}
.bk-thumb__n{font-size:max(24px,14cqw);line-height:0.95;text-wrap:balance}
.bk-fgroup>.bk-cap,.bk-files .bk-cap{color:var(--bk-quiet-panel)}
.bk-zip__n{font-family:var(--mono);font-size:13px;overflow-wrap:anywhere}
.bk-fgroup .bk-btn--primary{align-self:flex-start;margin-top:8px}
.bk-files{margin-top:8px}
.bk-files li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:10px 0;border-top:1px solid var(--bk-edge)}
.bk-file__n{grid-column:1;font-family:var(--mono);font-size:12px;overflow-wrap:anywhere}
.bk-files .bk-cap{grid-column:1}
.bk-files li .bk-btn{grid-column:2;grid-row:1/3}
.bk-file--logo{grid-template-columns:minmax(0,1fr)!important}
.bk-file--logo .bk-file__n{font-family:var(--chrome);font-size:13px;font-weight:500}
.bk-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:8px}
.bk-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px;margin-top:8px}
.bk-icon{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px;border:1px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-ground);font-size:12px;text-decoration:none;color:var(--bk-ink);transition:background-color 120ms ease-out}
@media (hover:hover){.bk-icon:hover{background:var(--bk-raised)}}

/* narrow: a top bar and a menu; slides keep their order but grow to hold their content */
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 16px;min-height:60px;border-right:0;border-bottom:1px solid var(--bk-hair)}
.bk-brand{flex:1;width:auto}.bk-brand svg{width:112px}
.bk-name{font-size:18px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--bk-ink);border-radius:${rc}px;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 16px;background:var(--bk-ground);border-bottom:1px solid var(--bk-hair);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{padding:8px;min-height:44px;font-size:15px}
.bk-sec{gap:8px;padding-bottom:8px;scroll-margin-top:60px}
.bk-slide{aspect-ratio:auto;min-height:min(78vw,340px);padding:36px 20px 20px}
.bk-slide--photo{padding:0}
.bk-slide::after{top:12px;right:16px}
.bk-slide--title,.bk-slide--cover{min-height:min(110vw,440px)}
.bk-slide--c{min-height:min(120vw,500px)}
.bk-slide--photo{min-height:0}
.bk-slide--photo .bk-sb{aspect-ratio:4/3}
.bk-slide--photo .bk-sf{padding:12px 16px}
.bk-slide--bar{padding:0}
.bk-slide--bar .bk-sb{padding:36px 20px 20px}
.bk-sf{padding-top:16px}
.bk-sb{gap:12px}
.bk-slide--pair .bk-sb,.bk-traits,.bk-slide--construct .bk-sb{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-never{grid-template-columns:minmax(0,1fr);gap:16px}
.bk-bar{flex-direction:column;height:auto}
.bk-sw{min-height:96px}
.bk-ramp{height:10px}
.bk-slide--c::after{top:22px}
.bk-vals{grid-template-columns:minmax(0,1fr);gap:10px}
.bk-vals div{flex-direction:row;align-items:baseline;gap:12px}
.bk-vals dt{width:52px;flex:none}
.bk-pairs{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.bk-pair{min-height:92px;padding:12px}
.bk-roles{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 8px}
.bk-role{min-height:44px}
.bk-lg{width:var(--lm)}
.bk-clear{--lw:64cqw}
.bk-tester__c{grid-template-columns:minmax(0,1fr)}
.bk-slide--sign .bk-sb,.bk-slide--screen .bk-sb{align-items:stretch}
.bk-sign{width:100%}
.bk-sign__crop{aspect-ratio:1/1.3}
.bk-stage{position:absolute;width:300cqw;left:-177.9cqw;top:-47.8cqw}
.bk-btn,.bk-dl{min-height:44px}
.bk-btn--val{min-height:0}
.bk-dl{min-width:44px}
.bk-btn--primary{width:100%}
.bk-sorter{grid-template-columns:minmax(0,1fr);padding:20px 20px 32px;gap:40px}
.bk-file--logo{gap:8px!important}
.bk-pngs{margin-left:0}
.bk-icon{min-height:44px}
.bk-foot{padding:20px;flex-direction:column}
}


@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk-btn:active{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}

@media print{
:root,[data-theme="dark"]{${vars(L)}}
.bk{display:block}
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.bk-btn:not(.bk-btn--val),.bk-dls,.bk-dl,.bk-tester__c,.bk-sorter,.bk-foot .bk-n{display:none!important}
.bk main{background:var(--bk-ground)}
.bk-sec{padding:0 0 12px;gap:8px;break-before:page}
.bk-sec--overview{break-before:auto}
.bk-slide{break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.bk-crow,.bk-pair,.bk-card,.bk-post,.bk-poster{break-inside:avoid}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js
export function cssBook(ctx) { return cssBookKit(ctx); }
