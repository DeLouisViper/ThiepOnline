import { useCallback, useEffect, useState } from 'react';
import { BUCKET_MEDIA, publicUrl, supabase } from '../lib/supabase';
import { processImage, validateImage } from '../lib/image';
import type { AdminSettings } from '../lib/types';

type Side = 'groom' | 'bride';
const MAX_AUDIO = 10 * 1024 * 1024;
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/x-m4a'];

type Msg = { ok: boolean; text: string } | null;

function useAdminSettings() {
  const [s, setS] = useState<AdminSettings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('wedding_settings').select('*').eq('id', 1).maybeSingle();
    if (error || !data) setErr('Không tải được cài đặt. Hãy chắc chắn đã chạy supabase/schema.sql.');
    else {
      setS(data as AdminSettings);
      setErr(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (patch: Partial<AdminSettings>) => {
    if (!supabase) throw new Error('no client');
    const { data, error } = await supabase.from('wedding_settings').update(patch).eq('id', 1).select().single();
    if (error) throw error;
    setS(data as AdminSettings);
  };
  return { s, err, save };
}

/* ---------------- General settings + music ---------------- */
function GeneralSettings({ s, save }: { s: AdminSettings; save: (p: Partial<AdminSettings>) => Promise<void> }) {
  const [form, setForm] = useState({
    music_enabled: s.music_enabled,
    music_url: s.music_url ?? '',
    petals_enabled: s.petals_enabled,
    require_approval: s.require_approval,
    allow_guest_photos: s.allow_guest_photos,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const uploadMusic = async (file: File | null) => {
    if (!supabase || !file) return;
    if (!AUDIO_TYPES.includes(file.type)) return setMsg({ ok: false, text: 'Chỉ hỗ trợ MP3, M4A, OGG hoặc WAV.' });
    if (file.size > MAX_AUDIO) return setMsg({ ok: false, text: 'File nhạc quá lớn (tối đa 10 MB).' });
    setBusy(true);
    setMsg(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
      const path = `music/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET_MEDIA).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const url = publicUrl(BUCKET_MEDIA, path) ?? '';
      setForm((f) => ({ ...f, music_url: url }));
      setMsg({ ok: true, text: 'Đã tải nhạc lên. Nhấn "Lưu cài đặt" để áp dụng.' });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: 'Không tải được file nhạc.' });
    }
    setBusy(false);
  };

  const submit = async () => {
    const url = form.music_url.trim();
    if (url && !/^https?:\/\//i.test(url)) return setMsg({ ok: false, text: 'Đường dẫn nhạc phải bắt đầu bằng http:// hoặc https://' });
    if (form.music_enabled && !url) return setMsg({ ok: false, text: 'Hãy nhập đường dẫn hoặc tải file nhạc lên trước khi bật nhạc.' });
    setBusy(true);
    setMsg(null);
    try {
      await save({ ...form, music_url: url || null });
      setMsg({ ok: true, text: 'Đã lưu cài đặt. Khách sẽ thấy thay đổi khi tải lại trang.' });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: 'Không lưu được cài đặt.' });
    }
    setBusy(false);
  };

  return (
    <div className="adm-card">
      <h2>Cài đặt thiệp</h2>
      <label className="switch"><input type="checkbox" checked={form.petals_enabled} onChange={(e) => setForm({ ...form, petals_enabled: e.target.checked })} /> Bật hiệu ứng hoa/lá rơi</label>
      <label className="switch"><input type="checkbox" checked={form.require_approval} onChange={(e) => setForm({ ...form, require_approval: e.target.checked })} /> Lời chúc mới cần được duyệt trước khi hiển thị</label>
      <label className="switch"><input type="checkbox" checked={form.allow_guest_photos} onChange={(e) => setForm({ ...form, allow_guest_photos: e.target.checked })} /> Cho phép khách đính kèm ảnh vào lời chúc</label>
      <div className="hint" style={{ marginLeft: 30, marginBottom: 8 }}>
        Mặc định tắt để tránh spam dung lượng. Ảnh khách gửi tối đa 2 MB (tự nén) và chỉ được thêm mới, không thể ghi đè hay xóa bởi người ngoài.
      </div>
      <h3>Nhạc nền</h3>
      <label className="switch"><input type="checkbox" checked={form.music_enabled} onChange={(e) => setForm({ ...form, music_enabled: e.target.checked })} /> Bật nhạc nền</label>
      <div className="adm-form">
        <label className="field">
          Đường dẫn file nhạc (URL)
          <input type="url" value={form.music_url} onChange={(e) => setForm({ ...form, music_url: e.target.value })} placeholder="https://…/nhac.mp3" />
        </label>
        <div className="row">
          <label className="btn">
            Hoặc tải file nhạc lên…
            <input type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-m4a,.mp3,.m4a,.ogg,.wav" hidden onChange={(e) => { void uploadMusic(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          {form.music_url && <audio controls src={form.music_url} style={{ maxWidth: '100%' }} />}
        </div>
        <div className="hint">Chỉ dùng nhạc bạn có bản quyền hoặc được cho phép (nhạc không lời/miễn phí bản quyền). Khách sẽ bấm “Mở thiệp & bật nhạc” để nhạc bắt đầu; họ có thể tạm dừng bất cứ lúc nào.</div>
      </div>
      {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
      <button className="btn primary" onClick={() => void submit()} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cài đặt'}</button>
    </div>
  );
}

/* ---------------- QR + bank per side ---------------- */
function QrEditor({ side, s, save }: { side: Side; s: AdminSettings; save: (p: Partial<AdminSettings>) => Promise<void> }) {
  const label = side === 'groom' ? 'Chú rể — Thanh Hải' : 'Cô dâu — Ánh Minh';
  const f = {
    qr: `${side}_qr_path`,
    bank: `${side}_bank_name`,
    num: `${side}_account_number`,
    holder: `${side}_account_holder`,
    show: `${side}_show_bank`,
  } as const;
  const get = <K extends keyof AdminSettings>(k: K) => s[k];
  const currentPath = get(f.qr as keyof AdminSettings) as string | null;

  const [bank, setBank] = useState((get(f.bank as keyof AdminSettings) as string | null) ?? '');
  const [num, setNum] = useState((get(f.num as keyof AdminSettings) as string | null) ?? '');
  const [holder, setHolder] = useState((get(f.holder as keyof AdminSettings) as string | null) ?? '');
  const [show, setShow] = useState(Boolean(get(f.show as keyof AdminSettings)));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pick = (fl: File | null) => {
    if (!fl) return;
    const problem = validateImage(fl, 8 * 1024 * 1024);
    if (problem) return setMsg({ ok: false, text: problem });
    setMsg(null);
    setFile(fl);
  };

  const submit = async () => {
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    let newPath: string | null = null;
    try {
      const patch: Record<string, unknown> = {
        [f.bank]: bank.trim() || null,
        [f.num]: num.trim() || null,
        [f.holder]: holder.trim() || null,
        [f.show]: show,
      };
      if (file) {
        // PNG, never JPEG: lossy compression can make QR codes unscannable
        const img = await processImage(file, { maxSide: 1200, keepPng: true });
        newPath = `qr/${side}-${Date.now()}.${img.ext}`;
        const up = await supabase.storage.from(BUCKET_MEDIA).upload(newPath, img.blob, { contentType: img.contentType, upsert: false });
        if (up.error) throw up.error;
        patch[f.qr] = newPath;
      }
      await save(patch as Partial<AdminSettings>);
      if (newPath && currentPath) await supabase.storage.from(BUCKET_MEDIA).remove([currentPath]);
      setFile(null);
      setMsg({ ok: true, text: 'Đã lưu. Thiệp công khai đã cập nhật.' });
    } catch (e) {
      console.error(e);
      if (newPath) await supabase.storage.from(BUCKET_MEDIA).remove([newPath]);
      setMsg({ ok: false, text: 'Không lưu được. Vui lòng thử lại.' });
    }
    setBusy(false);
  };

  const removeQr = async () => {
    if (!supabase || !currentPath || !window.confirm('Xóa ảnh QR này?')) return;
    setBusy(true);
    try {
      await save({ [f.qr]: null } as Partial<AdminSettings>);
      await supabase.storage.from(BUCKET_MEDIA).remove([currentPath]);
      setMsg({ ok: true, text: 'Đã xóa QR.' });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: 'Không xóa được QR.' });
    }
    setBusy(false);
  };

  const shownSrc = preview ?? publicUrl(BUCKET_MEDIA, currentPath);

  return (
    <div className="adm-card">
      <h2>QR mừng cưới — {label}</h2>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="qr-prev">{shownSrc ? <img src={shownSrc} alt={`QR ${label}`} /> : 'Chưa có QR'}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <label className="btn sm">
              {currentPath || file ? 'Đổi ảnh QR' : 'Chọn ảnh QR'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </label>
            {currentPath && !file && <button className="btn sm danger" onClick={() => void removeQr()} disabled={busy}>Xóa QR</button>}
          </div>
          {file && <div className="hint">Xem trước — chưa lưu</div>}
        </div>
        <div className="adm-form" style={{ flex: 1, minWidth: 220 }}>
          <label className="field">Ngân hàng (tùy chọn)<input type="text" maxLength={80} value={bank} onChange={(e) => setBank(e.target.value)} /></label>
          <label className="field">Số tài khoản (tùy chọn)<input type="text" inputMode="numeric" maxLength={40} value={num} onChange={(e) => setNum(e.target.value)} /></label>
          <label className="field">Chủ tài khoản (tùy chọn)<input type="text" maxLength={80} value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
          <label className="switch"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Hiển thị thông tin ngân hàng trên thiệp</label>
          <div className="hint">Nếu tắt, thông tin ngân hàng được lưu nhưng không bao giờ được gửi tới khách (cơ sở dữ liệu sẽ trả về rỗng).</div>
        </div>
      </div>
      {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
      <button className="btn primary" onClick={() => void submit()} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
    </div>
  );
}

export function SettingsManager() {
  const { s, err, save } = useAdminSettings();
  if (err) return <div className="msg err">{err}</div>;
  if (!s) return <div>Đang tải…</div>;
  return (
    <>
      <GeneralSettings s={s} save={save} />
      <QrEditor side="groom" s={s} save={save} />
      <QrEditor side="bride" s={s} save={save} />
      <div className="hint">Album ảnh được quản lý ở tab “Ảnh” — không cần sửa mã nguồn.</div>
    </>
  );
}
