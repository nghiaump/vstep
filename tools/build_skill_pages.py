"""Build offline practice pages from de-thi/exams/*.json:
  de-thi/reading/index.html  – làm bài theo đề hoặc theo dạng câu hỏi, chấm điểm, giải thích
  de-thi/writing/index.html  – đề Task 1/2, khung viết + đếm từ + hẹn giờ, hướng dẫn làm bài
Also writes de-thi/reading/data.json and de-thi/writing/data.json (normalized, reusable).
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'de-thi'
exams = sorted((json.loads(p.read_text()) for p in (ROOT / 'exams').glob('vlu-*.json')), key=lambda e: -e['number'])

reading = [dict(id=e['id'], number=e['number'], title=e['title'], source=e['source'] + '&skill=reading',
                parts=e['reading']['parts']) for e in exams if e['has_reading']]
writing = [dict(id=e['id'], number=e['number'], title=e['title'], source=e['source'] + '&skill=writing',
                tasks=e['writing']['tasks']) for e in exams if e['writing']['tasks']]

for d in ('reading', 'writing'):
    (ROOT / d).mkdir(exist_ok=True)
(ROOT / 'reading' / 'data.json').write_text(json.dumps(reading, ensure_ascii=False, indent=1))
(ROOT / 'writing' / 'data.json').write_text(json.dumps(writing, ensure_ascii=False, indent=1))

BASE_CSS = r"""
:root{--bg:#f6f7fb;--card:#fff;--ink:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;--accent-soft:#eaf0ff;--ok:#16a34a;--ok-soft:#e7f7ec;--bad:#dc2626;--bad-soft:#fdecec;--warn:#b45309}
@media (prefers-color-scheme:dark){:root{--bg:#0f1218;--card:#171b23;--ink:#e6e9ef;--muted:#98a2b3;--line:#2a303b;--accent:#7c9cff;--accent-soft:#1e2740;--ok:#4ade80;--ok-soft:#12301d;--bad:#f87171;--bad-soft:#3a1717;--warn:#fbbf24}}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
.app{display:grid;grid-template-columns:250px 1fr;min-height:100vh}
aside{border-right:1px solid var(--line);background:var(--card);padding:16px;position:sticky;top:0;height:100vh;overflow:auto}
aside h1{font-size:17px;margin:0 0 2px}.sub{color:var(--muted);font-size:13px;margin-bottom:12px}
input[type=search],select{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);font:inherit;font-size:14px}
button{font:inherit;cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:8px;padding:7px 12px;font-size:14px}
button:hover{border-color:var(--accent)}button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.seg{display:flex;gap:4px;margin:10px 0}.seg button{flex:1;padding:6px 4px;font-size:13px}
.list{display:flex;flex-direction:column;gap:2px;margin-top:8px}
.list a{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;border-radius:7px;color:inherit;text-decoration:none;font-size:14px}
.list a:hover{background:var(--bg)}.list a.active{background:var(--accent-soft);color:var(--accent);font-weight:600}
a{color:var(--accent)}.list a>span:first-child{white-space:nowrap}.list a .badge{overflow:hidden;text-overflow:ellipsis}
.badge{font-size:12px;color:var(--muted);font-weight:400;white-space:nowrap}
.badge.done{color:var(--ok);font-weight:600}
main{padding:24px clamp(16px,3vw,40px);min-width:0}
.head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
.head h2{margin:0;font-size:22px}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px}
.hint{color:var(--muted);font-size:13px}
.md p{margin:.4em 0}.md ul{margin:.3em 0;padding-left:22px}.md li{margin:.2em 0}
.menu{display:none}
@media (max-width:820px){.app{grid-template-columns:1fr}aside{position:fixed;inset:0 20% 0 0;z-index:5;transform:translateX(-105%);transition:.2s;height:100%}aside.open{transform:none;box-shadow:0 0 0 100vmax rgba(0,0,0,.35)}.menu{display:inline-block}main{padding:14px}}
"""

BASE_JS = r"""
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function md(src){
  const out=[]; let ul=0;
  const close=(to)=>{ while(ul>to){ out.push('</ul>'); ul--; } };
  for (const raw of String(src||'').split('\n')){
    const m = raw.match(/^(\s*)- (.*)$/);
    if (m){ const lvl = m[1].length>=2 ? 2 : 1; while(ul<lvl){ out.push('<ul>'); ul++; } close(lvl); out.push('<li>'+inline(m[2])+'</li>'); }
    else { close(0); if (raw.trim()) out.push('<p>'+inline(raw)+'</p>'); }
  }
  close(0); return out.join('');
}
const store = { get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
$('#menu') && ($('#menu').onclick = () => $('#side').classList.toggle('open'));
"""

READING_HTML = r"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>VSTEP Reading – Đề VLU</title><style>__CSS__
.split{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;align-items:start}
.passage{position:sticky;top:12px;max-height:calc(100vh - 40px);overflow:auto}
.passage h3{margin:0 0 4px;font-size:19px}.passage p{margin:0 0 12px;text-align:justify}
.passage .pn{color:var(--muted);font-size:12px;font-weight:600;margin-right:6px}
.q{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px;background:var(--card)}
.q .stem{font-weight:600;margin-bottom:8px}.q .num{color:var(--accent);margin-right:6px}
.opt{display:flex;gap:10px;align-items:flex-start;padding:7px 10px;border:1px solid var(--line);border-radius:9px;margin:6px 0;cursor:pointer}
.opt:hover{border-color:var(--accent)}.opt input{margin-top:5px}
.opt.sel{border-color:var(--accent);background:var(--accent-soft)}
.opt.correct{border-color:var(--ok);background:var(--ok-soft)}.opt.wrong{border-color:var(--bad);background:var(--bad-soft)}
.tag{display:inline-block;font-size:12px;padding:1px 8px;border-radius:99px;background:var(--accent-soft);color:var(--accent);margin-left:6px;font-weight:500}
.expl{margin-top:8px;font-size:14px;color:var(--muted);border-left:3px solid var(--line);padding-left:10px}
.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0 14px}
.score{font-weight:700}.timer{font:600 18px ui-monospace,Menlo,monospace}
details.tips{margin-top:14px}details.tips summary{cursor:pointer;font-weight:600}
.ctx{margin:8px 0 0;font-size:14px;max-height:280px;overflow:auto;border:1px dashed var(--line);border-radius:8px;padding:10px}
@media (max-width:1000px){.split{grid-template-columns:1fr}.passage{position:static;max-height:none}}
</style></head><body><div class="app">
<aside id="side"><h1>VSTEP Reading</h1><div class="sub">Đề Văn Lang (VLU) · <span id="cnt"></span> đề · offline</div>
<div class="seg"><button id="m-exam" class="on">Theo đề</button><button id="m-type">Theo dạng câu</button></div>
<input type="search" id="q" placeholder="Tìm tiêu đề bài đọc…"><nav class="list" id="list"></nav></aside>
<main><div class="head"><div style="display:flex;gap:10px;align-items:center"><button class="menu" id="menu">☰</button><h2 id="title"></h2></div><div class="tabs" id="tabs"></div></div>
<div id="view"></div></main></div>
<script>const DATA=__DATA__;__JS__
const TYPES=['Chi tiết','Từ vựng','Quy chiếu','Loại trừ (NOT/EXCEPT)','Suy luận','Ý chính','Mục đích tác giả','Thái độ tác giả','Chèn câu'];
const byId=Object.fromEntries(DATA.map(e=>[e.id,e]));
let mode='exam', cur=DATA[0].id, part=1, type=TYPES[0], page=0, tick=null;
let A=store.get('vstep-reading-answers',{}), S=store.get('vstep-reading-submitted',{});
const save=()=>{store.set('vstep-reading-answers',A);store.set('vstep-reading-submitted',S);};
const key=(id,p)=>id+'#'+p;
function partScore(e,p){const P=e.parts.find(x=>x.part===p);return P.questions.filter(q=>(A[e.id]||{})[q.number]===q.answer).length;}
function examBadge(e){const done=e.parts.filter(p=>S[key(e.id,p.part)]).length;if(!done)return '';const sc=e.parts.filter(p=>S[key(e.id,p.part)]).reduce((s,p)=>s+partScore(e,p.part),0);return '<span class="badge done">'+sc+'/'+done*10+'</span>';}

function renderList(){
  const q=$('#q').value.trim().toLowerCase(); let h='';
  if(mode==='exam') h=DATA.filter(e=>!q||(e.title+' '+e.parts.map(p=>p.title).join(' ')).toLowerCase().includes(q)).map(e=>'<a href="#" data-id="'+e.id+'" class="'+(e.id===cur?'active':'')+'"><span>VLU '+e.number+'</span>'+(examBadge(e)||'<span class="badge">'+esc(e.parts[0].title.slice(0,22))+'…</span>')+'</a>').join('');
  else { const all=allQs(); h=TYPES.map(t=>'<a href="#" data-t="'+esc(t)+'" class="'+(t===type?'active':'')+'"><span>'+esc(t)+'</span><span class="badge">'+all.filter(x=>x.q.type===t).length+'</span></a>').join(''); }
  $('#list').innerHTML=h||'<div class="hint">Không có kết quả.</div>';
  $('#list').querySelectorAll('a').forEach(a=>a.onclick=ev=>{ev.preventDefault(); if(a.dataset.id){cur=a.dataset.id;part=1;} else {type=a.dataset.t;page=0;} $('#side').classList.remove('open'); render();});
}
function allQs(){const r=[];for(const e of DATA)for(const p of e.parts)for(const q of p.questions)r.push({e,p,q});return r;}
function passageHTML(p){return '<h3>'+esc(p.title)+'</h3><div class="hint" style="margin-bottom:10px">'+esc(p.directions)+'</div>'+p.passage.map((t,i)=>'<p><span class="pn">'+(i+1)+'</span>'+inline(t)+'</p>').join('');}
function qHTML(e,q,submitted,showMeta){
  const sel=(A[e.id]||{})[q.number];
  const opts=Object.entries(q.options).map(([k,v])=>{let c='opt';if(sel===k)c+=' sel';if(submitted){if(k===q.answer)c+=' correct';else if(sel===k)c+=' wrong';}
    return '<label class="'+c+'"><input type="radio" name="'+e.id+'-'+q.number+'" value="'+k+'" '+(sel===k?'checked':'')+' '+(submitted?'disabled':'')+' data-e="'+e.id+'" data-q="'+q.number+'"><span><b>'+k+'.</b> '+inline(v)+'</span></label>';}).join('');
  const meta=submitted?'<div class="expl">Đáp án: <b>'+(q.answer||'?')+'</b>'+(q.explanation?' — '+inline(q.explanation):'')+'</div>':'';
  return '<div class="q"><div class="stem"><span class="num">'+q.number+'.</span>'+inline(q.stem)+(showMeta||submitted?'<span class="tag">'+esc(q.type)+'</span>':'')+'</div>'+opts+meta+'</div>';
}
function bindRadios(after){document.querySelectorAll('#view input[type=radio]').forEach(r=>r.onchange=()=>{(A[r.dataset.e]=A[r.dataset.e]||{})[r.dataset.q]=r.value;save();after&&after(r);});}

function renderExam(){
  const e=byId[cur], P=e.parts.find(x=>x.part===part), k=key(e.id,part), sub=!!S[k];
  $('#title').textContent=e.title;
  $('#tabs').innerHTML=e.parts.map(p=>'<button class="'+(p.part===part?'on':'')+'" data-p="'+p.part+'">Part '+p.part+(S[key(e.id,p.part)]?' ✓':'')+'</button>').join('');
  $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{part=+b.dataset.p;render();});
  const answered=P.questions.filter(q=>(A[e.id]||{})[q.number]).length;
  const bar='<div class="bar">'+(sub?'<span class="score">Kết quả: '+partScore(e,part)+'/10</span><button id="redo">Làm lại part này</button>':'<span class="hint">Đã chọn '+answered+'/10</span><button class="primary" id="submit">Nộp part '+part+'</button>')+'<span style="flex:1"></span><span class="timer" id="clock"></span><button id="tgo">⏱ 15 phút</button></div>';
  $('#view').innerHTML='<div class="split"><div class="card passage">'+passageHTML(P)+'</div><div>'+bar+P.questions.map(q=>qHTML(e,q,sub,false)).join('')
    +(sub&&P.tips_md?'<details class="tips card" open><summary>Gợi ý làm bài (Part '+part+')</summary><div class="md">'+md(P.tips_md)+'</div></details>':'')
    +'<p class="hint">Nguồn: <a href="'+esc(e.source)+'">vstepowl.com</a> · lưu để tự ôn cá nhân</p></div></div>';
  bindRadios(()=>{ if(!S[k]) { const n=P.questions.filter(q=>(A[e.id]||{})[q.number]).length; const h=document.querySelector('.bar .hint'); h&&(h.textContent='Đã chọn '+n+'/10'); document.querySelectorAll('.opt').forEach(o=>o.classList.toggle('sel',o.querySelector('input').checked)); } });
  $('#submit')&&($('#submit').onclick=()=>{S[k]=1;save();render();window.scrollTo(0,0);});
  $('#redo')&&($('#redo').onclick=()=>{delete S[k];P.questions.forEach(q=>{if(A[e.id])delete A[e.id][q.number];});save();render();});
  $('#tgo').onclick=()=>{clearInterval(tick);let left=900;const c=$('#clock');const d=()=>c.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');d();tick=setInterval(()=>{left--;if(left<0){clearInterval(tick);c.textContent='Hết giờ';return;}d();},1000);};
}
function renderType(){
  const items=allQs().filter(x=>x.q.type===type), per=10, pages=Math.ceil(items.length/per); page=Math.min(page,pages-1);
  $('#title').textContent=type+' ('+items.length+' câu)';
  $('#tabs').innerHTML='<button id="prev">←</button><span class="hint" style="align-self:center">Trang '+(page+1)+'/'+pages+'</span><button id="next">→</button>';
  $('#prev').onclick=()=>{if(page>0){page--;render();}}; $('#next').onclick=()=>{if(page<pages-1){page++;render();}};
  $('#view').innerHTML='<p class="hint">Chọn đáp án để xem ngay đúng/sai và giải thích. Bấm "Xem bài đọc" để mở đoạn văn gốc.</p>'+items.slice(page*per,page*per+per).map(({e,p,q})=>{
    const done=(A[e.id]||{})[q.number]!==undefined;
    return '<div><div class="hint">VLU '+e.number+' · Part '+p.part+' · '+esc(p.title)+' <a href="#" data-ctx="'+e.id+'|'+p.part+'">Xem bài đọc</a></div><div class="ctx" id="ctx-'+e.id+'-'+p.part+'-'+q.number+'" hidden></div>'+qHTML(e,q,done,true)+'</div>';}).join('');
  document.querySelectorAll('[data-ctx]').forEach(a=>a.onclick=ev=>{ev.preventDefault();const box=a.parentElement.nextElementSibling;const [id,pn]=a.dataset.ctx.split('|');box.innerHTML=passageHTML(byId[id].parts.find(x=>x.part===+pn));box.hidden=!box.hidden;});
  bindRadios(()=>render());
}
function render(){ clearInterval(tick); renderList(); mode==='exam'?renderExam():renderType(); store.set('vstep-reading-last',{mode,cur,part,type,page}); }
$('#m-exam').onclick=()=>{mode='exam';$('#m-exam').classList.add('on');$('#m-type').classList.remove('on');render();};
$('#m-type').onclick=()=>{mode='type';$('#m-type').classList.add('on');$('#m-exam').classList.remove('on');render();};
$('#q').oninput=renderList; $('#cnt').textContent=DATA.length;
const L=store.get('vstep-reading-last',null); if(L&&byId[L.cur]){({mode,cur,part,type,page}=L); if(mode==='type'){$('#m-type').classList.add('on');$('#m-exam').classList.remove('on');}}
render();
</script></body></html>"""

WRITING_HTML = r"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>VSTEP Writing – Đề VLU</title><style>__CSS__
.prompt{font-size:16px}.prompt p{margin:.5em 0}
.meta{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.pill{font-size:13px;padding:2px 10px;border-radius:99px;background:var(--accent-soft);color:var(--accent)}
textarea{width:100%;min-height:340px;margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font:16px/1.7 Georgia,"Times New Roman",serif;resize:vertical}
.bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
.wc{font-weight:700}.wc.low{color:var(--warn)}.wc.ok{color:var(--ok)}
.timer{font:600 18px ui-monospace,Menlo,monospace}
details.guide{margin-top:16px}details.guide summary{cursor:pointer;font-weight:600}
</style></head><body><div class="app">
<aside id="side"><h1>VSTEP Writing</h1><div class="sub">Đề Văn Lang (VLU) · <span id="cnt"></span> đề · offline</div>
<input type="search" id="q" placeholder="Tìm chủ đề, từ khoá…"><nav class="list" id="list"></nav></aside>
<main><div class="head"><div style="display:flex;gap:10px;align-items:center"><button class="menu" id="menu">☰</button><h2 id="title"></h2></div><div class="tabs" id="tabs"></div></div>
<div class="card" id="view"></div><p class="hint" id="src"></p></main></div>
<script>const DATA=__DATA__;__JS__
const byId=Object.fromEntries(DATA.map(e=>[e.id,e]));
let cur=DATA[0].id, task=1, tick=null;
let D=store.get('vstep-writing-drafts',{});
const words=s=>(s.trim().match(/[A-Za-zÀ-ỹ0-9'’-]+/g)||[]).length;
function renderList(){
  const q=$('#q').value.trim().toLowerCase();
  $('#list').innerHTML=DATA.filter(e=>!q||e.tasks.map(t=>t.prompt).join(' ').toLowerCase().includes(q)).map(e=>{const n=[1,2].filter(t=>words(D[e.id+'#'+t]||'')>0).length;
    return '<a href="#" data-id="'+e.id+'" class="'+(e.id===cur?'active':'')+'"><span>VLU '+e.number+'</span><span class="badge'+(n?' done':'')+'">'+(n?n+'/2 đã viết':'')+'</span></a>';}).join('')||'<div class="hint">Không có kết quả.</div>';
  $('#list').querySelectorAll('a').forEach(a=>a.onclick=ev=>{ev.preventDefault();cur=a.dataset.id;task=1;$('#side').classList.remove('open');render();});
}
function render(){
  clearInterval(tick); renderList();
  const e=byId[cur], T=e.tasks.find(t=>t.task===task)||e.tasks[0], k=e.id+'#'+T.task, mins=T.task===1?20:40;
  $('#title').textContent=e.title;
  $('#tabs').innerHTML=e.tasks.map(t=>'<button class="'+(t.task===T.task?'on':'')+'" data-t="'+t.task+'">Task '+t.task+'</button>').join('');
  $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{task=+b.dataset.t;render();});
  $('#view').innerHTML='<div class="meta"><span class="pill">Task '+T.task+' · '+esc(T.kind||'')+'</span><span class="pill">Tối thiểu '+(T.min_words||'?')+' từ</span><span class="pill">Gợi ý '+mins+' phút</span></div>'
    +'<div class="prompt md">'+md(T.prompt)+'</div>'
    +'<textarea id="draft" placeholder="Viết bài của bạn ở đây… (tự lưu trong trình duyệt)">'+esc(D[k]||'')+'</textarea>'
    +'<div class="bar"><span class="wc" id="wc"></span><span style="flex:1"></span><span class="timer" id="clock"></span><button id="tgo">⏱ '+mins+' phút</button><button id="dl">Tải bài (.txt)</button><button id="clr">Xoá bài</button></div>'
    +(T.guide_md?'<details class="guide"><summary>Hướng dẫn làm bài (dàn ý, từ vựng, lỗi thường gặp)</summary><div class="md">'+md(T.guide_md)+'</div></details>':'');
  $('#src').innerHTML='Nguồn: <a href="'+esc(e.source)+'">vstepowl.com</a> · lưu để tự ôn cá nhân';
  const ta=$('#draft'), wc=$('#wc'); const upd=()=>{const n=words(ta.value);wc.textContent=n+' / '+T.min_words+' từ';wc.className='wc '+(n>=T.min_words?'ok':n?'low':'');};
  upd(); ta.oninput=()=>{D[k]=ta.value;store.set('vstep-writing-drafts',D);upd();};
  ta.onblur=()=>renderList();
  $('#tgo').onclick=()=>{clearInterval(tick);let left=mins*60;const c=$('#clock');const d=()=>c.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');d();tick=setInterval(()=>{left--;if(left<0){clearInterval(tick);c.textContent='Hết giờ';return;}d();},1000);};
  $('#dl').onclick=()=>{const b=new Blob([T.prompt.replace(/\*\*/g,'')+'\n\n---\n\n'+ta.value],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=e.id+'-task'+T.task+'.txt';a.click();};
  $('#clr').onclick=ev=>{const b=ev.target;if(ta.value&&!b.dataset.armed){b.dataset.armed=1;b.textContent='Bấm lần nữa để xoá';setTimeout(()=>{delete b.dataset.armed;b.textContent='Xoá bài';},3000);return;}ta.value='';D[k]='';store.set('vstep-writing-drafts',D);upd();renderList();b.textContent='Xoá bài';delete b.dataset.armed;};
  store.set('vstep-writing-last',{cur,task});
}
$('#q').oninput=renderList; $('#cnt').textContent=DATA.length;
const L=store.get('vstep-writing-last',null); if(L&&byId[L.cur]){cur=L.cur;task=L.task;}
render();
</script></body></html>"""


def build(tpl, data, out):
    html = tpl.replace('__CSS__', BASE_CSS).replace('__JS__', BASE_JS).replace(
        '__DATA__', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
    out.write_text(html)
    print('wrote', out, f'{len(html)//1024} KB')


build(READING_HTML, reading, ROOT / 'reading' / 'index.html')
build(WRITING_HTML, writing, ROOT / 'writing' / 'index.html')
print(len(reading), 'reading exams,', sum(len(e['parts']) for e in reading) * 10, 'questions;', len(writing), 'writing exams')
