import { chromium } from 'playwright';
const B='http://127.0.0.1:3000';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:2});
const p=await c.newPage();
for (const slug of ['date-coconut-sugar','moiz-uzbek','dried-mulberries']) {
  await p.goto(`${B}/products/${slug}`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2200);
  await p.screenshot({path:`/home/user/product-shots/owner-${slug}.png`});
  console.log('✓',slug);
}
await b.close();
