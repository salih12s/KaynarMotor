const path=require('node:path');
const { chromium } = require('C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor/node_modules/@playwright/test');
(async()=>{
 const b=await chromium.launch({channel:'chrome'});
 for (const [ad,w] of [['masa',1300],['tel',400]]){
  const p=await b.newPage({viewport:{width:w,height:900}});
  await p.goto('file:///'+__dirname.split(path.sep).join('/')+'/sayfa/onizleme.html');
  await p.waitForTimeout(2500);
  const tasma=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const yuk=await p.evaluate(()=>document.documentElement.scrollHeight);
  console.log(ad,'taşma',tasma,'yükseklik',yuk);
  await p.screenshot({path:path.join(__dirname,'sayfa',ad+'.png'),fullPage:true});
 }
 await b.close();
})();
