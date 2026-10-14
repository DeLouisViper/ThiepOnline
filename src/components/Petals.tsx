import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ShapeKind } from '../lib/themes';
import { useTheme } from './ThemeContext';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function Shape({ kind, fill, stroke }: { kind: ShapeKind; fill: string; stroke: string }) {
  switch (kind) {
    case 'petal':
      return (
        <>
          <path d="M10 1C15.5 5 17 11.5 10 19 3 11.5 4.5 5 10 1Z" fill={fill} />
          <path d="M10 3V16" stroke={stroke} strokeWidth=".5" fill="none" />
        </>
      );
    case 'leaf':
      return (
        <>
          <path d="M2 18C2 8 8 2 18 2 18 12 12 18 2 18Z" fill={fill} />
          <path d="M2 18L14 6" stroke={stroke} strokeWidth=".6" fill="none" />
        </>
      );
    case 'flower':
      return (
        <>
          <g fill={fill} stroke={stroke} strokeWidth=".3">
            <circle cx="10" cy="5" r="3.4" />
            <circle cx="15" cy="9" r="3.4" />
            <circle cx="13" cy="15" r="3.4" />
            <circle cx="7" cy="15" r="3.4" />
            <circle cx="5" cy="9" r="3.4" />
          </g>
          <circle cx="10" cy="10" r="2.2" fill={stroke} />
        </>
      );
    case 'blade':
      return <path d="M10 0C13.2 6 13.2 14 10 20 6.8 14 6.8 6 10 0Z" fill={fill} stroke={stroke} strokeWidth=".4" />;
    case 'dot':
      return <circle cx="10" cy="10" r="4.5" fill={fill} stroke={stroke} strokeWidth=".4" />;
    case 'star':
      return <path d="M10 1 L12.2 7.8 L19 10 L12.2 12.2 L10 19 L7.8 12.2 L1 10 L7.8 7.8Z" fill={fill} />;
  }
}

interface PetalItem {
  id: number;
  kind: ShapeKind;
  fill: string;
  stroke: string;
  style: CSSProperties;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Lightweight CSS-only falling petals / leaves. Capped count, pointer-events none. Look follows the theme. */
export function Petals({ on }: { on: boolean }) {
  const theme = useTheme();
  const reduced = usePrefersReducedMotion();
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const h = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  const count = typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 18;

  const items = useMemo<PetalItem[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const spec = theme.petals[Math.floor(Math.random() * theme.petals.length)];
        const size = spec.kind === 'star' ? rand(7, 12) : spec.kind === 'dot' ? rand(6, 10) : rand(10, 19);
        return {
          id: i,
          kind: spec.kind,
          fill: spec.fill,
          stroke: spec.stroke,
          style: {
            ['--x' as string]: `${rand(0, 100).toFixed(1)}%`,
            ['--size' as string]: `${size.toFixed(1)}px`,
            ['--dur' as string]: `${rand(11, 22).toFixed(1)}s`,
            ['--delay' as string]: `${(-rand(0, 20)).toFixed(1)}s`,
            ['--sway' as string]: `${rand(2.4, 4.6).toFixed(1)}s`,
            ['--sway-x' as string]: `${rand(10, 30).toFixed(0)}px`,
            ['--drift' as string]: `${rand(-90, 90).toFixed(0)}px`,
            ['--rot' as string]: `${rand(200, 620).toFixed(0)}deg`,
            ['--op' as string]: rand(0.55, 0.9).toFixed(2),
          } as CSSProperties,
        };
      }),
    [count, theme],
  );

  if (!on || reduced) return null;

  return (
    <div className={`petals${hidden ? ' paused' : ''}`} aria-hidden="true">
      {items.map((p) => (
        <span key={p.id} className="petal" style={p.style}>
          <i>
            <svg viewBox="0 0 20 20" focusable="false">
              <Shape kind={p.kind} fill={p.fill} stroke={p.stroke} />
            </svg>
          </i>
        </span>
      ))}
    </div>
  );
}
