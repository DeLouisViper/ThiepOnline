import { useEffect, useState, type CSSProperties } from 'react';
import { BUCKET_MEDIA, publicUrl, supabase } from '../lib/supabase';
import { processImage, validateImage } from '../lib/image';
import {
  CONTENT_LIMITS,
  DEFAULT_CONTENT,
  deriveEvent,
  mergeContent,
  safeHttpUrl,
  type FamilyInfo,
  type WeddingContent,
} from '../lib/content';
import { THEMES, THEME_ORDER } from '../lib/themes';

type Msg = { ok: boolean; text: string } | null;

function Field({
  label,
  value,
  onChange,
  max = 80,
  hint,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  hint?: string;
  type?: string;
}) {
  return (
    <label className="field">
      {label}
      <input type={type} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function FamilyEditor({ title, f, onChange }: { title: string; f: FamilyInfo; onChange: (f: FamilyInfo) => void }) {
  const set = (k: keyof FamilyInfo) => (v: string) => onChange({ ...f, [k]: v });
  return (
    <div className="adm-card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="adm-form">
        <Field label="Tiêu đề (vd: Nhà trai)" value={f.title} onChange={set('title')} max={40} />
        <Field label="Phụ huynh 1 (vd: Ông Nguyễn Văn A)" value={f.parent1} onChange={set('parent1')} />
        <Field label="Phụ huynh 2 (vd: Bà Trần Thị B)" value={f.parent2} onChange={set('parent2')} />
        <Field label="Địa chỉ — dòng 1" value={f.address1} onChange={set('address1')} max={120} />
        <Field label="Địa chỉ — dòng 2 (tùy chọn)" value={f.address2} onChange={set('address2')} max={120} />
      </div>
    </div>
  );
}

function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const groups = ['Mẫu gốc', 'Theo mẫu tham khảo', 'Mẫu bổ sung', 'Thêm theo chungdoi.com'] as const;
  return (
    <div className="adm-card">
      <h2>Mẫu giao diện</h2>
      <div className="hint" style={{ marginBottom: 10 }}>
        Chọn kiểu thiệp, bấm <b>Lưu nội dung</b> ở cuối trang để áp dụng. Bấm <b>Xem thử</b> để mở thử trước khi lưu (không thay đổi thiệp của khách).
      </div>
      {groups.map((g) => (
        <div key={g}>
          <h3>{g}</h3>
          <div className="theme-grid">
            {THEME_ORDER.map((id) => THEMES[id]).filter((th) => th.group === g).map((th) => (
              <div key={th.id} className={`theme-card${value === th.id ? ' on' : ''}`}>
                <button type="button" className="theme-pick" onClick={() => onChange(th.id)} aria-pressed={value === th.id} aria-label={`Chọn mẫu ${th.name}`}>
                  <div className="theme-prev" style={{ ...(th.vars as CSSProperties), background: th.vars['--cream'] }}>
                    <div className="tp-eyebrow">Trân trọng kính mời</div>
                    <div className="tp-names" style={{ fontFamily: th.vars['--f-script'], fontStyle: th.vars['--names-style'], textTransform: th.vars['--names-tt'] as CSSProperties['textTransform'], letterSpacing: th.vars['--names-ls'] }}>
                      Thanh Hải &amp; Ánh Minh
                    </div>
                    <div className="tp-date">30 · 10 · 2026</div>
                    <div className="tp-swatch">
                      {['--sage-dark', '--sage', '--moss', '--gold', '--surface'].map((v) => (
                        <i key={v} style={{ background: th.vars[v] }} />
                      ))}
                    </div>
                  </div>
                  <div className="theme-name">{value === th.id ? '✓ ' : ''}{th.name}</div>
                  <div className="hint">{th.desc}</div>
                </button>
                <a className="btn sm" href={`#/?theme=${th.id}`} target="_blank" rel="noopener noreferrer">Xem thử</a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContentManager() {
  const [form, setForm] = useState<WeddingContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [bgBusy, setBgBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from('wedding_settings')
      .select('content')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setLoadErr(
            'Không tải được nội dung. Hãy chạy file supabase/migration-content.sql trong Supabase SQL Editor (xem hướng dẫn).',
          );
        } else {
          setForm(mergeContent(data?.content));
        }
      });
  }, []);

  const pickBg = async (file: File | null) => {
    if (!file || !supabase || !form) return;
    const bad = validateImage(file, 10 * 1048576);
    if (bad) return setMsg({ ok: false, text: bad });
    setBgBusy(true);
    setMsg(null);
    try {
      const img = await processImage(file, { maxSide: 1600, quality: 0.82 });
      const path = `bg/hero-${Date.now()}.${img.ext}`;
      const up = await supabase.storage.from(BUCKET_MEDIA).upload(path, img.blob, { contentType: img.contentType, upsert: false });
      if (up.error) throw up.error;
      setForm({ ...form, heroImage: path });
      setMsg({ ok: true, text: 'Đã tải ảnh nền lên. Bấm "Lưu nội dung" ở cuối trang để áp dụng.' });
    } catch (e) {
      console.error(e);
      setMsg({ ok: false, text: 'Không tải được ảnh nền. Hãy thử ảnh khác.' });
    }
    setBgBusy(false);
  };

  if (loadErr) return <div className="msg err">{loadErr}</div>;
  if (!form) return <div>Đang tải…</div>;

  const set = <K extends keyof WeddingContent>(k: K, v: WeddingContent[K]) => setForm({ ...form, [k]: v });
  const ev = deriveEvent(form);

  const setRow = (i: number, patch: Partial<{ time: string; label: string }>) =>
    set('timeline', form.timeline.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const moveRow = (i: number, dir: -1 | 1) => {
    const next = [...form.timeline];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set('timeline', next);
  };

  const validate = (): string | null => {
    if (!form.groom.trim() || !form.bride.trim()) return 'Vui lòng nhập tên chú rể và cô dâu (tên ngắn).';
    if (!form.groomFull.trim() || !form.brideFull.trim()) return 'Vui lòng nhập họ tên đầy đủ của chú rể và cô dâu.';
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.eventDateTime)) return 'Vui lòng chọn ngày và giờ tiệc.';
    if (!form.venueName1.trim() || !form.venueAddress.trim()) return 'Vui lòng nhập tên và địa chỉ địa điểm tiệc.';
    if (form.mapLink.trim() && !safeHttpUrl(form.mapLink.trim())) return 'Link chỉ đường phải bắt đầu bằng https://';
    if (form.timeline.some((t) => !t.time.trim() || !t.label.trim())) return 'Mỗi dòng lịch trình cần có cả giờ và nội dung (hoặc hãy xóa dòng trống).';
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) return setMsg({ ok: false, text: problem });
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    // mergeContent clamps lengths and strips anything unexpected before it is stored
    const clean = mergeContent({ ...form, mapLink: form.mapLink.trim() });
    const { error } = await supabase.from('wedding_settings').update({ content: clean }).eq('id', 1);
    setBusy(false);
    if (error) {
      console.error(error);
      setMsg({ ok: false, text: 'Không lưu được. Hãy chắc chắn đã chạy migration-content.sql và bạn đang đăng nhập bằng tài khoản admin.' });
    } else {
      setForm(clean);
      setMsg({ ok: true, text: 'Đã lưu. Thiệp công khai sẽ cập nhật khi tải lại trang.' });
    }
  };

  const reset = async () => {
    if (!supabase) return;
    if (!window.confirm('Đặt lại toàn bộ nội dung về mẫu ban đầu (Thanh Hải & Ánh Minh)?')) return;
    setBusy(true);
    const { error } = await supabase.from('wedding_settings').update({ content: null }).eq('id', 1);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: 'Không đặt lại được.' });
    setForm(DEFAULT_CONTENT);
    setMsg({ ok: true, text: 'Đã đặt lại về nội dung mẫu.' });
  };

  return (
    <>
      <div className="hint" style={{ marginBottom: 12 }}>
        Mọi nội dung ở đây hiển thị trên thiệp công khai. Để làm thiệp cho cặp đôi khác, chỉ cần sửa các ô dưới đây rồi bấm <b>Lưu nội dung</b>. Ngày, thứ, giờ, đếm ngược, lịch tháng và liên kết “Thêm vào lịch” đều tự tính từ ngày giờ tiệc.
      </div>

      <ThemePicker value={form.theme} onChange={(id) => set('theme', id)} />

      <div className="adm-card">
        <h2>Ảnh nền đầu thiệp (tùy chọn)</h2>
        <div className="hint" style={{ marginBottom: 10 }}>
          Dùng ảnh cưới của hai bạn làm nền trang đầu (phủ lớp màu mờ để chữ vẫn dễ đọc, hình trang trí của mẫu vẫn hiện). Nên dùng ảnh dọc, rõ nét. Sau khi chọn ảnh, bấm <b>Lưu nội dung</b> để áp dụng.
        </div>
        <div className="row">
          <div className="qr-prev" style={{ width: 120, height: 180 }}>
            {form.heroImage ? <img src={publicUrl(BUCKET_MEDIA, form.heroImage) ?? ''} alt="Ảnh nền hiện tại" style={{ objectFit: 'cover' }} /> : 'Chưa có ảnh'}
          </div>
          <div className="adm-form">
            <label className="btn">
              {bgBusy ? 'Đang tải ảnh…' : form.heroImage ? 'Đổi ảnh nền…' : 'Chọn ảnh nền…'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={bgBusy} onChange={(e) => { void pickBg(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </label>
            {form.heroImage && <button type="button" className="btn danger sm" onClick={() => set('heroImage', '')}>Bỏ ảnh nền</button>}
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h2>Cô dâu & chú rể</h2>
        <div className="adm-form">
          <div className="row">
            <div style={{ flex: 1, minWidth: 180 }}><Field label="Tên chú rể (ngắn, hiện ở đầu thiệp)" value={form.groom} onChange={(v) => set('groom', v)} max={40} /></div>
            <div style={{ flex: 1, minWidth: 180 }}><Field label="Tên cô dâu (ngắn)" value={form.bride} onChange={(v) => set('bride', v)} max={40} /></div>
          </div>
          <div className="row">
            <div style={{ flex: 1, minWidth: 180 }}><Field label="Họ tên đầy đủ chú rể" value={form.groomFull} onChange={(v) => set('groomFull', v)} max={60} /></div>
            <div style={{ flex: 1, minWidth: 180 }}><Field label="Họ tên đầy đủ cô dâu" value={form.brideFull} onChange={(v) => set('brideFull', v)} max={60} /></div>
          </div>
          <div className="row">
            <div style={{ flex: 1, minWidth: 180 }}><Field label="Vai vế chú rể (vd: Trưởng nam)" value={form.groomRole} onChange={(v) => set('groomRole', v)} max={40} /></div>
            <div style={{ flex: 1, minWidth: 180 }}><Field label="Vai vế cô dâu (vd: Thứ nữ)" value={form.brideRole} onChange={(v) => set('brideRole', v)} max={40} /></div>
          </div>
        </div>
      </div>

      <FamilyEditor title="Gia đình nhà trai" f={form.groomFamily} onChange={(f) => set('groomFamily', f)} />
      <FamilyEditor title="Gia đình nhà gái" f={form.brideFamily} onChange={(f) => set('brideFamily', f)} />

      <div className="adm-card">
        <h2>Ngày giờ tiệc</h2>
        <div className="adm-form">
          <label className="field">
            Ngày và giờ tiệc (giờ Việt Nam)
            <input type="datetime-local" value={form.eventDateTime} onChange={(e) => set('eventDateTime', e.target.value)} />
            <span className="hint">Hiển thị trên thiệp: {ev.weekdayLine}, {ev.year} — {ev.time}</span>
          </label>
          <Field label="Ngày âm lịch (tùy chọn)" value={form.lunar} onChange={(v) => set('lunar', v)} max={100} hint="Vd: (Nhằm ngày 21 tháng 09 năm Bính Ngọ). Để trống nếu không muốn hiển thị." />
        </div>
      </div>

      <div className="adm-card">
        <h2>Địa điểm</h2>
        <div className="adm-form">
          <Field label="Tên địa điểm — dòng 1" value={form.venueName1} onChange={(v) => set('venueName1', v)} />
          <Field label="Tên địa điểm — dòng 2 (tùy chọn)" value={form.venueName2} onChange={(v) => set('venueName2', v)} />
          <Field label="Sảnh / tầng (tùy chọn)" value={form.venueHall} onChange={(v) => set('venueHall', v)} />
          <Field label="Địa chỉ" value={form.venueAddress} onChange={(v) => set('venueAddress', v)} max={160} />
          <Field label="Từ khóa tìm trên bản đồ nhúng" value={form.mapQuery} onChange={(v) => set('mapQuery', v)} max={200} hint="Thường là tên địa điểm + địa chỉ. Bản đồ trên thiệp tìm theo đúng chữ này." />
          <Field label="Link chỉ đường Google Maps (https://…)" value={form.mapLink} onChange={(v) => set('mapLink', v)} max={CONTENT_LIMITS.url} type="url" hint="Mở Google Maps → Chia sẻ → Sao chép liên kết. Để trống thì ẩn nút “Chỉ đường”." />
        </div>
      </div>

      <div className="adm-card">
        <h2>Lịch trình ngày cưới</h2>
        {form.timeline.map((t, i) => (
          <div className="row" key={i} style={{ marginBottom: 8 }}>
            <input type="text" style={{ width: 90 }} placeholder="18:00" maxLength={10} value={t.time} onChange={(e) => setRow(i, { time: e.target.value })} aria-label="Giờ" />
            <input type="text" style={{ flex: 1, minWidth: 140 }} placeholder="Đón khách" maxLength={80} value={t.label} onChange={(e) => setRow(i, { label: e.target.value })} aria-label="Nội dung" />
            <button className="btn sm" onClick={() => moveRow(i, -1)} disabled={i === 0} aria-label="Lên">↑</button>
            <button className="btn sm" onClick={() => moveRow(i, 1)} disabled={i === form.timeline.length - 1} aria-label="Xuống">↓</button>
            <button className="btn sm danger" onClick={() => set('timeline', form.timeline.filter((_, j) => j !== i))} aria-label="Xóa dòng">✕</button>
          </div>
        ))}
        {form.timeline.length === 0 && <div className="hint">Chưa có dòng nào — mục “Lịch trình” sẽ được ẩn khỏi thiệp.</div>}
        <button className="btn sm" disabled={form.timeline.length >= CONTENT_LIMITS.timeline} onClick={() => set('timeline', [...form.timeline, { time: '', label: '' }])}>
          + Thêm dòng
        </button>
      </div>

      <div className="adm-card">
        <h2>Lời cảm ơn cuối thiệp</h2>
        <label className="field">
          Nội dung (xuống dòng được)
          <textarea rows={3} maxLength={CONTENT_LIMITS.thanks} value={form.thanks} onChange={(e) => set('thanks', e.target.value)} />
        </label>
      </div>

      {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
      <div className="row">
        <button className="btn primary" onClick={() => void save()} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu nội dung'}</button>
        <a className="btn" href="#/" target="_blank" rel="noopener noreferrer">Xem thiệp</a>
        <button className="btn danger" onClick={() => void reset()} disabled={busy}>Đặt lại về mẫu</button>
      </div>
    </>
  );
}
