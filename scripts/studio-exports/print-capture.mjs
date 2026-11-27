import { writeFile } from 'node:fs/promises';

// Resizing textured photographs can trigger a second raster pass in Chromium.
export async function printCapture(page,options={}) {
  const {path,...capture}=options;
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all([...document.images].map(image=>image.decode()));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  let previous=await page.screenshot(capture);
  for(let attempt=0;attempt<5;attempt++){
    const current=await page.screenshot(capture);
    if(current.equals(previous)){
      if(path) await writeFile(path,current);
      return current;
    }
    previous=current;
  }
  throw new Error('The photographed surface did not settle before capture.');
}
