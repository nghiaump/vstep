import { useCallback, useEffect, useRef, useState } from 'react';
import { pickMime } from '../lib/audio';

export type MicState = 'idle' | 'asking' | 'ready' | 'denied' | 'unsupported';

/** Microphone access + live input level + MediaRecorder start/stop returning a Blob. */
export function useRecorder() {
  const [mic, setMic] = useState<MicState>(() =>
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined' ? 'idle' : 'unsupported');
  const [level, setLevel] = useState(0);
  const [recording, setRecording] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef(0);
  const actx = useRef<AudioContext | null>(null);

  const enable = useCallback(async () => {
    if (stream.current) return true;
    setMic('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const ctx = new AudioContext();
      actx.current = ctx;
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        raf.current = requestAnimationFrame(loop);
      };
      loop();
      setMic('ready');
      return true;
    } catch {
      setMic('denied');
      return false;
    }
  }, []);

  const start = useCallback(() => {
    if (!stream.current) return false;
    const mime = pickMime();
    const r = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    r.start(1000);
    rec.current = r;
    setRecording(true);
    return true;
  }, []);

  const stop = useCallback(() => new Promise<Blob | null>((resolve) => {
    const r = rec.current;
    if (!r || r.state === 'inactive') return resolve(null);
    r.onstop = () => {
      setRecording(false);
      resolve(chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }) : null);
    };
    r.stop();
  }), []);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    if (rec.current && rec.current.state !== 'inactive') rec.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    actx.current?.close().catch(() => {});
  }, []);

  return { mic, level, recording, enable, start, stop };
}
