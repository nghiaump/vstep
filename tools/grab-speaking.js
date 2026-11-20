await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = b => b.offsetParent !== null;
  const btn = re => [...document.querySelectorAll('button')].filter(vis).find(b => re.test(b.innerText.trim()));
  const panel = () => { const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^SPEAKING\s*—\s*PART/i.test((e.innerText || '').trim())); let c = h; for (let i = 0; i < 4 && c; i++) c = c.parentElement; return c; };
  const clean = t => t.replace(/^(Gợi ý|Trợ lý AI|Nói với AI \(Live\)|Mindmap|Lịch sử|Ghi âm)$/gm, '').replace(/Gợi ý: Bạn có thể ghi chú.*\n?/g, '').replace(/Lưu ý: Nên dùng máy tính.*\n?/g, '').replace(/Bạn chưa biết bắt đầu từ đâu\?.*\n?/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const popup = async () => { const dlg = [...document.querySelectorAll('[role=dialog], .fixed')].find(d => vis(d) && /Vẫn tiếp tục|Chưa hoàn thành/.test(d.innerText)); if (dlg) { const ok = [...dlg.querySelectorAll('button')].find(x => /^Tiếp tục$/.test(x.innerText.trim())); if (ok) { ok.click(); await sleep(1000); } } };
  const goPart = async n => { const t = [...document.querySelectorAll('button')].filter(vis).find(b => b.innerText.trim() === 'Part ' + n); if (t) { t.click(); await sleep(1000); await popup(); } };
  const grab = async n => { await goPart(n); const s = btn(/^Bắt đầu$/); if (s) { s.click(); await sleep(1200); } const p = panel(); if (!p) return null; p.querySelectorAll('svg text').forEach(t => { const ts = [...t.querySelectorAll('tspan')]; ts.forEach((x, i) => { if (i < ts.length - 1 && !x.textContent.endsWith(' ')) x.textContent += ' '; }); }); return clean(p.innerText); };
  const want = +new URLSearchParams(location.search).get('exam').split('-').pop();
  const title = document.title.replace(/\s*\|.*$/, '');
  const start = btn(/^Làm bài$/); if (start) { start.click(); await sleep(2000); }
  let res;
  if (!panel()) res = { id: want, title, error: 'exam view not found' };
  else { const parts = []; for (let n = 1; n <= 3; n++) parts.push(await grab(n)); res = { id: want, title, parts }; }
  if (!title.endsWith(' ' + want)) res.error = 'title mismatch: ' + title;
  const dump = JSON.parse(sessionStorage.getItem('__vstep_dump') || '[]'); dump.push(res); sessionStorage.setItem('__vstep_dump', JSON.stringify(dump));
  const back = [...document.querySelectorAll('button')].filter(vis).filter(b => !b.innerText.trim() && b.getBoundingClientRect().y < 80).sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)[0];
  if (back) { back.click(); await sleep(800); }
  return `${want}: ${res.error || 'ok'} (${(res.parts || []).filter(Boolean).length} parts)`;
})()
