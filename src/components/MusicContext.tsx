import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type MusicStatus = 'idle' | 'playing' | 'paused' | 'error';

interface MusicApi {
  available: boolean;
  status: MusicStatus;
  /** Must be called from a click/tap handler (browsers block autoplay with sound). */
  start: () => Promise<void>;
  toggle: () => Promise<void>;
  errorMsg: string | null;
  preferOff: boolean;
}

const Ctx = createContext<MusicApi | null>(null);
const PREF_KEY = 'hm-wedding-music';

export function MusicProvider({ enabled, url, children }: { enabled: boolean; url: string | null; children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null); // single instance for the whole app
  const [status, setStatus] = useState<MusicStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preferOff, setPreferOff] = useState(() => {
    try {
      return localStorage.getItem(PREF_KEY) === 'off';
    } catch {
      return false;
    }
  });
  const available = enabled && Boolean(url);

  const savePref = (v: 'on' | 'off') => {
    try {
      localStorage.setItem(PREF_KEY, v);
    } catch {
      /* ignore */
    }
    setPreferOff(v === 'off');
  };

  // create / update the one Audio element
  useEffect(() => {
    if (!available || !url) {
      audioRef.current?.pause();
      audioRef.current = null;
      setStatus('idle');
      return;
    }
    let a = audioRef.current;
    if (!a) {
      a = new Audio();
      a.loop = true;
      a.preload = 'none';
      a.addEventListener('error', () => {
        setStatus('error');
        setErrorMsg('Không phát được nhạc nền.');
      });
      a.addEventListener('playing', () => setStatus('playing'));
      a.addEventListener('pause', () => setStatus((s) => (s === 'error' ? s : 'paused')));
      audioRef.current = a;
    }
    if (a.getAttribute('data-src') !== url) {
      const wasPlaying = !a.paused;
      a.setAttribute('data-src', url);
      a.src = url;
      setErrorMsg(null);
      if (wasPlaying) void a.play().catch(() => undefined);
    }
  }, [available, url]);

  // stop on unmount
  useEffect(() => () => audioRef.current?.pause(), []);

  const start = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      setErrorMsg(null);
      await a.play();
      savePref('on');
    } catch (e) {
      if ((e as DOMException)?.name === 'NotAllowedError') {
        setStatus('paused');
      } else {
        setStatus('error');
        setErrorMsg('Không phát được nhạc nền.');
      }
    }
  }, []);

  const toggle = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) await start();
    else {
      a.pause();
      savePref('off');
    }
  }, [start]);

  const value = useMemo<MusicApi>(
    () => ({ available, status, start, toggle, errorMsg, preferOff }),
    [available, status, start, toggle, errorMsg, preferOff],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMusic(): MusicApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMusic must be used inside MusicProvider');
  return v;
}
