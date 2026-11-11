import { cssBookKit } from './css-bookkit.js';
import { cssStr, cssNum } from '../../engine/escape.js';
// Styles for theme 10's brand book site (bookCss, scoped under .bk and the root custom properties) and for the
// brand kit pages: read-me, palette sheet, specimen, photography and the pack boards (cssBook, scoped under .pg).
// In use: the product on a phone with numbered notes beside it, Figtree chrome, Chalk ground, one Float panel behind the opening phone.
// Everything reads colours from the brand's roles; no hex is written here. Hairlines, not shadows; pill buttons, 20 px cards.

const vars = (r) => `--bk-ground:${r.surface};--bk-raised:${r.raised};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const rc = B.ui.radius.control, rcard = B.ui.radius.card, bw = B.ui.border;
  const hl = ctx.colours.find((c) => c.role === 'highlight').hex;
  return `:root,.bk--board{${vars(L)}--bk-float:${hl};--fix-ground:${L.surface};--fix-raised:${L.raised};--fix-ink:${L.text};--fix-soft:${L.textSoft};--fix-quiet:${L.quiet};--fix-hair:${L.divider};--fix-action:${L.action};--fix-action-ink:${L.actionLabel};--fix-pool:${L.success.bg};
--chrome:'Figtree',sans-serif;--display:'${cssStr(d.family)}',sans-serif;--body:'${cssStr(b.family)}',sans-serif;--mono:'${cssStr(m.family)}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
.bk{font-family:var(--chrome);font-size:13px;line-height:1.5;color:var(--bk-ink);background:var(--bk-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh;position:relative}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .disp,.bk-disp{font-family:var(--display);font-stretch:${cssNum(d.stretch || 100)}%;font-weight:${cssNum(d.weights[d.weights.length - 1])};letter-spacing:-0.01em}
.bk .num{font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;border-radius:999px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}

/* sidebar at desktop */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:40px;padding:32px 24px;border-right:1px solid var(--bk-hair);background:var(--bk-ground)}
.bk-brand{display:block;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font-family:var(--display);font-weight:700;font-size:24px;line-height:1.2}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-roles.bk-for-dark{display:none}[data-theme="dark"] .bk-roles.bk-for-dark{display:grid}[data-theme="dark"] .bk-roles.bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-height:0;overflow:auto}
.bk-nav ol{display:flex;flex-direction:column;gap:4px}
.bk-nav a{display:flex;gap:12px;align-items:center;padding:6px 12px 6px 8px;margin:0 -8px;border-radius:999px;font-size:14px;font-weight:500;color:var(--bk-soft);text-decoration:none;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-nav .bk-n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;flex:none;background:var(--bk-panel);color:var(--bk-quiet-panel);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.bk-nav a[aria-current]{background:var(--bk-float);color:var(--fix-ink);font-weight:600}
.bk-nav a[aria-current] .bk-n{background:var(--fix-ink);color:var(--fix-ground)}
@media (hover:hover){.bk-nav a:hover{background:var(--bk-panel);color:var(--bk-ink)}.bk-nav a[aria-current]:hover{background:var(--bk-float);color:var(--fix-ink)}}
.bk-mode{display:inline-flex;align-self:flex-start;border:${bw}px solid var(--bk-ink);border-radius:999px;overflow:hidden}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--bk-ink);font:600 13px/1 var(--chrome);height:36px;padding:0 16px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}

/* main: one section number per section, counted here so the markup stays plain */
.bk main{min-width:0;counter-reset:sec}
.bk main:focus{outline:none}
.bk-sec{counter-increment:sec;padding:96px 64px;border-top:1px solid var(--bk-hair);scroll-margin-top:0}
.bk-sec:first-of-type{border-top:0}
.bk-sec>*{max-width:1000px}
.bk-sec--logo,.bk-sec--type,.bk-sec--layout{background:var(--bk-raised)}
.bk-head{display:flex;flex-direction:column;gap:20px;margin-bottom:56px}
.bk-title{display:flex;align-items:center;gap:16px;font-family:var(--chrome);font-size:clamp(32px,3.4vw,44px);font-weight:600;line-height:1.1;letter-spacing:-0.01em;text-wrap:balance}
.bk-mk{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;flex:none;background:var(--bk-ink);color:var(--bk-ground);font:600 16px/1 var(--chrome);font-variant-numeric:tabular-nums;letter-spacing:0}
.bk-mk::before{content:counter(sec)}
.bk-lead{font-family:var(--body);font-size:18px;line-height:1.6;color:var(--bk-soft);max-width:60ch}
.bk-body{font-family:var(--body);font-size:16px;line-height:1.65;color:var(--bk-soft);max-width:62ch}
.bk-measure{max-width:62ch}
.bk-cap,.bk .cap{font-size:12px;line-height:1.6;color:var(--bk-quiet)}
.bk-h3{font-size:14px;font-weight:600;line-height:1.4;color:var(--bk-ink);margin-bottom:12px}
.bk-block{margin-top:72px}
.bk-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:48px;align-items:start}
.bk-two--even{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-stack{display:flex;flex-direction:column;gap:24px}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:32px 64px;border-top:1px solid var(--bk-hair);font-size:12px;color:var(--bk-quiet)}

/* buttons and links: pills */
.bk-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:40px;padding:0 18px;margin-top:16px;border:${bw}px solid var(--bk-ink);border-radius:999px;background:transparent;color:var(--bk-ink);font:600 14px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.bk-btn--primary{margin-top:0;height:48px;padding:0 28px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-size:16px;font-weight:600}
.bk-btn--quiet{margin-top:0;min-width:0;border-color:transparent;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
@media (hover:hover){.bk-btn:hover{background:var(--bk-panel)}.bk-btn--primary:hover{background:var(--bk-action-hover)}.bk-btn.is-copied:hover{background:var(--bk-ink)}}
.bk-btn:active{transform:scale(0.97)}
.bk-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-dl{display:inline-flex;align-items:center;justify-content:center;min-width:48px;height:28px;padding:0 12px;border:1px solid var(--bk-edge);border-radius:999px;font:600 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk-dl:hover{background:var(--bk-panel)}}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;border-radius:999px;background:var(--bk-ink);color:var(--bk-ground);font:600 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* photos and slots */
.bk-pho{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--chrome);font-size:12px;line-height:1.5;background:var(--bk-panel);color:var(--bk-quiet-panel)}
.bk-wide{margin:72px 0 0}
.bk-wide .bk-pho{aspect-ratio:21/9;height:auto;border-radius:${rcard}px}
.bk-wide .cap,.bk-shot .bk-capt{margin-top:8px}
.bk-capt{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-capt b{display:block;font-size:12px;font-weight:600;color:var(--bk-ink)}

/* the phone: the product, in light roles in both modes, with numbered markers on what the notes name */
.bk-phone{position:relative;width:min(100%,360px);aspect-ratio:360/660;display:flex;flex-direction:column;border-radius:28px;overflow:clip;background:var(--fix-ground);box-shadow:0 0 0 1px var(--fix-hair);font-family:var(--body);color:var(--fix-ink)}
.bk-phone__sb{height:44px;flex:none;padding:0 24px;display:flex;align-items:center;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.bk-phone__b{padding:12px 20px 0;display:flex;flex-direction:column;gap:16px}
.bk-phone__t{font-family:var(--display);font-weight:700;font-size:30px;line-height:1.05;letter-spacing:-0.01em}
.bk-phone__t--s{font-size:26px;line-height:1}
.bk-phone__s{margin-top:-10px;font-size:14px;line-height:20px;color:var(--fix-quiet)}
.bk-phone__p{font-size:16px;line-height:24px;color:var(--fix-quiet)}
.bk-phone__ft{margin-top:auto;padding:16px 20px 32px;display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--fix-hair);background:var(--fix-ground)}
.bk-m{display:flex;align-items:center;gap:8px}
.bk-chip{display:inline-flex;align-items:center;align-self:flex-start;font:500 14px/1.3 var(--body);white-space:nowrap}
/* the lane marker in the pool is not a status: it keeps its Float pill */
.bk-chip--float{height:28px;padding:0 11px;border-radius:999px;background:var(--bk-float);color:var(--fix-ink);font-weight:600;line-height:1}
.bk-pool{position:relative;height:200px;border-radius:${rcard}px;background:var(--fix-pool);overflow:hidden}
.bk-pool i{position:absolute;top:10px;bottom:10px;border-left:2px dashed var(--fix-raised)}
.bk-pool .bk-chip{position:absolute;left:40.5%;top:84px}
.bk-teach{display:flex;gap:14px;align-items:center;padding-top:12px;border-top:1px solid var(--fix-hair)}
.bk-teach b{display:block;font-size:16px;font-weight:600}
.bk-teach span:not(.bk-av){font-size:14px;color:var(--fix-quiet)}
.bk-av{width:40px;height:40px;border-radius:50%;background:var(--bk-float);color:var(--fix-ink);display:flex;align-items:center;justify-content:center;font:700 15px/1 var(--body);flex:none}
.bk-pcard{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:16px;border-radius:${rcard}px;background:var(--fix-raised);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-pcard>span:not(.bk-mkr){font-size:14px;line-height:20px;color:var(--fix-quiet)}
.bk-pcard>b{margin-top:4px;margin-bottom:10px;font-size:20px;line-height:22px;white-space:nowrap}
.bk-pcard>.bk-mkr{position:absolute;top:12px;right:12px}
.bk-pcard__l{display:flex;align-items:center;gap:8px}
.bk-m>.bk-phone__p,.bk-m>.bk-phone__t{flex:1;min-width:0}
.bk-mkr.bk-mkr--o{background:transparent;color:var(--bk-ink);box-shadow:inset 0 0 0 1.5px currentColor}
.bk-mkr.bk-flag{width:auto;height:22px;padding:0 9px 0 7px;gap:6px;display:inline-flex;align-items:center;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 2px var(--fix-raised)}
.bk-flag em{font-style:normal;font-weight:500;font-variant-numeric:tabular-nums}
.bk-phone--splash{box-shadow:none}
.bk-splash{flex:1;display:grid;place-items:center;position:relative}
.bk-splash .bk-mkr{position:absolute;left:calc(50% + 100px);top:calc(50% - 40px)}
.bk-hs{padding:24px 20px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px 16px}
.bk-hs__b,.bk-hs__i{display:block;aspect-ratio:1;border-radius:22%;background:var(--fix-raised);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-hs__i{position:relative;display:grid;place-items:center;box-shadow:none}
.bk-hs__i .bk-mkr{position:absolute;top:-8px;right:-8px}
.bk-hdr{flex:none;height:56px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--fix-hair);position:relative}
.bk-hdr svg,.bk-hdr .logo-slot{display:block}
.bk-pbtn{display:flex;align-items:center;justify-content:center;gap:8px;height:44px;border-radius:999px;background:var(--fix-raised);box-shadow:inset 0 0 0 ${bw}px var(--fix-ink);font-size:16px;font-weight:700;white-space:nowrap}
.bk-pbtn--go{background:var(--fix-action);color:var(--fix-action-ink);box-shadow:none}
.bk-days{display:flex;flex-direction:column}
.bk-day{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;height:52px;border-top:1px solid var(--fix-hair)}
.bk-day:last-child{border-bottom:1px solid var(--fix-hair)}
.bk-day>b{font-size:15px;font-weight:700}
.bk-day>i{font-style:normal;font-size:15px;color:var(--fix-quiet)}
.bk-day--ls{height:auto;padding:10px 0}
.bk-ls{background:var(--fix-raised);border-radius:${rcard}px;box-shadow:inset 0 0 0 1px var(--fix-hair);padding:12px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.bk-ls>div b{display:flex;align-items:center;gap:8px;font-size:16px;line-height:22px;font-weight:700}
.bk-ls>div i{display:block;font-style:normal;font-size:14px;line-height:20px;color:var(--fix-quiet);white-space:nowrap}
.bk-mkr{flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--fix-ink);color:var(--fix-ground);font:600 12px/1 var(--chrome);font-variant-numeric:tabular-nums;box-shadow:0 0 0 2px var(--fix-raised)}
.bk-phone>.bk-mkr{position:absolute;top:11px;right:20px}
.bk-mkr--n{width:24px;height:24px;background:var(--bk-ink);color:var(--bk-ground);box-shadow:none}
.bk-notes li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:0;padding:14px 0;border-top:1px solid var(--bk-hair)}
.bk-notes li:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-notes b{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;line-height:1.4}
.bk-notes p{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--bk-soft);margin-top:2px}
.bk-notes__sw{display:block;width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--bk-edge)}
.bk-use__row,.bk-stage{display:grid;grid-template-columns:360px minmax(0,1fr);gap:56px;align-items:start}
.bk-stage{margin-top:72px}
.bk-head+.bk-stage{margin-top:0}
.bk-stage--flip{grid-template-columns:minmax(0,1fr) 360px}
.bk-stage--flip .bk-stage__ph{order:2}
.bk-stage__ph{position:sticky;top:32px}
.bk-legend{margin-top:20px;max-width:46ch}
.bk-use__row .bk-notes{max-width:540px;padding-top:44px}
.bk-sec>.bk-use,.bk-sec>.bk-block.bk-use{max-width:1000px}
.bk-pnote{margin-top:24px;font-size:14px;line-height:1.5;color:var(--fix-ink);max-width:360px}
.bk-pnote b{display:block;font-weight:600}

/* overview: the hero line, and the Float panel holding the phone */
.bk-sec--overview{padding:0}
.bk-sec--overview>*{max-width:none}
.bk-open{display:grid;grid-template-columns:minmax(0,1fr) 480px}
.bk-hero{display:flex;flex-direction:column;gap:24px;padding:96px 64px 80px;max-width:760px}
.bk-h1{font-size:clamp(48px,6vw,88px);line-height:0.95;text-wrap:balance}
.bk-stripe{background:var(--bk-float);padding:72px 60px 64px}
.bk-stripe__in{position:sticky;top:48px}
.bk-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px;margin:80px 64px 0;max-width:1000px}
.bk-traits li{display:grid;grid-template-columns:36px minmax(0,1fr);padding-top:20px;border-top:1px solid var(--bk-hair)}
.bk-trait{font-size:20px;font-weight:600;line-height:1.2;margin-bottom:8px}
.bk-traits .bk-body{font-size:15px}
.bk-sec--overview>.bk-wide{margin:80px 64px 96px;max-width:1000px}

/* voice */
.bk-principles{border-top:1px solid var(--bk-hair)}
.bk-principles li{display:grid;grid-template-columns:36px minmax(0,1fr) minmax(0,1.6fr);gap:24px;padding:28px 0;border-bottom:1px solid var(--bk-hair);align-items:baseline}
.bk-principles .bk-mkr{align-self:start;margin-top:2px}
.bk-pt{font-size:15px;font-weight:600;line-height:1.4}
.bk-pe{font-family:var(--body);font-size:28px;font-weight:500;line-height:1.25;text-wrap:balance}
.bk-lines{display:flex;flex-direction:column;gap:12px}
.bk-lines li{font-size:clamp(30px,3.6vw,52px);line-height:1.02;text-wrap:balance}
.bk-lines li:first-child{color:var(--bk-ink)}
.bk-wtn__r{display:grid;grid-template-columns:36px minmax(0,1.5fr) minmax(0,1fr);gap:0 32px;padding:24px 0;border-bottom:1px solid var(--bk-hair);align-items:start}
.bk-wtn__r>.bk-mkr{margin-top:2px}
.bk-wtn__r p{font-family:var(--body);font-size:15px;line-height:1.5}
.bk-wtn__r b{display:block;font-family:var(--chrome);font-size:12px;font-weight:600;color:var(--bk-quiet);margin-bottom:2px}
.bk-wtn__r .w{font-size:22px;line-height:1.25;font-weight:600;color:var(--bk-ink)}
.bk-wtn__r .w b{font-size:12px;font-weight:600}
.bk-wtn__r .n{margin-top:12px;color:var(--bk-quiet)}
.bk-wtn__r .n s{text-decoration-thickness:1px}
.bk-wtn__r .b{color:var(--bk-soft)}

/* logo */
.bk-lphs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:40px 32px}
.bk-lph{display:flex;flex-direction:column;align-items:center;gap:20px;min-width:0}
.bk-lph__p{width:100%;display:flex;justify-content:center}
.bk-lph .bk-phone{width:min(100%,330px)}
.bk-lnote{display:grid;grid-template-columns:36px minmax(0,1fr);width:min(100%,330px);padding-top:14px;border-top:1px solid var(--bk-hair)}
.bk-lnote b{display:block;font-size:15px;font-weight:600;line-height:1.4}
.bk-lnote p{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--bk-soft);margin-top:2px}
.bk-tiles{border-top:1px solid var(--bk-hair)}
.bk-tile{display:grid;grid-template-columns:240px minmax(0,1fr);gap:0 32px;align-items:center;padding:16px 0;border-bottom:1px solid var(--bk-hair)}
.bk-ground{height:128px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:${rcard}px}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-tile .bk-capt{align-items:center}
.bk-tile .bk-capt>span:first-child{max-width:46ch;font-family:var(--body);font-size:14px;line-height:1.5;color:var(--bk-soft)}
.bk-tile .bk-capt b{font-family:var(--chrome);font-size:15px;margin-bottom:2px}
.bk-slotnote{margin-top:24px}
.bk-figs>li{display:grid;grid-template-columns:36px minmax(0,1.3fr) minmax(0,1fr);gap:0 32px;align-items:center;padding:28px 0;border-bottom:1px solid var(--bk-hair)}
.bk-figs .bk-fig{min-width:0}
.bk-figs .bk-h3{margin-bottom:4px}
.bk-clear{display:inline-block;max-width:100%;border:1.5px dashed var(--bk-edge);border-radius:${rc}px}
.bk-clear>div{background:var(--fix-ground);outline:0}
.bk-clear{background:var(--fix-ground);color:var(--fix-ink)}
.bk-clear svg,.bk-clear .logo-slot{display:block;max-width:100%}
.bk-clear+.bk-body,.bk-min .bk-body{margin-top:12px}
.bk-min__logo{color:var(--fix-ink);display:inline-flex;padding:24px;border-radius:${rcard}px;background:var(--fix-ground);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-never li{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;font-family:var(--body);font-size:15px;line-height:1.5;color:var(--bk-soft);padding:12px 0;border-bottom:1px solid var(--bk-hair)}

/* colour */
.bk-clist,.bk-scales,.bk-principles,.bk-wtn,.bk-meas,.bk-never,.bk-figs{border-top:1px solid var(--bk-hair)}
.bk-clist>li{display:grid;grid-template-columns:36px minmax(0,1fr);padding:20px 0;border-bottom:1px solid var(--bk-hair)}
.bk-clist>li>.bk-mkr{margin-top:8px}
.bk-crow__h{display:flex;gap:16px;align-items:center}
.bk-sw{appearance:none;flex:none;width:40px;height:40px;border:0;border-radius:50%;padding:0;cursor:pointer}
.bk-sw:focus-visible{outline-offset:3px}
.bk-chipsw{flex:none;width:40px;height:40px;border-radius:50%}
.bk-cname{font-size:16px;font-weight:600;line-height:1.3}
.bk-clands{font-family:var(--body);font-size:13px;line-height:1.5;color:var(--bk-soft);margin-top:2px;max-width:48ch}
.bk-off{display:block;color:var(--bk-quiet)}
.bk-share{display:flex;align-items:center;gap:12px;margin-top:12px}
.bk-share__bar{flex:1;max-width:240px;height:8px;border-radius:999px;background:var(--bk-panel);overflow:hidden}
.bk-share__bar i{display:block;height:100%;border-radius:999px}
.bk-share__bar i.is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-vals,.bk-copies{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.1fr) minmax(0,1.5fr);gap:0 12px}
.bk-vals{margin-top:16px}
.bk-vals dt{font-size:12px;color:var(--bk-quiet)}
.bk-vals dd{font-family:var(--mono);font-size:12px;line-height:1.5;color:var(--bk-ink);overflow-wrap:anywhere}
.bk-copies{margin-top:8px}
.bk-copies .bk-btn{margin-top:0;min-width:0;width:100%;height:32px;padding:0 8px;font-size:12px}
.bk-pairs{display:flex;flex-direction:column;gap:8px;margin-top:24px}
.bk-pair{display:grid;grid-template-columns:24px 92px minmax(0,1fr) auto;gap:0 16px;align-items:center;min-height:56px;padding:16px 24px 16px 16px;border-radius:${rcard}px;font-family:var(--body)}
.bk-pair__r{font-family:var(--chrome);font-size:20px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums;white-space:nowrap}
.bk-pair__u{font-size:14px;font-weight:500;line-height:1.3}
.bk-pair__n{font-family:var(--chrome);font-size:12px;text-align:right}
.bk-pair .bk-mkr--p{box-shadow:none}
.bk-pair .bk-mkr--o{box-shadow:inset 0 0 0 1.5px currentColor}
.bk-pair.is-large .bk-pair__r,.bk-pair.is-large .bk-pair__u{font-size:24px;line-height:1.2}
.bk-knote .bk-crow__b{display:flex;flex-direction:column}
.bk-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:24px}
.bk-role{appearance:none;width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 16px 8px 8px;border:1px solid var(--bk-hair);border-radius:999px;background:var(--bk-ground);color:var(--bk-ink);font:600 13px/1.2 var(--chrome);text-align:left;cursor:pointer;transition:background-color 120ms ease-out}
.bk-role__sw{width:28px;height:28px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-role__h{font-family:var(--mono);font-weight:400;font-size:12px;color:var(--bk-quiet)}
@media (hover:hover){.bk-role:hover{background:var(--bk-raised)}}

/* typography */
.bk-faces{border-top:1px solid var(--bk-hair)}
.bk-face{display:grid;grid-template-columns:120px minmax(0,1fr);gap:0 32px;align-items:start;padding:24px 0;border-bottom:1px solid var(--bk-hair)}
.bk-face__aa{font-size:88px;line-height:1;font-family:var(--body);font-weight:600}
.bk-face__aa.disp{font-family:var(--display);font-weight:700}
.bk-face__n{font-size:15px;font-weight:600;margin-bottom:4px}
.bk-face__al{font-size:20px;line-height:1.45;margin-top:16px;overflow-wrap:anywhere;color:var(--bk-ink)}
.bk-faces+.bk-cap{margin-top:24px}
.bk-scale{display:grid;grid-template-columns:36px minmax(0,1fr);padding:20px 0;border-bottom:1px solid var(--bk-hair)}
.bk-scale>.bk-mkr{margin-top:0}
.bk-scale__t{font-size:15px;font-weight:600}
.bk-scale__s{font-size:min(var(--size),11vw);margin:12px 0 0;color:var(--bk-ink);overflow-wrap:anywhere}
.bk-tester{padding:32px;background:var(--bk-ground);border-radius:${rcard}px;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px}
.bk-field{display:flex;flex-direction:column;gap:8px}
.bk-field label{font-size:13px;font-weight:600;color:var(--bk-ink)}
.bk-field output{font-weight:400;color:var(--bk-soft);margin-left:8px}
.bk-field input[type=text]{height:44px;padding:0 16px;border:${bw}px solid var(--bk-edge);border-radius:${rc}px;background:var(--bk-raised);color:var(--bk-ink);font:400 16px/1 var(--body)}
.bk-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.bk-tester__d{margin-top:32px;font-size:min(var(--tester-size,64px),15vw);line-height:1.05;min-height:1.05em;overflow-wrap:anywhere}
.bk-tester__b{margin-top:16px;font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.bk-use__h{font-size:34px;line-height:1.05;margin-bottom:16px}
.bk-use__p{font-family:var(--body);font-size:15px;line-height:1.6;color:var(--bk-soft);margin-bottom:12px;max-width:52ch}
.bk-rules li{padding:16px 0;border-top:1px solid var(--bk-hair);display:grid;gap:6px}
.bk-rules li:last-child{border-bottom:1px solid var(--bk-hair)}
.bk-rules p{font-family:var(--body);font-size:15px;line-height:1.5;display:grid;grid-template-columns:48px minmax(0,1fr)}
.bk-rules b{font-family:var(--chrome);font-size:12px;font-weight:600;color:var(--bk-ink);padding-top:2px}
.bk-dont{color:var(--bk-soft)}.bk-do{color:var(--bk-ink)}

/* imagery */
.bk-dir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 48px;margin-bottom:64px}
.bk-dir div{padding:16px 0;border-top:1px solid var(--bk-hair)}
.bk-dir dt{font-size:13px;font-weight:600;margin-bottom:4px}
.bk-dir dd{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--bk-soft)}
.bk-imgst{display:grid;grid-template-columns:280px minmax(0,1fr);gap:56px;align-items:start}
.bk-imgst__n{position:sticky;top:32px}
.bk-shots{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:32px 24px}
.bk-shot{grid-column:span 2;min-width:0}
.bk-shot__f{overflow:hidden;border-radius:${rcard}px}
.bk-shot--0{grid-column:span 4}.bk-shot--0 .bk-shot__f{aspect-ratio:3/2}
.bk-shot--1 .bk-shot__f{aspect-ratio:3/4}
.bk-shot--2 .bk-shot__f{aspect-ratio:1}
.bk-shot--3{grid-column:span 4}.bk-shot--3 .bk-shot__f{aspect-ratio:3/2}
.bk-shot--4,.bk-shot--5{grid-column:span 3}.bk-shot--4 .bk-shot__f,.bk-shot--5 .bk-shot__f{aspect-ratio:4/3}
.bk-shot .photo-slot{height:100%}

/* layout */
.bk-gridfig{display:grid;grid-template-columns:320px minmax(0,1fr);gap:56px;align-items:start}
.bk-page{position:relative;display:grid;background:var(--bk-ground);box-shadow:inset 0 0 0 1px var(--bk-hair);border-radius:${rc}px}
.bk-page__g{display:grid}
.bk-page__g i{display:block;background:var(--bk-panel);border-radius:4px}
.bk-pin{position:absolute;transform:translate(-50%,-50%)}
.bk-meas li{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;padding:16px 0;border-bottom:1px solid var(--bk-hair);font-size:15px}
.bk-meas__k{font-weight:600}.bk-meas__v{color:var(--bk-soft)}
.bk-space{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap}
.bk-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bk-space i{display:block;background:var(--bk-ink);border-radius:2px}
.bk-shape{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:16px}
.bk-shape div{display:flex;flex-direction:column;gap:8px}
.bk-shape i{display:block;width:88px;height:64px;border:${bw}px solid var(--bk-ink);background:var(--bk-ground)}

/* applications */
.bk-sec--apps{padding-bottom:0}
.bk-band{background:var(--bk-panel);margin:96px -64px 0;padding:72px 64px 96px;display:flex;flex-direction:column;gap:72px;max-width:none}
.bk-band .bk-cap,.bk-band .cap{color:var(--bk-quiet-panel)}
.bk-cards{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px}
.bk-card{position:relative;width:360px;max-width:100%;aspect-ratio:90/55;border-radius:${rc}px;overflow:hidden;flex:none}
.bk-card--front{background:${B.logo.colourways.reversed.ground};color:${B.logo.colourways.reversed.name}}
.bk-card--back{background:var(--fix-raised);color:var(--fix-ink)}
[data-theme="dark"] .bk-card--front{box-shadow:0 0 0 1px var(--bk-edge)}
.bk-card__logo{position:absolute;left:28px;top:44%;transform:translateY(-50%)}
.bk-card__line{position:absolute;left:28px;bottom:22px;font-size:12px}
.bk-card__mark{position:absolute;right:24px;top:22px}
.bk-card__who{position:absolute;left:28px;bottom:24px;font-family:var(--body)}
.bk-card__who .nm{font-size:17px;font-weight:700;line-height:1.2}
.bk-card__who .rl{font-size:13px;color:var(--fix-soft);margin-top:2px}
.bk-card__who .ct{font-size:13px;line-height:1.5;margin-top:12px}
.bk-posts{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
.bk-post{position:relative;overflow:hidden;border-radius:${rcard}px;max-width:100%;flex:none;padding:24px}
.bk-post--sq{width:280px;aspect-ratio:1}
.bk-post--pt{width:224px;aspect-ratio:4/5}
.bk-post--st{width:158px;aspect-ratio:9/16;padding:18px}
.bk-post .disp{position:relative;z-index:1;font-size:30px;line-height:1}
.bk-post--pt .disp{font-size:26px}.bk-post--st .disp{font-size:24px}
.bk-post__lg{position:absolute;left:24px;bottom:24px}
.bk-post--st .bk-post__lg{left:18px;bottom:18px}
.bk-sign__b{position:relative;width:min(100%,300px);aspect-ratio:2/3;padding:28px;display:flex;flex-direction:column;border-radius:${rc}px}
.bk-sign__b .disp{font-size:38px;line-height:1}
.bk-sign__l{font-family:var(--body);font-size:15px;line-height:1.4;margin-top:16px}
.bk-sign__lg{margin-top:auto}
.bk-sign .cap{margin-top:12px}
.bk-email{width:min(100%,480px);padding:24px;background:var(--fix-raised);color:var(--fix-ink);border-radius:${rcard}px;box-shadow:inset 0 0 0 1px var(--fix-hair);font-family:var(--body)}
.bk-email__n{font-size:16px;font-weight:600}
.bk-email__r{font-size:14px;color:var(--fix-soft)}
.bk-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.bk-email__l{margin-top:20px;padding-top:16px;border-top:1px solid var(--fix-hair)}

/* downloads */
.bk-zip{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;padding:32px;border-radius:${rcard}px;background:var(--bk-float);color:var(--fix-ink);margin-bottom:56px}
.bk-zip .bk-cap{color:var(--fix-ink)}
.bk-zip .bk-btn--primary{background:var(--fix-ink);color:var(--fix-ground)}
@media (hover:hover){.bk-zip .bk-btn--primary:hover{background:var(--fix-soft)}}
.bk-zip__n{font-family:var(--mono);font-size:15px;margin-bottom:4px}
.bk-dgrid{display:block;columns:280px 3;column-gap:24px}
.bk-ds{min-width:0;break-inside:avoid;margin-bottom:24px;padding:28px 20px 12px;border-radius:28px;background:var(--bk-raised);box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-ds__h{padding:0 0 16px}
.bk-ds__t{font-family:var(--display);font-weight:${cssNum(d.weights[d.weights.length - 1])};font-size:30px;line-height:1.05;letter-spacing:-0.01em;margin-bottom:6px}
.bk-files li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:12px 0;border-top:1px solid var(--bk-hair)}
.bk-file__n{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere}
.bk-files .bk-cap{grid-column:1;grid-row:2}
.bk-files li .bk-btn{grid-column:2;grid-row:1/3}
.bk-file--logo{grid-template-columns:minmax(0,1fr)!important;gap:8px!important}
.bk-file--logo .bk-file__n{font-family:var(--chrome);font-size:13px;font-weight:600}
.bk-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:8px}
.bk-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px;margin:4px 0 12px}
.bk-icon{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px;border:1px solid var(--bk-hair);border-radius:16px;font-size:12px;text-decoration:none;color:var(--bk-ink);overflow-wrap:anywhere;text-align:center;transition:background-color 120ms ease-out}
@media (hover:hover){.bk-icon:hover{background:var(--bk-raised)}}

@media (max-width:1320px){
.bk-use__row,.bk-stage{grid-template-columns:320px minmax(0,1fr);gap:40px}
.bk-stage--flip{grid-template-columns:minmax(0,1fr) 320px}
.bk-imgst{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-imgst__n{position:static}
.bk-tile{grid-template-columns:200px minmax(0,1fr)}
}
@media (max-width:1180px){
.bk-use__row,.bk-stage,.bk-stage--flip,.bk-gridfig{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-stage__ph{position:static}
.bk-stage--flip .bk-stage__ph{order:0}
.bk-use__row .bk-notes{padding-top:0}
}
@media (max-width:1180px){
.bk-open{grid-template-columns:minmax(0,1fr)}
.bk-hero{padding:80px 48px 56px}
.bk-stripe{padding:56px 48px}
.bk-stripe__in{position:static}
}

/* narrow: a top bar and a menu */
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 16px;min-height:60px;border-right:0;border-bottom:1px solid var(--bk-hair)}
.bk-brand{flex:1;width:auto}.bk-brand svg{width:112px}
.bk-name{font-size:22px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 18px;border:${bw}px solid var(--bk-ink);border-radius:999px;background:transparent;color:var(--bk-ink);font:600 14px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 16px;background:var(--bk-ground);border-bottom:1px solid var(--bk-hair);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{padding:8px 12px 8px 8px;min-height:44px;font-size:15px}
.bk-sec{padding:56px 20px;scroll-margin-top:60px}
.bk-sec>*{max-width:none}
.bk-sec--overview{padding:0}
.bk-hero{padding:40px 20px 40px}
.bk-stripe{padding:40px 20px}
.bk-traits{margin:48px 20px 0;grid-template-columns:minmax(0,1fr);gap:24px}
.bk-sec--overview>.bk-wide{margin:48px 20px 56px}
.bk-title{font-size:30px;gap:12px}
.bk-mk{width:36px;height:36px}
.bk-head{margin-bottom:32px}
.bk-lead{font-size:17px}
.bk-block{margin-top:48px}
.bk-two,.bk-two--even{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-wide .bk-pho{aspect-ratio:4/3}
.bk-principles li{grid-template-columns:36px minmax(0,1fr);gap:8px 12px}
.bk-principles .bk-pe{grid-column:2}
.bk-pe{font-size:24px}
.bk-wtn__r{grid-template-columns:36px minmax(0,1fr);gap:12px 12px;padding:20px 0}
.bk-wtn__r .b{grid-column:2}
.bk-wtn__r .w{font-size:20px}
.bk-tile{grid-template-columns:minmax(0,1fr);gap:12px}
.bk-ground{height:112px}
.bk-tile .bk-capt{flex-direction:column;align-items:flex-start;gap:12px}
.bk-figs>li{grid-template-columns:36px minmax(0,1fr);gap:16px 12px}
.bk-figs>li>div:last-child{grid-column:2}
.bk-figs .bk-fig{grid-column:2}
.bk-sw{width:44px;height:44px}
.bk-chipsw{width:44px;height:44px}
.bk-clist>li{grid-template-columns:32px minmax(0,1fr)}
.bk-vals{grid-template-columns:minmax(0,1fr);gap:0}
.bk-vals div{display:grid;grid-template-columns:56px minmax(0,1fr);gap:0 8px;padding:2px 0}
.bk-copies{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.bk-copies .bk-btn{height:44px;padding:0 4px;font-size:13px}
.bk-pair{grid-template-columns:24px 80px minmax(0,1fr);gap:4px 12px;padding:14px 16px}
.bk-pair__n{grid-column:3;text-align:left}
.bk-lphs{gap:32px}
.bk-roles{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.bk-role{min-height:44px}
.bk-face{grid-template-columns:minmax(0,1fr);gap:8px}
.bk-face__aa{font-size:88px}
.bk-tester{padding:20px}
.bk-tester__c{grid-template-columns:minmax(0,1fr)}
.bk-shots{grid-template-columns:minmax(0,1fr);gap:24px}
.bk-shot,.bk-shot--0,.bk-shot--3,.bk-shot--4,.bk-shot--5{grid-column:auto}
.bk-shot .bk-shot__f{aspect-ratio:4/3}
.bk-page{max-width:320px}
.bk-space{gap:12px}
.bk-shape{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 16px}
.bk-band{margin:64px -20px 0;padding:40px 20px 56px;gap:56px}
.bk-btn,.bk-dl{min-height:44px}
.bk-dl{min-width:44px}
.bk-btn--primary{width:100%}
.bk-dgrid{columns:1}
.bk-zip{padding:24px 20px}
.bk-file--logo{grid-template-columns:minmax(0,1fr)!important;gap:8px!important}
.bk-pngs{margin-left:0}
.bk-icon{min-height:44px}
.bk-foot{padding:24px 20px;flex-direction:column}
}

@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk-btn:active{transform:none}html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}

@media print{
:root,[data-theme="dark"]{${vars(L)}}
.bk{display:block}
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.bk-btn,.bk-dls,.bk-dl,.bk-copies,.bk-tester__c,.bk-icons,.bk-zip,.bk-foot .bk-n{display:none!important}
.bk-sec{padding:0 0 24px;border-top:0;break-before:page}
.bk-sec--overview{break-before:auto}
.bk-sec>*{max-width:none}
.bk-band{margin:0;padding:24px}
figure,li,.bk-tile,.bk-crow,.bk-pair,.bk-card,.bk-post,.bk-phone,.bk-shot,.bk-scale{break-inside:avoid}
.bk-bar{height:160px}
.bk-stage__ph,.bk-stripe__in,.bk-imgst__n{position:static}
.bk-dgrid{columns:2}
.bk-ds{break-inside:avoid}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js
export function cssBook(ctx) { return cssBookKit(ctx); }
