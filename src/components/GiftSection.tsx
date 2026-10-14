import { useState } from 'react';
import { BUCKET_MEDIA, publicUrl } from '../lib/supabase';
import type { PublicSettings } from '../lib/types';
import { Reveal } from './Reveal';

interface CardProps {
  title: string;
  qrPath: string | null;
  bank: string | null;
  number: string | null;
  holder: string | null;
}

function QrCard({ title, qrPath, bank, number, holder }: CardProps) {
  const src = publicUrl(BUCKET_MEDIA, qrPath);
  const hasBank = Boolean(bank || number || holder);
  return (
    <div className="qr-card">
      <div className="who">{title}</div>
      {src ? (
        <div className="qr-img has">
          <img src={src} alt={`Mã QR mừng cưới — ${title}`} loading="lazy" decoding="async" />
        </div>
      ) : (
        <div className="qr-img">
          QR sẽ được
          <br />
          cập nhật sau
        </div>
      )}
      {hasBank && (
        <div className="bank">
          {bank && <div>{bank}</div>}
          {number && <div>STK: {number}</div>}
          {holder && <div>Chủ TK: {holder}</div>}
        </div>
      )}
    </div>
  );
}

export function GiftSection({ settings: s, groom, bride }: { settings: PublicSettings; groom: string; bride: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section id="gift">
      <Reveal className="eyebrow">Hộp quà mừng</Reveal>
      <Reveal as="h2">Mừng cưới</Reveal>
      <Reveal className="envelope-wrap">
        <button
          type="button"
          className={`envelope${open ? ' open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Mở phong bì mừng cưới"
        >
          <div className="env-back" />
          <div className="env-flap" />
          <div className="env-sparkle">✦</div>
        </button>
      </Reveal>
      <Reveal className="env-hint">{open ? 'Nhấn để đóng phong bì' : 'Nhấn vào phong bì để mở'}</Reveal>

      <div className={`qr-panel${open ? ' show' : ''}`}>
        <QrCard
          title={`Chú rể — ${groom}`}
          qrPath={s.groom_qr_path}
          bank={s.groom_bank_name}
          number={s.groom_account_number}
          holder={s.groom_account_holder}
        />
        <QrCard
          title={`Cô dâu — ${bride}`}
          qrPath={s.bride_qr_path}
          bank={s.bride_bank_name}
          number={s.bride_account_number}
          holder={s.bride_account_holder}
        />
      </div>
    </section>
  );
}
