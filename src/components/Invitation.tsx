import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePublicSettings, useGallery } from '../hooks/usePublicData';
import { isSupabaseConfigured } from '../lib/supabase';
import { mergeContent } from '../lib/content';
import { DEFAULT_THEME, getTheme, isThemeId } from '../lib/themes';
import { ThemeCtx } from './ThemeContext';
import { MusicProvider } from './MusicContext';
import { Band } from './Scene';
import { Petals, usePrefersReducedMotion } from './Petals';
import { FloatingControls } from './FloatingControls';
import { EventSection, FamilySection, Footer, Hero, MapSection, TimelineSection } from './Sections';
import { GallerySection } from './GallerySection';
import { WishesSection } from './WishesSection';
import { GiftSection } from './GiftSection';

const PETAL_KEY = 'hm-wedding-petals';
const THEME_KEY = 'hm-wedding-theme';

function cachedTheme(): string | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemeId(v) ? v : null;
  } catch {
    return null;
  }
}

export function Invitation() {
  const { settings, loaded } = usePublicSettings();
  const photos = useGallery();
  const reduced = usePrefersReducedMotion();
  const content = useMemo(() => mergeContent(settings.content), [settings.content]);
  const [params] = useSearchParams();
  const previewId = params.get('theme'); // admin "Xem thử": #/?theme=navy
  // until settings arrive, use the last theme this browser saw (prevents a light→dark flash)
  const themeId = isThemeId(previewId) ? previewId : loaded ? content.theme : (cachedTheme() ?? DEFAULT_THEME);
  const theme = getTheme(themeId);

  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const vars = theme.vars;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    meta?.setAttribute('content', vars['--cream']);
    if (loaded && !isThemeId(previewId)) {
      try {
        localStorage.setItem(THEME_KEY, theme.id);
      } catch {
        /* ignore */
      }
    }
    return () => {
      Object.keys(vars).forEach((k) => root.style.removeProperty(k));
      meta?.setAttribute('content', '#faf7ef');
    };
  }, [theme, loaded, previewId]);
  const [petalsOn, setPetalsOn] = useState(() => {
    try {
      return localStorage.getItem(PETAL_KEY) !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.title = `${content.groom} & ${content.bride} — Thiệp Cưới`;
  }, [content.groom, content.bride]);

  const petalsAllowed = settings.petals_enabled && !reduced;
  const toggle = () => {
    setPetalsOn((v) => {
      try {
        localStorage.setItem(PETAL_KEY, v ? 'off' : 'on');
      } catch {
        /* ignore */
      }
      return !v;
    });
  };

  // Wait for the saved content so guests never see another couple's default names flash by.
  if (isSupabaseConfigured && !loaded) return <div className="card" aria-busy="true" />;

  return (
    <ThemeCtx.Provider value={theme}>
    <MusicProvider enabled={settings.music_enabled} url={settings.music_url}>
      <Petals on={petalsAllowed && petalsOn} />
      <div className="card">
        <Hero c={content} />
        <Band />
        <FamilySection c={content} />
        <Band />
        <EventSection c={content} />
        <Band />
        <MapSection c={content} />
        <Band />
        <TimelineSection c={content} />
        <Band />
        <GallerySection photos={photos} />
        <Band />
        <WishesSection settings={settings} />
        <Band />
        <GiftSection settings={settings} groom={content.groom} bride={content.bride} />
        <Footer c={content} />
      </div>
      <FloatingControls petalsAllowed={petalsAllowed} petalsOn={petalsOn} onTogglePetals={toggle} />
    </MusicProvider>
    </ThemeCtx.Provider>
  );
}
