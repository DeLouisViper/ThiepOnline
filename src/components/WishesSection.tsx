import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BUCKET_GUEST, isSupabaseConfigured, publicUrl, supabase } from '../lib/supabase';
import { processImage, validateImage } from '../lib/image';
import { useWishes } from '../hooks/usePublicData';
import type { PublicSettings } from '../lib/types';
import { Reveal } from './Reveal';

const MAX_NAME = 40;
const MAX_MSG = 300;
const MAX_PHOTO_INPUT = 12 * 1024 * 1024; // before compression
const DUPLICATE_WINDOW_MS = 60_000;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function friendlyError(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  if (msg.includes('rate_limit')) return 'Bạn gửi hơi nhanh. Vui lòng đợi vài phút rồi gửi lại nhé.';
  if (msg.includes('photos_disabled')) return 'Hiện không nhận ảnh đính kèm. Vui lòng gửi lời chúc không kèm ảnh.';
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network'))
    return 'Không có kết nối mạng. Vui lòng kiểm tra và thử lại.';
  return 'Gửi lời chúc thất bại. Vui lòng thử lại sau.';
}

export function WishesSection({ settings }: { settings: PublicSettings }) {
  const { wishes, loading, error, reload } = useWishes();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const sendingRef = useRef(false); // blocks double-clicks before React re-renders
  const lastRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!settings.allow_guest_photos) setPhoto(null);
  }, [settings.allow_guest_photos]);

  const onPickPhoto = (file: File | null) => {
    setFeedback(null);
    if (!file) return setPhoto(null);
    const problem = validateImage(file, MAX_PHOTO_INPUT);
    if (problem) {
      setFeedback({ ok: false, text: problem });
      return;
    }
    setPhoto(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sendingRef.current) return;
    if (honeypot) return; // bots fill hidden fields; silently drop

    const n = name.trim();
    const m = message.trim();
    if (!n || !m) return setFeedback({ ok: false, text: 'Vui lòng nhập tên và lời chúc.' });
    if (n.length > MAX_NAME) return setFeedback({ ok: false, text: `Tên tối đa ${MAX_NAME} ký tự.` });
    if (m.length > MAX_MSG) return setFeedback({ ok: false, text: `Lời chúc tối đa ${MAX_MSG} ký tự.` });
    if (!supabase) {
      return setFeedback({ ok: false, text: 'Trang chưa được kết nối cơ sở dữ liệu nên chưa thể gửi lời chúc.' });
    }
    const key = `${n}\u0000${m}`;
    if (lastRef.current && lastRef.current.key === key && Date.now() - lastRef.current.at < DUPLICATE_WINDOW_MS) {
      return setFeedback({ ok: false, text: 'Lời chúc này vừa được gửi rồi ạ.' });
    }

    sendingRef.current = true;
    setSending(true);
    setFeedback(null);
    try {
      let photoPath: string | null = null;
      if (photo && settings.allow_guest_photos) {
        const img = await processImage(photo, { maxSide: 1280, quality: 0.8 });
        if (img.blob.size > 2 * 1024 * 1024) throw new Error('Ảnh vẫn quá lớn sau khi nén.');
        photoPath = `${crypto.randomUUID()}.${img.ext}`;
        const up = await supabase.storage.from(BUCKET_GUEST).upload(photoPath, img.blob, {
          contentType: img.contentType,
          upsert: false,
        });
        if (up.error) throw up.error;
      }
      // No ".select()" → success only when the database answers 2xx for the INSERT.
      const { error: insErr } = await supabase
        .from('wishes')
        .insert({ guest_name: n, message: m, photo_path: photoPath });
      if (insErr) throw insErr;

      lastRef.current = { key, at: Date.now() };
      setName('');
      setMessage('');
      setPhoto(null);
      setFeedback({
        ok: true,
        text: settings.require_approval
          ? 'Cảm ơn bạn! Lời chúc đã được gửi và sẽ hiển thị sau khi gia đình duyệt.'
          : 'Cảm ơn bạn! Lời chúc của bạn đã được gửi.',
      });
      void reload();
    } catch (err) {
      console.error(err);
      setFeedback({ ok: false, text: friendlyError(err) });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <section id="wishes">
      <Reveal className="eyebrow">Sổ lưu bút</Reveal>
      <Reveal as="h2">Lời chúc từ mọi người</Reveal>
      <Reveal className={`wishes-note${isSupabaseConfigured ? '' : ' warn'}`}>
        {isSupabaseConfigured
          ? settings.require_approval
            ? 'Lời chúc sẽ hiển thị sau khi được gia đình duyệt.'
            : ''
          : 'Chức năng gửi lời chúc chưa được kết nối cơ sở dữ liệu.'}
      </Reveal>

      <Reveal as="form" className="wish-form" onSubmit={submit} noValidate>
        <input
          type="text"
          placeholder="Tên của bạn *"
          maxLength={MAX_NAME}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          aria-label="Tên của bạn"
          required
        />
        <textarea
          placeholder="Lời chúc của bạn *"
          maxLength={MAX_MSG}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Lời chúc của bạn"
          required
        />
        <div className="counter">{message.length}/{MAX_MSG}</div>
        {/* honeypot: invisible to people, tempting to bots */}
        <input
          className="hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          name="website"
        />
        {settings.allow_guest_photos && (
          <div className="photo-row">
            <label>
              📷 Đính kèm ảnh
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  onPickPhoto(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
            {preview && <img src={preview} alt="Ảnh đính kèm" />}
            {photo && (
              <button type="button" className="rm" onClick={() => setPhoto(null)}>
                Bỏ ảnh
              </button>
            )}
          </div>
        )}
        <button type="submit" className="send" disabled={sending || !isSupabaseConfigured}>
          {sending ? 'Đang gửi…' : '🪄 Gửi lời chúc'}
        </button>
      </Reveal>

      {feedback && (
        <div className={`form-msg ${feedback.ok ? 'ok' : 'err'}`} role="status">
          {feedback.text}
        </div>
      )}

      <Reveal className="wish-list">
        {loading ? (
          <div className="wish-empty">Đang tải lời chúc…</div>
        ) : error ? (
          <div className="wish-empty">{error}</div>
        ) : wishes.length === 0 ? (
          <div className="wish-empty">Chưa có lời chúc nào. Hãy là người đầu tiên!</div>
        ) : (
          wishes.map((w) => {
            const img = publicUrl(BUCKET_GUEST, w.photo_path);
            return (
              <div className="wish-card" key={w.id}>
                <div className="row">
                  {/* React escapes all text → no XSS; never use dangerouslySetInnerHTML for user content */}
                  <div className="who">{w.guest_name}</div>
                  <div className="when">{fmtTime(w.created_at)}</div>
                </div>
                <div className="msg">{w.message}</div>
                {img && <img className="wphoto" src={img} alt={`Ảnh từ ${w.guest_name}`} loading="lazy" decoding="async" />}
              </div>
            );
          })
        )}
      </Reveal>
    </section>
  );
}
