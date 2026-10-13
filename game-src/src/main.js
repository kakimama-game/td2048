import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import A from './assets_data.js';

// ---------- units ----------
const U = {
 2:{name:'弓兵の塔',icon:'🏹',dmg:5,rate:.8,range:2.1,col:'#7bb661'},
 4:{name:'弓兵の塔II',icon:'🏹',dmg:11,rate:.7,range:2.4,col:'#4fa36b'},
 8:{name:'剣士',icon:'🗡️',dmg:30,rate:.6,range:1.3,melee:1,col:'#3c8fc7'},
 16:{name:'大砲塔',icon:'💣',dmg:45,rate:1.4,range:2.6,splash:.9,col:'#5a6fd1'},
 32:{name:'騎士',icon:'⚔️',dmg:110,rate:.55,range:1.5,melee:1,cleave:.8,col:'#8a5ad1'},
 64:{name:'投石塔',icon:'🪨',dmg:200,rate:2,range:3.6,splash:1.2,col:'#c45ac0'},
 128:{name:'魔晶塔',icon:'💎',dmg:140,rate:.3,range:3,col:'#e0508a'},
 256:{name:'連射塔',icon:'🔫',dmg:300,rate:.22,range:3.2,col:'#e5603c'},
 512:{name:'英雄',icon:'🦸',dmg:1200,rate:.5,range:1.8,melee:1,cleave:1,col:'#eb8a1f'},
 1024:{name:'天空の砦',icon:'🏰',dmg:2200,rate:.6,range:4.2,splash:1.6,col:'#e8b915'},
 2048:{name:'伝説の城',icon:'👑',dmg:6000,rate:.5,range:5.5,splash:2,col:'#f4d03f'},
};
const unit = v => U[v] || {name:'神の塔',icon:'🌟',dmg:6000*v/2048,rate:.4,range:6,splash:2.2,col:'#fff1a0'};

// ---------- three setup ----------
const canvas = document.getElementById('c'), top = document.getElementById('top');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene = new THREE.Scene(); scene.background = new THREE.Color('#87c4e8');
scene.fog = new THREE.Fog('#87c4e8', 18, 34);
const camera = new THREE.PerspectiveCamera(40,1,.1,100);
scene.add(new THREE.HemisphereLight('#ffffff','#5a6a50',1.6));
const sun = new THREE.DirectionalLight('#fff4dd',2.2); sun.position.set(4,10,6); scene.add(sun);

const COLS=7, ROWS=9;
const W = (c,r)=>new THREE.Vector3(c-(COLS-1)/2,0,r-(ROWS-1)/2);
const WP=[[1,0],[1,2],[5,2],[5,5],[1,5],[1,7],[3,7],[3,8]];
const pathSet=new Set(); for(let i=0;i<WP.length-1;i++){let [c,r]=WP[i];const [c2,r2]=WP[i+1];while(true){pathSet.add(c+','+r);if(c===c2&&r===r2)break;c+=Math.sign(c2-c);r+=Math.sign(r2-r);}}
const wpW=WP.map(([c,r])=>W(c,r)); wpW.unshift(W(1,-1.2));
const segLen=[];let pathLen=0;for(let i=0;i<wpW.length-1;i++){const l=wpW[i].distanceTo(wpW[i+1]);segLen.push(l);pathLen+=l;}
function posAt(d,out){for(let i=0;i<segLen.length;i++){if(d<=segLen[i]||i===segLen.length-1){return out.copy(wpW[i]).lerp(wpW[i+1],Math.min(1,d/segLen[i]));}d-=segLen[i];}}

function fitCamera(){const w=top.clientWidth,h=top.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
 const vf=THREE.MathUtils.degToRad(camera.fov),hf=2*Math.atan(Math.tan(vf/2)*camera.aspect);
 const d=Math.max((COLS+.6)/2/Math.tan(hf/2),(ROWS+1)*.82/2/Math.tan(vf/2))+2.2;
 const a=THREE.MathUtils.degToRad(58);camera.position.set(0,Math.sin(a)*d,Math.cos(a)*d+.3);camera.lookAt(0,0,.5);camera.updateProjectionMatrix();}
addEventListener('resize',fitCamera);

// ---------- assets ----------
const M={};
function b64buf(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;}
async function loadAll(){const jobs=[];for(const [kit,tex] of [['td',A.tdTex],['md',A.mdTex]]){const mgr=new THREE.LoadingManager();mgr.setURLModifier(u=>/colormap\.png$/.test(u)?tex:u);const L=new GLTFLoader(mgr);
 for(const n in A[kit])jobs.push(new Promise((res,rej)=>L.parse(b64buf(A[kit][n]),'',g=>{M[n]=g.scene;res();},rej)));}await Promise.all(jobs);}
const mk=n=>skClone(M[n]);
function stack(names,width=.8){const g=new THREE.Group();let y=0;for(const n of names){const m=mk(n);const b=new THREE.Box3().setFromObject(m);m.position.y=y-b.min.y;y+=b.max.y-b.min.y;g.add(m);}
 const b=new THREE.Box3().setFromObject(g);const s=width/Math.max(b.max.x-b.min.x,b.max.z-b.min.z);g.scale.setScalar(s);return g;}
function sized(n,width){const m=mk(n);const b=new THREE.Box3().setFromObject(m);m.scale.setScalar(width/Math.max(b.max.x-b.min.x,b.max.z-b.min.z));const w=new THREE.Group();w.add(m);m.position.y=-b.min.y*m.scale.x;return w;}
function unitModel(v){switch(v){
 case 2:return stack(['tower-round-bottom-a','tower-round-top-a','weapon-ballista'],.62);
 case 4:return stack(['tower-round-bottom-a','tower-round-middle-a','tower-round-top-a','weapon-ballista'],.7);
 case 8:return sized('character-human',.58);
 case 16:return stack(['tower-square-bottom-a','tower-square-top-a','weapon-cannon'],.72);
 case 32:{const g=sized('character-human',.75);return g;}
 case 64:return stack(['tower-square-bottom-b','tower-square-middle-a','tower-square-top-b','weapon-catapult'],.8);
 case 128:return stack(['tower-round-bottom-b','tower-round-middle-b','tower-round-crystals'],.75);
 case 256:return stack(['tower-square-bottom-c','tower-square-middle-b','tower-square-middle-a','weapon-turret'],.8);
 case 512:return sized('character-human',.95);
 case 1024:return stack(['tower-round-bottom-c','tower-round-middle-a','tower-round-middle-b','tower-round-top-b','tower-round-crystals'],.9);
 default:return stack(['tower-square-bottom-c','tower-square-middle-b','tower-square-middle-a','tower-square-middle-b','tower-square-roof-a'],.95);}}
function label(v){const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.fillStyle=unit(v).col;x.beginPath();x.roundRect(4,4,120,56,16);x.fill();x.strokeStyle='#fff';x.lineWidth=5;x.stroke();x.fillStyle='#fff';x.font='bold 40px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(v,64,34);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));s.scale.set(.5,.25,1);s.renderOrder=5;return s;}

// ---------- world ----------
const cells={};const hl=[];
const hlMat=new THREE.MeshBasicMaterial({color:'#5dff7a',transparent:true,opacity:.38,depthWrite:false});
const pathMat=new THREE.MeshLambertMaterial({color:'#d9b77a'});
function buildWorld(){const tile=mk('tile');const tb=new THREE.Box3().setFromObject(tile);const ts=1/(tb.max.x-tb.min.x);const th=(tb.max.y-tb.min.y)*ts;
 for(let r=-2;r<ROWS+2;r++)for(let c=-2;c<COLS+2;c++){const p=W(c,r);const t=mk('tile');t.scale.setScalar(ts);t.position.set(p.x,-th-tb.min.y*ts,p.z);scene.add(t);
  const inside=c>=0&&c<COLS&&r>=0&&r<ROWS;
  if(!inside){if(Math.random()<.55){const d=sized(['detail-tree','detail-tree-large','detail-rocks','detail-tree'][Math.random()*4|0],.5+Math.random()*.3);d.position.copy(p);d.rotation.y=Math.random()*6;scene.add(d);}continue;}
  if(pathSet.has(c+','+r)){const m=new THREE.Mesh(new THREE.BoxGeometry(1.001,.04,1.001),pathMat);m.position.set(p.x,.0,p.z);scene.add(m);continue;}
  cells[c+','+r]={c,r,p,unit:null};const h=new THREE.Mesh(new THREE.PlaneGeometry(.9,.9),hlMat);h.rotation.x=-Math.PI/2;h.position.set(p.x,.03,p.z);h.visible=false;scene.add(h);hl.push(h);}
 const sp=sized('spawn-round',.95);sp.position.copy(W(1,-1));scene.add(sp);
 const base=stack(['tower-square-bottom-c','tower-square-middle-b','tower-square-roof-a'],.95);base.position.copy(W(3,8));scene.add(base);
 const bn=sized('banner',.4);bn.position.copy(W(3,8)).add(new THREE.Vector3(.45,0,.3));scene.add(bn);}

// ---------- state ----------
let G;const enemies=[],units=[],shots=[],fx=[];
const $=id=>document.getElementById(id);
function newGame(){for(const a of [enemies,units,shots,fx]){for(const o of a)scene.remove(o.obj);a.length=0;}
 for(const k in cells)cells[k].unit=null;
 G={hp:20,wave:0,score:0,t:0,next:10,spawnLeft:0,spawnT:0,over:false,best:+localStorage.td2048best||0};
 board=Array(16).fill(0);sel=-1;addTile();addTile();addTile();addTile();renderBoard();hud();}
function hud(){$('hWave').textContent='WAVE '+G.wave;$('hHp').textContent='❤️ '+Math.max(0,G.hp);$('hScore').textContent='⭐ '+G.score;
 $('hNext').textContent=(enemies.length?'敵 '+enemies.length+'体 ／ ':'')+(G.spawnLeft>0?'敵が来ています！':'次のウェーブまで '+Math.ceil(G.next)+'秒');}
let msgT;function msg(t){const m=$('msg');m.textContent=t;m.style.opacity=1;clearTimeout(msgT);msgT=setTimeout(()=>m.style.opacity=0,1600);}

// ---------- enemies ----------
const UFOS=['enemy-ufo-a','enemy-ufo-b','enemy-ufo-c','enemy-ufo-d'];
function startWave(){G.wave++;const w=G.wave;G.spawnLeft=Math.min(5+2*w,30);G.spawnT=0;G.boss=w%5===0;
 G.ehp=Math.round(14*Math.pow(1.3,w-1));G.espd=Math.min(.85+.035*w,1.7);G.eint=Math.max(.9-.02*w,.4);msg(G.boss?'⚠️ ボスウェーブ '+w+'！':'ウェーブ '+w+' 開始！');}
function spawnEnemy(boss){const hp=boss?G.ehp*12:G.ehp;const o=new THREE.Group();const m=sized(boss?'character-orc':UFOS[(G.wave-1)%4],boss?.75:.5);o.add(m);m.position.y=boss?0:.25;
 const bg=new THREE.Mesh(new THREE.PlaneGeometry(.6,.08),new THREE.MeshBasicMaterial({color:'#300',depthTest:false}));const fg=new THREE.Mesh(new THREE.PlaneGeometry(.6,.08),new THREE.MeshBasicMaterial({color:'#4f4',depthTest:false}));
 const bar=new THREE.Group();bar.add(bg,fg);fg.position.z=.001;bar.position.y=boss?1.1:.85;bar.renderOrder=6;bg.renderOrder=6;fg.renderOrder=7;o.add(bar);scene.add(o);
 enemies.push({obj:o,m,bar,fg,hp,max:hp,d:0,spd:G.espd*(boss?.6:1),boss,dead:false});}
function hurt(e,dmg){if(e.dead)return;e.hp-=dmg;if(e.hp<=0){e.dead=true;G.score+=e.boss?50*G.wave:5*G.wave;boom(e.obj.position,e.boss?'#ff5':'#fa4',e.boss?.9:.5);hud();}}

// ---------- fx ----------
const sphG=new THREE.SphereGeometry(1,8,6);
function boom(p,col,s){const m=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8}));m.position.copy(p).setY(.4);m.scale.setScalar(.1);scene.add(m);fx.push({obj:m,t:0,s});}
function shoot(u,e){const big=u.v>=16&&u.def.splash;const m=new THREE.Mesh(sphG,new THREE.MeshBasicMaterial({color:big?'#333':u.v>=128?'#f6f':'#ffe9a0'}));m.scale.setScalar(big?.1:.06);
 m.position.copy(u.obj.position).setY(u.h);scene.add(m);shots.push({obj:m,e,u,dmg:u.def.dmg,splash:u.def.splash||0,spd:big?6:11});}

// ---------- placement ----------
function place(cell,v){if(cell.unit){if(cell.unit.v>=v){msg('もっと大きい数字で上書きできます');return false;}scene.remove(cell.unit.obj);units.splice(units.indexOf(cell.unit),1);}
 const o=new THREE.Group();const m=unitModel(v);o.add(m);const b=new THREE.Box3().setFromObject(m);const lb=label(v);lb.position.y=b.max.y+.22;o.add(lb);o.position.copy(cell.p);scene.add(o);
 const u={obj:o,m,v,def:unit(v),cd:0,h:Math.max(.3,b.max.y*.85),cell,anim:0};units.push(u);cell.unit=u;boom(cell.p,'#7f7',.6);msg(unit(v).name+' を配置！');return true;}

// ---------- 2048 ----------
let board,sel=-1,newIdx=new Set();
function addTile(){const e=[];board.forEach((v,i)=>!v&&e.push(i));if(!e.length)return;const i=e[Math.random()*e.length|0];board[i]=Math.random()<.9?2:4;newIdx.add(i);}
function renderBoard(){const B=$('board');B.innerHTML='';board.forEach((v,i)=>{const d=document.createElement('div');d.dataset.i=i;
 if(!v)d.className='cell';else{const u=unit(v);d.className='t k'+String(v).length+(i===sel?' sel':'')+(newIdx.has(i)?' pop':'');d.style.background=u.col;d.innerHTML=`<div class="i">${u.icon}</div><div class="n">${v}</div><div class="l">${u.name}</div>`;}B.appendChild(d);});newIdx.clear();
 hl.forEach(h=>h.visible=sel>=0);
 $('info').textContent=sel>=0?`「${unit(board[sel]).name}(${board[sel]})」をマップの緑マスに配置 / もう一度タップで解除`:'スワイプで合体！ タイルをタップ→マップをタップで配置';}
function move(dir){if(G.over)return;let moved=false;const nb=Array(16).fill(0);
 for(let k=0;k<4;k++){const idx=[];for(let j=0;j<4;j++){const [r,c]=dir==='L'?[k,j]:dir==='R'?[k,3-j]:dir==='U'?[j,k]:[3-j,k];idx.push(r*4+c);}
  const vals=idx.map(i=>board[i]).filter(Boolean);const out=[];for(let j=0;j<vals.length;j++){if(vals[j]===vals[j+1]){out.push(vals[j]*2);G.score+=vals[j]*2;newIdx.add(idx[out.length-1]);j++;}else out.push(vals[j]);}
  idx.forEach((i,j)=>{nb[i]=out[j]||0;if(nb[i]!==board[i])moved=true;});}
 if(!moved){newIdx.clear();return;}board=nb;sel=-1;addTile();renderBoard();hud();}
addEventListener('keydown',e=>{const m={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D'}[e.key];if(m){e.preventDefault();move(m);}});
const BD=$('board');let ts=null;
BD.addEventListener('pointerdown',e=>{ts={x:e.clientX,y:e.clientY,t:e.target.closest('[data-i]')};});
BD.addEventListener('pointerup',e=>{if(!ts)return;const dx=e.clientX-ts.x,dy=e.clientY-ts.y;
 if(Math.hypot(dx,dy)>22)move(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U'));
 else if(ts.t){const i=+ts.t.dataset.i;if(board[i]){sel=sel===i?-1:i;renderBoard();}}ts=null;});
// map tap
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),tmp=new THREE.Vector3();
canvas.addEventListener('pointerdown',e=>{if(G.over)return;if(sel<0){msg('下のタイルをタップして選んでね');return;}const r=canvas.getBoundingClientRect();
 ray.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-(e.clientY-r.top)/r.height*2+1},camera);if(!ray.ray.intersectPlane(plane,tmp))return;
 const c=Math.round(tmp.x+(COLS-1)/2),rr=Math.round(tmp.z+(ROWS-1)/2);const cell=cells[c+','+rr];if(!cell){msg('ここには置けません');return;}
 if(place(cell,board[sel])){board[sel]=0;sel=-1;renderBoard();}});

// ---------- loop ----------
let last=performance.now();const tv=new THREE.Vector3();
function tick(now){requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000);last=now;if(G&&!G.over&&started)update(dt);
 for(const e of enemies)e.bar.quaternion.copy(camera.quaternion);renderer.render(scene,camera);}
function update(dt){G.t+=dt;
 if(G.spawnLeft>0){G.spawnT-=dt;if(G.spawnT<=0){G.spawnLeft--;spawnEnemy(G.boss&&G.spawnLeft===0);G.spawnT=G.eint;if(G.spawnLeft===0)G.next=12;}}
 else if(!enemies.length||G.next>0){G.next-=dt;if(G.next<=0){startWave();}}
 if(Math.floor(G.t*4)!==Math.floor((G.t-dt)*4))hud();
 for(const e of enemies){if(e.dead)continue;const p0=e.obj.position.clone();e.d+=e.spd*dt;posAt(e.d,e.obj.position);const dx=e.obj.position.x-p0.x,dz=e.obj.position.z-p0.z;if(dx||dz)e.m.rotation.y=Math.atan2(dx,dz);
  if(!e.boss)e.m.position.y=.25+Math.sin(G.t*5+e.d)*.05;e.fg.scale.x=Math.max(0,e.hp/e.max);e.fg.position.x=-.3*(1-e.fg.scale.x);
  if(e.d>=pathLen){e.dead=true;G.hp-=e.boss?5:1;boom(e.obj.position,'#f33',.7);msg('城がダメージ！');hud();if(G.hp<=0)gameOver();}}
 for(let i=enemies.length-1;i>=0;i--)if(enemies[i].dead){scene.remove(enemies[i].obj);enemies.splice(i,1);}
 for(const u of units){u.cd-=dt;if(u.anim>0){u.anim-=dt;u.m.rotation.x=u.def.melee?Math.sin(u.anim*20)*.5:0;}if(u.cd>0)continue;
  let best=null;for(const e of enemies){if(e.dead)continue;const d=e.obj.position.distanceTo(u.obj.position);if(d<=u.def.range&&(!best||e.d>best.d))best=e;}
  if(!best)continue;u.cd=u.def.rate;
  if(u.def.melee){u.m.rotation.y=Math.atan2(best.obj.position.x-u.obj.position.x,best.obj.position.z-u.obj.position.z);u.anim=.3;
   if(u.def.cleave){for(const e of enemies)if(e.obj.position.distanceTo(best.obj.position)<=u.def.cleave)hurt(e,u.def.dmg);}else hurt(best,u.def.dmg);boom(best.obj.position,'#fff',.25);}
  else shoot(u,best);}
 for(let i=shots.length-1;i>=0;i--){const s=shots[i];const tp=s.e.obj.position.clone().setY(.35);tv.subVectors(tp,s.obj.position);const L=tv.length(),st=s.spd*dt;
  if(L<=st||s.e.dead){if(!s.e.dead||s.splash){if(s.splash){for(const e of enemies)if(e.obj.position.distanceTo(tp)<=s.splash)hurt(e,s.dmg);boom(tp,'#f80',s.splash*.6);}else hurt(s.e,s.dmg);}scene.remove(s.obj);shots.splice(i,1);}
  else s.obj.position.addScaledVector(tv,st/L);}
 for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=dt;f.obj.scale.setScalar(.1+f.s*f.t*3);f.obj.material.opacity=.8*(1-f.t/.3);if(f.t>=.3){scene.remove(f.obj);fx.splice(i,1);}}}
function gameOver(){G.over=true;const best=Math.max(G.best,G.score);localStorage.td2048best=best;$('oTxt').innerHTML=`ウェーブ ${G.wave} まで到達<br>スコア ${G.score}<br>ベスト ${best}`;$('over').classList.remove('hide');}
let started=false;
$('bStart').onclick=()=>{$('start').classList.add('hide');started=true;newGame();msg('最初の敵は10秒後！');};
$('bRe').onclick=()=>{$('over').classList.add('hide');newGame();};
(async()=>{await loadAll();buildWorld();fitCamera();newGame();requestAnimationFrame(tick);window.__ready=true;})();
window.__dbg={get G(){return G},get board(){return board},set board(b){board=b;renderBoard()},enemies,units,move,place,cells};
