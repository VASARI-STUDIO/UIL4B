// Styles for theme 03's brand book site (bookCss, scoped under .bk and the root custom properties) and for the
// brand kit pages: read-me, palette sheet, specimen, photography and the pack boards (cssBook, scoped under .pg).
// Broadsheet on the screen: ruled columns, a running head over a 4 px action rule, one display headline a section, no boxes.
// Everything reads colours from the brand's roles; no hex is written here.
import { cssBookKit } from './css-bookkit.js';
import { cssStr } from '../../engine/escape.js';

const vars = (r) => `--bk-ground:${r.surface};--bk-raised:${r.raised};--bk-panel:${r.sunken};--bk-ink:${r.text};--bk-soft:${r.textSoft};--bk-quiet:${r.quiet};--bk-quiet-panel:${r.quietOnSunken};--bk-hair:${r.divider};--bk-edge:${r.border};--bk-action:${r.action};--bk-action-hover:${r.actionHover};--bk-action-ink:${r.actionLabel};--bk-focus:${r.focus};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const bw = B.ui.border, dw = d.weights[d.weights.length - 1];
  // the brand's fill-only mark colour (role "mark"), else the action colour
  const mark = (B.colours.find((c) => c.role === 'mark') || { hex: L.action }).hex;
  const cw = B.logo.colourways;
  return `:root,.bk--board{${vars(L)}--bk-mark:${mark};--fix-ground:${L.surface};--fix-ink:${L.text};--fix-soft:${L.textSoft};--fix-quiet:${L.quiet};--fix-hair:${L.divider};--fix-panel:${L.sunken};
--chrome:'Schibsted Grotesk',sans-serif;--display:'${cssStr(d.family)}',serif;--body:'${cssStr(b.family)}',sans-serif;--mono:'${cssStr(m.family)}',monospace}
[data-theme="dark"]{${vars(D)}}
body{background:var(--bk-ground);color:var(--bk-ink)}
.bk{font-family:var(--chrome);font-size:14px;line-height:1.45;color:var(--bk-ink);background:var(--bk-ground);-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh;position:relative}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0;font-weight:inherit;font-size:inherit}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk :where(b,strong){font-weight:600}
.bk .disp{font-family:var(--display);font-weight:${dw};letter-spacing:-0.01em}
.bk .num{font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid var(--bk-focus);outline-offset:2px}
.bk-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--bk-ink);color:var(--bk-ground);padding:12px 16px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}

/* the rail: the name, then the sections as an index */
.bk-top{position:sticky;top:0;align-self:start;height:100vh;display:flex;flex-direction:column;gap:24px;padding:32px 24px;border-right:1px solid var(--bk-ink);background:var(--bk-ground)}
.bk-brand{display:block;text-decoration:none;width:148px;padding-bottom:16px;border-bottom:3px double var(--bk-ink)}
.bk-brand svg{display:block;width:148px;height:auto}
.bk-name{font-family:var(--display);font-weight:${dw};font-size:28px;line-height:1.1;letter-spacing:-0.01em}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-roles.bk-for-dark{display:none}[data-theme="dark"] .bk-roles.bk-for-dark{display:grid}[data-theme="dark"] .bk-roles.bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-height:0;overflow:auto}
.bk-nav ol{border-top:0}
.bk-nav a{display:flex;gap:12px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--bk-hair);font-size:14px;font-weight:500;color:var(--bk-soft);text-decoration:none;transition:color 120ms ease-out}
.bk-nav .bk-n{order:2;color:var(--bk-quiet);font-variant-numeric:tabular-nums;font-weight:400;font-size:12px}
.bk-nav a::after{content:"";order:1;flex:1;min-width:12px;border-bottom:1px dotted var(--bk-quiet);transform:translateY(-3px)}
.bk-nav a::before{content:"";flex:none;width:8px;height:8px;background:transparent;align-self:center}
.bk-nav a[aria-current]{color:var(--bk-ink);font-weight:600}
.bk-nav a[aria-current]::before{background:var(--bk-mark)}
@media (hover:hover){.bk-nav a:hover{color:var(--bk-ink)}}
.bk-mode{display:inline-flex;align-self:flex-start;border:${bw}px solid var(--bk-ink)}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button:focus-visible{outline-offset:-4px}
@media (hover:hover){.bk-mode button[aria-pressed="false"]:hover{background:var(--bk-panel)}}

/* main: a section is a page of the paper */
.bk main{min-width:0}
.bk main:focus{outline:none}
.bk-sec{padding:32px 56px 96px;border-top:3px solid var(--bk-ink);scroll-margin-top:0}
.bk-sec:first-of-type{border-top:0}
.bk-sec>*{max-width:1120px}
.bk-sec>.bk-band{max-width:none}
.bk-run{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px;border-bottom:4px solid var(--bk-action)}
.bk-run__nm{font-family:var(--display);font-weight:${dw};font-size:24px;line-height:1.1}
.bk-run__f{font-size:14px;font-variant-numeric:tabular-nums}
.bk-headline{font-family:var(--display);font-weight:${dw};font-size:clamp(40px,4.6vw,64px);line-height:1.02;letter-spacing:-0.01em;margin-top:40px;text-wrap:balance}
.bk-deck{font-family:var(--body);font-size:19px;font-weight:500;line-height:1.4;color:var(--bk-ink);max-width:52ch;margin-top:16px}
.bk-hd{margin-bottom:56px}
.bk-lead{font-family:var(--body);font-size:19px;font-weight:500;line-height:1.4;color:var(--bk-ink);max-width:48ch}
.bk-body{font-family:var(--body);font-size:16px;line-height:1.6;color:var(--bk-soft);max-width:62ch}
.bk-measure{max-width:62ch}
.bk-cap,.bk .cap{font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-h3{font-family:var(--body);font-size:18px;font-weight:700;line-height:1.2;color:var(--bk-ink);margin-bottom:12px}
.bk-block{margin-top:64px}
.bk-two{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:0 48px;align-items:start}
.bk-two--even{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-two--ruled{gap:0}
.bk-two--ruled>*{padding:0 32px}
.bk-two--ruled>:first-child{padding-left:0}
.bk-two--ruled>:last-child{padding-right:0}
.bk-two--ruled>*+*{border-left:1px solid var(--bk-hair)}
.bk-stack{display:flex;flex-direction:column;gap:24px}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:24px 56px;border-top:1px solid var(--bk-hair);font-size:12px;color:var(--bk-quiet)}
.bk-cols{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr))}
.bk-cols>*{min-width:0;padding:0 24px;border-left:1px solid var(--bk-hair)}
.bk-cols>:first-child{padding-left:0;border-left:0}
.bk-cols>:last-child{padding-right:0}

/* buttons and links */
.bk-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:36px;padding:0 14px;margin-top:16px;border:${bw}px solid var(--bk-ink);background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-btn.is-copied{background:var(--bk-ink);color:var(--bk-ground)}
.bk-btn--primary{margin-top:0;height:48px;padding:0 24px;border-color:transparent;background:var(--bk-action);color:var(--bk-action-ink);font-family:var(--body);font-size:16px;font-weight:700}
.bk-btn--quiet{margin-top:0;min-width:0;border-color:transparent;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
@media (hover:hover){.bk-btn:hover{background:var(--bk-panel)}.bk-btn--primary:hover{background:var(--bk-action-hover)}.bk-btn.is-copied:hover{background:var(--bk-ink)}}
.bk-btn:active{transform:scale(0.97)}
.bk-dls{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-dl{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;padding:0 10px;border:1px solid var(--bk-edge);font:500 12px/1 var(--chrome);color:var(--bk-ink);text-decoration:none;transition:background-color 120ms ease-out}
@media (hover:hover){.bk-dl:hover{background:var(--bk-panel)}}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;background:var(--bk-ink);color:var(--bk-ground);font:500 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}
.bk-live:empty{display:none}

/* photos and slots */
.bk-ph{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;font-family:var(--chrome);font-size:12px;line-height:1.5;background:var(--bk-panel);color:var(--bk-quiet-panel);box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-capt{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;font-size:12px;line-height:1.5;color:var(--bk-quiet)}
.bk-capt b{display:block;font-size:12px;font-weight:600;color:var(--bk-ink)}

/* overview: the front page */
.bk-sec--front{padding-top:32px}
.bk-ears{display:flex;justify-content:space-between;gap:16px;font-size:12px;color:var(--bk-quiet);padding-bottom:8px;border-bottom:1px solid var(--bk-ink)}
.bk-mast{display:grid;grid-template-columns:200px minmax(0,1fr) 200px;align-items:center;gap:0 24px;padding:20px 0 16px;border-bottom:3px solid var(--bk-ink)}
.bk-rule2{height:0;margin-top:2px;border-top:1px solid var(--bk-ink)}
.bk-ear{border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-ink);padding:6px 0;font-size:12px;line-height:1.4;color:var(--bk-ink)}
.bk-ear.r{text-align:right}
.bk-plate{display:flex;justify-content:center;align-items:center;min-width:0;max-width:none}
.bk-plate .bk-for-light,.bk-plate .bk-for-dark{min-width:0;max-width:100%}
.bk-plate svg{display:block;max-width:100%;height:auto}
.bk-plate__t{font-family:var(--display);font-weight:${dw};font-size:clamp(48px,7vw,104px);line-height:0.9;letter-spacing:-0.01em}
.bk-front{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);margin-top:24px}
.bk-front__l{padding-right:24px;min-width:0}
.bk-front__l .photo-slot{aspect-ratio:4/3;height:auto}
.bk-front__l figcaption{margin-top:8px}
.bk-front__r{padding-left:24px;border-left:1px solid var(--bk-hair);display:flex;flex-direction:column;gap:24px;min-width:0}
.bk-wk h3{display:flex;align-items:center;gap:8px;font-family:var(--body);font-size:14px;font-weight:700;margin-bottom:4px}
.bk-wk h3 i{display:block;width:12px;height:12px;background:var(--bk-mark)}
.bk-wk li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--bk-hair);font-family:var(--body);font-size:14px;line-height:1.4}
.bk-wk .q{color:var(--bk-quiet);margin-left:6px}
.bk-wk .pr{color:var(--bk-action);font-weight:700;white-space:nowrap}
.bk-wk .gone{color:var(--bk-quiet);font-weight:500;white-space:nowrap}
.bk-traits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:56px;padding-top:24px;border-top:1px solid var(--bk-ink)}
.bk-traits>li{padding:0 24px;border-left:1px solid var(--bk-hair)}
.bk-traits>li:first-child{padding-left:0;border-left:0}
.bk-traits>li:last-child{padding-right:0}
.bk-trait{font-family:var(--display);font-weight:${dw};font-size:26px;line-height:1.1;margin-bottom:8px}
.bk-about{margin-top:56px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-about>*{padding:0 24px;border-left:1px solid var(--bk-hair)}
.bk-about>:first-child{padding-left:0;border-left:0}

/* voice: the editorial page. Lead column of headlines, a ruled sidebar of the four rules */
.bk-vo{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);align-items:start}
.bk-vo__main{min-width:0;padding-right:40px}
.bk-lines{border-top:3px solid var(--bk-ink)}
.bk-lines li{font-family:var(--display);font-weight:${dw};font-size:28px;line-height:1.1;letter-spacing:-0.01em;padding:16px 0;border-bottom:1px solid var(--bk-hair);text-wrap:balance}
.bk-lines .is-lead{font-size:clamp(36px,4vw,56px);line-height:1.02;padding:20px 0 24px}
.bk-principles{padding-left:32px;border-left:1px solid var(--bk-hair);border-top:3px solid var(--bk-ink)}
.bk-principles li{padding:16px 0;border-bottom:1px solid var(--bk-hair)}
.bk-pt{font-family:var(--body);font-size:16px;font-weight:700;line-height:1.2;margin-bottom:8px}
.bk-pe{font-family:var(--display);font-weight:${dw};font-size:24px;line-height:1.1;letter-spacing:-0.01em;color:var(--bk-ink);text-wrap:balance}
.bk-wtn{border-top:1px solid var(--bk-ink)}
.bk-wtn__h,.bk-wtn__r{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr);gap:24px;padding:14px 0;border-bottom:1px solid var(--bk-hair)}
.bk-wtn__h{padding:8px 0;border-bottom:1px solid var(--bk-ink);font-size:12px;font-weight:600;color:var(--bk-quiet)}
.bk-wtn__r p{font-family:var(--body);font-size:15px;line-height:1.5}
.bk-wtn__r .w{font-weight:700;color:var(--bk-ink)}
.bk-wtn__r .n{color:var(--bk-quiet);text-decoration:line-through;text-decoration-thickness:1px}
.bk-wtn__r .b{color:var(--bk-soft)}
.bk-boil{padding-top:24px;border-top:3px solid var(--bk-ink)}
.bk-nr{margin-top:56px;padding:24px 0 32px;border-top:3px double var(--bk-ink);border-bottom:3px double var(--bk-ink)}
.bk-nr .bk-body{font-size:20px;line-height:1.5;color:var(--bk-ink);max-width:64ch}

/* logo: the nameplate across the full measure, the versions down a ruled column, the don'ts as corrections */
.bk-nameplate{border-top:3px solid var(--bk-ink);border-bottom:1px solid var(--bk-ink)}
.bk-nameplate .bk-tile{padding-bottom:12px}
.bk .bk-nameplate .bk-ground{min-height:260px;box-shadow:none}
.bk-nameplate .bk-capt{padding-top:12px;border-top:1px solid var(--bk-hair)}
.bk-lg{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);margin-top:56px;align-items:stretch}
.bk-lg__main{min-width:0;padding-right:40px;display:flex;flex-direction:column;justify-content:space-between;gap:56px}
.bk-lg__main>.bk-block{margin-top:0}
.bk-tile{display:flex;flex-direction:column;min-width:0}
.bk-ground{flex:1;min-height:96px;display:flex;align-items:center;justify-content:center;padding:16px}
.bk-ground svg,.bk-ground .logo-slot{max-width:100%;height:auto}
.bk .is-hair{box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-tile .bk-capt{margin-top:8px}
.bk-vers{padding-left:32px;border-left:1px solid var(--bk-hair);border-top:3px solid var(--bk-ink)}
.bk-vers>li{padding:16px 0;border-bottom:1px solid var(--bk-hair);min-width:0}
.bk-clear{display:inline-block;max-width:100%;border:1.5px dashed var(--bk-edge);background:var(--fix-ground);color:var(--fix-ink)}
.bk-clear>div{background:var(--fix-ground)}
.bk-clear svg,.bk-clear .logo-slot{display:block;max-width:100%}
.bk-clear+.bk-body,.bk-min .bk-body{margin-top:12px}
.bk-min__logo{color:var(--fix-ink);display:inline-flex;padding:24px;background:var(--fix-ground);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-corr{margin-top:0;padding:16px 24px 8px;border-top:3px double var(--bk-ink);border-bottom:3px double var(--bk-ink)}
.bk-corr .bk-h3{font-family:var(--display);font-weight:${dw};font-size:24px;letter-spacing:-0.01em;margin-bottom:8px}
.bk-corr li{font-family:var(--body);font-size:15px;line-height:1.5;color:var(--bk-ink);padding:10px 0;border-top:1px solid var(--bk-hair)}
.bk-corr b{font-weight:700}

/* colour: the markets page. A listing like share prices, a lead story beside it, the contrast pairs as the weather table */
.bk-mkt{display:grid;grid-template-columns:minmax(0,1fr) 332px;align-items:start}
.bk-mkt__main{grid-column:1;grid-row:1;min-width:0;padding-right:32px}
.bk-story{grid-column:2;grid-row:1;position:sticky;top:24px;padding-left:32px;border-left:1px solid var(--bk-hair);border-top:3px solid var(--bk-ink);padding-top:16px}
.bk-story__h{font-family:var(--display);font-weight:${dw};font-size:32px;line-height:1.05;letter-spacing:-0.01em;margin-bottom:16px;text-wrap:balance}
.bk-photo{aspect-ratio:4/5;margin-bottom:8px}
.bk-story .bk-cap b{display:inline}
.bk-th,.bk-crow{display:grid;grid-template-columns:28px minmax(120px,1.6fr) 56px 72px 132px 172px;column-gap:16px}
.bk-th{padding:0 0 6px;border-bottom:1px solid var(--bk-ink);font-size:12px;font-weight:600;color:var(--bk-quiet)}
.bk-th .r{text-align:right}
.bk-clist{border-top:0}
.bk-crow{grid-template-rows:auto 1fr;row-gap:8px;align-items:start;padding:12px 0 16px;border-bottom:1px solid var(--bk-hair)}
.bk-sw,.bk-chip{grid-column:1;grid-row:1/3;display:block;position:relative;width:28px;height:28px;padding:0;border:0;margin-top:2px;appearance:none}
.bk-sw{cursor:pointer}
.bk-sw::after{content:"";position:absolute;inset:-8px}
.bk-sw:focus-visible{outline-offset:2px}
.bk-cinfo{grid-column:2;grid-row:1/3;min-width:0}
.bk-cname{font-family:var(--body);font-size:16px;font-weight:700;line-height:1.3}
.bk-clands{font-family:var(--body);font-size:14px;line-height:1.45;color:var(--bk-soft);margin-top:2px}
.bk-share{grid-column:3;grid-row:1/3;font-family:var(--chrome);font-size:14px;font-weight:600;text-align:right;padding-top:2px}
.bk-share i{display:block;height:3px;margin-top:4px;margin-left:auto;background:var(--bk-ink)}
.bk-vals,.bk-vals>div,.bk-copies{display:contents}
.bk-vals dt{position:absolute;width:1px;height:1px;font-size:0;line-height:0;clip-path:inset(50%);white-space:nowrap}
.bk-vals dd{font-family:var(--mono);font-size:12px;line-height:1.5;color:var(--bk-ink);overflow-wrap:anywhere;padding-top:3px;font-variant-numeric:tabular-nums}
.bk-vals>div:nth-child(1) dd{grid-column:4;grid-row:1}
.bk-vals>div:nth-child(2) dd{grid-column:5;grid-row:1}
.bk-vals>div:nth-child(3) dd{grid-column:6;grid-row:1}
.bk-copies .bk-btn{grid-row:2;margin:0;min-width:0;height:28px;padding:0 8px;justify-self:start;border:1px solid var(--bk-edge);font-size:12px}
.bk-copies .bk-btn:nth-child(1){grid-column:4}
.bk-copies .bk-btn:nth-child(2){grid-column:5}
.bk-copies .bk-btn:nth-child(3){grid-column:6}
.bk-wxh,.bk-pair{display:grid;grid-template-columns:minmax(0,1.6fr) 72px 96px minmax(0,1fr);column-gap:16px;align-items:center}
.bk-wxh{margin-top:24px;padding:0 0 6px;border-bottom:1px solid var(--bk-ink);font-size:12px;font-weight:600;color:var(--bk-quiet)}
.bk-wxh .r{text-align:right}
.bk-pair{padding:8px 0;border-bottom:1px solid var(--bk-hair)}
.bk-pair__u{font-family:var(--body);font-size:15px;font-weight:500;line-height:1.3}
.bk-pair__s{height:40px;display:grid;place-items:center;font-family:var(--body);font-size:24px;font-weight:700;line-height:1}
.bk-pair__r{font-family:var(--chrome);font-size:20px;font-weight:600;line-height:1.2;text-align:right;white-space:nowrap}
.bk-pair__n{font-family:var(--chrome);font-size:13px;color:var(--bk-soft)}
.bk-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));column-gap:24px;margin-top:16px;border-top:1px solid var(--bk-ink)}
.bk-role{appearance:none;width:100%;display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border:0;border-bottom:1px solid var(--bk-hair);background:transparent;color:var(--bk-ink);font:500 13px/1.2 var(--chrome);text-align:left;cursor:pointer;transition:background-color 120ms ease-out}
.bk-role__sw{width:20px;height:20px;box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-role__h{font-family:var(--mono);font-weight:400;font-size:12px;color:var(--bk-quiet)}
@media (hover:hover){.bk-role:hover{background:var(--bk-raised)}}

/* typography: a front page, each style labelled in the margin with a leader rule */
.bk-ty{display:grid;grid-template-columns:minmax(0,1fr) 296px;align-items:start}
.bk-ty__page{min-width:0;padding-right:32px}
.bk-ty__side{padding-left:32px;border-left:1px solid var(--bk-hair);min-width:0}
.bk-anat{border-top:3px double var(--bk-ink)}
.bk-an{display:grid;grid-template-columns:168px 24px minmax(0,1fr);align-items:start;padding:20px 0;border-bottom:1px solid var(--bk-hair)}
.bk-an__t{font-family:var(--body);font-size:16px;font-weight:700;line-height:1.2}
.bk-an__l{display:block;height:0;margin-top:10px;border-top:1px solid var(--bk-ink)}
.bk-an__s{min-width:0;padding-left:8px}
.bk-an__x{font-size:min(var(--size),9vw);margin:0;color:var(--bk-ink);overflow-wrap:anywhere;letter-spacing:-0.01em}
.bk-an__ph{max-width:320px}
.bk-an__ph .photo-slot{aspect-ratio:3/2;height:auto}
.bk-an__ph figcaption{margin-top:8px;color:var(--bk-quiet)}
.bk-an__cols{columns:2;column-gap:32px;column-rule:1px solid var(--bk-hair);color:var(--bk-soft)}
.bk-an__cols p{margin:0 0 12px;break-inside:avoid-column}
.bk-pq{padding:12px 0;border-top:1px solid var(--bk-ink);border-bottom:1px solid var(--bk-ink);font-size:var(--size);letter-spacing:-0.01em;text-wrap:balance}
.bk-face{padding:0 0 24px;margin-bottom:24px;border-bottom:1px solid var(--bk-hair)}
.bk-face__aa{font-size:64px;line-height:1;margin-bottom:8px;font-family:var(--body);font-weight:400}
.bk-face__aa.disp{font-family:var(--display)}
.bk-face__n{font-family:var(--body);font-size:18px;font-weight:700;margin-bottom:4px}
.bk-face__al{font-size:16px;line-height:1.45;margin-top:12px;overflow-wrap:anywhere;color:var(--bk-ink)}
.bk-ty__side>.bk-cap{margin-top:-4px}
.bk-ty__side .bk-block{margin-top:40px}
.bk-tester{padding-top:24px;border-top:3px solid var(--bk-ink)}
.bk-tester__c{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:24px}
.bk-field{display:flex;flex-direction:column;gap:8px}
.bk-field label{font-size:12px;font-weight:600;color:var(--bk-ink)}
.bk-field output{font-weight:400;color:var(--bk-soft);margin-left:8px}
.bk-field input[type=text]{height:44px;padding:0 12px;border:${bw}px solid var(--bk-edge);background:var(--bk-ground);color:var(--bk-ink);font:400 16px/1 var(--body)}
.bk-field input[type=range]{height:44px;margin:0;accent-color:var(--bk-action);width:100%}
.bk-tester__d{margin-top:32px;font-size:min(var(--tester-size,64px),15vw);line-height:1.05;min-height:1.05em;overflow-wrap:anywhere}
.bk-tester__b{margin-top:16px;font-family:var(--body);font-weight:500;font-size:min(var(--tester-size,64px),11vw);line-height:1.15;min-height:1.15em;overflow-wrap:anywhere}
.bk-rules{border-top:1px solid var(--bk-ink)}
.bk-rules li{padding:14px 0;border-bottom:1px solid var(--bk-hair);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px}
.bk-rules p{font-family:var(--body);font-size:15px;line-height:1.5;display:grid;grid-template-columns:48px minmax(0,1fr)}
.bk-rules b{font-family:var(--chrome);font-size:12px;font-weight:600;color:var(--bk-ink);padding-top:2px}
.bk-rules--stack li{grid-template-columns:minmax(0,1fr);gap:6px}
.bk-dont{color:var(--bk-soft)}.bk-do{color:var(--bk-ink)}

/* imagery: a picture page */
.bk-im{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);align-items:start}
.bk-im__lead{min-width:0;padding-right:32px}
.bk-dir{padding-left:32px;border-left:1px solid var(--bk-hair);border-top:3px solid var(--bk-ink)}
.bk-dir div{padding:14px 0;border-bottom:1px solid var(--bk-hair)}
.bk-dir dt{font-family:var(--body);font-size:16px;font-weight:700;margin-bottom:4px}
.bk-dir dd{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--bk-soft)}
.bk-reel{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));row-gap:32px;margin-top:40px;border-top:1px solid var(--bk-ink);padding-top:24px}
.bk-shot{grid-column:span 2;min-width:0;padding:0 20px;border-left:1px solid var(--bk-hair)}
.bk-shot--0{padding:0;border-left:0}
.bk-shot--1,.bk-shot--4{padding-left:0;border-left:0}
.bk-shot--3,.bk-shot--5{padding-right:0}
.bk-shot--4,.bk-shot--5{grid-column:span 3}
.bk-shot--0 .bk-shot__f,.bk-shot--4 .bk-shot__f,.bk-shot--5 .bk-shot__f{aspect-ratio:3/2}
.bk-shot--1 .bk-shot__f,.bk-shot--2 .bk-shot__f,.bk-shot--3 .bk-shot__f{aspect-ratio:auto;height:232px}
.bk-shot--4 .bk-shot__f,.bk-shot--5 .bk-shot__f{aspect-ratio:auto;height:304px}
.bk-shot__f{overflow:hidden}
.bk-shot .photo-slot{height:100%}
.bk-shot .bk-capt{margin-top:8px}

/* layout */
.bk-gridfig{display:grid;grid-template-columns:minmax(0,1fr) 248px;align-items:start}
.bk-page{display:grid;margin-right:32px;background:var(--bk-raised);box-shadow:inset 0 0 0 1px var(--bk-hair)}
.bk-page__g{display:grid}
.bk-page__g i{display:block;background:var(--bk-panel)}
.bk-meas{display:flex;flex-direction:column;padding-left:32px;border-left:1px solid var(--bk-hair);border-top:3px solid var(--bk-ink)}
.bk-meas div{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:12px 0;border-bottom:1px solid var(--bk-hair)}
.bk-meas dt{font-size:14px;color:var(--bk-quiet)}
.bk-meas dd{font-family:var(--display);font-weight:${dw};font-size:32px;line-height:1.1;letter-spacing:-0.01em}
.bk-space{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap}
.bk-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.bk-space i{display:block;background:var(--bk-ink)}
.bk-shape{display:flex;gap:32px;margin-bottom:16px;flex-wrap:wrap}
.bk-shape div{display:flex;flex-direction:column;gap:8px}
.bk-shape i{display:block;width:96px;height:64px;border:${bw}px solid var(--bk-ink);background:var(--bk-ground)}

/* applications: the press page. The pieces sit on the newsprint in ruled cells of different widths */
.bk-press{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));border-top:3px solid var(--bk-ink);border-left:1px solid var(--bk-hair)}
.bk-app{grid-column:span 6;min-width:0;padding:24px;border-right:1px solid var(--bk-hair);border-bottom:1px solid var(--bk-hair)}
.bk-app--7{grid-column:span 7}.bk-app--5{grid-column:span 5}.bk-app--12{grid-column:span 12}.bk-app--6{grid-column:span 6}
.bk-app .bk-h3{margin-bottom:16px}
.bk-cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.bk-card{position:relative;flex:1 1 240px;max-width:300px;aspect-ratio:90/55;overflow:hidden}
.bk-card--front{background:${cw.reversed.ground};color:${cw.reversed.name}}
.bk-card--back{background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-card__logo{position:absolute;left:24px;top:44%;transform:translateY(-50%)}
.bk-card__line{position:absolute;left:24px;bottom:18px;font-family:var(--body);font-size:12px}
.bk-card__mark{position:absolute;right:20px;top:18px}
.bk-card__who{position:absolute;left:24px;bottom:20px;font-family:var(--body)}
.bk-card__who .nm{font-size:16px;font-weight:700;line-height:1.2}
.bk-card__who .rl{font-size:12px;color:var(--fix-soft);margin-top:2px}
.bk-card__who .ct{font-size:12px;line-height:1.5;margin-top:8px}
.bk-posts{display:flex;gap:32px;flex-wrap:wrap;align-items:flex-end}
.bk-post{position:relative;overflow:hidden;max-width:100%;flex:none;padding:20px}
.bk-post--sq{width:280px;aspect-ratio:1;background:${cw['on-quandong'] ? cw['on-quandong'].ground : L.action};color:${cw['on-quandong'] ? cw['on-quandong'].name : L.actionLabel}}
.bk-post--pt{width:224px;aspect-ratio:4/5;background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair)}
.bk-post--st{width:158px;aspect-ratio:9/16;padding:16px;background:${cw.reversed.ground};color:${cw.reversed.name}}
.bk-post .disp{position:relative;z-index:1;font-size:30px;line-height:1}
.bk-post--pt .disp{font-size:26px}.bk-post--st .disp{font-size:24px}
.bk-post__lg{position:absolute;left:20px;bottom:20px}
.bk-post--st .bk-post__lg{left:16px;bottom:16px}
.bk-sign{width:240px;max-width:100%}
.bk-sign__panel{position:relative;aspect-ratio:3/4;padding:20px;display:flex;flex-direction:column;justify-content:space-between;background:${cw.reversed.ground};color:${cw.reversed.name}}
.bk-sign__panel .disp{font-size:30px;line-height:1}
.bk-sign .cap{margin-top:12px}
.bk-email{width:min(100%,480px);padding:24px;background:var(--fix-ground);color:var(--fix-ink);box-shadow:inset 0 0 0 1px var(--fix-hair);font-family:var(--body)}
.bk-email__n{font-size:16px;font-weight:700}
.bk-email__r{font-size:14px;color:var(--fix-soft)}
.bk-email__c{font-size:14px;line-height:1.5;margin-top:12px}
.bk-email__l{margin-top:20px;padding-top:16px;border-top:1px solid var(--fix-hair)}
.bk-device{width:min(100%,390px);border:${bw}px solid var(--bk-ink)}
.bk-screen{padding:20px;display:flex;flex-direction:column;gap:16px}
.bk-scr__top{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px;border-bottom:4px solid var(--action)}
.bk-scr__brand{font-size:22px;line-height:1.1}
.bk-scr__time{font-size:13px;color:var(--quiet)}
.bk-scr__t{margin:0;font-size:28px;line-height:1.1}
.bk-scr__note{margin:0;font-size:14px;color:var(--text-soft)}

/* downloads: the classifieds. A ruled grid of small ads, one per folder */
.bk-ads{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:3px solid var(--bk-ink);border-left:1px solid var(--bk-hair)}
.bk-ad{min-width:0;padding:20px;border-right:1px solid var(--bk-hair);border-bottom:1px solid var(--bk-hair)}
.bk-ad--2{grid-column:span 2}.bk-ad--4{grid-column:span 4}
.bk-ad__h{margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid var(--bk-ink)}
.bk-ad .bk-h3{font-family:var(--display);font-weight:${dw};font-size:24px;line-height:1.1;letter-spacing:-0.01em;margin-bottom:4px}
.bk-ad--zip{grid-column:span 2;display:flex;flex-direction:column;justify-content:space-between;gap:24px;background:var(--bk-panel)}
.bk-ad--zip .bk-cap{color:var(--bk-quiet-panel)}
.bk-zip__n{font-family:var(--mono);font-size:16px;margin-bottom:4px;overflow-wrap:anywhere}
.bk-ad--zip .bk-btn--primary{align-self:flex-start}
.bk-files li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:10px 0;border-top:1px solid var(--bk-hair)}
.bk-files li:first-child{border-top:0;padding-top:0}
.bk-file__n{font-family:var(--mono);font-size:12px;overflow-wrap:anywhere;grid-column:1}
.bk-file>.bk-cap{grid-column:1;grid-row:2}
.bk-file>.bk-btn{grid-column:2;grid-row:1/3}
.bk-file--logo{grid-template-columns:minmax(0,1fr) auto!important}
.bk-file--logo .bk-file__n{font-family:var(--chrome);font-size:14px;font-weight:500}
.bk-ad{container-type:inline-size}
@container (max-width:215px){.bk-files li:not(.bk-file--logo){grid-template-columns:minmax(0,1fr)}.bk-file:not(.bk-file--logo)>.bk-btn{grid-column:1;grid-row:3;justify-self:start;margin-top:4px}}
.bk-pngs{display:inline-flex;gap:6px;align-items:center;margin-left:8px}
.bk-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:0;margin-bottom:16px;border-top:1px solid var(--bk-hair);border-left:1px solid var(--bk-hair)}
.bk-icons>li{display:flex}
.bk-icon{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;border-right:1px solid var(--bk-hair);border-bottom:1px solid var(--bk-hair);font-size:12px;text-decoration:none;color:var(--bk-ink);transition:background-color 120ms ease-out}
@media (hover:hover){.bk-icon:hover{background:var(--bk-raised)}}

/* narrower: stack the side columns, then the table rows, then a top bar and a menu */
@media (max-width:1340px){
.bk-mkt{grid-template-columns:minmax(0,1fr)}
.bk-mkt__main{grid-row:2;padding-right:0}
.bk-story{grid-column:1;position:static;padding:16px 0 0;border-left:0;display:grid;grid-template-columns:200px minmax(0,1fr);gap:0 24px;align-items:start;margin-bottom:40px}
.bk-story__h{grid-column:2;grid-row:1;font-size:40px;margin:0}
.bk-story figure{grid-column:1;grid-row:1}
.bk-ty{grid-template-columns:minmax(0,1fr)}
.bk-ty__page{padding-right:0}
.bk-ty__side{padding:24px 0 0;margin-top:40px;border-left:0;border-top:3px solid var(--bk-ink)}
}
@media (max-width:1100px){
.bk-post--sq{width:236px}.bk-post--pt{width:188px}.bk-post--st{width:132px}.bk-post--sq .disp{font-size:26px}.bk-post--pt .disp{font-size:23px}.bk-post--st .disp{font-size:21px}
.bk-vo,.bk-lg,.bk-im,.bk-gridfig{grid-template-columns:minmax(0,1fr)}
.bk-vo__main,.bk-lg__main,.bk-im__lead{padding-right:0}
.bk-principles,.bk-dir,.bk-meas{padding-left:0;border-left:0;margin-top:40px}
.bk-page{margin-right:0}
.bk-vers{padding-left:0;border-left:0;margin-top:56px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px}
.bk-ads{grid-template-columns:repeat(2,minmax(0,1fr))}
.bk-ad--4,.bk-ad--zip{grid-column:span 2}
}
@media (max-width:1000px){
.bk-th,.bk-wxh{display:none}
.bk-crow{grid-template-columns:28px 52px minmax(0,1fr) auto;column-gap:12px;row-gap:8px;padding:16px 0}
.bk-sw,.bk-chip{grid-row:1}
.bk-cinfo{grid-column:2/4;grid-row:1}
.bk-share{grid-column:4;grid-row:1}
.bk-vals dt{position:static;width:auto;height:auto;clip-path:none;white-space:normal;grid-column:2;font-size:12px;line-height:1.4;color:var(--bk-quiet);align-self:center}
.bk-vals dd{grid-column:3!important;padding-top:0;align-self:center}
.bk-vals>div:nth-child(1) dt,.bk-vals>div:nth-child(1) dd{grid-row:2!important}
.bk-vals>div:nth-child(2) dt,.bk-vals>div:nth-child(2) dd{grid-row:3!important}
.bk-vals>div:nth-child(3) dt,.bk-vals>div:nth-child(3) dd{grid-row:4!important}
.bk-copies .bk-btn{grid-column:4!important;justify-self:stretch}
.bk-copies .bk-btn:nth-child(1){grid-row:2}
.bk-copies .bk-btn:nth-child(2){grid-row:3}
.bk-copies .bk-btn:nth-child(3){grid-row:4}
.bk-pair{grid-template-columns:72px minmax(0,1fr) auto;gap:2px 16px;padding:12px 0}
.bk-pair__s{grid-column:1;grid-row:1/3}
.bk-pair__u{grid-column:2;grid-row:1}
.bk-pair__n{grid-column:2;grid-row:2}
.bk-pair__r{grid-column:3;grid-row:1/3}
.bk-an{grid-template-columns:minmax(0,1fr);gap:12px}
.bk-an__l{display:none}
.bk-an__s{padding-left:0}
.bk-an__cols{columns:1}
}
@media (max-width:840px){
.bk{display:block}
.bk-top{position:sticky;top:0;z-index:20;height:auto;flex-direction:row;align-items:center;flex-wrap:nowrap;gap:12px;padding:8px 16px;min-height:60px;border-right:0;border-bottom:3px double var(--bk-ink)}
.bk-brand{flex:1;width:auto;padding:0;border-bottom:0}.bk-brand svg{width:120px}
.bk-name{font-size:22px}
.bk-menu{display:inline-flex;appearance:none;align-items:center;justify-content:center;height:44px;min-width:72px;padding:0 14px;border:${bw}px solid var(--bk-ink);background:transparent;color:var(--bk-ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--bk-ink);color:var(--bk-ground)}
.bk-mode button{height:40px;padding:0 12px;min-width:48px}
.bk-nav{display:none;position:absolute;left:0;right:0;top:100%;padding:8px 16px 16px;background:var(--bk-ground);border-bottom:1px solid var(--bk-ink);max-height:calc(100vh - 60px);overflow:auto;overscroll-behavior:contain}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav a{padding:12px 0;min-height:44px;font-size:16px;align-items:center}
.bk-sec{padding:24px 20px 56px;scroll-margin-top:60px}
.bk-sec>*{max-width:none}
.bk-headline{font-size:40px;margin-top:28px}
.bk-hd{margin-bottom:32px}
.bk-deck,.bk-lead{font-size:17px}
.bk-block{margin-top:48px}
.bk-two,.bk-two--even{grid-template-columns:minmax(0,1fr);gap:32px}
.bk-two--ruled>*{padding:0}
.bk-two--ruled>*+*{border-left:0;border-top:1px solid var(--bk-hair);padding-top:24px}
.bk-cols{grid-template-columns:minmax(0,1fr)}
.bk-cols>*{padding:20px 0;border-left:0;border-top:1px solid var(--bk-hair)}
.bk-cols>:first-child{padding-top:0;border-top:0}
.bk-mast{grid-template-columns:minmax(0,1fr);gap:12px;padding:16px 0 12px}
.bk-ear,.bk-ear.r{text-align:left}
.bk-mast .bk-ear.r{order:3}
.bk-ears{flex-wrap:wrap;gap:4px 16px}
.bk-front{grid-template-columns:minmax(0,1fr)}
.bk-front__l{padding-right:0}
.bk-front__r{padding-left:0;border-left:0;margin-top:24px}
.bk-traits,.bk-about{grid-template-columns:minmax(0,1fr);margin-top:40px}
.bk-traits>li,.bk-about>*{padding:20px 0;border-left:0;border-top:1px solid var(--bk-hair)}
.bk-traits>li:first-child,.bk-about>:first-child{padding-top:0;border-top:0}
.bk-lines .is-lead{font-size:36px}
.bk-wtn__h{display:none}
.bk-wtn__r{grid-template-columns:minmax(0,1fr);gap:4px;padding:16px 0}
.bk-nr .bk-body{font-size:18px}
.bk-nameplate .bk-ground{min-height:160px}
.bk-space{gap:12px}
.bk-vers{grid-template-columns:minmax(0,1fr)}
.bk-corr{padding:16px 0 8px}
.bk-story{grid-template-columns:minmax(0,1fr)}
.bk-story__h{grid-column:1;grid-row:1;font-size:30px;margin-bottom:16px}
.bk-story figure{grid-column:1;grid-row:2}
.bk-photo{aspect-ratio:16/9}
.bk-copies .bk-btn{height:44px}
.bk-role{min-height:44px}
.bk-roles{grid-template-columns:minmax(0,1fr)}
.bk-an__x{font-size:min(var(--size),11vw)}
.bk-an__cols{columns:1}
.bk-rules li{grid-template-columns:minmax(0,1fr);gap:6px}
.bk-tester__c{grid-template-columns:minmax(0,1fr)}
.bk-reel{grid-template-columns:minmax(0,1fr);row-gap:24px}
.bk-shot,.bk-shot--4,.bk-shot--5,.bk-shot--3{grid-column:auto;padding:0;border-left:0}
.bk-shot .bk-shot__f{aspect-ratio:4/3;height:auto}
.bk-meas dd{font-size:28px}
.bk-press{grid-template-columns:minmax(0,1fr)}
.bk-app,.bk-app--7,.bk-app--5,.bk-app--6,.bk-app--12{grid-column:auto;padding:20px 16px}
.bk-posts{justify-content:flex-start}
.bk-ads{grid-template-columns:minmax(0,1fr)}
.bk-ad,.bk-ad--2,.bk-ad--4,.bk-ad--zip{grid-column:auto}
.bk-btn,.bk-dl{min-height:44px}
.bk-dl{min-width:44px}
.bk-btn--primary{width:100%}
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
.bk-top,.bk-skip,.bk-live,.bk-menu,.bk-mode,.bk-btn,.bk-dls,.bk-dl,.bk-copies,.bk-tester__c,.bk-icons,.bk-ads,.bk-foot .bk-n{display:none!important}
.bk-sec{padding:0 0 24px;border-top:0;break-before:page}
.bk-sec--front{break-before:auto}
.bk-sec>*{max-width:none}
figure,li,.bk-tile,.bk-crow,.bk-pair,.bk-card,.bk-post,.bk-sign,.bk-shot,.bk-an,.bk-app{break-inside:avoid}
.bk-story{position:static}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;
}

// the brand kit pages (read-me, sheets, pack boards) are .pg pages: appended to css() in index.js
export function cssBook(ctx) { return cssBookKit(ctx); }
