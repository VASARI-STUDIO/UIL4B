// Prepares a prompt's demo page for the "See it running" iframe.
//
// The page is fetched and handed to the frame as `srcdoc` so a small bridge
// script can be added to it. The frame stays sandboxed with scripts only (an
// opaque origin: it cannot read this page's storage or cookies), which also
// means this page cannot hear the frame's key presses. The bridge fixes the
// two things that breaks:
//
//   · Escape pressed while focus is inside the frame posts a message, and the
//     modal closes, the same as Escape anywhere else in the dialog.
//   · In-page anchor links (`href="#section"`) scroll inside the frame. A
//     srcdoc document with a <base> would otherwise treat them as navigation
//     to another URL.
//
//   · Teardown. The bridge records every WebGL context the page creates and
//     releases each one (WEBGL_lose_context) on `pagehide`, which fires when
//     the modal unmounts the frame. Browsers cap live WebGL contexts per
//     process, so opening several 3D demos in a row must not leave the earlier
//     ones holding theirs until garbage collection.
//
// <base> points relative asset URLs at the page's real folder, so a page that
// loads its own files still finds them.

export const PREVIEW_MESSAGE = 'uil4b-preview'

const BRIDGE = `<script>(function(){`
  + `var gls=[];var P=window.HTMLCanvasElement&&HTMLCanvasElement.prototype;var get=P&&P.getContext;`
  + `if(get){P.getContext=function(t){var c=get.apply(this,arguments);`
  + `if(c&&/webgl/i.test(String(t))&&gls.indexOf(c)<0)gls.push(c);return c}}`
  + `addEventListener('pagehide',function(){for(var i=0;i<gls.length;i++){`
  + `try{var x=gls[i].getExtension('WEBGL_lose_context');if(x)x.loseContext()}catch(_){}}gls.length=0});`
  + `addEventListener('keydown',function(e){if(e.key==='Escape'){try{parent.postMessage({source:'${PREVIEW_MESSAGE}',type:'escape'},'*')}catch(_){}}},true);`
  + `addEventListener('click',function(e){if(e.defaultPrevented)return;`
  + `var a=e.target&&e.target.closest?e.target.closest('a[href^="#"]'):null;if(!a)return;e.preventDefault();`
  + `var id=decodeURIComponent(a.getAttribute('href').slice(1));var t=id?document.getElementById(id):null;`
  + `var smooth=!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);`
  + `if(t)t.scrollIntoView({behavior:smooth?'smooth':'auto'});else window.scrollTo({top:0,behavior:smooth?'smooth':'auto'})});`
  + `})()</script>`

/**
 * @param html     the demo page's source
 * @param baseHref absolute URL of the folder the page is served from
 * @returns the page with <base> and the bridge placed first in <head>
 */
export function framePreviewHtml(html, baseHref) {
  const source = String(html ?? '')
  const inject = `<base href="${String(baseHref).replace(/"/g, '&quot;')}">${BRIDGE}`
  const head = /<head[^>]*>/i.exec(source)
  if (head) return source.slice(0, head.index + head[0].length) + inject + source.slice(head.index + head[0].length)
  const htmlTag = /<html[^>]*>/i.exec(source)
  if (htmlTag) return source.slice(0, htmlTag.index + htmlTag[0].length) + `<head>${inject}</head>` + source.slice(htmlTag.index + htmlTag[0].length)
  return `<head>${inject}</head>${source}`
}

/** True for a message the bridge sent from `frameWindow`. */
export function isPreviewEscape(event, frameWindow) {
  return !!frameWindow && event?.source === frameWindow
    && event?.data?.source === PREVIEW_MESSAGE && event.data.type === 'escape'
}
