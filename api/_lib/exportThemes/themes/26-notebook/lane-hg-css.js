// Theme 26, Notebook, lane hg: the guide site stylesheet. The desk is a cool grey, each spread is the notebook's dotted stock (dots on a 24 px
// unit, an SVG tile, never a gradient), the fold is 1 px, the thread a dashed line with three station holes, and the brand's action colour is
// the tape. Dark is the black-stock notebook. Every class is hg-.
import { nb } from './helpers.js';

const dotTile = (hex) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='1' fill='%23${hex.replace('#', '')}'/%3E%3C/svg%3E")`;
function paperDark(ctx) {
  const f = (l, c, h) => ctx.C.fromOklch(l, c, h), D = ctx.roles.dark;
  const o = { paper: f(0.215, 0.006, 245), dot: f(0.38, 0.008, 240), fold: f(0.32, 0.006, 240), graphite: f(0.74, 0.01, 245), graphiteInk: f(0.92, 0.006, 245), desk: f(0.15, 0.006, 245), tape: D.action, tapeLabel: D.actionLabel, thread: D.text, focus: D.focus };
  o.text = o.graphiteInk;
  return o;
}
function check(ctx, o, mode) {
  for (const [fg, bg, what] of [[o.graphite, o.paper, 'graphite on paper'], [o.text, o.paper, 'text on paper'], [o.graphiteInk, o.desk, 'ink on desk'], [o.tapeLabel, o.tape, 'tape label on tape']]) {
    if (ctx.ratio(fg, bg) < 4.5) throw new Error(`26 guide site, ${mode}: ${what} is ${ctx.ratio(fg, bg).toFixed(2)}:1`);
  }
}
const vars = (o) => `--paper:${o.paper};--dot:${o.dot};--fold:${o.fold};--graphite:${o.graphite};--ink:${o.text};--ink2:${o.graphiteInk};--desk:${o.desk};--tape:${o.tape};--tape-ink:${o.tapeLabel};--thread:${o.thread};--focus:${o.focus};--dots:${dotTile(o.dot)};`;
const SH = 'box-shadow:0 1px 0 oklch(0.3 0.01 245 / 0.10),0 4px 10px -4px oklch(0.3 0.01 245 / 0.22)';

export function guideCss(ctx) {
  const B = ctx.brand, W = ctx.weights, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const L = { ...nb(ctx), desk: ctx.C.fromOklch(0.915, 0.006, 240), focus: ctx.roles.light.focus };
  const Dk = paperDark(ctx);
  check(ctx, L, 'light'); check(ctx, Dk, 'dark');
  return `:root{${vars(L)}--chrome:'Atkinson Hyperlegible Next',sans-serif;--val:'Atkinson Hyperlegible Mono',ui-monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m ? m.family : 'Atkinson Hyperlegible Mono'}',ui-monospace;--sw:min(1152px,round(down,calc(100% - 192px),48px))}
[data-theme="dark"]{${vars(Dk)}}
body{background:var(--desk);color:var(--ink2)}
.hg{background:var(--desk);color:var(--ink2);font:400 15px/24px var(--body);-webkit-font-smoothing:antialiased;min-height:100vh}
.hg :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.hg :where(ul,ol){list-style:none}
.hg :where(a){color:inherit}
.hg .disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:0}
.hg .m{font-family:var(--val);font-weight:400;font-size:13px;line-height:24px;letter-spacing:0;word-spacing:0;color:inherit;font-variant-numeric:tabular-nums}
.hg :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
/* the bar, on the desk above the notebook */
.hg-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;padding:12px 48px;background:var(--desk);border-bottom:1px solid var(--fold)}
.hg-brand{display:block;flex:none;width:120px;line-height:0;text-decoration:none}
.hg-for-dark{display:none}[data-theme="dark"] .hg-for-dark{display:block}[data-theme="dark"] .hg-for-light{display:none}
.hg-links{display:flex;gap:24px;flex:1;min-width:0}
.hg-links a{display:block;white-space:nowrap;padding:12px 0;font:400 13px/24px var(--chrome);color:var(--ink2);text-decoration:none;border-bottom:2px solid transparent;transition:border-color 120ms ease-out}
.hg-links a[aria-current]{border-bottom-color:var(--tape);font-weight:600}
@media (hover:hover){.hg-links a:hover{border-bottom-color:var(--graphite)}}
.hg-toc-btn{flex:none;appearance:none;height:36px;padding:0 12px;border:1px solid var(--ink2);background:transparent;color:var(--ink2);font:600 13px/24px var(--chrome);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hg-toc-btn[aria-expanded="true"]{background:var(--ink2);color:var(--desk)}
.hg-mode{display:inline-flex;flex:none;border:1px solid var(--ink2);overflow:hidden}
.hg-mode button{appearance:none;border:0;background:transparent;color:var(--ink2);font:600 13px/24px var(--chrome);height:34px;padding:0 12px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hg-mode button[aria-pressed="true"]{background:var(--ink2);color:var(--desk)}
.hg-mode button:focus-visible,.hg-toc-btn:focus-visible{outline-offset:-4px}
.hg-toc{position:absolute;left:0;right:0;top:100%;max-height:calc(100vh - 72px);overflow:auto;overscroll-behavior:contain;background:var(--desk);border-bottom:1px solid var(--fold);padding:24px 48px 48px}
.hg-toc[data-open="false"]{display:none}
.hg-toc > ol{display:grid;grid-template-columns:repeat(auto-fill,minmax(216px,1fr));gap:24px 48px;width:var(--sw);margin:0 auto}
.hg-toc__s{font:600 13px/24px var(--chrome);padding-bottom:6px}
.hg-toc a{display:block;padding:6px 0;font:400 15px/24px var(--chrome);text-decoration:none}
.hg-toc a[aria-current]{font-weight:600;text-decoration:underline 2px;text-decoration-color:var(--tape);text-underline-offset:4px}
@media (hover:hover){.hg-toc a:hover{text-decoration:underline 2px;text-decoration-color:var(--tape);text-underline-offset:4px}}
.hg main{display:block;padding:72px 0 0;overflow-x:clip}
.hg main:focus{outline:none}
.hg-foot{width:var(--sw);margin:48px auto 0;padding:0 0 48px}
.hg-pager{display:flex;justify-content:space-between;gap:24px}
.hg-pn{display:flex;flex-direction:column;gap:0;padding:12px 0;text-decoration:none;border-bottom:2px solid var(--tape);min-width:216px;transition:border-color 120ms ease-out}
.hg-pn--next{text-align:right;margin-left:auto}
.hg-pn__d{font:400 13px/24px var(--chrome)}
.hg-pn__t{font:600 17px/24px var(--chrome)}
@media (hover:hover){.hg-pn:hover{border-bottom-color:var(--ink2)}}
.hg-credit{margin-top:48px;font:400 13px/24px var(--chrome)}
/* the notebook */
.hg-spread{position:relative;isolation:isolate;width:var(--sw);margin:0 auto 72px;display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:row;background:var(--paper) var(--dots) -12px -12px/24px 24px repeat;color:var(--ink);${SH}}
.hg-spread + .hg-spread{margin-top:0}
.hg-spread::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--fold);z-index:1}
.hg-thread{position:absolute;left:calc(50% - 2px);top:48px;width:4px;height:calc(100% - 96px);overflow:visible;z-index:2;pointer-events:none}
.hg-thread line{stroke:var(--thread);stroke-width:1.5;stroke-dasharray:14 10}
.hg-thread circle{fill:var(--paper);stroke:var(--thread);stroke-width:1}
.hg-v{grid-column:1}.hg-r{grid-column:2}
.hg-v,.hg-r{position:relative;z-index:3;min-width:0;padding:24px 48px 0;container-type:inline-size;display:flex;flex-direction:column;gap:24px}
.hg-hd{padding-top:24px;font:400 12px/24px var(--chrome);color:var(--graphite);display:block}
.hg-r.hg-hd{text-align:right}
.hg-hd,.hg-ft{container-type:normal}
.hg-hd{background:var(--paper);justify-self:start;max-width:100%}
.hg-r.hg-hd{justify-self:end}
.hg-ft{padding:48px 48px 24px;display:block}
.hg-r.hg-ft{text-align:right}
.hg-fo{font:400 13px/24px var(--val);color:var(--graphite);background:var(--paper)}
.hg-end{grid-row:1 / span var(--span);background:var(--eg);color:var(--ei);padding:96px 48px 48px;justify-content:flex-start}
.hg-end__t{font:600 32px/48px var(--chrome)}
.hg-end__v{font:400 13px/24px var(--chrome)}
.hg-end__logo,.hg-bigmark{margin-top:auto}
.hg-bigmark{margin-top:0;flex:1;display:flex;align-items:center}
.hg-endline{font-size:min(32px,8cqw);line-height:1.2;margin-top:auto}
.hg-logo{display:block;line-height:0;max-width:100%}
.hg-logo > *{display:block;width:100%!important;height:auto!important;aspect-ratio:var(--ar);max-width:100%}
.hg-tab{position:absolute;top:-12px;left:calc(48px + (100% - 96px - 216px) * var(--i) / 8);width:216px;height:24px;z-index:5;background:var(--tape);color:var(--tape-ink);font:600 13px/24px var(--chrome);text-align:center;white-space:nowrap;${SH}}
.hg-tag{display:inline-block;align-self:flex-start;min-width:96px;height:24px;padding:0 12px;background:var(--tape);color:var(--tape-ink);font:600 13px/24px var(--chrome);text-align:center;white-space:nowrap}
.hg-k{background:var(--paper);-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:6px 12px;margin:0 -12px}
.hg-p{max-width:62ch;font:400 15px/24px var(--body)}
.hg-lede{font-size:17px}
.hg-line{font-weight:${W.strong};font-size:17px}
.hg-note,.hg-note .hg-k{font-family:var(--chrome);font-size:13px;line-height:24px;color:var(--graphite)}
.hg-h3{font:600 15px/24px var(--chrome)}
.hg-h1{font-size:min(48px,10cqw);line-height:1.12;text-wrap:balance;color:var(--ink)}
.hg-h1 .hg-k,.hg-hero .hg-k,.hg-big .hg-k,.hg-title .hg-k{padding:0 12px}
.hg-hero{font-size:min(64px,11cqw);line-height:1.12;text-wrap:balance;color:var(--ink)}
.hg-hero--cover{font-size:min(56px,10cqw)}
.hg-big{font-size:min(40px,8cqw);line-height:1.2;color:var(--ink)}
.hg-title{font-size:24px;line-height:36px;color:var(--ink)}
.hg-list{display:flex;flex-direction:column;gap:24px}
.hg-list li{display:flex;flex-direction:column;gap:12px}
.hg-strip{display:block;align-self:stretch;margin:0 -48px;padding:12px 48px;background:var(--tape);color:var(--tape-ink);font:600 15px/24px var(--chrome)}
.hg-traits,.hg-dir{display:flex;flex-direction:column;gap:24px}
.hg-traits dd,.hg-dir dd{margin-top:12px}
.hg-write{align-self:flex-start;padding:0 12px;background:var(--tape);color:var(--tape-ink);font:600 15px/24px var(--body)}
.hg-not{font:400 15px/24px var(--body);color:var(--graphite)}
.hg-not s{background:var(--paper);text-decoration-thickness:1.5px}
.hg-empty{padding:0}
.hg-rules{display:flex;flex-direction:column;gap:24px}
.hg-rules li{display:flex;flex-direction:column;gap:6px}
/* logo */
.hg-cut{display:flex;align-items:center;justify-content:center;padding:24px;min-height:144px;${SH}}
.hg-cut--tight{min-height:96px}
.hg-clear{position:relative;align-self:flex-start;max-width:100%;box-sizing:border-box;${SH}}
.hg-x{position:absolute;background:var(--tape);opacity:0.22}
.hg-x--tl{left:0;top:0}.hg-x--tr{right:0;top:0}.hg-x--bl{left:0;bottom:0}.hg-x--br{right:0;bottom:0}
.hg-tile{display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:192px;padding:24px;${SH}}
.hg-tile__n{font:600 13px/24px var(--chrome)}
.hg-over{position:absolute;left:24px;bottom:24px;width:40%;min-width:144px;max-width:240px}
.hg-over--panel{padding:12px 24px;width:auto;max-width:calc(100% - 48px);box-sizing:content-box}
.hg-over--panel .hg-logo{width:168px}
.hg-bench{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hg-lay__fill{display:block;position:absolute;inset:0}
.hg-try{position:relative;display:flex;align-items:center;justify-content:center;min-height:120px;padding:24px;overflow:hidden}
.hg-mu{display:block;line-height:0;max-width:100%}
.hg-mu > *{display:block;width:100%!important;height:auto!important;aspect-ratio:var(--ar)}
.hg-mu.is-boxed{padding:12px;border:2px solid var(--ink);box-sizing:content-box}
.hg-busy__l{position:absolute;left:12%;top:30%;width:60%}
.hg-busy__l .hg-mu{width:100%}
.hg-cross{position:absolute;inset:-24px;width:calc(100% + 48px);height:calc(100% + 48px);pointer-events:none}
.hg-xw{position:relative;display:block;max-width:100%}
.hg-xw.hg-busy__l{position:absolute}
.hg-cross .u{stroke:var(--paper);stroke-width:7;vector-effect:non-scaling-stroke}
.hg-cross .o{stroke:var(--graphite);stroke-width:2;vector-effect:non-scaling-stroke}
/* colour */
.hg-sw{display:flex;align-items:flex-end;min-height:calc(96px + var(--sh,0.3) * 288px);padding:12px 24px;font:600 13px/24px var(--chrome);${SH}}
.hg-sw--s{min-height:96px}
.hg-sw.is-edge,.hg-cut.is-edge,.hg-tile.is-edge,.hg-clear.is-edge,.hg-sig.is-edge{box-shadow:inset 0 0 0 1px var(--fold)}
.hg-bands{display:flex;flex-direction:column;min-height:576px;flex:1;gap:12px;margin:0 -48px 0 0}
.hg-bands li{flex:var(--sh) 1 0;min-height:48px;display:flex;align-items:flex-end;padding:12px 24px;font:600 13px/24px var(--chrome);font-variant-numeric:tabular-nums}
.hg-bands li.is-edge{box-shadow:inset 0 0 0 1px var(--fold)}
.hg-shares{display:flex;flex-direction:column;gap:6px}
.hg-shares li{display:flex;align-items:center;gap:12px}
.hg-sq{display:inline-block;width:24px;height:24px;flex:none;box-shadow:inset 0 0 0 1px oklch(0 0 0 / 0.1)}
.hg-shares__n{font:600 15px/24px var(--chrome);background:var(--paper)}
.hg-shares .m{background:var(--paper)}
.hg-pair{display:flex;align-items:flex-end;justify-content:space-between;height:120px;padding:12px 24px;${SH}}
.hg-pair__a{font-size:48px;line-height:60px}
.hg-pair__r{font-size:24px;line-height:36px}
.hg-vals{display:grid;grid-template-columns:auto 1fr;gap:0 12px}
.hg-vals div{display:contents}
.hg-vals dt{font:600 13px/24px var(--chrome);color:var(--graphite)}
.hg-vals dt,.hg-vals dd{background:var(--paper);justify-self:start}
.hg-ramp{display:flex;flex-wrap:wrap}
.hg-ramp li{width:24px;height:24px;box-shadow:inset 0 0 0 1px oklch(0 0 0 / 0.06)}
/* type */
.hg-aa{font-size:240px;line-height:240px;color:var(--ink)}
.hg-weights{display:flex;flex-direction:column}
.hg-weights li{font:400 17px/36px var(--body);background:var(--paper);align-self:flex-start}
.hg-monos{font:400 24px/36px var(--mono);background:var(--paper);align-self:flex-start}
.hg-sc{color:var(--graphite);background:var(--paper);align-self:flex-start}
.hg-scale__s{background:var(--paper);color:var(--ink)}
.hg-piece-set{display:flex;flex-direction:column;gap:24px;padding:48px 24px;background:var(--paper);border:1px solid var(--fold)}
.hg-set__h{font-size:min(48px,10cqw);line-height:1.12;color:var(--ink);text-wrap:balance}
.hg-set__p{max-width:52ch;font:400 17px/28px var(--body);color:var(--ink)}
.hg-set__c{font:400 13px/24px var(--chrome);color:var(--graphite)}
/* prints */
.hg-print{position:relative;display:flex;flex-direction:column;gap:12px}
.hg-print__f{position:relative;aspect-ratio:4/3;background:var(--paper);${SH}}
.hg-print--big .hg-print__f{aspect-ratio:4/5}
.hg-print__i{position:absolute;inset:0;overflow:hidden}
.hg-print__i > :not(.hg-mock):not(.hg-over):not(.hg-mu):not(.hg-cross):not(.hg-busy__l){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--pos,50% 50%)!important}
.hg-print__i img:not(.hg-mock),.hg-print__i svg.pl:not(.hg-mock){display:block;width:100%;height:100%}
.hg-mock{position:absolute;display:block;height:auto;max-width:none}
.hg-piece{position:absolute;left:-24px;top:-12px;width:120px;height:24px;background:var(--tape);z-index:2}
.hg-print figcaption{font:400 13px/24px var(--chrome);color:var(--graphite)}
.hg-print .photo-slot{padding:48px 24px 24px;box-sizing:border-box}
.hg-print.hg-print--slot .hg-print__f{aspect-ratio:auto}
.hg-print.hg-print--slot .hg-print__f .hg-print__i{position:relative;inset:auto}
.hg-print.hg-print--slot .hg-print__f .hg-print__i > .photo-slot.hg-photo{position:relative;inset:auto;height:auto;min-height:0;padding:24px}
/* layout */
.hg-page{position:relative;${SH}}
.hg-page__c{position:absolute;inset:var(--m);display:grid;grid-template-columns:repeat(var(--n),1fr);gap:var(--g)}
.hg-page__c i{background:var(--tape);opacity:0.22}
.hg-meas{display:grid;grid-template-columns:auto 1fr;gap:0 24px}
.hg-meas div{display:contents}
.hg-meas dt{font:600 13px/24px var(--chrome)}
.hg-meas dt,.hg-meas dd{background:var(--paper);justify-self:start}
.hg-space{display:flex;flex-direction:column;gap:6px}
.hg-space li{display:flex;align-items:center;gap:12px}
.hg-space i{display:block;height:12px;background:var(--tape)}
.hg-space .m{background:var(--paper)}
.hg-lay{display:flex;flex-direction:column;gap:12px}
.hg-lay__p{position:relative;overflow:hidden;container-type:inline-size;${SH}}
.hg-lay__h{position:absolute;left:12%;top:12%;right:12%;font-size:9cqw;line-height:1.1}
.hg-lay__h--s{font-size:7cqw}
.hg-lay__logo{position:absolute;left:12%;bottom:10%;width:36%}
.hg-lay__ph{position:absolute;left:0;top:0;bottom:0;width:50%;overflow:hidden}
.hg-lay__ph > *{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--pos,50% 50%)!important}
.hg-lay__t{position:absolute;left:58%;top:12%;right:8%;font:400 3.6cqw/1.45 var(--body)}
.hg-lay__h--s + .hg-lay__t{left:12%;right:12%;top:46%}
.hg-lay__p--flow{display:flex;flex-direction:column;gap:8px;padding:12%}
.hg-lay__p--flow>.hg-lay__h,.hg-lay__p--flow>.hg-lay__t,.hg-lay__p--flow>.hg-lay__h--s + .hg-lay__t{position:static}
.hg-lay figcaption{font:400 13px/24px var(--chrome);color:var(--graphite)}
/* applications */
.hg-cards{display:flex;flex-direction:column;gap:24px}
.hg-card{display:flex;flex-direction:column;justify-content:space-between;aspect-ratio:85/55;max-width:408px;padding:24px;${SH}}
.hg-card--back{align-items:center;justify-content:center}
.hg-card__p{display:flex;flex-direction:column;font:400 13px/18px var(--body)}
.hg-card__n{font-weight:${W.strong}}
.hg-posts{display:flex;flex-direction:column}
.hg-post{display:flex;align-items:flex-end;padding:24px;font-size:20px;line-height:28px;${SH}}
.hg-post--0{aspect-ratio:1}.hg-post--1{aspect-ratio:4/5}.hg-post--2{aspect-ratio:9/16;max-width:216px}
.hg-post__c{margin-top:12px}
.hg-sig{display:flex;flex-direction:column;padding:24px;max-width:408px;font:400 13px/24px var(--body);${SH}}
.hg-sig__n{font-weight:${W.strong}}
.hg-sig .hg-logo{margin-top:12px}
.hg-form{display:flex;flex-direction:column;gap:12px}
.hg-live{padding:24px;background:var(--surface);border-radius:0;${SH}}
.hg-chips{display:flex;flex-direction:column}
.hg-chips li{display:flex;justify-content:space-between;align-items:center;padding:12px 24px;font:600 13px/24px var(--chrome)}
.hg-chips li.is-edge{box-shadow:inset 0 0 0 1px var(--fold)}
.hg-three{display:flex;flex-direction:column;gap:24px}
.hg-three li{display:flex;flex-direction:column;gap:12px}
@media (prefers-reduced-motion:no-preference){.hg-piece{animation:hg-lay 600ms cubic-bezier(0.23,1,0.32,1) both}}
@keyframes hg-lay{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
[data-theme="dark"] :is(.hg-card,.hg-post,.hg-cut,.hg-pair,.hg-end,.hg-print__f,.hg-sig,.hg-sw,.hg-tile,.hg-lay__p,.hg-clear){outline:1px solid var(--fold)}
/* contents */
.hg-toc-l{display:flex;flex-direction:column;margin-top:-12px}
.hg-toc-l a{display:flex;justify-content:space-between;gap:12px;padding:0;text-decoration:none;font:400 15px/24px var(--body)}
.hg-toc-l a span{background:var(--paper)}
@media (hover:hover){.hg-toc-l a:hover span:first-child{text-decoration:underline 2px;text-decoration-color:var(--tape);text-underline-offset:4px}}
@media (max-width:1279px){
.hg-top{flex-wrap:wrap;padding:12px 24px;gap:12px}
.hg-links{gap:16px}
.hg-toc{padding:24px}
}
@media (max-width:840px){
.hg-brand{width:96px;order:1}
.hg-toc-btn{order:2;margin-left:auto}
.hg-mode{order:3}
.hg-links{order:4;flex:1 0 100%;gap:24px}
.hg-links a{padding:6px 0}
.hg main{padding-top:48px}
.hg-spread{--sw:100%;width:100%;grid-template-columns:1fr;margin-bottom:48px}
.hg-spread::before{left:12px}
.hg-thread{left:10px}
.hg-v,.hg-r,.hg-end{grid-column:1;grid-row:auto}
.hg-v,.hg-r{padding:24px 24px 0 48px}
.hg-v.hg-hd{order:-3}
.hg-lead{order:-2}
.hg-r.hg-hd,.hg-v.hg-ft,.hg-empty{display:none}
.hg-ft{padding:48px 24px 24px 48px}
.hg-end{padding:48px 24px 48px 48px;min-height:288px;order:-1}
.hg-end.hg-lead{order:-2}
.hg-strip{margin:0 -24px 0 -48px;padding:12px 24px 12px 48px}
.hg-tab{left:calc(48px + (100% - 72px - 216px) * var(--i) / 8)}
.hg-aa{font-size:168px;line-height:168px}
.hg-bands{min-height:384px;margin-right:-24px}
.hg-toc > ol{width:100%;grid-template-columns:1fr}
.hg-foot{width:auto;margin:48px 24px 0}
.hg-pager{flex-direction:column}
.hg-pn--next{margin-left:0;text-align:left}
.hg-posts .hg-post--2{max-width:216px}
}
@media (prefers-reduced-motion:reduce){.hg *{transition:none!important;animation:none!important}}
.ph-b>.ph-l{font-weight:600}`;
}
