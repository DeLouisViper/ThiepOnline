import { useEffect, useState } from 'react';
import { useMusic } from './MusicContext';

interface Props {
  petalsAllowed: boolean;
  petalsOn: boolean;
  onTogglePetals: () => void;
}

export function FloatingControls({ petalsAllowed, petalsOn, onTogglePetals }: Props) {
  const music = useMusic();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!music.errorMsg) return;
    setToast(music.errorMsg);
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [music.errorMsg]);

  if (!music.available && !petalsAllowed) return null;
  const playing = music.status === 'playing';

  return (
    <>
      <div className="fab-stack">
        {petalsAllowed && (
          <button
            type="button"
            className={`fab${petalsOn ? '' : ' off'}`}
            onClick={onTogglePetals}
            aria-pressed={petalsOn}
            aria-label={petalsOn ? 'Tắt hoa rơi' : 'Bật hoa rơi'}
            title={petalsOn ? 'Tắt hoa rơi' : 'Bật hoa rơi'}
          >
            🌸
          </button>
        )}
        {music.available && (
          <button
            type="button"
            className={`fab${playing ? ' playing' : ' off'}`}
            onClick={() => void music.toggle()}
            disabled={music.status === 'error'}
            aria-pressed={playing}
            aria-label={playing ? 'Tạm dừng nhạc' : 'Phát nhạc'}
            title={music.status === 'error' ? 'Không phát được nhạc' : playing ? 'Tạm dừng nhạc' : 'Phát nhạc'}
          >
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <rect className="bar" x="3" y="4" width="3.5" height="12" rx="1" />
                <rect className="bar" x="8.2" y="4" width="3.5" height="12" rx="1" />
                <rect className="bar" x="13.4" y="4" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6 3.5v13l11-6.5z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
