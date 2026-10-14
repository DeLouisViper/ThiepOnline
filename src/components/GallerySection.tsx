import { useEffect, useState } from 'react';
import { BUCKET_MEDIA, publicUrl } from '../lib/supabase';
import type { GalleryPhoto } from '../lib/types';
import { Reveal } from './Reveal';

export function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <section id="gallery">
      <Reveal className="eyebrow">Khoảnh khắc</Reveal>
      <Reveal as="h2">Album ảnh</Reveal>
      <Reveal className="gallery">
        {photos.length === 0
          ? [1, 2, 3, 4].map((n) => (
              <div className="ph empty" key={n}>
                Ảnh sẽ được
                <br />
                cập nhật sớm
              </div>
            ))
          : photos.map((p, i) => {
              const src = publicUrl(BUCKET_MEDIA, p.storage_path);
              return (
                <button type="button" className="ph" key={p.id} onClick={() => setOpen(p)} aria-label={p.caption ?? `Ảnh ${i + 1}`}>
                  {src && <img src={src} alt={p.caption ?? `Ảnh cưới ${i + 1}`} loading="lazy" decoding="async" />}
                  {p.caption && <span className="cap">{p.caption}</span>}
                </button>
              );
            })}
      </Reveal>
      {open && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <img src={publicUrl(BUCKET_MEDIA, open.storage_path) ?? ''} alt={open.caption ?? 'Ảnh cưới'} />
          {open.caption && <div className="lb-cap">{open.caption}</div>}
        </div>
      )}
    </section>
  );
}
