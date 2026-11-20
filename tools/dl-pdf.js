// In-page: open "Tải đề (PDF)" modal, ensure answers+hints on, click "Tải PDF", wait for success toast.
await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = b => b.offsetParent !== null;
  const want = new URLSearchParams(location.search).get('exam');
  const open = [...document.querySelectorAll('button')].filter(vis).find(b => /Tải đề/.test(b.innerText) || b.getAttribute('aria-label') === 'Tải đề (PDF)');
  if (!open) return want + ': no download button';
  if (!/Tải đề PDF/.test(document.body.innerText)) { open.click(); await sleep(1000); }
  const dlg = [...document.querySelectorAll('[role=dialog]')].find(d => /Tải đề PDF/.test(d.innerText)); if (!dlg) return want + ': no dialog';
  for (const s of dlg.querySelectorAll('[role=switch]')) {
    let c = s; for (let i = 0; i < 5 && c && !/Kèm/.test(c.innerText); i++) c = c.parentElement;
    const label = (c && c.innerText || '').split('\n')[0];
    const want_on = /đáp án|gợi ý/i.test(label) && !/mind map/i.test(label);
    if ((s.getAttribute('aria-checked') === 'true') !== want_on) { s.click(); await sleep(250); }
  }
  const go = [...dlg.querySelectorAll('button')].find(b => b.innerText.trim() === 'Tải PDF'); if (!go) return want + ': no Tải PDF';
  go.click();
  for (let i = 0; i < 40; i++) { await sleep(500); if (/Xuất PDF thành công/.test(document.body.innerText)) return want + ': ok'; }
  return want + ': timeout';
})()
