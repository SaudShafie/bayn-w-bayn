// سيرفر محلي بدون أي مكتبات: يقدّم ملفات اللعبة ويمرر الرسائل (SSE)
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os');
const PORT=process.env.PORT||3000,rooms={};
const ip=()=>{for(const l of Object.values(os.networkInterfaces()))for(const a of l)if(a.family==='IPv4'&&!a.internal)return a.address;return 'localhost';};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer((req,res)=>{const u=new URL(req.url,'http://x');
  if(u.pathname==='/api/ping')return res.end('ok');
  if(u.pathname==='/api/info'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({ip:ip(),port:PORT}));}
  if(u.pathname==='/api/events'){const c=u.searchParams.get('code');res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});res.write(':ok\n\n');
    (rooms[c]=rooms[c]||new Set()).add(res);const k=setInterval(()=>res.write(':k\n\n'),20000);req.on('close',()=>{clearInterval(k);rooms[c].delete(res);});return;}
  if(u.pathname==='/api/send'&&req.method==='POST'){let b='';req.on('data',d=>{b+=d;if(b.length>1e5)req.destroy();});req.on('end',()=>{try{const {code,msg}=JSON.parse(b);const d=`data: ${JSON.stringify(msg)}\n\n`;for(const r of rooms[code]||[])r.write(d);}catch{}res.end('ok');});return;}
  let p=u.pathname==='/'||u.pathname==='/host'?'/index.html':u.pathname==='/play'?'/play.html':u.pathname;
  let f;try{f=path.join(__dirname,path.normalize(decodeURIComponent(p)));}catch{res.writeHead(400);return res.end('400');}
  if(!f.startsWith(__dirname+path.sep)||!types[path.extname(f)]||path.basename(f)==='server.js'){res.writeHead(404);return res.end('404');}
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('404');}res.setHeader('content-type',types[path.extname(f)]||'application/octet-stream');res.end(d);});
}).listen(PORT,()=>console.log(`بين وبين شغال:\n  التلفزيون: http://${ip()}:${PORT}/host\n  الجوالات: http://${ip()}:${PORT}/play`));
