const path=require('node:path');
const { chromium } = require('C:/Users/salih/Desktop/GüncelProjelerim/KaynarMotor/node_modules/@playwright/test');
(async()=>{
 const b=await chromium.launch({channel:'chrome'});
 const p=await b.newPage({viewport:{width:1300,height:900}});
 await p.goto('file:///'+__dirname.split(path.sep).join('/')+'/sayfa/onizleme.html');
 await p.waitForTimeout(6000);
 await p.evaluate(async()=>{for(const i of document.images){i.loading='eager'}}); await p.waitForTimeout(6000); console.log(await p.evaluate(()=>{const im=[...document.images];return im.length+' görsel, yüklü: '+im.filter(i=>i.complete&&i.naturalWidth>0).length+', kırık: '+im.filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.alt).join('|')}));
 await p.click('button[data-mod="a"]');
 console.log('A modunda görünen görsel:', await p.evaluate(()=>[...document.images].filter(i=>i.offsetParent!==null).length));
 await p.click('button[data-mod="b"]');
 console.log('B modunda görünen görsel:', await p.evaluate(()=>[...document.images].filter(i=>i.offsetParent!==null).length));
 await p.click('button[data-mod="hepsi"]');
 await p.click('#servis .fa .buyut');
 console.log('büyütme açık:', await p.evaluate(()=>document.getElementById('buyuk').classList.contains('acik')));
 await b.close();
})();
