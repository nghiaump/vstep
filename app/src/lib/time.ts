/** Remaining seconds for a timed attempt; derived from wall clock so reloads never reset the timer. */
export function remainingSec(startedAt: number, durationSec: number, now = Date.now()) {
  return Math.max(0, Math.ceil(durationSec - (now - startedAt) / 1000));
}
export function elapsedSec(startedAt: number, end = Date.now()) {
  return Math.max(0, Math.floor((end - startedAt) / 1000));
}
export function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
export function duration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 1) return `${sec} giây`;
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}
export function when(ts: number, now = Date.now()) {
  const d = new Date(ts);
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `Hôm nay, ${hm}`;
  if (days === 1) return `Hôm qua, ${hm}`;
  if (days < 7) return `${days} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function countWords(s: string) {
  return (s.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}
export function countParagraphs(s: string) {
  return s.split(/\n\s*\n|\n/).filter((p) => p.trim()).length;
}
