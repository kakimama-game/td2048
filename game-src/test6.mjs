import { chromium } from 'playwright';
const URL=process.argv[2]||'file:///workspace/td2048/dist/index.html',P=process.argv[3]||'v3';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL);await p.waitForFunction(()=>window.__ready,null,{timeout:60000});
await p.screenshot({path:`shots/${P}_0start.png`});await p.click('#bStart');
await p.evaluate(()=>{__dbg.board=[2,4,8,16,32,64,128,256,0,0,0,0,0,0,0,0];});
const tap=async s=>{const bx=await p.locator(s).boundingBox();await p.mouse.click(bx.x+bx.width/2,bx.y+bx.height/2);};
await tap('#board [data-i="7"]');await tap('#store [data-s="0"]');   // stash 256
await tap('#board [data-i="1"]');await tap('#store [data-s="1"]');   // stash 4
await tap('#store [data-s="0"]');await p.screenshot({path:`shots/${P}_1storesel.png`});
await tap('#board [data-i="12"]');                                    // put 256 back at empty 12
const r1=await p.evaluate(()=>JSON.stringify({b:__dbg.board,s:__dbg.store}));
await tap('#store [data-s="1"]');
// deploy from store onto map via canvas tap: find screen pos of cell 2,3
await p.evaluate(()=>{const d=__dbg;[['0,1',2],['2,1',16],['3,3',8],['6,3',32],['2,6',256],['4,6',512]].forEach(([k,v])=>d.place(d.cells[k],v));d.G.wave=7;d.G.next=.1;});
await p.click('[data-sp="3"]');await p.waitForTimeout(14000);await p.screenshot({path:`shots/${P}_2play.png`});
console.log(errs,r1,await p.evaluate(()=>JSON.stringify({w:__dbg.G.wave,hp:__dbg.G.hp,units:__dbg.units.map(u=>u.v+':'+u.dur.toFixed(1)).join(' '),s:__dbg.store,q:__dbg.G.queue.length})));await b.close();
