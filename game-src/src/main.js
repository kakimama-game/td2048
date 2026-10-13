import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import A from './assets_data.js';
import { initAudio, sfx, toggleMute, isMuted } from './audio.js';

// ---------- enemy types & tower classes ----------
const ET={
 n:{name:'通常',icon:'👾',col:null,hp:1,spd:1},
 armor:{name:'装甲',icon:'🛡️',col:'#8a96a8',hp:1.7,spd:.8},
 ghost:{name:'霊体',icon:'👻',col:'#c08cff',hp:1.1,spd:.95,ghost:1},
 fast:{name:'俊足',icon:'⚡',col:'#ffd23c',hp:.7,spd:1.9},
 fly:{name:'飛行',icon:'🦅',col:'#5fe3ff',hp:.8,spd:.75,fly:1},
 boss:{name:'ボス',icon:'💀',col:null,hp:12,spd:.6},
};
const CLS={ // which enemy types each class can damage
 arrow:{name:'弓系',hits:['n','fast','fly','boss']},
 melee:{name:'近接',hits:['n','boss']},
 blast:{name:'爆発',hits:['n','armor','boss']},
 magic:{name:'魔法',hits:['n','ghost','fly','boss']},
 hero:{name:'英雄',hits:['n','armor','ghost','fast','boss']},
 all:{name:'伝説',hits:['n','armor','ghost','fast','fly','boss']},
};
const U={
 2:{name:'弓兵の塔',icon:'🏹',cls:'arrow',dmg:5,rate:.8,range:2.1,col:'#7bb661'},
 4:{name:'剣士',icon:'🗡️',cls:'melee',dmg:16,rate:.6,range:1.3,melee:1,col:'#3c8fc7'},
 8:{name:'大砲塔',icon:'💣',cls:'blast',dmg:24,rate:1.4,range:2.5,splash:.9,col:'#5a6fd1'},
 16:{name:'魔法塔',icon:'🔮',cls:'magic',dmg:30,rate:.7,range:2.6,col:'#9b59d6'},
 32:{name:'連弩の塔',icon:'🏹',cls:'arrow',dmg:60,rate:.45,range:2.8,col:'#3fa66b'},
 64:{name:'騎士',icon:'⚔️',cls:'melee',dmg:260,rate:.55,range:1.5,melee:1,cleave:.8,col:'#2f6fb0'},
 128:{name:'投石塔',icon:'🪨',cls:'blast',dmg:320,rate:2,range:3.6,splash:1.2,col:'#c45ac0'},
 256:{name:'魔晶塔',icon:'💎',cls:'magic',dmg:280,rate:.35,range:3.2,col:'#e0508a'},
 512:{name:'連射塔',icon:'🔫',cls:'arrow',dmg:450,rate:.22,range:3.4,col:'#e5603c'},
 1024:{name:'英雄',icon:'🦸',cls:'hero',dmg:2600,rate:.5,range:1.9,melee:1,cleave:1,col:'#eb8a1f'},
 2048:{name:'伝説の城',icon:'👑',cls:'all',dmg:6000,rate:.5,range:5.5,splash:2,col:'#e8b915'},
};
const unit=v=>U[v]||{name:'神の塔',icon:'🌟',cls:'all',dmg:6000*v/2048,rate:.4,range:6,splash:2.2,col:'#f4d03f'};
const canHit=(u,e)=>CLS[u.def.cls].hits.includes(e.type);
const hitIcons=c=>CLS[c].hits.filter(t=>t!=='boss').map(t=>ET[t].icon).join('');

// ---------- three setup ----------
const canvas=document.getElementById('c'),top=document.getElementById('top');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();scene.background=new THREE.Color('#87c4e8');scene.fog=new THREE.Fog('#87c4e8',18,34);
const camera=new THREE.PerspectiveCamera(40,1,.1,100);
scene.add(new THREE.HemisphereLight('#ffffff','#5a6a50',1.6));const sun=new THREE.DirectionalLight('#fff4dd',2.2);sun.position.set(4,10,6);scene.add(sun);
const COLS=7,ROWS=9;const W=(c,r)=>new THREE.Vector3(c-(COLS-1)/2,0,r-(ROWS-1)/2);
const WP=[[1,0],[1,2],[5,2],[5,5],[1,5],[1,7],[3,7],[3,8]];
const pathSet=new Set();for(let i=0;i<WP.length-1;i++){let [c,r]=WP[i];const [c2,r2]=WP[i+1];while(true){pathSet.add(c+','+r);if(c===c2&&r===r2)break;c+=Math.sign(c2-c);r+=Math.sign(r2-r);}}
const wpW=WP.map(([c,r])=>W(c,r));wpW.unshift(W(1,-1.2));const BASE=W(3,8);
const segLen=[];let pathLen=0;for(let i=0;i<wpW.length-1;i++){const l=wpW[i].distanceTo(wpW[i+1]);segLen.push(l);pathLen+=l;}
function posAt(d,out){for(let i=0;i<segLen.length;i++){if(d<=segLen[i]||i===segLen.length-1)return out.copy(wpW[i]).lerp(wpW[i+1],Math.min(1,d/segLen[i]));d-=segLen[i];}}
function fitCamera(){const w=top.clientWidth,h=top.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
 const vf=THREE.MathUtils.degToRad(camera.fov),hf=2*Math.atan(Math.tan(vf/2)*camera.aspect);
 const d=Math.max((COLS+.6)/2/Math.tan(hf/2),(ROWS+1)*.82/2/Math.tan(vf/2))+2.2;const a=THREE.MathUtils.degToRad(58);
 camera.position.set(0,Math.sin(a)*d,Math.cos(a)*d+.3);camera.lookAt(0,0,.5);camera.updateProjectionMatrix();}
addEventListener('resize',fitCamera);

// ---------- assets ----------
const M={};
function b64buf(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;}
async function loadAll(){const jobs=[];for(const [kit,tex] of [['td',A.tdTex],['md',A.mdTex]]){const mgr=new THREE.LoadingManager();mgr.setURLModifier(u=>/colormap\.png$/.test(u)?tex:u);const L=new GLTFLoader(mgr);
 for(const n in A[kit])jobs.push(new Promise((res,rej)=>L.parse(b64buf(A[kit][n]),'',g=>{M[n]=g.scene;res();},rej)));}await Promise.all(jobs);}
const mk=n=>skClone(M[n]);
function stack(names,width=.8){const g=new THREE.Group();let y=0;for(const n of names){const m=mk(n);const b=new THREE.Box3().setFromObject(m);m.position.y=y-b.min.y;y+=b.max.y-b.min.y;g.add(m);}
 const b=new THREE.Box3().setFromObject(g);g.scale.setScalar(width/Math.max(b.max.x-b.min.x,b.max.z-b.min.z));return g;}
function sized(n,width){const m=mk(n);const b=new THREE.Box3().setFromObject(m);m.scale.setScalar(width/Math.max(b.max.x-b.min.x,b.max.z-b.min.z));const w=new THREE.Group();w.add(m);m.position.y=-b.min.y*m.scale.x;return w;}
function unitModel(v){switch(v){
 case 2:return stack(['tower-round-bottom-a','tower-round-top-a','weapon-ballista'],.62);
 case 4:return sized('character-human',.58);
 case 8:return stack(['tower-square-bottom-a','tower-square-top-a','weapon-cannon'],.72);
 case 16:return stack(['tower-round-bottom-b','tower-round-top-b','tower-round-crystals'],.66);
 case 32:return stack(['tower-round-bottom-a','tower-round-middle-a','tower-round-top-a','weapon-ballista'],.72);
 case 64:return sized('character-human',.75);
 case 128:return stack(['tower-square-bottom-b','tower-square-middle-a','tower-square-top-b','weapon-catapult'],.8);
 case 256:return stack(['tower-round-bottom-b','tower-round-middle-b','tower-round-middle-b','tower-round-crystals'],.78);
 case 512:return stack(['tower-square-bottom-c','tower-square-middle-b','tower-square-middle-a','weapon-turret'],.8);
 case 1024:return sized('character-human',.95);
 default:return stack(['tower-round-bottom-c','tower-round-middle-a','tower-round-middle-b','tower-round-top-b','tower-round-crystals'],.92);}}
function canvasSprite(draw,w,h,sx,sy){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));s.scale.set(sx,sy,1);s.renderOrder=5;return s;}
function label(v){return canvasSprite(x=>{x.fillStyle=unit(v).col;x.beginPath();x.roundRect(4,4,120,56,16);x.fill();x.strokeStyle='#fff';x.lineWidth=5;x.stroke();x.fillStyle='#fff';x.font='bold 40px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(v,64,34);},128,64,.5,.25);}
const iconTex={};function iconSprite(t){if(!iconTex[t]){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle=ET[t].col||'#fff';x.beginPath();x.arc(32,32,30,0,7);x.fill();x.font='38px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(ET[t].icon,32,35);iconTex[t]=new THREE.CanvasTexture(c);}
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex[t],depthTest:false}));s.scale.set(.26,.26,1);s.renderOrder=8;return s;}

// ---------- world ----------
const cells={};const hl=[];
const hlMat=new THREE.MeshBasicMaterial({color:'#5dff7a',transparent:true,opacity:.38,depthWrite:false});
const pathMat=new THREE.MeshLambertMaterial({color:'#d9b77a'});
const ring=new THREE.Mesh(new THREE.RingGeometry(.96,1,48),new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:.7,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;ring.visible=false;scene.add(ring);
function buildWorld(){const tile=mk('tile');const tb=new THREE.Box3().setFromObject(tile);const ts=1/(tb.max.x-tb.min.x);const th=(tb.max.y-tb.min.y)*ts;
 for(let r=-2;r<ROWS+2;r++)for(let c=-2;c<COLS+2;c++){const p=W(c,r);const t=mk('tile');t.scale.setScalar(ts);t.position.set(p.x,-th-tb.min.y*ts,p.z);scene.add(t);
  const inside=c>=0&&c<COLS&&r>=0&&r<ROWS;
  if(!inside){if(Math.random()<.55){const d=sized(['detail-tree','detail-tree-large','detail-rocks','detail-tree'][Math.random()*4|0],.5+Math.random()*.3);d.position.copy(p);d.rotation.y=Math.random()*6;scene.add(d);}continue;}
  if(pathSet.has(c+','+r)){const m=new THREE.Mesh(new THREE.BoxGeometry(1.001,.04,1.001),pathMat);m.position.set(p.x,0,p.z);scene.add(m);continue;}
  cells[c+','+r]={c,r,p,unit:null};const h=new THREE.Mesh(new THREE.PlaneGeometry(.9,.9),hlMat);h.rotation.x=-Math.PI/2;h.position.set(p.x,.03,p.z);h.visible=false;scene.add(h);hl.push(h);}
 const sp=sized('spawn-round',.95);sp.position.copy(W(1,-1));scene.add(sp);
 const base=stack(['tower-square-bottom-c','tower-square-middle-b','tower-square-roof-a'],.95);base.position.copy(BASE);scene.add(base);
 const bn=sized('banner',.4);bn.position.copy(BASE).add(new THREE.Vector3(.45,0,.3));scene.add(bn);}

// ---------- state ----------
let G,speed=1;const enemies=[],units=[],shots=[],fx=[];
const $=id=>document.getElementById(id);
function newGame(){for(const a of [enemies,units,shots,fx]){for(const o of a)scene.remove(o.obj);a.length=0;}
 for(const k in cells)cells[k].unit=null;closeMenu();
 G={hp:20,wave:0,score:0,t:0,next:10,queue:[],spawnT:0,over:false,best:+localStorage.td2048best||0};
 board=Array(16).fill(0);sel=-1;for(let i=0;i<4;i++)addTile();renderBoard();hud();}
function hud(){$('hWave').textContent='WAVE '+G.wave;$('hHp').textContent='❤️ '+Math.max(0,G.hp);$('hScore').textContent='⭐ '+G.score;
 const pv=pool(G.wave+1).map(([t])=>ET[t].icon).join('')+(((G.wave+1)%5===0)?'💀':'');
 $('hNext').textContent=(enemies.length?'敵 '+enemies.length+'体 ／ ':'')+(G.queue.length?'敵が来ています！':'次のウェーブ '+Math.ceil(G.next)+'秒')+'　次:'+pv;}
let msgT;function msg(t){const m=$('msg');m.textContent=t;m.style.opacity=1;clearTimeout(msgT);msgT=setTimeout(()=>m.style.opacity=0,1700);}

// ---------- waves ----------
const UFO={n:'enemy-ufo-a',armor:'enemy-ufo-b',ghost:'enemy-ufo-c',fast:'enemy-ufo-d',fly:'enemy-ufo-a'};
function pool(w){const p=[['n',4]];if(w>=3)p.push(['armor',Math.min(4,1+(w-3)*.5)]);if(w>=5)p.push(['fast',Math.min(4,1+(w-5)*.5)]);if(w>=7)p.push(['ghost',Math.min(4,1+(w-7)*.5)]);
 if(w>=9){const tot=p.reduce((s,x)=>s+x[1],0);const f=Math.min(.6,.15+.04*(w-9));p.push(['fly',tot*f/(1-f)]);}if(w>=12&&w%4===0)return [['fly',1]];return p;}
function startWave(){G.wave++;const w=G.wave;const n=Math.min(5+2*w,45);const p=pool(w);const tot=p.reduce((s,x)=>s+x[1],0);G.queue=[];
 for(let i=0;i<n;i++){let r=Math.random()*tot;for(const [t,wt] of p){r-=wt;if(r<=0){G.queue.push(t);break;}}}if(w%5===0)G.queue.push('boss');
 G.ehp=Math.round(12*Math.pow(1.24,w-1)*(1+w*.02));G.espd=Math.min(.85+.03*w,1.6);G.eint=Math.max(.9-.025*w,.28);G.spawnT=0;sfx('wave');
 const intro={3:'🛡️装甲が登場！ 爆発系(💣🪨)で倒そう',5:'⚡俊足が登場！ 弓系(🏹🔫)で倒そう',7:'👻霊体が登場！ 魔法系(🔮💎)で倒そう',9:'🦅飛行が登場！ 弓系・魔法系で撃ち落とせ'}[w];
 msg(intro||(w>=12&&w%4===0?'🦅 飛行大群ウェーブ！':w%5===0?'⚠️ ボスウェーブ '+w+'！':'ウェーブ '+w+' 開始！'));if(intro)$('msg').style.fontSize='15px';else $('msg').style.fontSize='';}
function tint(o,col,ghost){o.traverse(m=>{if(m.isMesh){m.material=m.material.clone();if(col){m.material.color.lerp(new THREE.Color(col),.6);m.material.emissive=new THREE.Color(col).multiplyScalar(.25);}if(ghost){m.material.transparent=true;m.material.opacity=.55;}}});}
function spawnEnemy(type){const et=ET[type],boss=type==='boss';const hp=G.ehp*et.hp;const o=new THREE.Group();const m=sized(boss?'character-orc':UFO[type],boss?.75:type==='fly'?.45:.5);tint(m,et.col,et.ghost);o.add(m);m.position.y=boss?0:.25;
 const bg=new THREE.Mesh(new THREE.PlaneGeometry(.6,.08),new THREE.MeshBasicMaterial({color:'#300',depthTest:false}));const fg=new THREE.Mesh(new THREE.PlaneGeometry(.6,.08),new THREE.MeshBasicMaterial({color:'#4f4',depthTest:false}));
 const bar=new THREE.Group();bar.add(bg,fg);fg.position.z=.001;bar.position.y=boss?1.1:.85;bg.renderOrder=6;fg.renderOrder=7;o.add(bar);
 if(type!=='n'&&!boss){const ic=iconSprite(type);ic.position.set(-.42,bar.position.y,0);o.add(ic);}scene.add(o);
 const e={obj:o,m,bar,fg,hp,max:hp,d:0,spd:G.espd*et.spd,boss,type,dead:false,len:pathLen};
 if(et.fly){e.from=new THREE.Vector3((Math.random()-.5)*7,0,-6.5);e.len=e.from.distanceTo(BASE);o.position.copy(e.from);}
 enemies.push(e);}
function hurt(e,dmg){if(e.dead)return;e.hp-=dmg;if(e.hp<=0){e.dead=true;G.score+=e.boss?50*G.wave:5*G.wave;boom(e.obj.position,e.boss?'#ff5':'#fa4',e.boss?.9:.5,e.obj.position.y+.4);sfx('kill');hud();}}

// ---------- fx ----------
const sphG=new THREE.SphereGeometry(1,8,6);
function boom(p,col,s,y=.4){const m=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8}));m.position.copy(p).setY(y);m.scale.setScalar(.1);scene.add(m);fx.push({obj:m,t:0,s});}
function shoot(u,e){const c=u.def.cls,big=c==='blast'||c==='all';const m=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:big?'#333':c==='magic'?'#f6f':'#ffe9a0'}));m.scale.setScalar(big?.1:.06);
 m.position.copy(u.obj.position).setY(u.h);scene.add(m);shots.push({obj:m,e,u,dmg:u.def.dmg,splash:u.def.splash||0,spd:big?6:11});sfx(big?'boom':c==='magic'?'zap':'shoot');}

// ---------- placement / unit menu ----------
function place(cell,v){if(cell.unit){if(cell.unit.v>=v){msg('もっと大きい数字で上書きできます');sfx('no');return false;}removeUnit(cell.unit,true);}
 const o=new THREE.Group();const m=unitModel(v);o.add(m);const b=new THREE.Box3().setFromObject(m);const lb=label(v);lb.position.y=b.max.y+.22;o.add(lb);o.position.copy(cell.p);scene.add(o);
 const u={obj:o,m,v,def:unit(v),cd:0,h:Math.max(.3,b.max.y*.85),cell,anim:0};units.push(u);cell.unit=u;boom(cell.p,'#7f7',.6);sfx('place');msg(unit(v).name+' を配置！');return true;}
function removeUnit(u,quiet){scene.remove(u.obj);units.splice(units.indexOf(u),1);u.cell.unit=null;if(!quiet){boom(u.cell.p,'#ccc',.5);sfx('remove');msg(u.def.name+' を撤去しました');}}
let menuU=null;const MN=$('umenu');
function openMenu(u){menuU=u;const d=u.def;$('umTitle').textContent=`${d.icon} ${d.name} (${u.v})`;$('umInfo').textContent=`${CLS[d.cls].name}：${hitIcons(d.cls)} に攻撃可能`;
 ring.visible=true;ring.position.x=u.obj.position.x;ring.position.z=u.obj.position.z;ring.scale.set(d.range,d.range,1);
 const v=u.obj.position.clone().setY(.6).project(camera);MN.classList.remove('hide');const W_=top.clientWidth,H_=top.clientHeight;
 let x=(v.x+1)/2*W_,y=(1-v.y)/2*H_;x=Math.max(90,Math.min(W_-90,x));y=y>H_/2?y-MN.offsetHeight-20:y+20;MN.style.left=(x-MN.offsetWidth/2)+'px';MN.style.top=Math.max(4,y)+'px';sfx('ui');}
function closeMenu(){menuU=null;MN.classList.add('hide');ring.visible=false;}
$('umDel').onclick=()=>{if(menuU)removeUnit(menuU);closeMenu();};$('umCancel').onclick=()=>{closeMenu();sfx('ui');};

// ---------- 2048 ----------
let board,sel=-1,newIdx=new Set();
function addTile(){const e=[];board.forEach((v,i)=>!v&&e.push(i));if(!e.length)return;const i=e[Math.random()*e.length|0];board[i]=Math.random()<.9?2:4;newIdx.add(i);}
function renderBoard(){const B=$('board');B.innerHTML='';board.forEach((v,i)=>{const d=document.createElement('div');d.dataset.i=i;
 if(!v)d.className='cell';else{const u=unit(v);d.className='t k'+String(v).length+(i===sel?' sel':'')+(newIdx.has(i)?' pop':'');d.style.background=u.col;d.innerHTML=`<div class="i">${u.icon}</div><div class="n">${v}</div><div class="l">${u.name}</div><div class="h">${hitIcons(u.cls)}</div>`;}B.appendChild(d);});newIdx.clear();
 hl.forEach(h=>h.visible=sel>=0);
 $('info').textContent=sel>=0?`「${unit(board[sel]).name}(${board[sel]})」を緑マスに配置 / もう一度タップで解除`:'スワイプで合体 → タイル→マップで配置 / ユニットをタップで撤去';}
function move(dir){if(G.over)return;let moved=false,merged=false;const nb=Array(16).fill(0);
 for(let k=0;k<4;k++){const idx=[];for(let j=0;j<4;j++){const [r,c]=dir==='L'?[k,j]:dir==='R'?[k,3-j]:dir==='U'?[j,k]:[3-j,k];idx.push(r*4+c);}
  const vals=idx.map(i=>board[i]).filter(Boolean);const out=[];for(let j=0;j<vals.length;j++){if(vals[j]===vals[j+1]){out.push(vals[j]*2);G.score+=vals[j]*2;newIdx.add(idx[out.length-1]);merged=true;j++;}else out.push(vals[j]);}
  idx.forEach((i,j)=>{nb[i]=out[j]||0;if(nb[i]!==board[i])moved=true;});}
 if(!moved){newIdx.clear();return;}board=nb;sel=-1;addTile();renderBoard();hud();sfx(merged?'merge':'move');}
addEventListener('keydown',e=>{const m={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D'}[e.key];if(m){e.preventDefault();move(m);}});
const BD=$('board');let ts=null;
BD.addEventListener('pointerdown',e=>{ts={x:e.clientX,y:e.clientY,t:e.target.closest('[data-i]')};});
BD.addEventListener('pointerup',e=>{if(!ts)return;const dx=e.clientX-ts.x,dy=e.clientY-ts.y;closeMenu();
 if(Math.hypot(dx,dy)>22)move(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U'));
 else if(ts.t){const i=+ts.t.dataset.i;if(board[i]){sel=sel===i?-1:i;renderBoard();sfx('ui');}}ts=null;});
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),tmp=new THREE.Vector3();
canvas.addEventListener('pointerdown',e=>{if(G.over)return;const r=canvas.getBoundingClientRect();
 ray.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-(e.clientY-r.top)/r.height*2+1},camera);if(!ray.ray.intersectPlane(plane,tmp))return;
 const c=Math.round(tmp.x+(COLS-1)/2),rr=Math.round(tmp.z+(ROWS-1)/2);const cell=cells[c+','+rr];
 if(sel<0){if(cell&&cell.unit){openMenu(cell.unit);return;}closeMenu();msg('下のタイルをタップして選んでね');return;}
 closeMenu();if(!cell){msg('ここには置けません');sfx('no');return;}
 if(place(cell,board[sel])){board[sel]=0;sel=-1;renderBoard();}});

// ---------- loop ----------
let last=performance.now();const tv=new THREE.Vector3();
function tick(now){requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000);last=now;if(G&&!G.over&&started)for(let i=0;i<speed&&!G.over;i++)update(dt);
 for(const e of enemies)e.bar.quaternion.copy(camera.quaternion);renderer.render(scene,camera);}
const flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function update(dt){G.t+=dt;
 if(G.queue.length){G.spawnT-=dt;if(G.spawnT<=0){spawnEnemy(G.queue.shift());G.spawnT=G.eint;if(!G.queue.length)G.next=12;}}
 else{G.next-=dt;if(G.next<=0)startWave();}
 if(Math.floor(G.t*4)!==Math.floor((G.t-dt)*4))hud();
 for(const e of enemies){if(e.dead)continue;const p0=e.obj.position.clone();e.d+=e.spd*dt;
  if(e.from){e.obj.position.copy(e.from).lerp(BASE,Math.min(1,e.d/e.len));e.obj.position.y=1.3*Math.min(1,(e.len-e.d)/1.5+.1);}else posAt(e.d,e.obj.position);
  const dx=e.obj.position.x-p0.x,dz=e.obj.position.z-p0.z;if(dx||dz)e.m.rotation.y=Math.atan2(dx,dz);
  if(!e.boss)e.m.position.y=.25+Math.sin(G.t*5+e.d)*.05;e.fg.scale.x=Math.max(0,e.hp/e.max);e.fg.position.x=-.3*(1-e.fg.scale.x);
  if(e.d>=e.len){e.dead=true;G.hp-=e.boss?5:1;boom(e.obj.position,'#f33',.7);sfx('leak');msg('城がダメージ！');hud();if(G.hp<=0)gameOver();}}
 for(let i=enemies.length-1;i>=0;i--)if(enemies[i].dead){scene.remove(enemies[i].obj);enemies.splice(i,1);}
 for(const u of units){u.cd-=dt;if(u.anim>0){u.anim-=dt;u.m.rotation.x=u.def.melee?Math.sin(u.anim*20)*.5:0;}if(u.cd>0)continue;
  let best=null;for(const e of enemies){if(e.dead||!canHit(u,e))continue;const d=flat(e.obj.position,u.obj.position);if(d<=u.def.range&&(!best||e.d/e.len>best.d/best.len))best=e;}
  if(!best)continue;u.cd=u.def.rate;
  if(u.def.melee){u.m.rotation.y=Math.atan2(best.obj.position.x-u.obj.position.x,best.obj.position.z-u.obj.position.z);u.anim=.3;sfx('melee');
   if(u.def.cleave){for(const e of enemies)if(canHit(u,e)&&flat(e.obj.position,best.obj.position)<=u.def.cleave)hurt(e,u.def.dmg);}else hurt(best,u.def.dmg);boom(best.obj.position,'#fff',.25);}
  else shoot(u,best);}
 for(let i=shots.length-1;i>=0;i--){const s=shots[i];const tp=s.e.obj.position.clone();tp.y+=.35;tv.subVectors(tp,s.obj.position);const L=tv.length(),st=s.spd*dt;
  if(L<=st||s.e.dead){if(!s.e.dead||s.splash){if(s.splash){for(const e of enemies)if(canHit(s.u,e)&&e.obj.position.distanceTo(s.e.obj.position)<=s.splash)hurt(e,s.dmg);boom(tp,'#f80',s.splash*.6,tp.y);}else hurt(s.e,s.dmg);}scene.remove(s.obj);shots.splice(i,1);}
  else s.obj.position.addScaledVector(tv,st/L);}
 for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=dt;f.obj.scale.setScalar(.1+f.s*f.t*3);f.obj.material.opacity=.8*(1-f.t/.3);if(f.t>=.3){scene.remove(f.obj);fx.splice(i,1);}}}
function gameOver(){G.over=true;sfx('over');const best=Math.max(G.best,G.score);localStorage.td2048best=best;$('oTxt').innerHTML=`ウェーブ ${G.wave} まで到達<br>スコア ${G.score}<br>ベスト ${best}`;$('over').classList.remove('hide');}

// ---------- UI buttons ----------
document.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{speed=+b.dataset.sp;document.querySelectorAll('[data-sp]').forEach(x=>x.classList.toggle('on',x===b));sfx('ui');});
const muteBtn=$('bMute');const setMuteIcon=()=>muteBtn.textContent=isMuted()?'🔇':'🔊';setMuteIcon();muteBtn.onclick=()=>{initAudio();toggleMute();setMuteIcon();};
function buildLegend(){let h='<h2>敵のタイプと弱点</h2><table>';for(const t of ['n','armor','fast','ghost','fly']){const ok=Object.entries(U).filter(([v,u])=>CLS[u.cls].hits.includes(t)).map(([v,u])=>u.icon+v).join(' ');
 h+=`<tr><td class="ei" style="background:${ET[t].col||'#7a8'}">${ET[t].icon}</td><td><b>${ET[t].name}</b><br><small>効く: ${ok}</small></td></tr>`;}
 h+='</table><p class="s">🛡️装甲=W3〜 ⚡俊足=W5〜 👻霊体=W7〜 🦅飛行=W9〜（道を無視して城へ直進）。💀ボスは5WAVEごと、全タワーが攻撃可能。タイルの下の小アイコン＝攻撃できる敵。</p>';$('lgBody').innerHTML=h;}
buildLegend();$('bLegend').onclick=()=>{$('legend').classList.remove('hide');sfx('ui');};$('lgClose').onclick=()=>$('legend').classList.add('hide');
let started=false;
$('bStart').onclick=()=>{initAudio();$('start').classList.add('hide');started=true;newGame();msg('最初の敵は10秒後！');};
$('bRe').onclick=()=>{initAudio();$('over').classList.add('hide');newGame();};
(async()=>{await loadAll();buildWorld();fitCamera();newGame();requestAnimationFrame(tick);window.__ready=true;})();
window.__dbg={get G(){return G},get board(){return board},set board(b){board=b;renderBoard()},enemies,units,move,place,cells,startWave,openMenu,set speed(s){speed=s}};
