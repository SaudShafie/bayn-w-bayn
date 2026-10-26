// «بين وبين» — منطق اللعبة
const $=s=>document.querySelector(s), app=$('#app');
const COLORS=['#ffc145','#7c5cff','#4fc3f7','#ff8a3d','#e84393','#a3e635','#f472b6','#22d3ee','#fb7185','#facc15','#c084fc','#34d399'];
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('bwb_'+k))??d}catch{return d}},set:(k,v)=>localStorage.setItem('bwb_'+k,JSON.stringify(v))};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allPairs=()=>BUILTIN_PAIRS.concat(LS.get('custom',[]).map(p=>({...p,category:'بطاقاتي'})));
const allCats=()=>CATEGORIES.concat(LS.get('custom',[]).length?['بطاقاتي']:[]);
let settings=LS.get('settings',{cats:[],rounds:10,players:['',''],kids:false});
function deck(cats){let p=allPairs();if(cats&&cats.length)p=p.filter(x=>cats.includes(x.category));if(!p.length)p=allPairs();
  const used=new Set(LS.get('used',[]));let fresh=p.filter(x=>!used.has(x.left+x.right));if(fresh.length<5){fresh=p;LS.set('used',[]);}
  return fresh.sort(()=>Math.random()-.5);}
function markUsed(pair){const u=LS.get('used',[]);u.push(pair.left+pair.right);LS.set('used',u.slice(-400));}
const randTarget=()=>Math.round(8+Math.random()*164);
function scoreOf(t,g){const d=Math.abs(t-g);return d<=5?4:d<=12?3:d<=19?2:0;}

// ---------- الدائرة (SVG) ----------
const CX=200,CY=200,R=180;
const pt=(a,r=R)=>[CX-r*Math.cos(a*Math.PI/180),CY-r*Math.sin(a*Math.PI/180)];
function wedge(a1,a2,col){a1=Math.max(0,a1);a2=Math.min(180,a2);const [x1,y1]=pt(a1),[x2,y2]=pt(a2);return `<path d="M${CX},${CY} L${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2} Z" fill="${col}"/>`;}
function dialSVG({target=null,needles=[],cover=false}){
  let s=`<svg class="dial" viewBox="0 0 400 215"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#19c3b1"/><stop offset="1" stop-color="#ff4d5e"/></linearGradient></defs>`;
  s+=`<path d="M20,200 A180,180 0 0 1 380,200 Z" fill="#f3ead6"/>`;
  if(target!=null){s+=wedge(target-19,target+19,'#ffc145')+wedge(target-12,target+12,'#ff8a3d')+wedge(target-5,target+5,'#ff4d5e');
    for(const [a,n] of [[target-15.5,2],[target-8.5,3],[target,4],[target+8.5,3],[target+15.5,2]]){if(a<2||a>178)continue;const [x,y]=pt(a,R-18);s+=`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="900" fill="#fff">${n}</text>`;}}
  if(cover)s+=`<path d="M20,200 A180,180 0 0 1 380,200 Z" fill="#2b6f8a"/><text x="200" y="140" text-anchor="middle" font-size="22" fill="#fff" font-weight="800">؟</text>`;
  s+=`<path d="M20,200 A180,180 0 0 1 380,200" fill="none" stroke="url(#g)" stroke-width="10"/>`;
  const placed=[];
  for(const n of needles){const [x,y]=pt(n.angle,R-6);s+=`<line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="${n.color}" stroke-width="6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="9" fill="${n.color}" stroke="#fff" stroke-width="2"/>`;
    if(n.label){const w=String(n.label).length*8+10;let r=R-30,lx,ly;
      do{[lx,ly]=pt(n.angle,r);r-=14;}while(r>40&&placed.some(b=>Math.abs(b.x-lx)<(b.w+w)/2&&Math.abs(b.y-ly)<16));placed.push({x:lx,y:ly,w});
      s+=`<text x="${lx}" y="${ly}" text-anchor="middle" font-size="13" fill="${n.color}" stroke="#1e1a33" stroke-width="3" paint-order="stroke" font-weight="800">${esc(n.label)}</text>`;}}
  s+=`<circle cx="${CX}" cy="${CY}" r="16" fill="#ff4d5e" stroke="#fff" stroke-width="3"/></svg>`;return s;}
function interactiveDial(el,opts,onChange){let ang=opts.angle??90;
  const draw=()=>{el.innerHTML=dialSVG({...opts,needles:[...(opts.needles||[]),{angle:ang,color:opts.color||'#7c5cff'}]});};
  const move=e=>{const svg=el.querySelector('svg'),r=svg.getBoundingClientRect();const x=(e.clientX-r.left)*400/r.width,y=(e.clientY-r.top)*215/r.height;
    let a=Math.atan2(CY-y,CX-x)*180/Math.PI;if(a<0)a=x<CX?0:180;ang=Math.round(Math.min(180,Math.max(0,a)));draw();onChange&&onChange(ang);};
  let down=false;el.onpointerdown=e=>{down=true;el.setPointerCapture(e.pointerId);move(e)};el.onpointermove=e=>down&&move(e);el.onpointerup=el.onpointercancel=()=>down=false;
  draw();return ()=>ang;}
const endsHTML=p=>`<div class="center"><span class="cat">${esc(p.category)}</span></div><div class="ends"><div class="l">⬅ ${esc(p.left)}</div><div class="r">${esc(p.right)} ➡</div></div>`;
function validClue(c,p){c=c.trim();if(!c)return'اكتب تلميحك أول';if(/[0-9٠-٩۰-۹]/.test(c))return'لا تحط أرقام';
  for(const w of (p.left+' '+p.right).split(/\s+/))if(w.length>2&&c.includes(w))return`«${w}» من البطاقة، غيّرها`;if(c.split(/\s+/).length>10)return'اختصر شوي (١٠ كلمات بالكثير)';return null;}

// ---------- الشاشة الرئيسية ----------
localStorage.removeItem('bwb_high');
function home(){document.body.className='';
  app.innerHTML=`<h1>بين وبين</h1><p class="center mut">واحد يلمّح، والباقين يحاولون يجيبون الهدف بالضبط 🎯</p>
  <div class="card"><button class="big" id="m1">📱 جوال واحد بينكم (بدون نت)</button><button class="big sec" id="m2">📺 الشاشة + جوالاتكم</button><button class="big sec" id="m3">🧠 تحدّى نفسك</button></div>
  <div class="card"><button class="sec" id="how">❓ كيف نلعب؟</button><button class="sec" id="cards">🗂️ الأقسام وبطاقاتك</button></div>
  <p class="center mut">${allPairs().length} بطاقة في ${allCats().length} قسم</p>`;
  $('#m1').onclick=()=>lobby('pass');$('#m3').onclick=()=>lobby('solo');$('#m2').onclick=hostSetup;$('#how').onclick=how;$('#cards').onclick=cardsScreen;}
function how(){app.innerHTML=`<h2>كيف نلعب؟</h2><div class="card"><ol style="line-height:2">
<li>كل جولة واحد منكم يصير <b>الملمّح</b>: يشوف طرفين متضادين (مثلاً: هواية على قد الحال ⟷ هواية تفلّس) ويشوف وين الهدف بالضبط.</li>
<li>يكتب تلميح قصير — لا أرقام ولا كلمات من البطاقة.</li>
<li>الباقين كل واحد يحط إبرته وين يحس الهدف.</li>
<li>وقت الكشف: بالنص ٤ نقاط، جنبه ٣، بعده ٢، وبرا صفر. والملمّح ياخذ متوسط نقاطكم.</li>
<li>الملمّح يتغير كل جولة، واللي يجمع أكثر ياخذها 🔥</li></ol></div><button class="big" onclick="home()">رجوع</button>`;}
function cardsScreen(){const c=LS.get('custom',[]);
  app.innerHTML=`<h2>الأقسام</h2><div class="card">${allCats().map(k=>`<div class="score"><span>${esc(k)}</span><span>${allPairs().filter(p=>p.category===k).length}</span></div>`).join('')}</div>
  <div class="card"><b>سوّ بطاقتك الخاصة</b><div class="row"><input id="cl" placeholder="الطرف الأول"><input id="cr" placeholder="الطرف الثاني"></div><button id="add">ضيفها</button>
  ${c.map((p,i)=>`<div class="score"><span>${esc(p.left)} ⟷ ${esc(p.right)}</span><button class="red" data-i="${i}">احذف</button></div>`).join('')}</div>
  <button class="sec" id="rs">رجّع كل البطاقات من جديد</button><button class="big" onclick="home()">رجوع</button>`;
  $('#add').onclick=()=>{const l=$('#cl').value.trim(),r=$('#cr').value.trim();if(!l||!r)return;c.push({id:'c'+Date.now(),left:l,right:r});LS.set('custom',c);cardsScreen();};
  app.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{c.splice(+b.dataset.i,1);LS.set('custom',c);cardsScreen();});
  $('#rs').onclick=()=>{LS.set('used',[]);alert('تمام ✅');};}
function catPicker(){return `<div class="chips" id="cats"><span class="chip ${settings.cats.length?'':'on'}" data-c="">🎲 خلطة من الكل</span>${allCats().map(c=>`<span class="chip ${settings.cats.includes(c)?'on':''}" data-c="${esc(c)}">${esc(c)}</span>`).join('')}</div>`;}
function bindCats(){app.querySelectorAll('#cats .chip').forEach(ch=>ch.onclick=()=>{const c=ch.dataset.c;if(!c)settings.cats=[];else settings.cats=settings.cats.includes(c)?settings.cats.filter(x=>x!==c):[...settings.cats,c];
  app.querySelectorAll('#cats .chip').forEach(x=>x.classList.toggle('on',x.dataset.c?settings.cats.includes(x.dataset.c):!settings.cats.length));LS.set('settings',settings);});}

// ---------- اللوبي (تمرير/فردي) ----------
function lobby(mode){const solo=mode==='solo';
  const draw=()=>{app.innerHTML=`<h2>${solo?'تحدّى نفسك':'جوال واحد بينكم'}</h2>
  ${solo?'':`<div class="card"><b>مين بيلعب؟ (٢–١٢)</b>${settings.players.map((n,i)=>`<div class="row"><input data-p="${i}" value="${esc(n)}" placeholder="اسم اللاعب ${i+1}">${settings.players.length>2?`<button class="red" style="flex:0" data-x="${i}">✕</button>`:''}</div>`).join('')}
  ${settings.players.length<12?'<button class="sec" id="addp">+ ضيف لاعب</button>':''}</div>`}
  <div class="card"><b>كم جولة؟</b><select id="rounds">${[5,8,10,12,15,20].map(r=>`<option ${r==settings.rounds?'selected':''}>${r}</option>`).join('')}</select></div>
  <div class="card"><b>الأقسام</b>${catPicker()}</div>
  ${solo?'<div class="card"><p class="mut">يطلع لك الهدف ٣ ثواني وبعدها يختفي، وعليك تحط الإبرة من ذاكرتك 🧠</p><label><input type="checkbox" id="noclue" style="width:auto"> بدون ما أشوف الهدف (على الحظ 🎲)</label></div>':''}
  <button class="big" id="go">يلا نبدأ 🔥</button><button class="big sec" onclick="home()">رجوع</button>`;
  app.querySelectorAll('[data-p]').forEach(i=>i.oninput=()=>{settings.players[+i.dataset.p]=i.value;LS.set('settings',settings)});
  app.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{settings.players.splice(+b.dataset.x,1);draw()});
  $('#addp')&&($('#addp').onclick=()=>{settings.players.push('');draw()});bindCats();
  $('#rounds').onchange=e=>{settings.rounds=+e.target.value;LS.set('settings',settings)};
  $('#go').onclick=()=>{LS.set('settings',settings);
    if(solo)return startLocal([{name:'أنت',score:0,color:COLORS[0]}],{solo:true,noclue:$('#noclue').checked});
    const names=settings.players.map((n,i)=>n.trim()||`لاعب ${i+1}`);startLocal(names.map((n,i)=>({name:n,score:0,color:COLORS[i]})),{});};};draw();}

// ---------- لعبة محلية ----------
let G;
function startLocal(players,o){G={players,round:0,total:settings.rounds,deck:deck(settings.cats),giver:-1,...o};nextRound();}
function nextRound(){G.round++;if(G.round>G.total)return final(G.players);G.giver=(G.giver+1)%G.players.length;G.pair=G.deck.pop()||deck([]).pop();markUsed(G.pair);G.target=randTarget();G.clue='';G.guesses={};
  if(G.solo&&G.noclue){G.clue='(على الحظ 🎲)';return guessTurn(0);}
  if(G.solo)return soloFlash();
  passTo(G.players[G.giver].name,'أنت الملمّح 🤫 لا أحد يشوف الشاشة',giverScreen);}
function hdr(){return `<div class="row mut"><span>الجولة ${G.round}/${G.total}</span><span style="text-align:left">${G.players.map(p=>`<span class="dot" style="background:${p.color}"></span>${esc(p.name)} ${p.score}`).join(' · ')}</span></div>`;}
function passTo(name,sub,next){if(G.solo)return next();app.innerHTML=`${hdr()}<div class="card center" style="margin-top:20vh"><p class="mut">مرّر الجوال لـ</p><h1 style="font-size:2.6rem">${esc(name)}</h1><p>${sub}</p><button class="big" id="ok">جاهز 👍</button></div>`;$('#ok').onclick=next;}
function soloFlash(){G.clue='(وين كان الهدف؟)';
  app.innerHTML=`${hdr()}<h2>ركّز على مكان الهدف 👀</h2><div class="card">${endsHTML(G.pair)}${dialSVG({target:G.target})}<p class="center mut">يختفي بعد ٣ ثواني...</p><button class="big" id="ok">جاهز</button></div>`;
  const btn=$('#ok'),go=()=>{clearTimeout(t);if(btn.isConnected)guessTurn(0);},t=setTimeout(go,3000);btn.onclick=go;}
function giverScreen(){app.innerHTML=`${hdr()}<h2>🎙️ ${esc(G.players[G.giver].name)} يلمّح</h2><div class="card">${endsHTML(G.pair)}${dialSVG({target:G.target})}
 <input id="clue" maxlength="40" placeholder="اكتب تلميحك هنا..."><p id="err" style="color:var(--red)"></p><button class="big" id="send">🙈 أرسل التلميح</button><button class="sec" id="skip">غيّر البطاقة 🔄</button></div>`;
  $('#skip').onclick=()=>{G.pair=G.deck.pop()||deck([]).pop();markUsed(G.pair);G.target=randTarget();giverScreen();};
  $('#send').onclick=()=>{const v=$('#clue').value,e=validClue(v,G.pair);if(e)return $('#err').textContent=e;G.clue=v.trim();
    if(G.solo)return guessTurn(0);const order=G.players.map((_,i)=>i).filter(i=>i!==G.giver);G.order=order;guessTurn(0);};}
function guessTurn(k){const order=G.solo?[0]:G.order;if(k>=order.length)return reveal();const i=order[k],p=G.players[i];
  passTo(p.name,'دورك تخمّن 🎯',()=>{app.innerHTML=`${hdr()}<h2>${esc(p.name)} يخمّن</h2><div class="card">${endsHTML(G.pair)}<div class="clue">«${esc(G.clue)}»</div><div id="d"></div><button class="big" id="lock">🔒 اعتمد</button></div>`;
    const get=interactiveDial($('#d'),{cover:true,color:p.color});$('#lock').onclick=()=>{G.guesses[i]=get();guessTurn(k+1);};});}
function reveal(){const res=[];let sum=0,n=0;
  for(const [i,a] of Object.entries(G.guesses)){const s=scoreOf(G.target,a);G.players[i].score+=s;sum+=s;n++;res.push({i:+i,a,s});}
  let gs=0;if(!G.solo&&n){gs=Math.round(sum/n);G.players[G.giver].score+=gs;}
  app.innerHTML=`${hdr()}<h2>وقت الكشف 👀</h2><div class="card">${endsHTML(G.pair)}<div class="clue">«${esc(G.clue)}»</div>
  ${dialSVG({target:G.target,needles:res.map(r=>({angle:r.a,color:G.players[r.i].color,label:G.players[r.i].name}))})}
  ${res.map(r=>`<div class="score"><span><span class="dot" style="background:${G.players[r.i].color}"></span>${esc(G.players[r.i].name)}</span><span class="pts" style="font-size:1.6rem">+${r.s}</span></div>`).join('')}
  ${G.solo?'':`<div class="score"><span>🎙️ ${esc(G.players[G.giver].name)} (الملمّح)</span><b>+${gs}</b></div>`}</div>
  <button class="big" id="nx">${G.round>=G.total?'النتيجة 🏆':'الجولة الجاية ⬅'}</button><button class="sec" onclick="if(confirm('متأكد تبي تطلع؟'))home()">اطلع</button>`;$('#nx').onclick=nextRound;}
function final(players){const s=[...players].sort((a,b)=>b.score-a.score);
  app.innerHTML=`<div class="trophy">🏆</div><h1>${esc(s[0].name)} أخذها! 🔥</h1><div class="card">${s.map((p,i)=>`<div class="score"><span>${['🥇','🥈','🥉'][i]||'▫️'} <span class="dot" style="background:${p.color}"></span>${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}</div><button class="big" onclick="home()">الرئيسية</button>`;}

// ---------- الشبكة: سيرفر محلي (SSE) ← PeerJS (GitHub Pages) ← BroadcastChannel ----------
const PEER_PREFIX='baynwbayn-room-';
class Net{constructor(code,id,onMsg){this.code=code;this.id=id;this.on=onMsg;this.mode='';this.conns=new Map();this.q=[];this.closed=false;}
  get host(){return this.id==='host';}
  async open(){try{const r=await fetch('/api/ping');if(r.ok&&(await r.text())==='ok')this.mode='server';}catch{}
    if(this.mode==='server'){this.es=new EventSource(`/api/events?code=${this.code}`);this.es.onmessage=e=>this.recv(JSON.parse(e.data));return this;}
    if(window.Peer){const r=await this.openPeer();if(r==='taken')throw new Error('taken');if(r)return this;}
    this.mode='local';this.bc=new BroadcastChannel('bwb-'+this.code);this.bc.onmessage=e=>this.recv(e.data);return this;}
  openPeer(){return new Promise(res=>{let opened=false;const done=v=>{if(!opened){opened=true;clearTimeout(t);res(v);}};const t=setTimeout(()=>{this.peer&&this.peer.destroy();done(false);},10000);
    this.peer=new Peer(this.host?PEER_PREFIX+this.code:undefined,{debug:0});
    this.peer.on('open',()=>{this.mode='peer';if(this.host)this.peer.on('connection',c=>this.bind(c));else this.connect();done(true);});
    this.peer.on('disconnected',()=>{if(!this.closed&&!this.peer.destroyed)this.peer.reconnect();});
    this.peer.on('error',e=>{if(!opened){this.peer.destroy();return done(e.type==='unavailable-id'?'taken':false);}
      if(e.type==='peer-unavailable'&&!this.host&&!this.closed)setTimeout(()=>this.connect(),2500);});});}
  connect(){if(this.closed)return;this.bind(this.peer.connect(PEER_PREFIX+this.code,{reliable:true}));}
  bind(c){c.on('open',()=>{this.conns.set(c.peer,c);if(!this.host){const q=this.q;this.q=[];q.forEach(m=>c.send(m));}});
    c.on('data',m=>{if(this.host&&m&&m.from)c.pid=m.from;this.recv(m);});
    c.on('close',()=>{this.conns.delete(c.peer);if(!this.host&&!this.closed)setTimeout(()=>this.connect(),2000);});}
  recv(m){if(!m||m.from===this.id)return;if(m.to&&m.to!==this.id)return;if(m.except&&m.except===this.id)return;this.on(m);}
  close(){this.closed=true;this.es&&this.es.close();this.bc&&this.bc.close();this.peer&&this.peer.destroy();this.on=()=>{};}
  send(msg,to,except){const m={...msg,from:this.id,to,except};
    if(this.mode==='server')fetch('/api/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:this.code,msg:m})});
    else if(this.mode==='peer'){const open=[...this.conns.values()].filter(c=>c.open);
      if(!this.host){if(open.length)open.forEach(c=>c.send(m));else this.q=[...this.q.slice(-20),m];return;}
      for(const c of open)if((!to||c.pid===to)&&(!except||c.pid!==except))c.send(m);}
    else this.bc.postMessage(m);}}

// ---------- المضيف (التلفزيون) ----------
let H;
function hostSetup(){app.innerHTML=`<h2>📺 الشاشة + جوالاتكم</h2><div class="card"><b>كم جولة؟</b><select id="rounds">${[5,8,10,12,15,20].map(r=>`<option ${r==settings.rounds?'selected':''}>${r}</option>`).join('')}</select><br><br><b>الأقسام</b>${catPicker()}</div>
<button class="big" id="go">افتح الغرفة</button><button class="big sec" id="join">أنا لاعب — بدخل من جوالي</button><button class="big sec" onclick="home()">رجوع</button>`;bindCats();
  $('#rounds').onchange=e=>{settings.rounds=+e.target.value;LS.set('settings',settings)};$('#go').onclick=startHost;$('#join').onclick=()=>playerJoin('');}
async function startHost(){if(H)H.net.close();document.body.className='tv';app.innerHTML='<h2>لحظة نفتح الغرفة...</h2>';
  let code,net;for(let i=0;i<5&&!net;i++){code=String(Math.floor(1000+Math.random()*9000));try{net=await new Net(code,'host',m=>H&&H.code===code&&hostMsg(m)).open();}catch{}}
  if(!net){app.innerHTML='<h2>ما قدرنا نفتح الغرفة 😕</h2><button class="big" onclick="startHost()">جرّب مرة ثانية</button><button class="big sec" onclick="home()">رجوع</button>';return;}
  H={code,net,players:[],phase:'lobby',round:0,total:settings.rounds,deck:deck(settings.cats),giver:-1,guesses:{},clue:''};
  let base=new URL('./',location.href).href;
  if(net.mode==='server'){try{const i=await (await fetch('/api/info')).json();if(i.ip)base=`http://${i.ip}:${i.port}/`;}catch{}}
  H.url=new URL(`play.html?code=${code}`,base).href;history.replaceState(0,'','?host='+code);hostDraw();}
function hostBroadcast(){const giverId=H.players[H.giver]?.id,st={type:'state',phase:H.phase,round:H.round,total:H.total,players:H.players,giverId,pair:H.pair,clue:H.clue,guessed:Object.keys(H.guesses),
  target:H.phase==='reveal'?H.target:null,guesses:H.phase==='reveal'?H.guesses:null,results:H.results};
  if(H.phase==='giving'&&giverId){H.net.send(st,null,giverId);H.net.send({...st,target:H.target},giverId);}else H.net.send(st);}
function hostMsg(m){const giverId=H.players[H.giver]?.id;
  if(m.type==='join'){let p=H.players.find(p=>p.id===m.from);if(!p&&H.players.length<12){H.players.push({id:m.from,name:String(m.name||'').slice(0,20)||'لاعب',score:0,color:COLORS[H.players.length]});}}
  if(m.type==='clue'&&H.phase==='giving'&&m.from===giverId){H.clue=String(m.clue||'').slice(0,40);H.phase='guessing';}
  if(m.type==='skip'&&H.phase==='giving'&&m.from===giverId)hostNewCard();
  if(m.type==='guess'&&H.phase==='guessing'&&m.from!==giverId&&H.players.some(p=>p.id===m.from)&&Number.isFinite(m.angle)){
    H.guesses[m.from]=Math.min(180,Math.max(0,m.angle));if(Object.keys(H.guesses).length>=H.players.length-1)hostReveal();}
  if(H.phase!=='final')hostDraw();else if(m.type==='join')hostBroadcast();}
function hostNewCard(){H.pair=H.deck.pop()||deck([]).pop();markUsed(H.pair);H.target=randTarget();}
function hostNext(){H.round++;if(H.round>H.total){H.phase='final';hostDraw();return;}H.giver=(H.giver+1)%H.players.length;hostNewCard();H.clue='';H.guesses={};H.results=null;H.phase='giving';hostDraw();}
function hostSkipGiver(){if(H.phase!=='giving')return;H.giver=(H.giver+1)%H.players.length;hostNewCard();hostDraw();}
function hostExit(){if(!confirm('أكيد تبي تقفل الغرفة؟'))return;H.net.close();H=null;history.replaceState(0,'',location.pathname);home();}
function hostReveal(){const res={};let sum=0,n=0;for(const [id,a] of Object.entries(H.guesses)){const s=scoreOf(H.target,a);res[id]=s;sum+=s;n++;H.players.find(p=>p.id===id).score+=s;}
  const g=H.players[H.giver];res[g.id]=n?Math.round(sum/n):0;g.score+=res[g.id];H.results=res;H.phase='reveal';}
function hostDraw(){hostBroadcast();const P=H.players,side=`<div class="card"><b>النقاط</b>${[...P].sort((a,b)=>b.score-a.score).map(p=>`<div class="score"><span><span class="dot" style="background:${p.color}"></span>${esc(p.name)}${p.id===P[H.giver]?.id?' 🎙️':''}${H.guesses[p.id]!=null&&H.phase==='guessing'?' ✅':''}</span><b>${p.score}</b></div>`).join('')||'<p class="mut">ما دخل أحد للحين</p>'}</div>
  <div class="card center"><div class="mut">كود الغرفة</div><div class="code" style="font-size:2rem">${H.code}</div></div><button class="sec" id="hx">🚪 اقفل الغرفة</button>`;
  if(H.phase==='lobby'){app.innerHTML=`<h1>بين وبين</h1><div class="tvgrid"><div class="card center"><p>ادخلوا من جوالاتكم 👇</p><div class="code">${H.code}</div>
   <img alt="" style="background:#fff;padding:10px;border-radius:12px;width:220px" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(H.url)}" onerror="this.remove()">
   <p dir="ltr" style="word-break:break-all">${esc(H.url)}</p>${H.net.mode==='local'?'<p class="mut">⚠️ ما فيه نت: الجوالات ما تقدر تدخل. تقدر تجرّب بتبويب ثاني بنفس المتصفح بس.</p>':''}
   <button class="big" id="st" ${P.length<2?'disabled':''}>يلا نبدأ (${P.length} لاعبين) 🔥</button></div><div>${side}</div></div>`;$('#st').onclick=hostNext;$('#hx').onclick=hostExit;return;}
  if(H.phase==='final'){final(P);return;}
  const g=P[H.giver];let main=`<div class="mut">الجولة ${H.round}/${H.total}</div>${endsHTML(H.pair)}`;
  if(H.phase==='giving')main+=`<div class="clue mut" style="font-size:2rem">🎙️ ${esc(g.name)} يفكّر بتلميح...</div>${dialSVG({cover:true})}<button class="sec" id="sg">⏭️ الملمّح علّق؟ عطها اللي بعده</button>`;
  if(H.phase==='guessing')main+=`<div class="clue">«${esc(H.clue)}»</div>${dialSVG({cover:true})}<p class="center">حطّوا إبرتكم من الجوالات! (${Object.keys(H.guesses).length}/${P.length-1})</p><button class="sec" id="rv">اكشف الحين</button>`;
  if(H.phase==='reveal')main+=`<div class="clue">«${esc(H.clue)}»</div>${dialSVG({target:H.target,needles:Object.entries(H.guesses).map(([id,a])=>{const p=P.find(x=>x.id===id);return{angle:a,color:p.color,label:p.name}})})}
   <div class="row">${P.map(p=>`<div class="score"><span><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</span><b class="pts" style="font-size:1.5rem">+${H.results[p.id]??0}</b></div>`).join('')}</div><button class="big" id="nx">${H.round>=H.total?'النتيجة 🏆':'الجولة الجاية ⬅'}</button>`;
  app.innerHTML=`<div class="tvgrid"><div class="card">${main}</div><div>${side}</div></div>`;$('#rv')&&($('#rv').onclick=()=>{hostReveal();hostDraw();});$('#nx')&&($('#nx').onclick=hostNext);
  $('#sg')&&($('#sg').onclick=hostSkipGiver);$('#hx').onclick=hostExit;}

// ---------- اللاعب (الجوال) ----------
let PL;
function playerJoin(code){app.innerHTML=`<h1>بين وبين</h1><div class="card"><input id="code" inputmode="numeric" placeholder="كود الغرفة" value="${esc(code)}"><input id="nm" placeholder="اسمك" value="${esc(LS.get('name',''))}"><button class="big" id="j">دخّلني</button></div><button class="sec" onclick="location.href='index.html'">رجوع</button>`;
  $('#j').onclick=async()=>{const c=$('#code').value.trim(),n=$('#nm').value.trim().slice(0,20);if(!c||!n)return;$('#j').disabled=true;LS.set('name',n);
    let id=sessionStorage.getItem('bwb_id');if(!id){id='p'+Math.random().toString(36).slice(2,9);sessionStorage.setItem('bwb_id',id);}
    PL={id,name:n,st:null,lastPhase:''};PL.net=await new Net(c,id,m=>{if(m.type==='state'){PL.st=m;playerDraw();}}).open();PL.net.send({type:'join',name:n});
    let tries=0;PL.ping=setInterval(()=>{if(!PL.st||!PL.st.players.some(p=>p.id===id)){PL.net.send({type:'join',name:n});
      if(++tries===5&&$('#hint'))$('#hint').textContent=PL.net.mode==='local'?'ما فيه نت — تأكد إنك متصل وجرّب مرة ثانية':'ما لقينا الغرفة… تأكد من الكود وإن الغرفة مفتوحة (للحين نحاول)';}},2000);
    if(!PL.st)app.innerHTML='<h2>لحظة ندخّلك...</h2><p class="center mut" id="hint"></p><button class="sec" onclick="location.reload()">رجوع</button>';};}
function playerDraw(){const s=PL.st,me=s.players.find(p=>p.id===PL.id);if(!me){app.innerHTML='<h2>لحظة ندخّلك...</h2>';return;}
  const giver=s.giverId===PL.id,done=s.guessed.includes(PL.id),waiting=s.phase==='guessing'&&(giver||done);
  const key=[s.phase,s.round,s.giverId,done,s.pair?.left,s.target,waiting?s.guessed.length:''].join('|');if(key===PL.lastPhase&&s.phase!=='lobby')return;PL.lastPhase=key;
  const head=`<div class="row mut"><span><span class="dot" style="background:${me.color}"></span>${esc(me.name)} — ${me.score} نقطة</span><span style="text-align:left">${s.round?`الجولة ${s.round}/${s.total}`:''}</span></div>`;
  if(s.phase==='lobby')app.innerHTML=head+`<div class="card center"><h2>دخلت ✅</h2><p>انتظر لين تبدأ اللعبة...</p><p class="mut">${s.players.map(p=>esc(p.name)).join('، ')}</p></div>`;
  else if(s.phase==='giving'&&giver){app.innerHTML=head+`<h2>🎙️ أنت الملمّح</h2><div class="card">${endsHTML(s.pair)}${dialSVG({target:s.target})}<input id="clue" maxlength="40" placeholder="اكتب تلميحك هنا..."><p id="err" style="color:var(--red)"></p><button class="big" id="send">🙈 أرسل التلميح</button><button class="sec" id="sk">غيّر البطاقة 🔄</button></div>`;
    $('#sk').onclick=()=>{PL.lastPhase='';PL.net.send({type:'skip'},'host');};
    $('#send').onclick=()=>{const v=$('#clue').value,e=validClue(v,s.pair);if(e)return $('#err').textContent=e;PL.net.send({type:'clue',clue:v.trim()},'host');};}
  else if(s.phase==='giving')app.innerHTML=head+`<div class="card center"><h2>الملمّح يفكّر 🤔</h2>${endsHTML(s.pair)}</div>`;
  else if(s.phase==='guessing'&&!giver&&!s.guessed.includes(PL.id)){app.innerHTML=head+`<div class="card">${endsHTML(s.pair)}<div class="clue">«${esc(s.clue)}»</div><div id="d"></div><button class="big" id="lock">🔒 اعتمد</button></div>`;
    const get=interactiveDial($('#d'),{cover:true,color:me.color});$('#lock').onclick=()=>{$('#lock').disabled=true;PL.net.send({type:'guess',angle:get()},'host');};}
  else if(s.phase==='guessing')app.innerHTML=head+`<div class="card center"><h2>${giver?'التلميح انرسل 👍':'اعتمدت ✅'}</h2><p>ننتظر الباقين... (${s.guessed.length}/${s.players.length-1})</p></div>`;
  else if(s.phase==='reveal')app.innerHTML=head+`<div class="card center"><h2>طالع الشاشة 📺</h2><div class="pts">+${s.results?.[PL.id]??0}</div>${dialSVG({target:s.target,needles:s.guesses[PL.id]!=null?[{angle:s.guesses[PL.id],color:me.color}]:[]})}</div>`;
  else if(s.phase==='final'){const w=[...s.players].sort((a,b)=>b.score-a.score);app.innerHTML=`<div class="trophy">🏆</div><h2>${esc(w[0].name)} أخذها! 🔥</h2><div class="card">${w.map(p=>`<div class="score"><span>${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}</div>`;}}

// ---------- التشغيل ----------
const q=new URLSearchParams(location.search);
if(/\/play(\.html)?$/.test(location.pathname)||q.has('code'))playerJoin(q.get('code')||'');else home();
