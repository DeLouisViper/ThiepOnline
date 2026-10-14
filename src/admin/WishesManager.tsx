import { useCallback, useEffect, useMemo, useState } from 'react';
import { BUCKET_GUEST, publicUrl, supabase } from '../lib/supabase';
import type { Wish, WishStatus } from '../lib/types';

const STATUS_LABEL: Record<WishStatus, string> = { approved: 'Đã duyệt', pending: 'Chờ duyệt', hidden: 'Đã ẩn' };

// Prevents spreadsheet formula injection when the CSV is opened in Excel / Sheets.
function csvCell(v: string): string {
  let s = v.replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCsv(rows: Wish[]) {
  const head = ['Thời gian', 'Tên', 'Lời chúc', 'Trạng thái', 'Ảnh'];
  const lines = rows.map((w) =>
    [
      new Date(w.created_at).toLocaleString('vi-VN'),
      w.guest_name,
      w.message,
      STATUS_LABEL[w.status],
      w.photo_path ? (publicUrl(BUCKET_GUEST, w.photo_path) ?? '') : '',
    ]
      .map(csvCell)
      .join(','),
  );
  // BOM so Excel opens Vietnamese UTF-8 correctly
  const blob = new Blob(['﻿' + [head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loi-chuc-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function WishesManager() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | WishStatus>('all');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [open, setOpen] = useState<Wish | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('wishes').select('*').order('created_at', { ascending: false }).limit(2000);
    if (error) setMsg({ ok: false, text: 'Không tải được danh sách lời chúc.' });
    else setWishes((data ?? []) as Wish[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = wishes.filter(
      (w) =>
        (status === 'all' || w.status === status) &&
        (!needle || w.guest_name.toLowerCase().includes(needle) || w.message.toLowerCase().includes(needle)),
    );
    rows.sort((a, b) => (order === 'newest' ? 1 : -1) * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    return rows;
  }, [wishes, q, status, order]);

  const setWishStatus = async (w: Wish, next: WishStatus) => {
    if (!supabase) return;
    const { error } = await supabase.from('wishes').update({ status: next }).eq('id', w.id);
    if (error) return setMsg({ ok: false, text: 'Không cập nhật được trạng thái.' });
    setWishes((all) => all.map((x) => (x.id === w.id ? { ...x, status: next } : x)));
    setOpen((o) => (o && o.id === w.id ? { ...o, status: next } : o));
    setMsg(null);
  };

  const remove = async (w: Wish) => {
    if (!supabase) return;
    if (!window.confirm(`Xóa vĩnh viễn lời chúc của "${w.guest_name}"?`)) return;
    const { error } = await supabase.from('wishes').delete().eq('id', w.id);
    if (error) return setMsg({ ok: false, text: 'Không xóa được lời chúc.' });
    if (w.photo_path) await supabase.storage.from(BUCKET_GUEST).remove([w.photo_path]);
    setWishes((all) => all.filter((x) => x.id !== w.id));
    setOpen(null);
    setMsg({ ok: true, text: 'Đã xóa lời chúc.' });
  };

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Tìm theo tên hoặc nội dung…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm kiếm" />
        <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | WishStatus)} aria-label="Lọc trạng thái">
          <option value="all">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="hidden">Đã ẩn</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as 'newest' | 'oldest')} aria-label="Sắp xếp">
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
        </select>
        <button className="btn" onClick={() => exportCsv(shown)} disabled={shown.length === 0}>Xuất CSV</button>
      </div>
      {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
      <div className="hint" style={{ marginBottom: 10 }}>{loading ? 'Đang tải…' : `${shown.length} / ${wishes.length} lời chúc`}</div>

      {shown.map((w) => (
        <div className="wish-row" key={w.id}>
          <div className="head">
            <b>{w.guest_name}</b>
            <span><span className={`badge ${w.status}`}>{STATUS_LABEL[w.status]}</span> · {new Date(w.created_at).toLocaleString('vi-VN')}</span>
          </div>
          <div className="text" onClick={() => setOpen(w)}>{w.message}</div>
          <div className="row">
            <button className="btn sm" onClick={() => setOpen(w)}>Xem</button>
            {w.status !== 'approved' && <button className="btn sm primary" onClick={() => void setWishStatus(w, 'approved')}>Duyệt</button>}
            {w.status !== 'hidden' && <button className="btn sm" onClick={() => void setWishStatus(w, 'hidden')}>Ẩn</button>}
            <button className="btn sm danger" onClick={() => void remove(w)}>Xóa</button>
          </div>
        </div>
      ))}

      {open && (
        <div className="modal-bg" onClick={() => setOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="head" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <h3 style={{ margin: 0 }}>{open.guest_name}</h3>
              <span className={`badge ${open.status}`}>{STATUS_LABEL[open.status]}</span>
            </div>
            <div className="hint">{new Date(open.created_at).toLocaleString('vi-VN')}</div>
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{open.message}</p>
            {open.photo_path && <img src={publicUrl(BUCKET_GUEST, open.photo_path) ?? ''} alt="Ảnh khách gửi" />}
            <div className="row" style={{ marginTop: 14 }}>
              {open.status !== 'approved' && <button className="btn primary" onClick={() => void setWishStatus(open, 'approved')}>Duyệt</button>}
              {open.status !== 'hidden' && <button className="btn" onClick={() => void setWishStatus(open, 'hidden')}>Ẩn</button>}
              <button className="btn danger" onClick={() => void remove(open)}>Xóa</button>
              <button className="btn" onClick={() => setOpen(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
