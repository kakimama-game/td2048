import { chromium } from 'playwright';
const URL=process.argv[2]||'file:///workspace/td2048/dist/index.html';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto(URL);await p.waitForFunction(()=>window.__ready,null,{timeout:60000});
await p.screenshot({path:'shots/v2_0start.png'});await p.click('#bStart');
await p.evaluate(()=>{const d=__dbg;d.board=[2,4,8,16,32,64,128,256,512,1024,2048,2,0,0,4,2];
 [['0,1',2],['2,1',16],['3,3',8],['4,4',4],['6,3',32],['0,6',128],['2,6',256],['4,6',512],['6,6',64]].forEach(([k,v])=>d.place(d.cells[k],v));
 d.G.wave=9;d.G.next=0.1;});
await p.click('[data-sp="3"]');
await p.waitForTimeout(12000);await p.screenshot({path:'shots/v2_1wave.png'});
// tap placed unit at cell 3,3 -> menu
const pos=await p.evaluate(()=>{const c=__dbg.cells['3,3'];return null});
await p.evaluate(()=>__dbg.openMenu(__dbg.cells['3,3'].unit));await p.screenshot({path:'shots/v2_2menu.png'});
await p.click('#umDel');const removed=await p.evaluate(()=>!__dbg.cells['3,3'].unit);
await p.click('#bLegend');await p.screenshot({path:'shots/v2_3legend.png'});await p.click('#lgClose');
const st=await p.evaluate(()=>JSON.stringify({w:__dbg.G.wave,hp:__dbg.G.hp,s:__dbg.G.score,types:__dbg.enemies.map(e=>e.type).join(','),q:__dbg.G.queue.length}));
console.log(errs,removed,st);await b.close();
