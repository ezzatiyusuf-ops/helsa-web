import { chromium } from 'playwright';
const B='http://127.0.0.1:3000';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:2});
const p=await c.newPage();
await p.goto(`${B}/products/date-coconut-sugar`,{waitUntil:'domcontentloaded'});
await p.waitForTimeout(2500);
await p.screenshot({path:'/home/user/product-shots/pdp-date-coconut-real.png'});
// گالری: کلیک روی تصویر ۲
const thumbs=p.locator('button[aria-label*="تصویر"], img[alt*="قند خرما"]');
console.log('thumbs:', await thumbs.count());
await b.close();
