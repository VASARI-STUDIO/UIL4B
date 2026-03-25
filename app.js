/* ═══════════════════════════════════════
   VISARI STUDIO — app.js
   ═══════════════════════════════════════ */

const $=id=>document.getElementById(id);
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1400)}
function copyText(t){navigator.clipboard.writeText(t.trim()).then(()=>toast('Copied'))}

// ── Nav ──
function go(id){document.querySelectorAll('.sec').forEach(function(s){s.classList.remove('on')});document.querySelectorAll('.nl[data-s]').forEach(function(l){l.classList.remove('on')});var sec=$('sec-'+id);if(sec)sec.classList.add('on');var nl=document.querySelector('[data-s="'+id+'"]');if(nl)nl.classList.add('on');closeM();window.scrollTo(0,0)}
function toggleNavGroup(el){el.classList.toggle('open');var sub=el.nextElementSibling;if(sub&&sub.classList.contains('nav-sub'))sub.classList.toggle('open')}
function toggleDoc(btn){btn.classList.toggle('open');var body=btn.nextElementSibling;if(body)body.classList.toggle('open')}
function toggleM(){$('sidebar').classList.toggle('open');$('ov').classList.toggle('show')}
function closeM(){$('sidebar').classList.remove('open');$('ov').classList.remove('show')}

// ── Theme ──
function toggleTheme(){var d=document.documentElement,dk=d.getAttribute('data-theme')==='dark';d.setAttribute('data-theme',dk?'light':'dark');$('tl').textContent=dk?'Light':'Dark';$('sw').classList.toggle('on',dk);drawEasing&&drawEasing();localStorage.setItem('vs-t',dk?'light':'dark')}
(function(){var s=localStorage.getItem('vs-t');if(s==='light'){document.documentElement.setAttribute('data-theme','light');$('tl').textContent='Light';$('sw').classList.add('on')}})();

// ── Colour utils ──
function h2hsl(h){var r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;var mx=Math.max(r,g,b),mn=Math.min(r,g,b);var hh,s,l=(mx+mn)/2;if(mx===mn)hh=s=0;else{var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r:hh=((g-b)/d+(g<b?6:0))/6;break;case g:hh=((b-r)/d+2)/6;break;case b:hh=((r-g)/d+4)/6;break}}return[Math.round(hh*360),Math.round(s*100),Math.round(l*100)]}
function hsl2h(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;var a=s*Math.min(l,1-l);var f=function(n){var k=(n+h/30)%12;var c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0')};return'#'+f(0)+f(8)+f(4)}
function h2rgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
function lum(r,g,b){var a=[r,g,b].map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
function cRat(h1,h2){var c1=h2rgb(h1),c2=h2rgb(h2);var l1=lum(c1[0],c1[1],c1[2]),l2=lum(c2[0],c2[1],c2[2]);return(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}

// ── Palette ──
var harm='complement';
var HARMS=['complement','analogous','triadic','split','tetradic'];
var HARM_LABELS={'complement':'Complementary','analogous':'Analogous','triadic':'Triadic','split':'Split Complementary','tetradic':'Tetradic'};
var ROLES=['PRIMARY','CONTAINER','ACCENT','SUBTLE','DEEP'];
function setH(t){harm=t;document.querySelectorAll('#harmBtns .harm-opt').forEach(function(b){b.classList.toggle('on',b.dataset.h===t)});updPal()}
function initHarmBtns(){$('harmBtns').innerHTML=HARMS.map(function(h){return'<button class="harm-opt'+(h===harm?' on':'')+'" data-h="'+h+'" onclick="setH(\''+h+'\')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:'+(h===harm?'var(--accent-bg)':'transparent')+';color:'+(h===harm?'var(--accent)':'var(--t1)')+';font-size:12px;font-weight:'+(h===harm?'600':'400')+';cursor:pointer;width:100%;text-align:left;font-family:var(--font);transition:all .15s">'+HARM_LABELS[h]+'</button>'}).join('')}
function randomPal(){var hex=hsl2h(Math.floor(Math.random()*360),50+Math.floor(Math.random()*40),40+Math.floor(Math.random()*20));$('bCol').value=hex;$('bHex').value=hex;updPal()}
function genHarm(hex,type){var hs=h2hsl(hex),h=hs[0],s=hs[1],l=hs[2];var c=[hex];switch(type){case'complement':c.push(hsl2h(h+180,s,l),hsl2h(h,Math.max(s-20,10),Math.min(l+30,90)),hsl2h(h+180,Math.max(s-20,10),Math.min(l+30,90)),hsl2h(h,s,Math.max(l-25,10)));break;case'analogous':c.push(hsl2h(h-30,s,l),hsl2h(h+30,s,l),hsl2h(h-15,Math.max(s-15,10),Math.min(l+20,90)),hsl2h(h+15,Math.max(s-15,10),Math.min(l+20,90)));break;case'triadic':c.push(hsl2h(h+120,s,l),hsl2h(h+240,s,l),hsl2h(h,Math.max(s-25,10),Math.min(l+25,90)),hsl2h(h+120,Math.max(s-25,10),Math.min(l+25,90)));break;case'split':c.push(hsl2h(h+150,s,l),hsl2h(h+210,s,l),hsl2h(h,s,Math.min(l+30,90)),hsl2h(h+180,s,Math.max(l-20,10)));break;case'tetradic':c.push(hsl2h(h+90,s,l),hsl2h(h+180,s,l),hsl2h(h+270,s,l));break}return c}
function updPal(){var hex=$('bCol').value;$('bHex').value=hex;var c=genHarm(hex,harm);
var cols=c.length;
$('palSwatches').innerHTML='<div class="pal-grid" style="grid-template-columns:repeat('+cols+',1fr)">'+c.map(function(x,i){var hsl=h2hsl(x);var textCol=hsl[2]>55?'rgba(0,0,0,.85)':'rgba(255,255,255,.9)';var role=ROLES[i]||'SWATCH '+(i+1);return'<div class="pal-swatch" style="background:'+x+';color:'+textCol+'" onclick="copyText(\''+x+'\')"><div class="role">'+role+'</div><div class="hex">'+x+'</div></div>'}).join('')+'</div>';
$('palCss').innerHTML='<div class="code" onclick="copyText(this.textContent)" style="font-size:11px">:root {\n'+c.map(function(x,i){return'  --p-'+ROLES[i].toLowerCase()+': '+x+';'}).join('\n')+'\n}</div>';
initHarmBtns()}
var starters=[{n:'Midnight',c:['#0f0f23','#1a1a3e','#4a4a8a','#8888cc','#ccccff']},{n:'Forest',c:['#1a2e1a','#2d5a2d','#4a8c4a','#7bc47b','#c8f0c8']},{n:'Ember',c:['#2d1b0e','#8b4513','#d2691e','#f4a460','#ffe4c4']},{n:'Ocean',c:['#0a1628','#1e3a5f','#3a7bd5','#63b3ed','#bee3f8']},{n:'Plum',c:['#1a0a1a','#4a154b','#7c3085','#b660cd','#e8b4f8']},{n:'Slate',c:['#0f1419','#1e2630','#384250','#6b7b8d','#b0bec5']}];
function ldStarters(){$('starters').innerHTML=starters.map(function(p){return'<div class="card" style="cursor:pointer;padding:10px" onclick="document.getElementById(\'bCol\').value=\''+p.c[2]+'\';document.getElementById(\'bHex\').value=\''+p.c[2]+'\';updPal()"><div style="display:flex;overflow:hidden;margin-bottom:6px">'+p.c.map(function(c){return'<div style="flex:1;height:28px;background:'+c+'"></div>'}).join('')+'</div><div style="font-size:11px;font-weight:600">'+p.n+'</div></div>'}).join('')}

// ── Tints (advanced) ──
var T_LABELS=['50','100','200','300','400','500','600','700','800','900','950'];
// Linear lightness stops (0=darkest, 100=lightest)
var T_LINEAR=[97,93,85,75,62,50,38,28,18,10,5];
// Perceived lightness (accounts for human vision weighting)
var T_PERCEIVED=[98,95,88,78,66,53,40,30,20,12,6];
var tints=[{hex:'#6366f1',anchor:5,hueShift:0,satMin:0,satMax:0,lMin:5,lMax:98,mode:'perceived'}];

function genTintScale(cfg){
  var hs=h2hsl(cfg.hex),h=hs[0],s=hs[1],baseL=hs[2];
  var stops=cfg.mode==='perceived'?T_PERCEIVED:T_LINEAR;
  var n=stops.length,ai=cfg.anchor;
  return stops.map(function(defaultL,i){
    var newL;
    if(i===ai){newL=baseL}
    else if(i<ai){var t=1-(i/ai);newL=baseL+t*(cfg.lMax-baseL)}
    else{var t2=(i-ai)/(n-1-ai);newL=baseL-t2*(baseL-cfg.lMin)}
    newL=Math.max(0,Math.min(100,newL));
    var tNorm=(n-1-i)/(n-1);
    var newH=h+cfg.hueShift*tNorm;
    var satShift=cfg.satMax*tNorm+cfg.satMin*(1-tNorm);
    var newS=Math.max(0,Math.min(100,s+satShift));
    if(i===0||i===n-1)newS=Math.max(0,newS*0.3);
    return hsl2h(newH,Math.round(newS),Math.round(newL));
  });
}

var _tintTimer=null;
function debouncedTints(){clearTimeout(_tintTimer);_tintTimer=setTimeout(renderTints,80)}

function renderTints(){
  $('tintContainer').innerHTML=tints.map(function(cfg,idx){
    var scale=genTintScale(cfg);
    var anchorLabels=['50','100','200','300','400','500','600','700','800','900','950'];
    return '<div class="tint-row">'+
      '<div class="row mb" style="gap:12px">'+
        '<input type="color" value="'+cfg.hex+'" style="width:32px;height:28px" onchange="tints['+idx+'].hex=this.value;document.getElementById(\'tHex'+idx+'\').value=this.value;renderTints()">'+
        '<input type="text" id="tHex'+idx+'" value="'+cfg.hex+'" style="width:80px;font-family:var(--mono);font-size:10px" onchange="tints['+idx+'].hex=this.value;renderTints()">'+
        '<label style="font-size:9px;color:var(--t2)">Anchor</label>'+
        '<select style="width:70px" onchange="tints['+idx+'].anchor=+this.value;renderTints()">'+anchorLabels.map(function(l,i){return'<option value="'+i+'"'+(i===cfg.anchor?' selected':'')+'>'+l+'</option>'}).join('')+'</select>'+
        '<label style="font-size:9px;color:var(--t2)">Mode</label>'+
        '<select style="width:90px" onchange="tints['+idx+'].mode=this.value;renderTints()"><option value="perceived"'+(cfg.mode==='perceived'?' selected':'')+'>Perceived</option><option value="linear"'+(cfg.mode==='linear'?' selected':'')+'>Linear</option></select>'+
        (idx>0?'<button class="btn btn-s" onclick="tints.splice('+idx+',1);renderTints()">Remove</button>':'')+
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(11,1fr);gap:8px;margin-bottom:16px">'+scale.map(function(c,i){var hsl=h2hsl(c);var textCol=hsl[2]>55?'rgba(0,0,0,.7)':'rgba(255,255,255,.7)';var isAnchor=i===cfg.anchor;return'<div style="text-align:center"><div class="tint-swatch" style="background:'+c+'" onclick="copyText(\''+c+'\')"><span class="stop-label" style="color:'+textCol+'">'+T_LABELS[i]+'</span></div><div class="tint-info"><div class="hex">'+c+'</div>'+(isAnchor?'<div class="tint-base-tag">Base</div>':'<div class="lval">L: '+hsl[2]+'%</div>')+'</div></div>'}).join('')+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><label style="font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t2);display:flex;justify-content:space-between">Lightness Max <span style="font-family:var(--mono);font-weight:500;color:var(--t1)">'+cfg.lMax+'</span></label><input type="range" min="60" max="100" value="'+cfg.lMax+'" oninput="tints['+idx+'].lMax=+this.value;debouncedTints()"></div>'+
        '<div><label style="font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t2);display:flex;justify-content:space-between">Lightness Min <span style="font-family:var(--mono);font-weight:500;color:var(--t1)">'+cfg.lMin+'</span></label><input type="range" min="0" max="20" value="'+cfg.lMin+'" oninput="tints['+idx+'].lMin=+this.value;debouncedTints()"></div>'+
        '<div><label style="font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t2);display:flex;justify-content:space-between">Hue Shift <span style="font-family:var(--mono);font-weight:500;color:var(--t1)">'+(cfg.hueShift>0?'+':'')+cfg.hueShift+'°</span></label><input type="range" min="-30" max="30" value="'+cfg.hueShift+'" oninput="tints['+idx+'].hueShift=+this.value;debouncedTints()"></div>'+
        '<div><label style="font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--t2);display:flex;justify-content:space-between">Sat Shift (light end) <span style="font-family:var(--mono);font-weight:500;color:var(--t1)">'+(cfg.satMax>0?'+':'')+cfg.satMax+'</span></label><input type="range" min="-30" max="30" value="'+cfg.satMax+'" oninput="tints['+idx+'].satMax=+this.value;debouncedTints()"></div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function addTint(){tints.push({hex:hsl2h(Math.floor(Math.random()*360),65,50),anchor:5,hueShift:0,satMin:0,satMax:0,lMin:5,lMax:98,mode:'perceived'});renderTints()}

function buildTintData(){
  var result={};
  tints.forEach(function(cfg,idx){
    var scale=genTintScale(cfg);
    var name='colour-'+(idx+1);
    var obj={};
    T_LABELS.forEach(function(l,i){obj[l]=scale[i]});
    result[name]=obj;
  });
  return result;
}

function exportTintCSS(){
  var data=buildTintData();
  var css=':root {\n';
  Object.keys(data).forEach(function(name){
    var stops=data[name];
    Object.keys(stops).forEach(function(k){css+='  --'+name+'-'+k+': '+stops[k]+';\n'});
  });
  css+='}';
  copyText(css);
  $('tintExportOut').innerHTML='<div class="code-l">CSS Variables (copied)</div><div class="code">'+css+'</div>';
}

function exportTintJSON(){
  var data=buildTintData();
  // Framer-compatible JSON format
  var json=JSON.stringify(data,null,2);
  copyText(json);
  $('tintExportOut').innerHTML='<div class="code-l">Framer JSON (copied)</div><div class="code">'+json.replace(/</g,'&lt;')+'</div>';
}

// ── Gradients ──
var gPre=[{n:'Indigo Rose',css:'linear-gradient(135deg,#667eea,#764ba2)'},{n:'Peach',css:'linear-gradient(to right,#ee9ca7,#ffdde1)'},{n:'Aqua',css:'linear-gradient(to right,#1a2980,#26d0ce)'},{n:'Celestial',css:'linear-gradient(to right,#c33764,#1d2671)'},{n:'Relay',css:'linear-gradient(to right,#3a1c71,#d76d77,#ffaf7b)'},{n:'Sublime',css:'linear-gradient(to right,#fc5c7d,#6a82fb)'},{n:'Flare',css:'linear-gradient(to right,#f12711,#f5af19)'},{n:'Moonlit',css:'linear-gradient(to right,#0f2027,#203a43,#2c5364)'},{n:'Frost',css:'linear-gradient(to right,#000428,#004e92)'},{n:'Emerald',css:'linear-gradient(to right,#348f50,#56b4d3)'},{n:'Velvet',css:'linear-gradient(to right,#da4453,#89216b)'}];
function updG(){var c1=$('g1').value,c2=$('g2').value,a=$('gAngle').value,css='linear-gradient('+a+'deg, '+c1+', '+c2+')';$('gP').style.background=css;$('gC').textContent='background: '+css+';';$('gAngleTag').textContent=a+'\u00b0';$('gAngleNum').value=a}
function ldGrad(){$('gPresets').innerHTML=gPre.map(function(g){return'<div class="grad-p" style="background:'+g.css+'" onclick="copyText(\'background: '+g.css+';\')" title="'+g.n+'"></div>'}).join('')}

// ── Contrast ──
function chkC(){
  var fg=$('cF').value,bg=$('cB').value;
  $('cFh').value=fg;$('cBh').value=bg;
  var prev=$('cPrev');prev.style.background=bg;prev.style.color=fg;
  var btn=$('cBtn');if(btn){btn.style.background=fg;btn.style.color=bg}
  var ghost=$('cBtnGhost');if(ghost){ghost.style.borderColor=fg;ghost.style.color=fg}
  var r=cRat(fg,bg),v=r.toFixed(1),aaN=r>=4.5,aaL=r>=3,aaaN=r>=7,aaaL=r>=4.5;
  $('cRatio').textContent=v+':1';
  // Luminance info
  var fgRgb=h2rgb(fg),bgRgb=h2rgb(bg);
  var fgL=lum(fgRgb[0],fgRgb[1],fgRgb[2]).toFixed(3);
  var bgL=lum(bgRgb[0],bgRgb[1],bgRgb[2]).toFixed(3);
  var lumEl=$('cLumInfo');if(lumEl)lumEl.textContent='FG: '+fgL+' \u00b7 BG: '+bgL;
  // Compliance rows with fix buttons
  var rows=[
    ['WCAG AA','Normal Text',4.5,aaN],
    ['WCAG AA','Large Text',3,aaL],
    ['WCAG AAA','Normal Text',7,aaaN],
    ['WCAG AAA','Large Text',4.5,aaaL]
  ];
  $('cRes').innerHTML=rows.map(function(row){
    var pass=row[3];
    var fixBtns='';
    if(!pass)fixBtns='<button class="btn btn-s" style="margin-left:6px" onclick="fixContrast('+row[2]+')">Fix FG</button><button class="btn btn-s" style="margin-left:4px" onclick="fixContrastBG('+row[2]+')">Fix BG</button>';
    return'<div class="comp-row"><div><div class="label">'+row[0]+'</div><div class="sublabel">'+row[1]+'</div></div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px"><span class="tag '+(pass?'tag-pass':'tag-fail')+'">'+(pass?'PASS \u2713':'FAIL')+'</span>'+fixBtns+'</div></div>';
  }).join('');
  // Suggested adjustments
  var sugEl=$('cSuggest'),swEl=$('cSuggestSwatches');
  if(!aaaN&&sugEl&&swEl){var fgHsl2=h2hsl(fg);var sugs=[];[7,4.5,3].forEach(function(tgt){var lo2,hi2;var dk2=parseFloat(bgL)<0.5;if(dk2){lo2=fgHsl2[2];hi2=100}else{lo2=0;hi2=fgHsl2[2]}var best2=fg;for(var j=0;j<30;j++){var mid2=(lo2+hi2)/2;var t2=hsl2h(fgHsl2[0],fgHsl2[1],Math.round(mid2));var r2=cRat(t2,bg);if(r2>=tgt){best2=t2;if(dk2)hi2=mid2;else lo2=mid2}else{if(dk2)lo2=mid2;else hi2=mid2}}if(sugs.indexOf(best2)===-1)sugs.push(best2)});
  sugEl.style.display='flex';swEl.innerHTML=sugs.map(function(c){return'<div class="suggest-sw" style="background:'+c+'" onclick="document.getElementById(\'cF\').value=\''+c+'\';document.getElementById(\'cFh\').value=\''+c+'\';chkC()" title="'+c+'"></div>'}).join('')}
  else if(sugEl){sugEl.style.display='none'}
}

function fixContrast(targetRatio){
  var bg=$('cB').value,fg=$('cF').value,fgHsl=h2hsl(fg);
  var h=fgHsl[0],s=fgHsl[1],l=fgHsl[2];
  var bgLum=lum.apply(null,h2rgb(bg));var isDk=bgLum<0.5;
  var lo,hi;if(isDk){lo=l;hi=100}else{lo=0;hi=l}
  var best=fg;
  for(var i=0;i<30;i++){var mid=(lo+hi)/2;var t=hsl2h(h,s,Math.round(mid));var r=cRat(t,bg);if(r>=targetRatio){best=t;if(isDk)hi=mid;else lo=mid}else{if(isDk)lo=mid;else hi=mid}}
  $('cF').value=best;$('cFh').value=best;chkC();toast('FG adjusted to '+best);
}
function fixContrastBG(targetRatio){
  var fg=$('cF').value,bg=$('cB').value,bgHsl=h2hsl(bg);
  var h=bgHsl[0],s=bgHsl[1],l=bgHsl[2];
  var fgLum=lum.apply(null,h2rgb(fg));var isFgLight=fgLum>0.5;
  var lo,hi;if(isFgLight){lo=0;hi=l}else{lo=l;hi=100}
  var best=bg;
  for(var i=0;i<30;i++){var mid=(lo+hi)/2;var t=hsl2h(h,s,Math.round(mid));var r=cRat(fg,t);if(r>=targetRatio){best=t;if(isFgLight)lo=mid;else hi=mid}else{if(isFgLight)hi=mid;else lo=mid}}
  $('cB').value=best;$('cBh').value=best;chkC();toast('BG adjusted to '+best);
}

function swC(){var f=$('cF').value,b=$('cB').value;$('cF').value=b;$('cB').value=f;chkC()}

// ── Type Scale ──
function genTS(){var base=parseFloat($('tsB').value),ratio=parseFloat($('tsR').value);var nms=['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl'],exps=[-2,-1,0,1,2,3,4,5,6];var css=':root {\n';$('tsOut').innerHTML=exps.map(function(e,i){var s=(base*Math.pow(ratio,e)).toFixed(1);css+='  --text-'+nms[i]+': '+s+'px;\n';return'<div class="ts-row"><div class="ts-meta">'+nms[i]+'<br>'+s+'px</div><div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:'+s+'px;font-weight:'+(e>=3?600:400)+'">The quick brown fox</div></div>'}).reverse().join('');css+='}';$('tsCss').innerHTML='<div class="code-l">CSS Variables</div><div class="code" onclick="copyText(this.textContent)">'+css+'</div>'}

// ── Font Matcher ──
var fontDB={
  'Playfair Display':{w:700,cat:'serif',pairs:['Source Sans 3','DM Sans','Instrument Sans','Commissioner']},
  'Sora':{w:700,cat:'sans',pairs:['DM Sans','Inter Tight','Commissioner','Source Sans 3']},
  'Fraunces':{w:700,cat:'serif',pairs:['Commissioner','Instrument Sans','Inter Tight','Source Sans 3']},
  'Bricolage Grotesque':{w:700,cat:'sans',pairs:['Inter Tight','Source Sans 3','Commissioner','DM Sans']},
  'Outfit':{w:700,cat:'sans',pairs:['DM Sans','Source Sans 3','Commissioner','Instrument Sans']},
  'Manrope':{w:700,cat:'sans',pairs:['Inter Tight','Source Sans 3','DM Sans','Commissioner']},
  'Instrument Sans':{w:700,cat:'sans',pairs:['Source Sans 3','Commissioner','Inter Tight','DM Sans']},
};
function updateFontMatch(){var heading=$('fpSelect').value;var db=fontDB[heading];if(!db)return;$('fpG').innerHTML=db.pairs.map(function(body){var imp=heading.replace(/ /g,'+')+':wght@'+db.w+'&family='+body.replace(/ /g,'+')+':wght@400;500';var url='https://fonts.googleapis.com/css2?family='+imp+'&display=swap';return'<div class="card fp" onclick="copyText(\''+url+'\')"><div class="fp-h" style="font-family:\''+heading+'\','+db.cat+';font-weight:'+db.w+';font-size:24px">The quick brown fox</div><div class="fp-b" style="font-family:\''+body+'\',sans-serif">Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.</div><div class="fp-m">'+heading+' + '+body+' · Click to copy import</div></div>'}).join('')}

// ── Buttons ──
function ldBtns(){var b=[
  {n:'Primary Solid',css:'padding:12px 28px;background:#f5f5f5;color:#0a0a0a;border:none;font-size:14px;font-weight:600'},
  {n:'Outline',css:'padding:12px 28px;background:transparent;color:var(--t0);border:1.5px solid var(--border-h);font-size:14px;font-weight:500'},
  {n:'Ghost',css:'padding:12px 28px;background:transparent;color:var(--t1);border:none;font-size:14px;font-weight:500'},
  {n:'Pill',css:'padding:10px 24px;background:var(--bg-2);color:var(--t0);border:1px solid var(--border);border-radius:999px;font-size:13px;font-weight:500'},
  {n:'Underline',css:'padding:4px 0;background:transparent;color:var(--t0);border:none;border-bottom:1.5px solid var(--t0);font-size:14px;font-weight:500'},
  {n:'Small Tag',css:'padding:5px 14px;background:var(--bg-2);color:var(--t1);border:1px solid var(--border);font-size:11px;font-weight:500'},
  {n:'Large CTA',css:'padding:16px 40px;background:var(--t0);color:var(--bg-0);border:none;font-size:16px;font-weight:700;letter-spacing:-0.01em'},
  {n:'Glass',css:'padding:12px 28px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:14px;font-weight:500;backdrop-filter:blur(12px)'},
];
$('btnG').innerHTML=b.map(function(x){return'<div class="btn-cell"><button style="'+x.css+';cursor:pointer;font-family:var(--font);outline:none">Button</button><span class="bn">'+x.n+'</span><div class="code" style="font-size:9px;width:100%;margin-top:6px;white-space:pre-wrap" onclick="event.stopPropagation();copyText(this.textContent)">'+x.css+'</div></div>'}).join('')}

// ── Layouts ──
function ldLay(){var l=[
  {n:'Hero — Centred',d:'Full-width, centred text stack.',css:'.hero {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  padding: 80px 24px;\n}\n.hero-content { max-width: 720px; }',p:'<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px"><div class="lph" style="width:55%;height:14px"></div><div class="lph" style="width:75%;height:8px"></div><div class="lph" style="width:35%;height:24px;margin-top:3px"></div></div>'},
  {n:'Hero — Split',d:'50/50 text + image.',css:'.split {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 40px;\n  align-items: center;\n}\n@media (max-width: 810px) {\n  .split { grid-template-columns: 1fr; }\n}',p:'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px"><div style="display:flex;flex-direction:column;gap:5px;justify-content:center"><div class="lph" style="height:12px;width:75%"></div><div class="lph" style="height:7px;width:100%"></div></div><div class="lph" style="height:70px"></div></div>'},
  {n:'Feature Grid (3-col)',d:'Auto-wrapping grid.',css:'.features {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 24px;\n}',p:'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px"><div class="lph" style="height:50px"></div><div class="lph" style="height:50px"></div><div class="lph" style="height:50px"></div></div>'},
  {n:'CTA Banner',d:'Full-width centred band.',css:'.cta {\n  padding: 48px 24px;\n  text-align: center;\n}',p:'<div style="background:var(--bg-3);padding:14px;text-align:center"><div class="lph" style="height:10px;width:45%;margin:0 auto 6px"></div><div class="lph" style="height:20px;width:25%;margin:0 auto"></div></div>'},
  {n:'Testimonials',d:'3-col card row.',css:'.testimonials {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}',p:'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:8px"><div class="lph" style="height:44px"></div><div class="lph" style="height:44px"></div><div class="lph" style="height:44px"></div></div>'},
  {n:'Footer — 4 Column',d:'Logo + 3 link columns.',css:'.footer {\n  display: grid;\n  grid-template-columns: 2fr 1fr 1fr 1fr;\n  gap: 32px;\n}',p:'<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:5px;padding:8px"><div class="lph" style="height:36px"></div><div class="lph" style="height:36px"></div><div class="lph" style="height:36px"></div><div class="lph" style="height:36px"></div></div>'},
];
$('layG').innerHTML=l.map(function(x){return'<div class="card" style="padding:12px"><div class="lp">'+x.p+'</div><div style="font-size:12px;font-weight:600;margin:8px 0 2px">'+x.n+'</div><p class="d" style="margin-bottom:5px">'+x.d+'</p><div class="code" style="font-size:10px" onclick="copyText(this.textContent)">'+x.css+'</div></div>'}).join('')}

// ── Icons (CDN + embedded) ──
var activeCat='all';var _iconTimer=null;var iconCdnOk=null;
function debounceIconSearch(){clearTimeout(_iconTimer);_iconTimer=setTimeout(doIconSearch,300)}
function doIconSearch(){
  var q=($('iSrch').value||'').trim();
  if(!q||q.length<2){renderLocalIcons(q);return}
  if(iconCdnOk===false){renderLocalIcons(q);return}
  var pack=$('iPackFilter')?$('iPackFilter').value:'';
  var pfx=pack?'prefix='+pack+'&':'';
  fetch('https://api.iconify.design/search?'+pfx+'query='+encodeURIComponent(q)+'&limit=80',{signal:AbortSignal.timeout(4000)}).then(function(r){return r.json()}).then(function(d){
    iconCdnOk=true;if(!d.icons||!d.icons.length){renderLocalIcons(q);return}
    $('iCats').innerHTML='';
    $('iG').innerHTML=d.icons.map(function(id){var p=id.split(':');var url='https://api.iconify.design/'+p[0]+'/'+p[1]+'.svg?width=24&height=24';return'<div class="ic" onclick="fetchCdnSvg(\''+p[0]+'\',\''+p[1]+'\')"><img src="'+url+'" width="24" height="24" style="filter:var(--icon-inv)" loading="lazy"><span>'+p[1]+'</span><span style="font-size:6px;color:var(--t3)">'+p[0]+'</span></div>'}).join('');
    $('iCount').textContent=d.icons.length;$('iMode').textContent='Live via Iconify';
  }).catch(function(){iconCdnOk=false;renderLocalIcons(q)});
}
function fetchCdnSvg(pack,name){fetch('https://api.iconify.design/'+pack+'/'+name+'.svg?width=24&height=24').then(function(r){return r.text()}).then(function(s){copyText(s)}).catch(function(){toast('Failed')})}
function renderLocalIcons(q){
  q=(q||'').toLowerCase();var pack=$('iPackFilter')?$('iPackFilter').value:'';
  var pm={'tabler':'T','lucide':'L','iconoir':'I','heroicons':'H','simple-icons':'S'};var pc=pm[pack]||'';
  var f=icons.filter(function(i){return(activeCat==='all'||i.c===activeCat)&&(!pack||i.p===pc)&&(!q||i.n.indexOf(q)!==-1||i.c.indexOf(q)!==-1||(CATS[i.c]||'').toLowerCase().indexOf(q)!==-1||(PACKS[i.p]||'').toLowerCase().indexOf(q)!==-1)});
  if(!q){var cc={};f.forEach(function(i){cc[i.c]=(cc[i.c]||0)+1});$('iCats').innerHTML='<button class="pt-t'+(activeCat==='all'?' on':'')+'" onclick="setCat(\'all\',this)">All ('+f.length+')</button>'+Object.entries(CATS).map(function(e){return cc[e[0]]?'<button class="pt-t'+(activeCat===e[0]?' on':'')+'" onclick="setCat(\''+e[0]+'\',this)">'+e[1]+' ('+cc[e[0]]+')</button>':''}).join('')}
  $('iG').innerHTML=f.map(function(i){var fl=i.p==='S';var svg=fl?'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="'+i.d+'"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+i.d+'"/></svg>';var esc=svg.replace(/'/g,"\\'").replace(/"/g,'&quot;');return'<div class="ic" onclick="copyText(\''+esc+'\')"><svg viewBox="0 0 24 24" '+(fl?'fill="currentColor" stroke="none"':'')+'><path d="'+i.d+'"/></svg><span>'+i.n+'</span><span style="font-size:6px;color:var(--t3)">'+PACKS[i.p]+'</span></div>'}).join('');
  $('iCount').textContent=f.length;$('iMode').textContent=iconCdnOk===false?'Offline':'Embedded';
}
function ldIcons(){renderLocalIcons('')}
function setCat(cat,el){activeCat=cat;document.querySelectorAll('#iCats .pt-t').forEach(function(b){b.classList.remove('on')});el.classList.add('on');renderLocalIcons($('iSrch').value)}
function fltI(){renderLocalIcons($('iSrch').value)}

// ── Image Converter ──
var imgFiles=[],imgOriginals=[];
var _imgTimer=null;
function debouncedImgPreview(){clearTimeout(_imgTimer);_imgTimer=setTimeout(updateImgPreview,150)}
function handleImgFiles(files){imgFiles=[];imgOriginals=[];for(var i=0;i<files.length;i++){if(files[i].type.startsWith('image/'))imgFiles.push(files[i])}if(!imgFiles.length)return;$('imgControls').style.display='block';$('imgResults').style.display='block';var loaded=0;imgOriginals=new Array(imgFiles.length);imgFiles.forEach(function(file,idx){var reader=new FileReader();reader.onload=function(e){var img=new Image();img.onload=function(){imgOriginals[idx]={img:img,name:file.name,size:file.size,w:img.width,h:img.height};loaded++;if(loaded===imgFiles.length)updateImgPreview()};img.src=e.target.result};reader.readAsDataURL(file)})}
function updateImgPreview(){var format=$('imgFormat').value;var quality=parseInt($('imgQuality').value)/100;var maxW=parseInt($('imgMaxWidth').value)||0;var ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/avif':'avif'}[format]||'webp';var list=$('imgList');list.innerHTML='';imgOriginals.forEach(function(orig,idx){if(!orig)return;var canvas=document.createElement('canvas');var ctx=canvas.getContext('2d');var w=orig.w,h=orig.h;if(maxW>0&&w>maxW){h=Math.round(h*(maxW/w));w=maxW}canvas.width=w;canvas.height=h;if(format==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h)}ctx.drawImage(orig.img,0,0,w,h);var dataUrl;try{dataUrl=canvas.toDataURL(format,quality)}catch(e){dataUrl=canvas.toDataURL('image/png')}var cs=Math.round((dataUrl.length-dataUrl.indexOf(',')-1)*0.75);var sv=orig.size>0?Math.round((1-cs/orig.size)*100):0;var sc=sv>0?'color:#16a34a':'color:#dc2626';var bn=orig.name.replace(/\.[^.]+$/,'');var card=document.createElement('div');card.className='card';card.style.padding='10px';card.innerHTML='<div style="background:var(--bg-2);margin-bottom:8px;overflow:hidden"><img src="'+dataUrl+'" style="width:100%;display:block;max-height:160px;object-fit:contain"></div><div style="font-size:11px;font-weight:600;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+bn+'.'+ext+'</div><div style="font-size:10px;color:var(--t2);margin-bottom:2px">'+w+' × '+h+'px</div><div style="font-size:10px;color:var(--t2)">'+formatBytes(orig.size)+' → '+formatBytes(cs)+' <span style="'+sc+';font-weight:600">'+(sv>0?'−':'+')+Math.abs(sv)+'%</span></div><button class="btn btn-s" style="margin-top:8px;width:100%" onclick="downloadImg('+idx+')">Download</button>';list.appendChild(card)})}
function formatBytes(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function downloadImg(idx){var orig=imgOriginals[idx];if(!orig)return;var format=$('imgFormat').value;var quality=parseInt($('imgQuality').value)/100;var maxW=parseInt($('imgMaxWidth').value)||0;var ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/avif':'avif'}[format]||'webp';var canvas=document.createElement('canvas');var ctx=canvas.getContext('2d');var w=orig.w,h=orig.h;if(maxW>0&&w>maxW){h=Math.round(h*(maxW/w));w=maxW}canvas.width=w;canvas.height=h;if(format==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h)}ctx.drawImage(orig.img,0,0,w,h);canvas.toBlob(function(blob){if(!blob){toast('Format not supported');return}var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=orig.name.replace(/\.[^.]+$/,'')+'.'+ext;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(a.href);toast('Downloaded '+a.download)},format,quality)}
function convertAllImages(){imgOriginals.forEach(function(_,idx){setTimeout(function(){downloadImg(idx)},idx*200)})}
function clearImages(){imgFiles=[];imgOriginals=[];$('imgControls').style.display='none';$('imgResults').style.display='none';$('imgList').innerHTML='';$('imgFileInput').value=''}

// ── Prompt Library (localStorage) ──
function getPrompts(){try{return JSON.parse(localStorage.getItem('vs-prompts')||'[]')}catch(e){return[]}}
function setPrompts(p){localStorage.setItem('vs-prompts',JSON.stringify(p))}
function savePrompt(){var text=$('promptText').value.trim();if(!text){toast('Enter a prompt first');return}var tags=$('promptTags').value.trim();var fileInput=$('promptImg');var prompt={id:Date.now(),text:text,tags:tags,img:'',date:new Date().toLocaleDateString('en-AU')};if(fileInput.files&&fileInput.files[0]){var reader=new FileReader();reader.onload=function(e){prompt.img=e.target.result;var prompts=getPrompts();prompts.unshift(prompt);setPrompts(prompts);$('promptText').value='';$('promptTags').value='';fileInput.value='';renderPrompts();toast('Prompt saved')};reader.readAsDataURL(fileInput.files[0])}else{var prompts=getPrompts();prompts.unshift(prompt);setPrompts(prompts);$('promptText').value='';$('promptTags').value='';renderPrompts();toast('Prompt saved')}}
function renderPrompts(){var prompts=getPrompts();var q=($('promptSearch').value||'').toLowerCase();var filtered=prompts.filter(function(p){return!q||p.text.toLowerCase().indexOf(q)!==-1||(p.tags||'').toLowerCase().indexOf(q)!==-1});$('promptEmpty').style.display=filtered.length?'none':'block';$('promptGrid').innerHTML=filtered.map(function(p){return'<div class="prompt-card">'+(p.img?'<img src="'+p.img+'" alt="Output">':'<div style="width:100%;height:80px;background:var(--bg-2);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:10px;color:var(--t2)">No image</div>')+'<div class="prompt-text" onclick="copyText(this.textContent)">'+p.text.replace(/</g,'&lt;')+'</div><div style="display:flex;justify-content:space-between;align-items:center"><div class="prompt-meta">'+(p.tags?p.tags+' · ':'')+p.date+'</div><button class="btn btn-s" onclick="deletePrompt('+p.id+')">Delete</button></div></div>'}).join('')}
function deletePrompt(id){var prompts=getPrompts().filter(function(p){return p.id!==id});setPrompts(prompts);renderPrompts();toast('Deleted')}

// ── Init ──
document.addEventListener('DOMContentLoaded',function(){
  initHarmBtns();updPal();ldStarters();renderTints();updG();ldGrad();chkC();
  genTS();updateFontMatch();
  ldBtns();ldLay();ldIcons();
  renderPrompts();
});
