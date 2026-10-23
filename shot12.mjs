import { chromium } from 'playwright';
const B='http://127.0.0.1:3000';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:2});
const p=await c.newPage();
await p.goto(`${B}/products/dried-mulberries`,{waitUntil:'domcontentloaded'});
await p.waitForTimeout(2200);
await p.screenshot({path:'/home/user/product-shots/owner-dried-mulberries.png'});
await b.close();
