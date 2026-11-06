// Styles for guidelines-a.js (theme 10, In use). Appended to css() in index.js; uses the .pg custom properties. Every class starts a-.
import { cssStr } from '../../engine/escape.js';
export function cssA(ctx) {
  const mono = ctx.brand.fonts.mono;
  return `
.pg{--mono:'${cssStr(mono.family)}',monospace}
.a-abs{position:absolute}
.a-mk--lt{background:var(--card);color:var(--ink)}
.a-h1{font-family:var(--display);font-weight:700;font-size:58px;line-height:1.05;letter-spacing:-0.01em;text-wrap:balance;max-width:560px}
.a-lead{font-size:16px;line-height:1.55;color:var(--soft)}
.a-body{font-family:var(--body);font-size:20px;line-height:1.5;color:var(--soft);max-width:360px;margin-top:24px}
.a-soft{font-size:14px;line-height:1.55;color:var(--soft)}
.a-h3{font-size:12px;line-height:1.5;font-weight:600;color:var(--ink);margin-bottom:8px}
.a-mono{font-family:var(--mono);font-size:12px;line-height:1.3;color:var(--ink);white-space:nowrap}
.a-sw{display:block;flex:none;width:28px;height:28px;border-radius:50%}
.a-sw.hairline,.a-anat-l.hairline,.a-ramp i.hairline{box-shadow:inset 0 0 0 1px var(--hair)}
.a-fillimg{position:absolute;inset:0;width:100%;height:100%}
.a-onphoto{position:absolute;left:24px;top:24px;display:block}
.a-onphoto--mid{left:50%;top:50%;transform:translate(-50%,-50%)}
.a-cross{position:absolute;right:12px;top:10px;color:var(--ink);z-index:2}

/* notes beside a screen */
.a-notes{display:block}
.a-n{display:grid;grid-template-columns:24px 1fr;gap:12px;padding:14px 0;border-top:1px solid var(--hair);font-size:13px;line-height:1.5;color:var(--quiet)}
.a-n b{display:block;color:var(--ink);font-size:14px;font-weight:600}
.a-n--pal{grid-template-columns:24px 28px 1fr}

/* phone screens drawn for these pages */
.a-fm{position:relative;padding:16px 20px 0}
.a-fm-t{position:relative;margin-bottom:20px}
.a-fm-h{display:block;font-family:var(--display);font-weight:700;font-size:26px;line-height:1;letter-spacing:-0.01em}
.a-fm>.a-fm-h{margin-bottom:20px}
.a-fld{position:relative;background:var(--card);border-radius:20px;box-shadow:inset 0 0 0 1px var(--hair);padding:12px 16px;margin-bottom:12px}
.a-fld span:not(.mk){display:block;font-size:12px;line-height:16px;color:var(--quiet)}
.a-fld b{display:block;font-size:16px;line-height:24px;font-weight:600}
.a-fm .teach{margin-top:16px}
.a-btn{position:absolute;left:20px;right:20px;bottom:36px;height:44px;border-radius:999px;background:var(--accent);color:var(--card);display:flex;align-items:center;justify-content:center;font:700 16px/1 var(--body)}
.a-msgs{display:flex;flex-direction:column;gap:12px}
.a-msg{position:relative;background:var(--card);border-radius:20px;box-shadow:inset 0 0 0 1px var(--hair);padding:16px 48px 16px 16px}
.a-msg p{font-family:var(--body);font-size:18px;line-height:1.4}
.a-msg div{margin-top:8px}
.a-msg b{font-size:14px;line-height:1.4;font-weight:600;color:var(--quiet)}

/* shared: phones in the flow of the page, phone tops, the "phone and key" frames */
.a-ph{position:relative;width:var(--w);height:var(--h);flex:none}
.a-ph--home{background:var(--panel)}
.a-duo{display:grid;grid-template-columns:360px minmax(0,1fr);gap:40px;margin-top:32px;align-items:start}
.a-duo--r{grid-template-columns:minmax(0,1fr) 360px}
.a-duo--v{grid-template-columns:300px minmax(0,1fr)}
.a-two2{display:grid;grid-template-columns:321px 321px;gap:40px}
.a-notes--t .a-n b{font-size:18px;line-height:1.3}
.a-notes--3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 24px;margin-top:28px}
.a-keyc{display:grid;grid-template-columns:1fr 1fr;gap:0 40px}
.a-keyc .a-n{font-size:13px;color:var(--soft)}
.a-pc{position:relative;width:var(--w);border-radius:28px 28px 0 0;overflow:hidden;box-shadow:0 0 0 1px var(--hair);font-family:var(--body)}
.a-pc .sb{position:relative;z-index:1;height:44px;padding:0 20px;display:flex;align-items:center;font-size:14px;font-weight:700}
.a-pcb{position:absolute;left:0;right:0;top:44px;bottom:0;display:flex;align-items:center;justify-content:center}
.a-ic{display:block;width:52px;height:52px;border-radius:14px;background:var(--hair)}
.a-ic--app{position:relative;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px var(--hair)}
.a-home{display:grid;grid-template-columns:repeat(3,52px);gap:24px 15px;justify-content:center;padding:24px 16px}
.a-dock{position:absolute;left:16px;right:16px;bottom:20px;height:76px;border-radius:24px;background:var(--card);box-shadow:inset 0 0 0 1px var(--hair);display:flex;gap:15px;justify-content:center;align-items:center}
.a-cen{position:absolute;left:0;right:0;top:44px;bottom:0;display:flex;align-items:center;justify-content:center}

/* intro */
.a-il{position:absolute;left:var(--m);top:176px;width:290px;display:flex;flex-direction:column;gap:24px}
.a-h1--s{font-size:40px;max-width:290px}
.a-body--s{margin:0;max-width:290px;font-size:18px}
.a-introph{left:378px;top:200px;width:360px;height:740px}
.a-blk{border-top:1px solid var(--hair);padding-top:14px}

/* personality */
.a-lines{display:flex;gap:32px;margin-top:32px}
.a-lines span{flex:1;font-family:var(--display);font-weight:700;font-size:32px;line-height:1.1;letter-spacing:-0.01em;text-wrap:balance}
.a-pers{margin-top:40px}
.a-pers-l{width:290px}
.a-traits{margin-top:32px}
.a-traits li{display:grid;grid-template-columns:24px 1fr;gap:12px;padding:20px 0;border-top:1px solid var(--hair)}
.a-trait{font-family:var(--body);font-size:24px;line-height:1.2;font-weight:700;margin-bottom:8px}

/* voice, write-this: messages in a thread */
.a-msg--w p{font-weight:700;font-size:17px;line-height:1.35}
.a-msg--n{background:var(--panel);box-shadow:none}
.a-msg--n p{font-size:15px;line-height:1.4;color:var(--quiet)}

/* messaging: a first-run screen */
.a-fr{padding:8px 20px 0}
.a-fr-logo{margin-bottom:28px}
.a-fr-l{position:relative;padding:16px 36px 16px 0;border-top:1px solid var(--hair)}
.a-fr-l p{font-family:var(--body);font-size:20px;line-height:1.3;font-weight:600}
.a-fr-l--h{border-top:0;padding-top:0}
.a-fr-l--h p{font-family:var(--display);font-size:38px;line-height:1.05;font-weight:700;letter-spacing:-0.01em;text-wrap:balance}
.a-bp{display:flex;flex-direction:column;gap:20px;margin-top:24px}
.a-namebar{margin-top:40px}
.a-nr{font-family:var(--body);font-size:20px;line-height:1.45;font-weight:600;max-width:580px}

/* logo in use */
.a-lrow{display:grid;grid-template-columns:repeat(3,214px);gap:20px;margin-top:28px}
.a-lcol .a-n{margin-top:12px}
.a-bar--s{position:relative;justify-content:flex-start;padding:12px 16px}
.a-scr{padding:8px 16px 0;display:flex;flex-direction:column;gap:16px}
.a-t26{font-size:26px;line-height:1.1;white-space:normal}
.a-pool{height:120px}
.a-pool .fl{top:46px}
.a-splash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.a-anat{display:grid;grid-template-columns:auto minmax(0,1fr);gap:24px;align-items:center;margin-top:28px}
.a-anat-l{padding:24px 56px 24px 24px;border-radius:20px}
.a-lw{position:relative}

/* clear space */
.a-zone{position:relative;flex:none;outline:1.5px dashed var(--ink);outline-offset:-1px}
.a-unit{position:absolute;display:grid;place-items:center;background:var(--float);color:var(--ink);font:600 14px/1 var(--chrome)}
.a-zin{position:absolute}

/* minimum size */
.a-spec{margin-bottom:12px}
.a-ruler{display:block;height:6px;border:1.5px solid var(--ink);border-top:0;margin-top:10px;box-sizing:border-box}
.a-crop{position:relative;width:360px;height:560px;border-radius:28px 28px 0 0;box-shadow:0 0 0 1px var(--hair);background:var(--ground);overflow:hidden;font-family:var(--body)}
.a-crop .sb{height:44px;padding:0 24px;display:flex;align-items:center;font-size:14px;font-weight:700}
.a-bar{position:relative;display:flex;justify-content:space-between;align-items:center;padding:12px 20px;font-size:14px;font-weight:600}

/* logo on colour, misuse */
.a-gd{display:grid;grid-template-columns:198px minmax(0,1fr);gap:32px;margin-top:28px;align-items:start}
.a-gcells{display:grid;grid-template-columns:repeat(2,214px);grid-auto-rows:190px;gap:24px}
.a-pc--photo{grid-column:2;grid-row:1/3}
.a-pc--photo .photo-slot{background:var(--ink);color:var(--ground)}
.a-pc--photo .a-onphoto{left:20px;top:64px}
.a-md{display:grid;grid-template-columns:452px minmax(0,1fr);gap:32px;margin-top:28px;align-items:start}
.a-mcells{display:grid;grid-template-columns:repeat(2,214px);gap:24px}
.a-boxed{border:2px solid var(--ink);padding:10px 14px}

/* proportion */
.a-prop{display:grid;grid-template-columns:320px minmax(0,1fr);gap:56px;margin-top:28px;align-items:start}
.a-pg{display:grid;width:320px;height:656px;border-radius:28px;overflow:hidden;box-shadow:0 0 0 1px var(--hair)}
.a-pgcol{display:grid;min-height:0}
.a-pgrow{display:grid}
.a-prop-side{display:flex;flex-direction:column;gap:32px}
.a-plist li{display:grid;grid-template-columns:28px 1fr auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--hair)}
.a-plist li:last-child{border-bottom:1px solid var(--hair)}
.a-pcn{font-size:14px;font-weight:600}
.a-pct{font-size:28px;line-height:1.1;font-weight:600}

/* fixes to the base pages (contents, contrast), see guidelines.js */
.toc li{grid-template-columns:1fr 32px}
.cr{margin-top:20px}
.cr li{padding:6px 0}
.cr .samp{height:34px}
.card--front .lg,.card--front .ln{left:48px}
.card--back .who{left:48px}
.nu{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 16px;margin-top:12px}
.nu span{font-size:12px}

/* colour values: a numbered key beside the phone */
.a-kvs{display:block}
.a-kv{padding:12px 0;border-top:1px solid var(--hair)}
.a-kv:last-child{border-bottom:1px solid var(--hair)}
.a-kvh{display:flex;align-items:center;gap:12px;font-size:14px}
.a-kvh b{font-weight:600}
.a-kvv{display:flex;gap:16px;margin-top:6px;padding-left:76px}
.a-ramp{display:flex;gap:4px;margin-top:10px}
.a-ramp span{flex:1;min-width:0}
.a-ramp i{display:block;height:12px;border-radius:3px}
.a-rampnote{margin-top:8px;padding-left:76px;font-size:12px;line-height:1.5;color:var(--quiet)}
.a-ramp .base i{box-shadow:0 0 0 2px var(--ground),0 0 0 4px var(--ink)}
.a-ramp .base em{color:var(--ink);font-weight:600}
.a-ramp em{display:block;font-style:normal;font-size:12px;line-height:1.5;color:var(--quiet);text-align:center;margin-top:6px}
.a-vbot{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:28px}
.a-tones li{display:flex;align-items:center;gap:12px;margin-top:10px;font-size:14px}
.a-tones b{display:block;font-weight:600}
`;
}
