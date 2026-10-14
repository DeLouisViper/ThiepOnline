import { useCallback, useEffect, useRef, useState } from 'react';
import { BUCKET_MEDIA, publicUrl, supabase } from '../lib/supabase';
import { processImage, validateImage } from '../lib/image';
import type { GalleryPhoto } from '../lib/types';

const MAX_INPUT = 20 * 1024 * 1024;

interface Pending {
  key: string;
  file: File;
  preview: string;
  caption: string;
}

export function PhotosManager() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<Pending[]>([]);
  pendingRef.current = pending;

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) setMsg({ ok: false, text: 'Không tải được danh sách ảnh.' });
    else setPhotos((data ?? []) as GalleryPhoto[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const pick = (files: FileList | null) => {
    if (!files) return;
    const added: Pending[] = [];
    const errors: string[] = [];
    Array.from(files).forEach((f) => {
      const problem = validateImage(f, MAX_INPUT);
      if (problem) errors.push(`${f.name}: ${problem}`);
      else added.push({ key: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f), caption: '' });
    });
    setPending((p) => [...p, ...added]);
    setMsg(errors.length ? { ok: false, text: errors.join(' ') } : null);
  };

  const dropPending = (key: string) =>
    setPending((p) => {
      const t = p.find((x) => x.key === key);
      if (t) URL.revokeObjectURL(t.preview);
      return p.filter((x) => x.key !== key);
    });

  const uploadOne = async (file: File): Promise<string> => {
    const img = await processImage(file, { maxSide: 1600, quality: 0.82 });
    const path = `gallery/${crypto.randomUUID()}.${img.ext}`;
    const { error } = await supabase!.storage.from(BUCKET_MEDIA).upload(path, img.blob, { contentType: img.contentType, upsert: false });
    if (error) throw error;
    return path;
  };

  const saveAll = async () => {
    if (!supabase || busy || pending.length === 0) return;
    setBusy(true);
    setMsg(null);
    let nextOrder = photos.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1;
    let done = 0;
    const failed: string[] = [];
    for (const item of pending) {
      setProgress(`Đang tải lên ${done + 1}/${pending.length}…`);
      try {
        const path = await uploadOne(item.file);
        const { error } = await supabase.from('gallery_photos').insert({
          storage_path: path,
          caption: item.caption.trim() || null,
          sort_order: nextOrder++,
        });
        if (error) {
          await supabase.storage.from(BUCKET_MEDIA).remove([path]);
          throw error;
        }
        dropPending(item.key);
        done++;
      } catch (e) {
        console.error(e);
        failed.push(item.file.name);
      }
    }
    setProgress(null);
    setBusy(false);
    setMsg(
      failed.length
        ? { ok: false, text: `Đã lưu ${done} ảnh. Lỗi với: ${failed.join(', ')}.` }
        : { ok: true, text: `Đã lưu ${done} ảnh vào album.` },
    );
    void load();
  };

  const replace = async (p: GalleryPhoto, file: File | null) => {
    if (!supabase || !file) return;
    const problem = validateImage(file, MAX_INPUT);
    if (problem) return setMsg({ ok: false, text: problem });
    setBusy(true);
    setProgress('Đang thay ảnh…');
    try {
      const path = await uploadOne(file);
      const { error } = await supabase.from('gallery_photos').update({ storage_path: path }).eq('id', p.id);
      if (error) {
        await supabase.storage.from(BUCKET_MEDIA).remove([path]);
        throw error;
      }
      await supabase.storage.from(BUCKET_MEDIA).remove([p.storage_path]);
      setMsg({ ok: true, text: 'Đã thay ảnh.' });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: 'Không thay được ảnh.' });
    }
    setProgress(null);
    setBusy(false);
    void load();
  };

  const saveCaption = async (p: GalleryPhoto, caption: string) => {
    if (!supabase || (p.caption ?? '') === caption.trim()) return;
    const { error } = await supabase.from('gallery_photos').update({ caption: caption.trim() || null }).eq('id', p.id);
    if (error) setMsg({ ok: false, text: 'Không lưu được chú thích.' });
    else void load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!supabase) return;
    const a = photos[index];
    const b = photos[index + dir];
    if (!a || !b) return;
    // renumber the whole list so equal sort_orders can never cause a no-op swap
    const reordered = [...photos];
    reordered[index] = b;
    reordered[index + dir] = a;
    const results = await Promise.all(
      reordered.map((p, i) => supabase!.from('gallery_photos').update({ sort_order: i + 1 }).eq('id', p.id)),
    );
    if (results.some((r) => r.error)) setMsg({ ok: false, text: 'Không đổi được thứ tự.' });
    void load();
  };

  const remove = async (p: GalleryPhoto) => {
    if (!supabase || !window.confirm('Xóa ảnh này khỏi album?')) return;
    const { error } = await supabase.from('gallery_photos').delete().eq('id', p.id);
    if (error) return setMsg({ ok: false, text: 'Không xóa được ảnh.' });
    await supabase.storage.from(BUCKET_MEDIA).remove([p.storage_path]);
    setMsg({ ok: true, text: 'Đã xóa ảnh.' });
    void load();
  };

  return (
    <>
      <div className="adm-card">
        <h2>Thêm ảnh</h2>
        <div className="hint">JPEG, PNG hoặc WebP, tối đa 20 MB mỗi ảnh. Ảnh được tự động thu nhỏ (cạnh dài tối đa 1600 px) trước khi tải lên.</div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="btn">
            Chọn ảnh…
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {pending.length > 0 && (
            <button className="btn primary" onClick={() => void saveAll()} disabled={busy}>
              {busy ? progress ?? 'Đang lưu…' : `Lưu ${pending.length} ảnh`}
            </button>
          )}
        </div>
        {pending.length > 0 && (
          <div className="photo-grid" style={{ marginTop: 14 }}>
            {pending.map((p) => (
              <div className="photo-item" key={p.key}>
                <img src={p.preview} alt="Xem trước" />
                <input
                  type="text"
                  placeholder="Chú thích (tùy chọn)"
                  maxLength={200}
                  value={p.caption}
                  onChange={(e) => setPending((all) => all.map((x) => (x.key === p.key ? { ...x, caption: e.target.value } : x)))}
                />
                <button className="btn sm" onClick={() => dropPending(p.key)} disabled={busy}>Bỏ ảnh</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
      {progress && !busy && <div className="hint">{progress}</div>}

      <h2>Album hiện tại ({photos.length})</h2>
      {photos.length === 0 && <div className="hint">Chưa có ảnh nào. Trang thiệp đang hiển thị khung ảnh trống.</div>}
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div className="photo-item" key={p.id}>
            <img src={publicUrl(BUCKET_MEDIA, p.storage_path) ?? ''} alt={p.caption ?? `Ảnh ${i + 1}`} loading="lazy" />
            <input
              type="text"
              defaultValue={p.caption ?? ''}
              placeholder="Chú thích"
              maxLength={200}
              onBlur={(e) => void saveCaption(p, e.target.value)}
              aria-label="Chú thích"
            />
            <div className="row">
              <button className="btn sm" onClick={() => void move(i, -1)} disabled={i === 0 || busy} aria-label="Lên">↑</button>
              <button className="btn sm" onClick={() => void move(i, 1)} disabled={i === photos.length - 1 || busy} aria-label="Xuống">↓</button>
              <label className="btn sm">
                Thay
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    void replace(p, e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
              <button className="btn sm danger" onClick={() => void remove(p)} disabled={busy}>Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
