import { useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useUi } from '../lib/storage';
import { RANGE_LABEL } from '../lib/data';
import { Icon } from './Icon';
import s from './AppShell.module.css';

export function useThemeSync() {
  const [ui] = useUi();
  useEffect(() => {
    const root = document.documentElement;
    if (ui.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = ui.theme;
  }, [ui.theme]);
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
  { to: '/reading', label: 'Reading' },
  { to: '/writing', label: 'Writing' },
  { to: '/speaking', label: 'Speaking' },
  { to: '/bai-mau', label: 'Bài mẫu' },
  { to: '/history', label: 'Lịch sử' },
];

export function AppShell() {
  return (
    <div className={s.shell}>
      <header className={s.nav}>
        <div className={s.inner}>
          <Link to="/" className={s.brand}>
            <span className={s.mark} aria-hidden="true">V</span>
            <span>VSTEP <span className={s.brandSub}>Phòng luyện</span></span>
          </Link>
          <nav className={s.links} aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? s.active : undefined)}>{n.label}</NavLink>
            ))}
          </nav>
          <div className={s.tools}>
            <ThemeToggle />
            <NavLink to="/settings" className={({ isActive }) => s.iconBtn + (isActive ? ' ' + s.iconActive : '')} aria-label="Cài đặt" title="Cài đặt">
              <Icon name="gear" size={17} />
            </NavLink>
          </div>
        </div>
      </header>
      <main className={s.main}><Outlet /></main>
      <footer className={s.foot}>
        <div className={s.inner}>
          <span>Đề Văn Lang ({RANGE_LABEL}) · nguồn vstepowl.com · bản lưu để tự ôn cá nhân, không chia sẻ lại.</span>
        </div>
      </footer>
    </div>
  );
}
