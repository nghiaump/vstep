import { useRef, useState } from 'react';
import { clearAll, exportAll, importAll, useAttempts, useProfile, useUi } from '../lib/storage';
import { clear as clearIdb } from 'idb-keyval';
import s from './Settings.module.css';

export default function Settings() {
  const [profile, setProfile] = useProfile();
  const [ui, setUi] = useUi();
  const [attempts] = useAttempts();
  const [msg, setMsg] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportAll()], { type: 'application/json' }));
    a.download = `vstep-tien-do-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setMsg('Đã xuất file sao lưu (không gồm file ghi âm).');
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    try { importAll(await f.text()); setMsg('Đã khôi phục tiến độ từ file.'); }
    catch (e) { setMsg((e as Error).message || 'Không đọc được file.'); }
  };
  const doClear = async () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    clearAll();
    await clearIdb();
    setArmed(false);
    setMsg('Đã xoá toàn bộ dữ liệu luyện tập trên máy này.');
  };

  return (
    <div className="page">
      <div className="page-head"><div><p className="eyebrow">Tuỳ chỉnh</p><h1 className="page-title">Cài đặt</h1></div></div>
      <div className={s.rows}>
        <div className={s.row}>
          <div><h2>Tên thí sinh</h2><p>Hiển thị ở thanh trên của phòng thi.</p></div>
          <input className="field" style={{ maxWidth: 320 }} value={profile.name} maxLength={40} placeholder="Chưa đặt tên"
            onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        </div>
        <div className={s.row}>
          <div><h2>Giao diện</h2><p>Theo hệ thống hoặc cố định sáng / tối.</p></div>
          <div className="seg" role="group" aria-label="Giao diện">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button key={t} aria-pressed={ui.theme === t} onClick={() => setUi({ ...ui, theme: t })}>{t === 'system' ? 'Hệ thống' : t === 'light' ? 'Sáng' : 'Tối'}</button>
            ))}
          </div>
        </div>
        <div className={s.row}>
          <div><h2>Cỡ chữ bài đọc</h2><p>Cỡ chữ đề và bài mẫu. Trên điện thoại, mặc định là chữ nhỏ, xếp dày để ít phải cuộn.</p></div>
          <div className="seg" role="group" aria-label="Cỡ chữ bài đọc">
            {(['s', 'm', 'l'] as const).map((k) => (
              <button key={k} aria-pressed={(ui.readSize ?? 'm') === k} onClick={() => setUi({ ...ui, readSize: k })}>{k === 's' ? 'Nhỏ' : k === 'm' ? 'Vừa' : 'Lớn'}</button>
            ))}
          </div>
        </div>
        <div className={s.row}>
          <div><h2>Sao lưu tiến độ</h2><p>{attempts.length} lượt làm bài. Xuất ra file JSON để chuyển sang máy khác hoặc phòng khi xoá dữ liệu trình duyệt.</p></div>
          <div className={s.btns}>
            <button className="btn" onClick={doExport}>Xuất file</button>
            <button className="btn" onClick={() => file.current?.click()}>Nhập file…</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
          </div>
        </div>
        <div className={s.row}>
          <div><h2>Xoá dữ liệu</h2><p>Xoá mọi bài làm, điểm, bài viết và file ghi âm trên máy này. Không thể hoàn tác.</p></div>
          <button className={'btn ' + (armed ? 'btn-primary' : 'btn-danger')} onClick={doClear}>{armed ? 'Bấm lần nữa để xoá hết' : 'Xoá toàn bộ'}</button>
        </div>
      </div>
      {msg && <p className={s.msg} role="status">{msg}</p>}
      <div className={s.about}>
        <h2>Về ứng dụng</h2>
        <p>Bài làm, điểm và bản ghi âm được lưu trong trình duyệt của từng máy, không gửi đi đâu. Điện thoại và máy tính có dữ liệu riêng: dùng Sao lưu tiến độ để chuyển qua lại.</p>
        <p>Đề được lưu từ vstepowl.com (Exam Reviews, Đại học Văn Lang) để tự ôn cá nhân; không chia sẻ lại. Phím tắt trong phòng thi Reading: bấm <kbd>?</kbd>.</p>
      </div>
    </div>
  );
}
