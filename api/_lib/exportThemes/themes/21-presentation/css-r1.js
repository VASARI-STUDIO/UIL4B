// Styles for the round 1 gate pages (guidelines-r1.js). Chrome is the brand's own body face, so the theme reads as the brand and not as a second font.
export function cssR1(ctx) {
  const d = ctx.brand.fonts.display;
  return `
.pg{--chrome:var(--body)}
.pg--r{font-family:var(--body);font-size:12px;line-height:16px;-webkit-font-smoothing:antialiased}
.pg--r .r-a{position:absolute;box-sizing:border-box}
.pg--r :where(p,h2){margin:0}
.pg--r h2{font-size:inherit}
.pg--r .disp{font-stretch:${d.stretch || 100}%}
.r-hd{position:absolute;left:56px;right:56px;top:28px;height:16px;display:flex;justify-content:space-between;font:400 12px/16px var(--body)}
.r-hd b{font-weight:400;margin-right:16px}
.r-hr i{font-style:normal}
.r-hr b{display:inline-block;width:28px;margin:0 0 0 8px;text-align:right}
.r-hr{margin-right:-0px;position:relative;left:0}
.r-t12{font:400 12px/16px var(--body)}
.r-t15{font:400 15px/24px var(--body)}
.r-t18{font:400 18px/24px var(--body)}
.r-t22{font:600 22px/28px var(--body)}
.r-w500{font-weight:500}
.r-w600{font-weight:600}
.r-lead{font:500 22px/28px var(--body)}
.r-mono{font:400 12px/16px '${ctx.brand.fonts.mono.family}',monospace}
.r-mono.r-t22{font-size:22px;line-height:28px}
.r-nw{white-space:nowrap;margin:0}
.r-ln{display:block;white-space:nowrap}
.pg--r :where(.r-t12,.r-t15,.r-t18){text-wrap:pretty}
.r-set{font-size:26px;line-height:30px}
/* the Track screen at its real phone size (390 x 844): the photograph's screen mask gives the corners, the share button sits 88 px above the foot */
.kphone.r-ph{width:390px;height:844px;border-radius:0}
.r-ph .kph-top{padding:16px 20px 0}
.r-ph .kph-body{padding:16px 20px 88px}
.r-col{display:block}
.r-col .r-bot{position:absolute;left:0;bottom:0}
.r-col .r-t12{margin-top:4px}
`;
}
