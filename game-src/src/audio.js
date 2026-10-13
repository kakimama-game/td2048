// All sounds are generated procedurally with WebAudio (no external audio files).
let ctx=null,master,bgmGain,sfxGain,muted=localStorage.td2048mute==='1',bgmTimer=null,step=0,nextT=0;
const last={};
export function initAudio(){if(ctx){ctx.resume();return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();
 master=ctx.createGain();master.gain.value=muted?0:1;master.connect(ctx.destination);
 bgmGain=ctx.createGain();bgmGain.gain.value=.16;bgmGain.connect(master);sfxGain=ctx.createGain();sfxGain.gain.value=.5;sfxGain.connect(master);startBgm();}
export function isMuted(){return muted;}
export function toggleMute(){muted=!muted;localStorage.td2048mute=muted?'1':'0';if(master)master.gain.setTargetAtTime(muted?0:1,ctx.currentTime,.02);return muted;}
function tone(t,f,d,type,v,dest,f2){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.02);}
let nb;function noise(t,d,v,fc,dest){if(!nb){nb=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate);const a=nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
 const s=ctx.createBufferSource();s.buffer=nb;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=fc;const g=ctx.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(dest);s.start(t);s.stop(t+d);}
const N=n=>440*Math.pow(2,(n-69)/12);
// simple chiptune loop: Am - F - C - G
const CH=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];const MEL=[76,74,72,74,76,79,76,72, 77,76,72,69,72,74,72,69, 72,74,76,79,84,79,76,74, 74,71,67,71,74,79,74,71];
function startBgm(){nextT=ctx.currentTime+.1;bgmTimer=setInterval(()=>{const spb=.2;while(nextT<ctx.currentTime+.3){const bar=(step>>3)%4,s=step%8,c=CH[bar];
  if(s%2===0)tone(nextT,N(c[0]-12),.35,'triangle',.5,bgmGain);
  tone(nextT,N(c[(s%3)]+12),.12,'square',.08,bgmGain);
  if((step>>5)%2===1||s%2===0)tone(nextT,N(MEL[step%32]),.18,'square',.1,bgmGain);
  if(s%4===0)noise(nextT,.08,.25,180,bgmGain);if(s%4===2)noise(nextT,.05,.12,4000,bgmGain);
  nextT+=spb;step++;}},50);}
export function sfx(k){if(!ctx||muted)return;const t=ctx.currentTime;const lim={shoot:.07,hit:.05,boom:.1,kill:.06,melee:.08,zap:.08}[k]||0;if(lim&&last[k]&&t-last[k]<lim)return;last[k]=t;const D=sfxGain;
 switch(k){case 'shoot':tone(t,900,.06,'square',.08,D,500);break;case 'zap':tone(t,1300,.12,'sawtooth',.06,D,2400);break;case 'melee':noise(t,.09,.3,2500,D);break;
 case 'boom':noise(t,.35,.6,600,D);tone(t,120,.3,'sine',.4,D,40);break;case 'kill':tone(t,660,.08,'square',.1,D,990);break;
 case 'place':tone(t,523,.1,'square',.15,D);tone(t+.08,784,.15,'square',.15,D);break;case 'merge':tone(t,700,.08,'triangle',.25,D,1100);break;
 case 'move':tone(t,300,.05,'triangle',.15,D,200);break;case 'remove':tone(t,400,.15,'triangle',.2,D,150);break;
 case 'leak':tone(t,220,.3,'sawtooth',.2,D,90);break;case 'wave':[523,659,784,1046].forEach((f,i)=>tone(t+i*.09,f,.15,'square',.12,D));break;
 case 'over':[392,330,262,196].forEach((f,i)=>tone(t+i*.22,f,.3,'triangle',.3,D));break;case 'ui':tone(t,880,.05,'square',.08,D);break;case 'no':tone(t,180,.12,'square',.12,D);break;}}
