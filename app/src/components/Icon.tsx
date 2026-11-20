const P: Record<string, string> = {
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  flag: 'M5 21V4m0 0h11l-1.5 4L16 12H5',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm6-3a6 6 0 0 1-12 0m6 6v3',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M7 7h10v10H7z',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  marker: 'M15 5l4 4-9 9H6v-4l9-9Zm-2 2 4 4M4 21h16',
  eraser: 'M7 19h12M5.5 14.5l7-7 5 5-5.5 5.5H9.5l-4-4a1 1 0 0 1 0-1.5Z',
  keyboard: 'M3 7h18v10H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13',
  pen: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  search: 'M20 20l-4.5-4.5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
};

export function Icon({ name, size = 16, stroke = 1.6, className }: { name: keyof typeof P | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={P[name] ?? ''} />
    </svg>
  );
}
