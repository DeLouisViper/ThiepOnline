import type { OrnamentKind } from '../lib/themes';
import { useTheme } from './ThemeContext';

/** Corner decorations (line art, colours follow the active theme). */
export function Ornament({ className, kind }: { className?: string; kind?: OrnamentKind }) {
  const theme = useTheme();
  const k = kind ?? theme.ornament;
  const s = 'var(--sage)';
  const m = 'var(--moss)';
  const g = 'var(--gold)';
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      {k === 'vine' && (
        <>
          <path d="M5 5 C 40 5, 30 45, 60 55 C 90 65, 80 20, 115 15" stroke={s} strokeWidth="1.2" />
          <path d="M5 5 C 25 25, 15 40, 35 50" stroke={m} strokeWidth="1" />
        </>
      )}
      {k === 'grass' && (
        <>
          <path d="M8 4 C 20 30, 28 55, 24 100" stroke={s} strokeWidth="1.1" />
          <path d="M20 4 C 34 28, 46 50, 48 92" stroke={g} strokeWidth="1.1" />
          <path d="M34 4 C 46 24, 62 42, 70 80" stroke={m} strokeWidth="1.1" />
          <g fill={g} opacity=".8">
            <ellipse cx="24" cy="100" rx="2.2" ry="4" />
            <ellipse cx="48" cy="92" rx="2.2" ry="4" />
            <ellipse cx="70" cy="80" rx="2.2" ry="4" />
          </g>
          <path d="M8 4 C 14 20, 14 30, 10 44" stroke={m} strokeWidth="1" />
        </>
      )}
      {k === 'bloom' && (
        <>
          <g stroke={s} strokeWidth="1.1" transform="translate(40 40)">
            <ellipse cx="0" cy="-16" rx="7" ry="14" />
            <ellipse cx="0" cy="-16" rx="7" ry="14" transform="rotate(72)" />
            <ellipse cx="0" cy="-16" rx="7" ry="14" transform="rotate(144)" />
            <ellipse cx="0" cy="-16" rx="7" ry="14" transform="rotate(216)" />
            <ellipse cx="0" cy="-16" rx="7" ry="14" transform="rotate(288)" />
            <circle r="3" stroke={g} />
          </g>
          <path d="M62 62 C 80 74, 92 90, 104 112" stroke={m} strokeWidth="1.1" />
          <path d="M82 78 C 94 70, 104 72, 112 80 C 102 88, 90 88, 82 78Z" stroke={s} strokeWidth="1" />
        </>
      )}
      {k === 'lines' && (
        <>
          <path d="M6 54 V6 H54" stroke={s} strokeWidth="1.2" />
          <path d="M16 40 V16 H40" stroke={g} strokeWidth="1" />
          <circle cx="6" cy="6" r="2" fill={g} stroke="none" />
        </>
      )}
      {k === 'sparkle' && (
        <>
          <path d="M8 8 H70" stroke={g} strokeWidth="1" />
          <path d="M8 8 V70" stroke={g} strokeWidth="1" />
          <path d="M40 28 L43 38 L53 41 L43 44 L40 54 L37 44 L27 41 L37 38Z" fill={g} stroke="none" opacity=".85" />
          <path d="M72 14 L73.5 19 L78.5 20.5 L73.5 22 L72 27 L70.5 22 L65.5 20.5 L70.5 19Z" fill={s} stroke="none" opacity=".8" />
          <path d="M18 72 L19.5 77 L24.5 78.5 L19.5 80 L18 85 L16.5 80 L11.5 78.5 L16.5 77Z" fill={s} stroke="none" opacity=".8" />
        </>
      )}
    </svg>
  );
}
