import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_SETTINGS, type GalleryPhoto, type PublicSettings, type Wish } from '../lib/types';

function useVisibleInterval(fn: () => void, ms: number) {
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) fn();
    };
    const id = window.setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fn, ms]);
}

export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase.from('public_wedding_settings').select('*').maybeSingle();
    if (!error && data) setSettings({ ...DEFAULT_SETTINGS, ...(data as PublicSettings) });
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  // never leave guests on a blank screen if the database is slow or unreachable
  useEffect(() => {
    const t = window.setTimeout(() => setLoaded(true), 4000);
    return () => window.clearTimeout(t);
  }, []);
  useVisibleInterval(load, 60_000);

  return { settings, loaded };
}

export function useGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error && data) setPhotos(data as GalleryPhoto[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useVisibleInterval(load, 120_000);
  return photos;
}

/**
 * Wishes wall. Uses polling (every 20 s while the tab is visible) instead of Supabase
 * Realtime: it needs no extra setup, never exceeds free-tier realtime limits, and a 20 s
 * delay is perfectly fine for a guest book.
 */
export function useWishes() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('wishes')
      .select('id, guest_name, message, photo_path, status, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) setError('Không tải được lời chúc. Vui lòng thử lại sau.');
    else {
      setError(null);
      setWishes((data ?? []) as Wish[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useVisibleInterval(load, 20_000);

  return { wishes, loading, error, reload: load };
}
