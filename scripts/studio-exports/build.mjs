import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { zipFiles } from '../../api/_lib/exportThemes/engine/files.js';
import { photographCards } from './cards.mjs';
import { sampleProject } from './samples.mjs';
import { renderTemplate } from './document.mjs';
import { libraryPage, saveComparison } from './gallery.mjs';
import { makePhotographs, findScenes } from './photography.mjs';
import { themes } from './themes.mjs';

const {values}=parseArgs({options:{out:{type:'string'},theme:{type:'string'},project:{type:'string'},scenes:{type:'string'}}});
if (!values.out) throw new Error('Pass --out followed by the output directory.');
if (values.theme && !Object.hasOwn(themes,values.theme)) throw new Error('Unknown theme '+values.theme);
const root=path.resolve(values.out);
const project=values.project && JSON.parse(await readFile(values.project,'utf8'));
const selected=values.theme?[values.theme]:Object.keys(themes);
const titles={brand:'Brand guidelines',ui:'UI style guide'};
const sceneRoot=await findScenes(values.scenes);
const browser=await chromium.launch({channel:'chromium'});
const editions=[];
const run=promisify(execFile);
const scratch=await mkdtemp(path.join(tmpdir(),'uil4b-exports-'));
try {
  for (const id of selected) {
    const data=project || sampleProject(id), theme=themes[id];
    const edition={id,name:theme.name,discipline:theme.discipline,project:data.name,guides:[]};
    editions.push(edition);
    const photographs=await makePhotographs(browser,sceneRoot,id,data);
    photographs.stationery=await photographCards(browser,sceneRoot,id,data);
    for (const [product,title] of Object.entries(titles)) {
      const dir=path.join(root,id,product);
      await mkdir(dir,{recursive:true});
      const files={};
      let detailPage,colourPage,interfacePage;
      for (const layout of ['deck','a4']) {
        const {html,files:code,license}=renderTemplate(data,id,product,layout,photographs);
        Object.assign(files,code,{'LICENSES.txt':license});
        files[layout+'.html']=html;
        const htmlPath=path.join(dir,layout+'.html');
        await writeFile(htmlPath,html);
        const width=layout==='deck'?1280:794,height=layout==='deck'?720:1123;
        const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,colorScheme:'light'});
        try {
          await page.goto(pathToFileURL(htmlPath).href);
          await page.emulateMedia({media:'print'});
          await page.evaluate(()=>document.fonts.ready);
          const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
          // Chromium timestamps vary between identical renders. Preserve xref offsets.
          files[layout+'.pdf']=Buffer.from(pdf.toString('latin1').replace(/\/(?:CreationDate|ModDate)\s*\(D:\d{14}[^)]*\)/g,m=>m.replace(/\d{14}/,'20000101000000')),'latin1');
          await writeFile(path.join(dir,layout+'.pdf'),files[layout+'.pdf']);
          // Rasterise the final PDF so the previews and page images match the print composition.
          const pdfPath=path.join(dir,layout+'.pdf');
          await run('pdftoppm',['-r','192','-png',pdfPath,path.join(scratch,'page')]);
          const sheets=page.locator('main>.sheet');
          for(let i=0;i<await sheets.count();i++) {
            const sheet=sheets.nth(i), section=(await sheet.getAttribute('class')).split(' ')[1];
            const file='images/'+layout+'/'+String(i+1).padStart(2,'0')+'-'+section+'.png';
            const number=String(i+1).padStart(String(await sheets.count()).length,'0');
            files[file]=await readFile(path.join(scratch,'page-'+number+'.png'));
          }
          if(layout==='deck'){
            const detail=page.locator('main>.sheet.'+(product==='brand'?'application':'components'));
            detailPage=Number((await detail.getAttribute('id')).slice(5));
            colourPage=Number((await page.locator('main>.sheet.colour').first().getAttribute('id')).slice(5));
            const previews=[['cover',1],['detail',detailPage],['colour',colourPage]];
            if(product==='ui'){
              interfacePage=Number((await page.locator('main>.sheet.interface').getAttribute('id')).slice(5));
              previews.push(['interface',interfacePage]);
            }
            for(const [label,number] of previews){
              await run('pdftoppm',['-f',String(number),'-l',String(number),'-singlefile','-r','96','-jpeg',pdfPath,path.join(dir,label)]);
            }
          }
        } finally {await page.close();}
      }
      const stem=id+'-'+(product==='brand'?'brand-guidelines':'ui-style-guide');
      await writeFile(path.join(dir,stem+'.zip'),await zipFiles(files,stem));
      edition.guides.push({product,title,stem,detailPage,colourPage,interfacePage});
      console.log(theme.name+' / '+title+' complete');
    }
  }
  await saveComparison(browser,root,editions);
} finally {await browser.close();await rm(scratch,{recursive:true,force:true});}
await writeFile(path.join(root,'index.html'),libraryPage(editions));
