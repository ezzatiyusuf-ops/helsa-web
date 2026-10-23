import { chromium } from 'playwright';
const B='http://127.0.0.1:3000';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:2});
const p=await c.newPage();
for (const slug of ['date-coconut-sugar','moiz-uzbek','dried-mulberries']) {
  await p.goto(`${B}/products/${slug}`,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2000);
  await p.screenshot({path:`/home/user/product-shots/real-${slug}.png`});
  const t=await p.locator('body').innerText();
  console.log(slug, '| عنوان ok:', t.includes(slug==='date-coconut-sugar'?'قند خرما نارگیلی هلسا':slug==='moiz-uzbek'?'مویز ممتاز ازبک':'توت خشک'), '| قیمت:', (t.match(/[۰-۹٬,]{5,}/g)||[]).slice(0,1));
}
await b.close();
