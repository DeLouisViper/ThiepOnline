import { useEffect, useMemo, useState } from 'react';
import { deriveEvent, safeHttpUrl, type FamilyInfo, type WeddingContent } from '../lib/content';
import { Reveal } from './Reveal';
import { useMusic } from './MusicContext';
import { BUCKET_MEDIA, publicUrl } from '../lib/supabase';
import { Scene } from './Scene';

/* ======================= HERO ======================= */
export function Hero({ c }: { c: WeddingContent }) {
  const music = useMusic();
  const ev = deriveEvent(c);
  const bg = publicUrl(BUCKET_MEDIA, c.heroImage);
  const scrollToFamily = () => document.getElementById('family')?.scrollIntoView({ behavior: 'smooth' });
  const withMusic = music.available && !music.preferOff;

  const open = async (playMusic: boolean) => {
    if (playMusic) await music.start(); // user gesture → allowed by browsers
    scrollToFamily();
  };

  return (
    <section id="hero">
      {bg && <div className="hero-photo" style={{ backgroundImage: `url("${bg}")` }} />}
      <Scene part="top" />
      <Scene part="bottom" />
      <Reveal immediate className="sub">Trân trọng kính mời</Reveal>
      <Reveal immediate className="names">
        {c.groom}
        <span className="amp">&amp;</span>
        {c.bride}
      </Reveal>
      <Reveal immediate className="date-line">{ev.dateLine}</Reveal>
      {music.available ? (
        <>
          <button type="button" className="invite-btn" onClick={() => void open(withMusic)}>
            {withMusic ? 'Mở thiệp & bật nhạc' : 'Mở thiệp mời'}
          </button>
          {withMusic && (
            <button type="button" className="invite-link" onClick={() => void open(false)}>
              Mở thiệp (không bật nhạc)
            </button>
          )}
        </>
      ) : (
        <button type="button" className="invite-btn" onClick={scrollToFamily}>
          Mở thiệp mời
        </button>
      )}
      <div className="scroll-cue" aria-hidden="true">↓</div>
    </section>
  );
}

/* ======================= FAMILY ======================= */
function Family({ f }: { f: FamilyInfo }) {
  return (
    <Reveal className="family">
      <div className="honor">{f.title}</div>
      <div className="names2">
        {f.parent1}
        {f.parent2 && (
          <>
            <br />
            {f.parent2}
          </>
        )}
      </div>
      <div className="addr">
        {f.address1}
        {f.address2 && (
          <>
            <br />
            {f.address2}
          </>
        )}
      </div>
    </Reveal>
  );
}

export function FamilySection({ c }: { c: WeddingContent }) {
  return (
    <section id="family">
      <Reveal className="eyebrow">Thông tin lễ cưới</Reveal>
      <Reveal as="h2">Hai gia đình</Reveal>
      <div className="family-wrap">
        <Family f={c.groomFamily} />
        <Family f={c.brideFamily} />
      </div>
      <Reveal className="announce">Trân trọng báo tin lễ thành hôn của con chúng tôi</Reveal>
      <Reveal className="groom-bride-name">{c.groomFull}</Reveal>
      <Reveal className="role-tag">{c.groomRole}</Reveal>
      <Reveal className="divider">
        <svg viewBox="0 0 60 14" aria-hidden="true">
          <path d="M0 7 H24" stroke="var(--gold)" strokeWidth="1" />
          <circle cx="30" cy="7" r="3" fill="none" stroke="var(--gold)" strokeWidth="1" />
          <path d="M36 7 H60" stroke="var(--gold)" strokeWidth="1" />
        </svg>
      </Reveal>
      <Reveal className="groom-bride-name">{c.brideFull}</Reveal>
      <Reveal className="role-tag">{c.brideRole}</Reveal>
    </section>
  );
}

/* ======================= EVENT / COUNTDOWN / CALENDAR ======================= */
const pad = (n: number) => String(n).padStart(2, '0');

function useCountdown(iso: string) {
  const target = useMemo(() => new Date(iso).getTime(), [iso]);
  const [diff, setDiff] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    const tick = () => setDiff(Math.max(0, target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

function MonthCalendar({ year, month, day }: { year: number; month: number; day: number }) {
  // UTC math → independent of the visitor's time zone
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7; // Monday-first grid
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  return (
    <Reveal className="cal">
      <div className="cal-head">Tháng {month} · {year}</div>
      <div className="cal-grid">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((x) => (
          <div className="dow" key={x}>{x}</div>
        ))}
        {cells.map((cell, i) =>
          cell === null ? <div key={`e${i}`} /> : (
            <div key={cell} className={`day${cell === day ? ' mark' : ''}`}>{cell}</div>
          ),
        )}
      </div>
    </Reveal>
  );
}

export function EventSection({ c }: { c: WeddingContent }) {
  const ev = useMemo(() => deriveEvent(c), [c]);
  const cd = useCountdown(ev.iso);
  const location = `${[c.venueName1, c.venueName2].filter(Boolean).join(' ')} - ${c.venueHall}, ${c.venueAddress}`;
  const calUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(`Tiệc cưới ${c.groom} & ${c.bride}`)}` +
    `&dates=${ev.calStart}/${ev.calEnd}&ctz=Asia%2FHo_Chi_Minh` +
    `&location=${encodeURIComponent(location)}` +
    `&details=${encodeURIComponent('Trân trọng kính mời quý khách đến chung vui cùng gia đình chúng tôi.')}`;

  return (
    <section id="event">
      <Reveal className="eyebrow">Save the date</Reveal>
      <Reveal as="h2">Ngày trọng đại</Reveal>

      <Reveal className="countdown" role="timer" aria-label="Đếm ngược đến ngày cưới">
        {[
          ['Ngày', cd.d],
          ['Giờ', cd.h],
          ['Phút', cd.m],
          ['Giây', cd.s],
        ].map(([l, v]) => (
          <div className="box" key={l as string}>
            <div className="n">{pad(v as number)}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </Reveal>

      <Reveal className="event-block">
        <div className="venue-card">
          <div className="venue-tag">Tiệc cưới diễn ra tại</div>
          <div className="loc">
            {c.venueName1}
            {c.venueName2 && (
              <>
                <br />
                {c.venueName2}
              </>
            )}
          </div>
          {c.venueHall && <div className="hall">{c.venueHall}</div>}
          <div className="addr">{c.venueAddress}</div>
          <div className="vc-divider">
            <span />
            <span className="gem">✦</span>
            <span />
          </div>
          <div className="event-time">
            {ev.weekdayLine}
            <b>{ev.time}</b>
            {ev.year}
          </div>
          {c.lunar && <div className="lunar">{c.lunar}</div>}
        </div>
      </Reveal>

      <MonthCalendar year={ev.year} month={ev.month} day={ev.day} />

      <Reveal as="a" className="add-cal-btn" href={calUrl} target="_blank" rel="noopener noreferrer">
        ＋ Thêm vào lịch
      </Reveal>
    </section>
  );
}

/* ======================= MAP ======================= */
export function MapSection({ c }: { c: WeddingContent }) {
  const link = safeHttpUrl(c.mapLink);
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(c.mapQuery || c.venueAddress)}&output=embed`;
  return (
    <section id="map">
      <Reveal className="eyebrow">Vị trí</Reveal>
      <Reveal as="h2">Đường đến tiệc cưới</Reveal>
      <Reveal className="addr" style={{ marginTop: 8 }}>
        {[c.venueName1, c.venueName2].filter(Boolean).join(' ')}
        {c.venueHall ? ` — ${c.venueHall}` : ''}
        <br />
        {c.venueAddress}
      </Reveal>
      <Reveal className="map-frame">
        <iframe
          title="Bản đồ địa điểm tiệc cưới"
          src={embed}
          height="260"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Reveal>
      {link && (
        <Reveal as="a" className="add-cal-btn" href={link} target="_blank" rel="noopener noreferrer">
          📍 Chỉ đường trên Google Maps
        </Reveal>
      )}
    </section>
  );
}

/* ======================= TIMELINE ======================= */
export function TimelineSection({ c }: { c: WeddingContent }) {
  if (c.timeline.length === 0) return null;
  return (
    <section id="timeline">
      <Reveal className="eyebrow">Lịch trình</Reveal>
      <Reveal as="h2">Ngày cưới</Reveal>
      <Reveal className="timeline">
        {c.timeline.map((t, i) => (
          <div className="t-item" key={`${t.time}-${i}`}>
            <div className="t-time">{t.time}</div>
            <div className="t-dot" />
            <div className="t-label">{t.label}</div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/* ======================= FOOTER ======================= */
export function Footer({ c }: { c: WeddingContent }) {
  return (
    <footer>
      <Scene part="bottom" />
      <Reveal className="thanks" style={{ whiteSpace: 'pre-line' }}>{c.thanks}</Reveal>
      <Reveal className="sign">
        {c.groom} &amp; {c.bride}
      </Reveal>
      <div className="credit">made with love</div>
    </footer>
  );
}
