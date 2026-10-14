import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Props = {
  as?: 'div' | 'h2' | 'a' | 'form' | 'span';
  className?: string;
  immediate?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  [attr: string]: unknown;
};

/** Fade/slide-in on scroll (same behaviour as the original IntersectionObserver reveal). */
export function Reveal({ as = 'div', className = '', immediate = false, children, ...rest }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(immediate);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return createElement(
    as,
    { ref, className: `reveal${shown ? ' in' : ''}${className ? ' ' + className : ''}`, ...rest },
    children,
  );
}
