import { useSyncExternalStore } from 'react';
import type { Attempt } from './types';

const NS = 'vstep:v1:';
const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let v: T = fallback;
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw) v = JSON.parse(raw) as T;
  } catch { /* storage unavailable or corrupt: use fallback */ }
  cache.set(key, v);
  return v;
}

function write<T>(key: string, value: T) {
  cache.set(key, value);
  try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch { /* quota / private mode */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key?.startsWith(NS)) { cache.delete(e.key.slice(NS.length)); cb(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

/** Reactive localStorage value shared across components (and tabs). */
export function useStored<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = (v: T | ((prev: T) => T)) => write(key, typeof v === 'function' ? (v as (p: T) => T)(read(key, fallback)) : v);
  return [value, set];
}

// ---------- Profile & UI ----------
export interface Profile { name: string }
export type ReadSize = 's' | 'm' | 'l';
export interface UiPrefs { theme: 'system' | 'light' | 'dark'; split: number; readSize?: ReadSize }
export const DEFAULT_PROFILE: Profile = { name: '' };
export const DEFAULT_UI: UiPrefs = { theme: 'system', split: 0.52, readSize: 'm' };

export const useProfile = () => useStored<Profile>('profile', DEFAULT_PROFILE);
export const useUi = () => useStored<UiPrefs>('ui', DEFAULT_UI);

// ---------- Attempts ----------
const EMPTY: Attempt[] = [];
export const useAttempts = () => useStored<Attempt[]>('attempts', EMPTY);
export const getAttempts = () => read<Attempt[]>('attempts', EMPTY);

export function saveAttempt(a: Attempt) {
  const list = getAttempts();
  const i = list.findIndex((x) => x.id === a.id);
  write('attempts', i < 0 ? [...list, a] : list.map((x) => (x.id === a.id ? a : x)));
}
export function removeAttempt(id: string) {
  write('attempts', getAttempts().filter((x) => x.id !== id));
}
export function getAttempt<T extends Attempt>(id: string): T | undefined {
  return getAttempts().find((x) => x.id === id) as T | undefined;
}
export function findActive<T extends Attempt>(pred: (a: Attempt) => boolean): T | undefined {
  return getAttempts().find((a) => !a.submittedAt && pred(a)) as T | undefined;
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Backup ----------
export function exportAll(): string {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(NS)) out[k] = JSON.parse(localStorage.getItem(k) || 'null');
  }
  return JSON.stringify({ app: 'vstep-practice', version: 1, exportedAt: new Date().toISOString(), data: out }, null, 2);
}
export function importAll(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.app !== 'vstep-practice' || typeof parsed.data !== 'object') throw new Error('File không đúng định dạng sao lưu.');
  for (const [k, v] of Object.entries(parsed.data)) if (k.startsWith(NS)) localStorage.setItem(k, JSON.stringify(v));
  cache.clear();
  listeners.forEach((l) => l());
}
export function clearAll() {
  Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k));
  cache.clear();
  listeners.forEach((l) => l());
}
