import { useEffect, useRef, useState } from 'react';
import { BUCKET_MEDIA, publicUrl } from '../lib/supabase';
import type { GalleryPhoto } from '../lib/types';
import type { GalleryLayout } from '../lib/content';
import { Reveal } from './Reveal';
import { usePrefersReducedMotion } from './Petals';

type Open = (p: GalleryPhoto) => void;

function Photo({ p, i, onOpen }: { p: GalleryPhoto; i: number; onOpen: Open }) {
  const src = publicUrl(BUCKET_MEDIA, p.storage_path);
  return (
    <button type="button" className="ph" onClick={() => onOpen(p)} aria-label={p.caption ?? `Ảnh ${i + 1}`}>
      {src && <img src={src} alt={p.caption ?? `Ảnh cưới ${i + 1}`} loading="lazy" decoding="async" />}
      {p.caption && <span className="cap">{p.caption}</span>}
    </button>
  );
}

/** 3-D "cover flow" carousel: centre photo large, neighbours turned away. Swipe, arrows, or tap a side photo. */
function CoverFlow({ photos, onOpen }: { photos: GalleryPhoto[]; onOpen: Open }) {
  const [idx, setIdx] = useState(0);
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const n = photos.length;
  const go = (d: number) => setIdx((v) => (v + d + n) % n);

  useEffect(() => {
    if (reduced || paused || n < 2) return;
    const id = window.setInterval(() => setIdx((v) => (v + 1) % n), 3800);
    return () => window.clearInterval(id);
  }, [reduced, paused, n]);

  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setPaused(true);
  };
  const onUp = (e: React.PointerEvent) => {
    if (startX.current !== null) {
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    }
    startX.current = null;
  };

  return (
    <div className="cf" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (startX.current = null)} onMouseLeave={() => setPaused(false)} onKeyDown={(e) => e.key === 'ArrowLeft' ? go(-1) : e.key === 'ArrowRight' ? go(1) : undefined}>
      <div className="cf-stage">
        {photos.map((p, i) => {
          let d = i - idx;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const a = Math.abs(d);
          const src = publicUrl(BUCKET_MEDIA, p.storage_path);
          const style = {
            transform: `translateX(${d * 58}%) translateZ(${-a * 90}px) rotateY(${-Math.sign(d) * Math.min(a, 2) * 38}deg) scale(${1 - Math.min(a, 3) * 0.06})`,
            opacity: a > 2 ? 0 : 1 - a * 0.18,
            zIndex: 10 - a,
            pointerEvents: a > 2 ? ('none' as const) : ('auto' as const),
          };
          return (
            <button
              type="button"
              key={p.id}
              className="cf-item"
              style={style}
              onClick={() => (d === 0 ? onOpen(p) : setIdx(i))}
              aria-label={p.caption ?? `Ảnh ${i + 1}`}
              tabIndex={a > 2 ? -1 : 0}
            >
              {src && <img src={src} alt={p.caption ?? `Ảnh cưới ${i + 1}`} loading="lazy" decoding="async" draggable={false} />}
            </button>
          );
        })}
      </div>
      {n > 1 && (
        <>
          <button type="button" className="cf-nav prev" onClick={() => go(-1)} aria-label="Ảnh trước">‹</button>
          <button type="button" className="cf-nav next" onClick={() => go(1)} aria-label="Ảnh sau">›</button>
        </>
      )}
      {photos[idx]?.caption && <div className="cf-cap">{photos[idx].caption}</div>}
    </div>
  );
}

export function GallerySection({ photos, layout = 'grid' }: { photos: GalleryPhoto[]; layout?: GalleryLayout }) {
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const empty = photos.length === 0;
  const useLayout: GalleryLayout = empty ? 'grid' : layout;

  return (
    <section id="gallery">
      <Reveal className="eyebrow">Khoảnh khắc</Reveal>
      <Reveal as="h2">Album ảnh</Reveal>
      {useLayout === 'coverflow' ? (
        <Reveal>
          <CoverFlow photos={photos} onOpen={setOpen} />
        </Reveal>
      ) : (
        <Reveal className={`gallery g-${useLayout}`}>
          {empty
            ? [1, 2, 3, 4].map((n) => (
                <div className="ph empty" key={n}>
                  Ảnh sẽ được
                  <br />
                  cập nhật sớm
                </div>
              ))
            : photos.map((p, i) => <Photo key={p.id} p={p} i={i} onOpen={setOpen} />)}
        </Reveal>
      )}
      {open && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <img src={publicUrl(BUCKET_MEDIA, open.storage_path) ?? ''} alt={open.caption ?? 'Ảnh cưới'} />
          {open.caption && <div className="lb-cap">{open.caption}</div>}
        </div>
      )}
    </section>
  );
}
