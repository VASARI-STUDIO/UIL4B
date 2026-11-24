import { esc } from './specimens.mjs';

export function libraryPage(editions, planned) {
  const index=editions.map(({id,name})=>`<a href="#${id}"><img width="1280" height="720" src="${id}/brand/cover.jpg" alt=""><span>${name}</span></a>`).join('');
  const sections=editions.map(({id,name,discipline,project,guides})=>{
    const rows=guides.map(({product,title,stem,detailPage,colourPage})=>{
      const dir=id+'/'+product+'/';
      const preview=(label,jpg,page)=>`<a href="${dir}deck.html#page-${page}"><img width="1280" height="720" loading="lazy" src="${dir}${jpg}.jpg" alt="${esc(name)} ${esc(label)}"><span>${label}</span></a>`;
      return `<article><div class="spread">${preview(title,'cover',1)}${preview(product==='brand'?'Brand application':'Component states','detail',detailPage)}${preview('Colour in use','colour',colourPage)}</div><div class="guide-links"><h3>${title}</h3><p><a href="${dir}a4.html">A4 HTML</a><a href="${dir}deck.html">Deck HTML</a><a href="${dir}a4.pdf">A4 PDF</a><a href="${dir}deck.pdf">Deck PDF</a></p><a class="zip" href="${dir}${stem}.zip" download>Download ZIP</a></div></article>`;
    }).join('');
    return `<section id="${id}"><header><h2>${name}</h2><p>${discipline}<br>${esc(project)}</p></header>${rows}<a class="back" href="#collection">Back to collection</a></section>`;
  }).join('');
  return `<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UIL4B · Studio editions</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f6f4ef;color:#242320;font:16px/1.45 Arial,sans-serif}main{max-width:1520px;margin:auto;padding:0 4vw 70px}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:3px solid #9d411e;outline-offset:4px}h1,h2,h3,p{margin:0}h1,h2{font:normal clamp(55px,7.4vw,112px)/.98 Georgia,serif;letter-spacing:-.06em}.topline{border-bottom:1px solid;display:flex;justify-content:space-between;padding:20px 0 12px}.intro{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:40px 0 26px}.intro p{max-width:37ch}nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}nav a,.spread a{text-decoration:none;display:grid;gap:5px}img{display:block;width:100%;height:auto;border:1px solid #bebbb4}nav span{font-size:15px}section{margin-top:86px;scroll-margin-top:20px}section header{border-block-start:3px solid;padding:20px 0;display:flex;justify-content:space-between;align-items:end}section header p{text-align:right}article{margin:12px 0 32px}.spread{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.spread span,.back{font-size:13px}.guide-links{border-top:1px solid #b1ada4;margin-top:12px;padding-top:12px;display:flex;align-items:center;gap:20px}.guide-links h3{font-size:19px}.guide-links p{display:flex;flex-wrap:wrap;gap:14px}.zip{margin-left:auto;padding:9px 16px;background:#22211e;color:white;text-decoration:none}footer{border-top:1px solid;margin-top:65px;padding-top:15px}
  @media(max-width:760px){.intro,.guide-links{align-items:start;flex-direction:column}.zip{margin:0}nav{grid-template-columns:repeat(2,minmax(0,1fr))}.spread{grid-template-columns:1fr 1fr}.spread a:first-child{grid-column:1/-1}.guide-links{gap:9px}section{margin-top:48px}section header{display:block}section header p{text-align:left;margin-top:8px}}
  </style><main id="collection"><div class="topline"><b>UI L4B</b><span>Export library</span></div><div class="intro"><h1>Studio editions</h1><p>Brand guidelines and UI style guides in A4 and widescreen. Each download includes offline HTML, PDFs and individual PNG pages. <a href="collection-proof.jpg">Compare all spreads</a>.</p></div><nav aria-label="Browse themes">${index}</nav>${sections}<footer><b>Planned editions</b><p>${planned.join(' · ')}</p></footer></main></html>`;
}

export async function saveComparison(browser, root, editions) {
  const { pathToFileURL } = await import('node:url');
  const { join } = await import('node:path');
  const page=await browser.newPage({viewport:{width:1340,height:1100},deviceScaleFactor:1});
  try {
    const rows=editions.map(e=>{
      const images=['cover','detail','colour'].map(part=>`<img src="${pathToFileURL(join(root,e.id,'brand',part+'.jpg')).href}" alt="">`);
      return `<section><h2>${esc(e.name)}</h2>${images.join('')}</section>`;
    }).join('');
    await page.goto(pathToFileURL(join(root,editions[0].id,'brand','deck.html')).href);
    await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#eeeae3;color:#262522}main{padding:25px;width:1340px}header,section{display:grid;grid-template-columns:126px repeat(3,minmax(0,1fr));gap:12px;align-items:center}header{padding-bottom:12px;font:16px Arial}section{border-top:1px solid #b4ada2;padding:12px 0}h2{font:26px/1 Georgia,serif;letter-spacing:-.045em;margin:0}img{display:block;width:100%;border:1px solid #bcb5a9}</style><main><header><b>UI L4B</b><span>Brand guidelines</span><span>Application</span><span>Colour</span></header>${rows}</main>`);
    await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
    await page.locator('main').screenshot({type:'jpeg',quality:90,path:join(root,'collection-proof.jpg')});
  } finally {await page.close();}
}
