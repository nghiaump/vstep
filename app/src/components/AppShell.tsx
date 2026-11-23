import { Suspense, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useUi } from '../lib/storage';
import { useMedia } from '../hooks/useMedia';
import { Icon } from './Icon';
import s from './AppShell.module.css';

export function useThemeSync() {
  const [ui] = useUi();
  useEffect(() => {
    const root = document.documentElement;
    if (ui.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = ui.theme;
    if (!ui.readSize || ui.readSize === 'm') delete root.dataset.read;
    else root.dataset.read = ui.readSize;
  }, [ui.theme, ui.readSize]);
}

export function ThemeToggle() {
  const [ui, setUi] = useUi();
  const isDark = ui.theme === 'dark' || (ui.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <button className={s.iconBtn} onClick={() => setUi({ ...ui, theme: isDark ? 'light' : 'dark' })}
      aria-label={isDark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'} title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}>
      <Icon name={isDark ? 'sun' : 'moon'} size={17} />
    </button>
  );
}

const NAV = [
  { to: '/reading', label: 'Reading', icon: 'book' },
  { to: '/writing', label: 'Writing', icon: 'pen' },
  { to: '/speaking', label: 'Speaking', icon: 'mic' },
  { to: '/bai-mau', label: 'Bài mẫu', icon: 'doc' },
  { to: '/history', label: 'Lịch sử', icon: 'history' },
];

/** Phones get a compact top bar plus an iOS-style bottom tab bar; only one layout is rendered. */
export const PHONE = '(max-width: 720px)';

export function AppShell() {
  const phone = useMedia(PHONE);
  return (
    <div className={s.shell + (phone ? ' ' + s.phone : '')}>
      <header className={s.nav}>
        <div className={s.inner}>
          <Link to="/" className={s.brand}>
            <span className={s.mark} aria-hidden="true">V</span>
            <span>VSTEP <span className={s.brandSub}>Phòng luyện</span></span>
          </Link>
          {!phone && (
            <nav className={s.links} aria-label="Điều hướng chính">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? s.active : undefined)}>{n.label}</NavLink>
              ))}
            </nav>
          )}
          <div className={s.tools}>
            <ThemeToggle />
            <NavLink to="/settings" className={({ isActive }) => s.iconBtn + (isActive ? ' ' + s.iconActive : '')} aria-label="Cài đặt" title="Cài đặt">
              <Icon name="gear" size={17} />
            </NavLink>
          </div>
        </div>
      </header>
      <main className={s.main}><Suspense fallback={<div className="page muted" aria-busy="true">Đang tải…</div>}><Outlet /></Suspense></main>
      <footer className={s.foot}>
        <div className={s.inner}>
          <span>Nguồn đề: <a href="https://vstepowl.com" target="_blank" rel="noopener noreferrer">vstepowl.com</a> (Exam Reviews, Đại học Văn Lang) · dùng để ôn luyện với sự cho phép của chủ trang.</span>
        </div>
      </footer>
      {phone && (
        <nav className={s.tabbar} aria-label="Điều hướng chính">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => s.tab + (isActive ? ' ' + s.tabActive : '')}>
              <Icon name={n.icon} size={21} stroke={1.7} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
