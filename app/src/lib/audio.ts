import { del, get, set, keys } from 'idb-keyval';

const key = (attemptId: string, part: number) => `audio:${attemptId}:${part}`;
export const saveAudio = (attemptId: string, part: number, blob: Blob) => set(key(attemptId, part), blob);
export const loadAudio = (attemptId: string, part: number) => get<Blob>(key(attemptId, part));
export async function deleteAudio(attemptId: string) {
  const all = await keys();
  await Promise.all(all.filter((k) => String(k).startsWith(`audio:${attemptId}:`)).map((k) => del(k)));
}

let ctx: AudioContext | null = null;
/** Short sine "beep" for phase changes (no audio files needed). */
export function beep(freq = 880, ms = 160, times = 1) {
  try {
    ctx ??= new AudioContext();
    const c = ctx;
    for (let i = 0; i < times; i++) {
      const t0 = c.currentTime + i * (ms / 1000 + 0.09);
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + ms / 1000 + 0.02);
    }
  } catch { /* audio not available */ }
}

export function pickMime() {
  const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return c.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}
export const extFor = (mime: string) => (mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm');
