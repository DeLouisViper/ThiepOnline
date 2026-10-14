import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Wish } from '../lib/types';

interface Stats {
  total: number;
  approved: number;
  pending: number;
  hidden: number;
  gallery: number;
  guestPhotos: number;
}

export function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Wish[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    const count = async (table: string, status?: string) => {
      let q = db.from(table).select('*', { count: 'exact', head: true });
      if (status) q = q.eq('status', status);
      const { count: c, error } = await q;
      if (error) throw error;
      return c ?? 0;
    };
    (async () => {
      try {
        const [total, approved, pending, hidden, gallery, guestPhotos] = await Promise.all([
          count('wishes'),
          count('wishes', 'approved'),
          count('wishes', 'pending'),
          count('wishes', 'hidden'),
          count('gallery_photos'),
          db.from('wishes').select('*', { count: 'exact', head: true }).not('photo_path', 'is', null).then((r) => {
            if (r.error) throw r.error;
            return r.count ?? 0;
          }),
        ]);
        setStats({ total, approved, pending, hidden, gallery, guestPhotos });
        const { data, error } = await db.from('wishes').select('*').order('created_at', { ascending: false }).limit(5);
        if (error) throw error;
        setRecent((data ?? []) as Wish[]);
      } catch (e) {
        console.error(e);
        setErr('Không tải được số liệu.');
      }
    })();
  }, []);

  if (err) return <div className="msg err">{err}</div>;
  if (!stats) return <div>Đang tải…</div>;

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{stats.total}</b><span>Tổng lời chúc</span></div>
        <div className="stat"><b>{stats.approved}</b><span>Đã duyệt</span></div>
        <div className="stat"><b>{stats.pending}</b><span>Chờ duyệt</span></div>
        <div className="stat"><b>{stats.hidden}</b><span>Đã ẩn</span></div>
        <div className="stat"><b>{stats.gallery}</b><span>Ảnh album</span></div>
        <div className="stat"><b>{stats.guestPhotos}</b><span>Ảnh khách gửi</span></div>
      </div>
      <h3>Lời chúc gần đây</h3>
      {recent.length === 0 && <div className="hint">Chưa có lời chúc nào.</div>}
      {recent.map((w) => (
        <div className="wish-row" key={w.id}>
          <div className="head">
            <b>{w.guest_name}</b>
            <span>
              <span className={`badge ${w.status}`}>{w.status}</span> · {new Date(w.created_at).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="text" style={{ cursor: 'default' }}>{w.message}</div>
        </div>
      ))}
    </>
  );
}
