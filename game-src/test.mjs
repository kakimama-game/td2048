import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file:///workspace/td2048/dist/index.html');await p.waitForFunction(()=>window.__ready,null,{timeout:60000});
await p.screenshot({path:'shots/0start.png'});await p.click('#bStart');
await p.evaluate(()=>{const d=__dbg;d.board=[2,4,8,16,32,64,128,256,512,1024,2048,2,0,0,4,2];});
// tap tile 0 then map cell (0,0)
const box=await p.locator('#board [data-i="3"]').boundingBox();await p.mouse.click(box.x+20,box.y+20);
await p.screenshot({path:'shots/1sel.png'});
await p.evaluate(()=>{const d=__dbg;const ks=Object.keys(d.cells);const vals=[2,4,8,16,32,64,128,256,512,1024,2048];['0,1','2,1','3,3','4,4','6,3','0,6','2,6','4,6','2,8','4,8','6,6'].forEach((k,i)=>d.place(d.cells[k],vals[i]));});
await p.waitForTimeout(45000);await p.screenshot({path:'shots/2play.png'});
await p.evaluate(()=>__dbg.move('L'));await p.screenshot({path:'shots/3.png'});
console.log(errs, await p.evaluate(()=>JSON.stringify({w:__dbg.G.wave,hp:__dbg.G.hp,s:__dbg.G.score,e:__dbg.enemies.length,b:__dbg.board})));await b.close();
