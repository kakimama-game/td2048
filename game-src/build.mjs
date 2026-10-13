import { build } from 'esbuild';import fs from 'fs';
const r=await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',target:'es2020',write:false,legalComments:'none'});
let js=r.outputFiles[0].text.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
let html=fs.readFileSync('src/index.html','utf8').replace('/*CSS*/',()=>fs.readFileSync('src/style.css','utf8')).replace('<script>/*JS*/</script>',()=>'<script>'+js+'</script>');
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',html);console.log((html.length/1e6).toFixed(2),'MB');
