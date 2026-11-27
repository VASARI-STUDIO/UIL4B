import { readFileSync } from 'node:fs';
import { esc } from './specimens.mjs';

const css=readFileSync(new URL('./library.css',import.meta.url),'utf8');

export function libraryPage(editions) {
  const index=editions.map(({id,name,discipline})=>`<a href="#${id}"><img src="${id}/in-print.jpg" alt="${esc(name)} in print" width="1200" height="980"><span class="listing"><b>${esc(name)}</b><small>${esc(discipline)}</small></span></a>`).join('');
  const sections=editions.map(({id,name,discipline,project,guides,description})=>{
    const rows=guides.map(({product,title,stem,detailPage,colourPage,interfacePage})=>{
      const dir=id+'/'+product+'/';
      const preview=(label,jpg,page)=>`<a href="${dir}deck.html#page-${page}"><img width="1280" height="720" loading="lazy" src="${dir}${jpg}.jpg" alt="${esc(name)} ${esc(label)}"><span>${label}</span></a>`;
      return `<article><div class="guide-links"><h3>${title}</h3><p><a href="${dir}a4.html">A4 HTML</a><a href="${dir}deck.html">Deck HTML</a><a href="${dir}a4.pdf">A4 PDF</a><a href="${dir}deck.pdf">Deck PDF</a></p><a class="zip" href="${dir}${stem}.zip" download>Download ZIP</a></div><div class="spread">${preview(title,'cover',1)}${preview(product==='brand'?'Brand application':'Component states','detail',detailPage)}${product==='brand'?preview('Colour study','colour',colourPage):preview('Working interface','interface',interfacePage)}</div></article>`;
    }).join('');
    return `<section id="${id}"><header><h2>${esc(name)}</h2><p>${esc(discipline)}<br>${esc(project)}</p></header><div class="visuals"><img loading="lazy" src="${id}/in-print.jpg" alt="${esc(name)} print proof"><div>${description?`<p>${esc(description)}</p>`:''}<a href="${id}/edition.jpg" download>Download the edition image · 4:5 JPG</a></div></div>${rows}<a class="back" href="#collection">Back to collection</a></section>`;
  }).join('');
  return `<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio editions · UI L4B</title><style>${css}</style><main id="collection"><div class="mast"><b>UI L4B</b><div><a href="print-collection.jpg">Print collection</a><a href="collection-proof.jpg">Brand spreads</a><a href="ui-proof.jpg">UI spreads</a></div></div><div class="intro"><h1>Studio editions</h1><p>Brand guidelines and working UI style guides. Available in A4 and widescreen, as PDF, HTML and individual page images.</p></div><nav aria-label="Browse editions">${index}</nav>${sections}</main></html>`;
}

export async function saveComparison(browser, root, editions) {
  const { pathToFileURL } = await import('node:url');
  const { join } = await import('node:path');
  const page=await browser.newPage({viewport:{width:1340,height:1100},deviceScaleFactor:1});
  try {
    for(const product of ['brand','ui']){
      const sections=product==='brand'?['cover','detail','colour']:['cover','interface','detail'];
      const headings=product==='brand'?['Brand guidelines','Application','Colour']:['UI style guide','Working interface','Component states'];
      const rows=editions.map(e=>{
        const images=sections.map(part=>`<img src="${pathToFileURL(join(root,e.id,product,part+'.jpg')).href}" alt="">`);
        return `<section><h2>${esc(e.name)}</h2>${images.join('')}</section>`;
      }).join('');
      await page.goto(pathToFileURL(join(root,editions[0].id,'brand','deck.html')).href);
      await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#eeeae3;color:#262522}main{padding:25px;width:1340px}header,section{display:grid;grid-template-columns:126px repeat(3,minmax(0,1fr));gap:12px;align-items:center}header{padding-bottom:12px;font:16px Arial}section{border-top:1px solid #b4ada2;padding:12px 0}h2{font:26px/1 Georgia,serif;letter-spacing:-.045em;margin:0}img{display:block;width:100%;border:1px solid #bcb5a9}</style><main><header><b>UI L4B</b>${headings.map(h=>'<span>'+h+'</span>').join('')}</header>${rows}</main>`);
      await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
      await page.locator('main').screenshot({type:'jpeg',quality:90,path:join(root,product==='brand'?'collection-proof.jpg':'ui-proof.jpg')});
    }
    const covers=editions.map(e=>`<figure><img src="${pathToFileURL(join(root,e.id,'in-print.jpg')).href}"><figcaption>${esc(e.name)}</figcaption></figure>`).join('');
    await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0}main{width:1340px;background:#f5f3ed;color:#211f1c;padding:30px}h1{margin:0 0 20px;font:44px/1 Georgia,serif;letter-spacing:-.055em}div{display:grid;grid-template-columns:repeat(5,1fr);gap:21px 10px}figure{margin:0}img{display:block;object-fit:cover;width:100%;aspect-ratio:1.2}figcaption{margin-top:7px;font:21px/1.1 Georgia,serif}</style><main><h1>Studio editions</h1><div>${covers}</div></main>`);
    await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
    await page.locator('main').screenshot({type:'jpeg',quality:94,path:join(root,'print-collection.jpg')});
  } finally {await page.close();}
}
