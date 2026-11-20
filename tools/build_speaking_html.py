"""Build de-thi/speaking/index.html (self-contained, works offline via file://) from data.json."""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent / 'de-thi' / 'speaking'
data = json.loads((root / 'data.json').read_text())

HTML = r"""<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VSTEP Speaking – Đề VLU</title>
<style>
:root{--bg:#f6f7fb;--card:#fff;--ink:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;--accent-soft:#eaf0ff;--ok:#16a34a;--warn:#d97706}
@media (prefers-color-scheme:dark){:root{--bg:#0f1218;--card:#171b23;--ink:#e6e9ef;--muted:#98a2b3;--line:#2a303b;--accent:#7c9cff;--accent-soft:#1e2740;--ok:#4ade80;--warn:#fbbf24}}
*{box-sizing:border-box}
body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
.app{display:grid;grid-template-columns:260px 1fr;min-height:100vh}
aside{border-right:1px solid var(--line);background:var(--card);padding:16px;position:sticky;top:0;height:100vh;overflow:auto}
aside h1{font-size:17px;margin:0 0 4px}
aside .sub{color:var(--muted);font-size:13px;margin-bottom:12px}
input[type=search]{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:inherit;font-size:14px}
.tools{display:flex;gap:6px;margin:10px 0}
button{font:inherit;cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:8px;padding:7px 11px;font-size:14px}
button:hover{border-color:var(--accent)}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.list{display:flex;flex-direction:column;gap:2px}
.list a{display:flex;justify-content:space-between;gap:8px;padding:7px 10px;border-radius:7px;color:inherit;text-decoration:none;font-size:14px}
.list a:hover{background:var(--bg)}
.list a.active{background:var(--accent-soft);color:var(--accent);font-weight:600}
.list a small{color:var(--muted);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
main{padding:28px clamp(16px,4vw,48px);max-width:900px}
.head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.head h2{margin:0;font-size:24px}
.tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
.tabs button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px}
.card h3{margin:0 0 4px;font-size:13px;letter-spacing:.06em;color:var(--muted);text-transform:uppercase}
.topic{font-weight:600;margin:16px 0 6px}
ol{margin:6px 0 0;padding-left:24px}
ol li{margin:5px 0}
.situation{font-size:17px;margin:10px 0}
.opts{display:grid;gap:8px;margin:12px 0}
.opt{border:1px solid var(--line);border-radius:10px;padding:10px 14px}
.opt b{color:var(--accent);margin-right:6px}
.task{font-style:italic;color:var(--muted)}
.mind{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.mind .center{grid-column:1/-1;text-align:center;background:var(--accent);color:#fff;border-radius:10px;padding:12px;font-weight:700}
.mind .node{border:1.5px solid var(--accent);border-radius:10px;padding:10px 12px;text-align:center}
.mind .node.own{border-style:dashed;color:var(--muted)}
.timer{display:flex;align-items:center;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line);flex-wrap:wrap}
.clock{font:600 26px/1 ui-monospace,Menlo,monospace;min-width:84px}
.clock.prep{color:var(--warn)}.clock.speak{color:var(--ok)}
.hint{color:var(--muted);font-size:13px}
.src{margin-top:18px;font-size:13px;color:var(--muted)}
.src a{color:var(--muted)}
.menu{display:none}
@media (max-width:760px){
  .app{grid-template-columns:1fr}
  aside{position:fixed;inset:0 25% 0 0;z-index:5;transform:translateX(-105%);transition:.2s;height:100%}
  aside.open{transform:none;box-shadow:0 0 0 100vmax rgba(0,0,0,.35)}
  .menu{display:inline-block}
  main{padding:16px}
  .mind{grid-template-columns:1fr}
}
</style>
</head>
<body>
<div class="app">
  <aside id="side">
    <h1>VSTEP Speaking</h1>
    <div class="sub">Đề Văn Lang (VLU) · <span id="count"></span> đề · bản lưu offline</div>
    <input type="search" id="q" placeholder="Tìm chủ đề, từ khoá…">
    <div class="tools"><button id="rand">🎲 Đề ngẫu nhiên</button></div>
    <nav class="list" id="list"></nav>
  </aside>
  <main>
    <div class="head">
      <div style="display:flex;gap:10px;align-items:center"><button class="menu" id="menu">☰</button><h2 id="title"></h2></div>
      <div style="display:flex;gap:6px"><button id="prev">← Đề mới hơn</button><button id="next">Đề cũ hơn →</button></div>
    </div>
    <div class="tabs" id="tabs"></div>
    <div class="card" id="part"></div>
    <div class="src" id="src"></div>
  </main>
</div>
<script>
const DATA = __DATA__;
const ids = Object.keys(DATA).map(Number).sort((a,b)=>b-a);
const TIME = {1:{prep:0,speak:180},2:{prep:60,speak:180},3:{prep:60,speak:240}};
let cur = ids[0], part = 1, tick = null;
const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function lines(t){ return t.split('\n').slice(1).map(s=>s.trim()).filter(Boolean); }
function questions(arr){ const q=[]; for(let i=0;i<arr.length;i++){ if(/^\d+$/.test(arr[i]) && arr[i+1]){ q.push(arr[i+1]); i++; } } return q; }

function renderP1(t){
  const L = lines(t).filter(s=>s!=='Questions:'); let html='', buf=[];
  const flush=()=>{ if(buf.length){ html+='<ol>'+questions(buf).map(q=>'<li>'+esc(q)+'</li>').join('')+'</ol>'; buf=[]; } };
  let n=0;
  for(const s of L){ if(/^(Now, )?let.s talk about/i.test(s)){ flush(); html+='<div class="topic">'+esc(s)+'</div>'; } else buf.push(s); }
  flush();
  // keep original numbering across the two topics
  return html.replace(/<ol>/g, () => { const start = n*3+1; n++; return '<ol start="'+start+'">'; });
}
function renderP2(t){
  const L = lines(t); const opts=L.filter(s=>/^Option \d+:/.test(s));
  const sit = L[0]; const task = L.find(s=>/^Choose/.test(s))||'';
  return '<p class="situation">'+esc(sit)+'</p><div class="opts">'+opts.map(o=>{const m=o.match(/^(Option \d+):\s*(.*)$/);return '<div class="opt"><b>'+m[1]+'</b>'+esc(m[2])+'</div>';}).join('')+'</div><p class="task">'+esc(task)+'</p>';
}
function renderP3(t){
  const L = lines(t); const fi = L.indexOf('Follow-up Questions:');
  const topic = L[0], mind = L.slice(1, fi<0?L.length:fi), fq = fi<0?[]:questions(L.slice(fi+1));
  const [center, ...nodes] = mind;
  return '<div class="topic" style="font-size:18px">'+esc(topic)+'</div>'
    + '<div class="mind"><div class="center">'+esc(center||'')+'</div>'+nodes.map(n=>'<div class="node'+(/your own/i.test(n)?' own':'')+'">'+esc(n)+'</div>').join('')+'</div>'
    + (fq.length?'<div class="topic">Follow-up questions</div><ol>'+fq.map(q=>'<li>'+esc(q)+'</li>').join('')+'</ol>':'');
}
const R = {1:renderP1,2:renderP2,3:renderP3};
const NAME = {1:'Part 1 · Social interaction',2:'Part 2 · Solution discussion',3:'Part 3 · Topic development'};

function fmt(s){ return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function stopTimer(){ clearInterval(tick); tick=null; }
function startTimer(){
  stopTimer(); const T=TIME[part]; let phase=T.prep?'prep':'speak', left=T.prep||T.speak;
  const c=$('#clock'), lab=$('#phase');
  const draw=()=>{ c.textContent=fmt(left); c.className='clock '+phase; lab.textContent=phase==='prep'?'Chuẩn bị':'Đang nói'; };
  draw();
  tick=setInterval(()=>{ left--; if(left<0){ if(phase==='prep'){ phase='speak'; left=T.speak; } else { stopTimer(); c.textContent='Hết giờ'; lab.textContent=''; return; } } draw(); },1000);
}

function show(){
  stopTimer();
  const ex = DATA[cur];
  $('#title').textContent = ex.title;
  $('#tabs').innerHTML = [1,2,3].map(n=>'<button class="'+(n===part?'on':'')+'" data-p="'+n+'">Part '+n+'</button>').join('');
  const T=TIME[part];
  $('#part').innerHTML = '<h3>'+NAME[part]+'</h3>'+R[part](ex.parts[part-1])
    + '<div class="timer"><span class="clock" id="clock">'+fmt(T.prep||T.speak)+'</span><span class="hint" id="phase">'+(T.prep?'1 phút chuẩn bị, ':'')+fmt(T.speak)+' nói</span>'
    + '<button class="primary" id="go">▶ Bắt đầu</button><button id="stop">■ Dừng</button></div>';
  $('#src').innerHTML = 'Nguồn: <a href="https://vstepowl.com/exam-reviews/de-thi/?exam=vlu-exam-'+cur+'&skill=speaking">vstepowl.com</a> · lưu để tự ôn cá nhân';
  document.querySelectorAll('#list a').forEach(a=>a.classList.toggle('active', +a.dataset.id===cur));
  $('#go').onclick=startTimer; $('#stop').onclick=stopTimer;
  try{ localStorage.setItem('vstep-speaking-last', JSON.stringify({cur,part})); }catch(e){}
  if(location.hash!=='#'+cur+'-'+part) history.replaceState(null,'','#'+cur+'-'+part);
}
function go(id,p=1){ cur=id; part=p; show(); $('#side').classList.remove('open'); window.scrollTo(0,0); }

function renderList(){
  const q=$('#q').value.trim().toLowerCase();
  const shown = ids.filter(id=>!q || (DATA[id].title+' '+DATA[id].parts.join(' ')).toLowerCase().includes(q));
  $('#list').innerHTML = shown.map(id=>{ const p3=lines(DATA[id].parts[2])[0]||''; return '<a href="#'+id+'-1" data-id="'+id+'">VLU '+id+'<small title="'+esc(p3)+'">'+esc(p3)+'</small></a>'; }).join('') || '<div class="hint">Không có đề nào khớp.</div>';
  document.querySelectorAll('#list a').forEach(a=>{ a.classList.toggle('active', +a.dataset.id===cur); a.onclick=e=>{e.preventDefault(); go(+a.dataset.id);} });
}

$('#count').textContent = ids.length;
$('#q').oninput = renderList;
$('#tabs').onclick = e=>{ const p=e.target.dataset.p; if(p){ part=+p; show(); } };
$('#rand').onclick = ()=> go(ids[Math.floor(Math.random()*ids.length)]);
$('#prev').onclick = ()=>{ const i=ids.indexOf(cur); if(i>0) go(ids[i-1]); };
$('#next').onclick = ()=>{ const i=ids.indexOf(cur); if(i<ids.length-1) go(ids[i+1]); };
$('#menu').onclick = ()=> $('#side').classList.toggle('open');
document.addEventListener('keydown', e=>{ if(e.target.tagName==='INPUT') return; if(e.key==='ArrowRight'){part=Math.min(3,part+1);show();} if(e.key==='ArrowLeft'){part=Math.max(1,part-1);show();} });

window.addEventListener('hashchange', ()=>{ const m=location.hash.match(/^#(\d+)-(\d)$/); if(m && DATA[m[1]] && (+m[1]!==cur || +m[2]!==part)){ cur=+m[1]; part=+m[2]; renderList(); show(); } });
const h = location.hash.match(/^#(\d+)-(\d)$/);
if(h && DATA[h[1]]){ cur=+h[1]; part=+h[2]; }
else { try{ const s=JSON.parse(localStorage.getItem('vstep-speaking-last')||'null'); if(s && DATA[s.cur]){ cur=s.cur; part=s.part; } }catch(e){} }
renderList(); show();
</script>
</body>
</html>
"""

out = HTML.replace('__DATA__', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
(root / 'index.html').write_text(out)
print('wrote', root / 'index.html', len(out), 'bytes,', len(data), 'exams')
