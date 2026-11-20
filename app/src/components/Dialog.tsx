import { useEffect, useRef, type ReactNode } from 'react';
import s from './Dialog.module.css';

/** Native <dialog> based modal: focus trap, Esc to close, backdrop click to close. */
export function Dialog({ open, onClose, title, children, actions, width = 440 }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={s.dialog} style={{ width }} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="dlg-title">
      <div className={s.body}>
        <h2 id="dlg-title" className={s.title}>{title}</h2>
        <div className={s.content}>{children}</div>
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </dialog>
  );
}
