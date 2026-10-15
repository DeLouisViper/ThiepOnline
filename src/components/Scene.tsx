import type { ReactNode } from 'react';
import type { SceneKind } from '../lib/themes';
import { useTheme } from './ThemeContext';

/* Original line-art / flat illustrations drawn in SVG. Each theme has its own scene
   (top + bottom artwork) so themes differ in more than colour. */

type P = [number, number];
const bez = (a: P, b: P, c: P, t: number): P => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1],
];
const ang = (a: P, b: P, c: P, t: number) => {
  const dx = 2 * (1 - t) * (b[0] - a[0]) + 2 * t * (c[0] - b[0]);
  const dy = 2 * (1 - t) * (b[1] - a[1]) + 2 * t * (c[1] - b[1]);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};
const LEAF = 'M0 0 C 6 -8, 6 -22, 0 -30 C -6 -22, -6 -8, 0 0Z';

function Leaf({ x, y, r, s = 1, fill, stroke, op = 1 }: { x: number; y: number; r: number; s?: number; fill: string; stroke?: string; op?: number }) {
  return <path d={LEAF} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.8 : 0} opacity={op} />;
}

function Flower({ x, y, s = 1, petal, center, stroke, n = 5, r = 0 }: { x: number; y: number; s?: number; petal: string; center: string; stroke?: string; n?: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {Array.from({ length: n }, (_, i) => (
        <ellipse key={i} cx="0" cy="-8" rx="5" ry="9" fill={petal} stroke={stroke} strokeWidth={stroke ? 0.7 : 0} transform={`rotate(${(360 / n) * i})`} />
      ))}
      <circle r="3" fill={center} />
    </g>
  );
}

function Blossom({ x, y, s = 1, petal, center, r = 0 }: { x: number; y: number; s?: number; petal: string; center: string; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx="0" cy="-6" r="5.2" fill={petal} transform={`rotate(${a})`} />
      ))}
      <circle r="2.2" fill={center} />
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M0 0 L0 -4.5" stroke={center} strokeWidth=".6" transform={`rotate(${a + 36})`} />
      ))}
    </g>
  );
}

function Magnolia({ x, y, s = 1, r = 0, petal, edge, center }: { x: number; y: number; s?: number; r?: number; petal: string; edge: string; center: string }) {
  const P = 'M0 0 C 11 -10, 11 -32, 0 -46 C -11 -32, -11 -10, 0 0Z';
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {[-70, -35, 35, 70].map((a) => (
        <path key={a} d={P} transform={`rotate(${a}) scale(.9)`} fill={petal} stroke={edge} strokeWidth=".9" />
      ))}
      {[-18, 18].map((a) => (
        <path key={a} d={P} transform={`rotate(${a}) scale(.98)`} fill={petal} stroke={edge} strokeWidth=".9" />
      ))}
      <path d={P} transform="scale(1.05)" fill={petal} stroke={edge} strokeWidth=".9" />
      <path d="M0 -8 L0 -30" stroke={edge} strokeWidth=".6" opacity=".6" />
      <circle cy="-6" r="3" fill={center} />
    </g>
  );
}

function Rose({ x, y, s = 1, base, mid, edge }: { x: number; y: number; s?: number; base: string; mid: string; edge: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-13" rx="11" ry="13" fill={base} stroke={edge} strokeWidth=".8" transform={`rotate(${a})`} />
      ))}
      <circle r="13" fill={mid} stroke={edge} strokeWidth=".8" />
      <path d="M-8 2 C -8 -9, 8 -9, 8 1 C 8 8, -3 9, -3 2 C -3 -3, 3 -3, 3 1" fill="none" stroke={edge} strokeWidth="1" />
      <path d="M-11 -3 C -9 -14, 9 -14, 11 -3" fill="none" stroke={edge} strokeWidth=".7" opacity=".7" />
    </g>
  );
}

interface BranchProps {
  p0: P;
  p1: P;
  p2: P;
  n?: number;
  size?: number;
  fill: string;
  fill2?: string;
  stroke: string;
  sw?: number;
  spread?: number;
  extra?: (pt: P, rot: number, i: number) => ReactNode;
  tip?: boolean;
}
function Branch({ p0, p1, p2, n = 7, size = 1, fill, fill2, stroke, sw = 1.3, spread = 52, extra, tip = true }: BranchProps) {
  const items: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1);
    const pt = bez(p0, p1, p2, t);
    const a = ang(p0, p1, p2, t);
    const k = size * (1.05 - t * 0.45);
    items.push(
      <Leaf key={`a${i}`} x={pt[0]} y={pt[1]} r={a + 90 + spread} s={k} fill={i % 2 ? fill2 ?? fill : fill} />,
      <Leaf key={`b${i}`} x={pt[0]} y={pt[1]} r={a + 90 - spread} s={k * 0.92} fill={i % 2 ? fill : fill2 ?? fill} />,
    );
    if (extra) items.push(<g key={`x${i}`}>{extra(pt, a, i)}</g>);
  }
  if (tip) {
    const a = ang(p0, p1, p2, 1);
    items.push(<Leaf key="tip" x={p2[0]} y={p2[1]} r={a + 90} s={size * 0.8} fill={fill} />);
  }
  return (
    <g>
      <path d={`M${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      {items}
    </g>
  );
}

function Pampas({ p0, p1, p2, color, color2, plume = 34 }: { p0: P; p1: P; p2: P; color: string; color2: string; plume?: number }) {
  const strokes: ReactNode[] = [];
  const N = 26;
  for (let i = 0; i < N; i++) {
    const t = 0.52 + (i / N) * 0.48;
    const pt = bez(p0, p1, p2, t);
    const a = ang(p0, p1, p2, t);
    const side = i % 2 ? 1 : -1;
    const off = 14 + ((i * 7) % 12);
    const len = plume * (1 - (t - 0.5) * 0.7) * (0.7 + ((i * 5) % 6) / 12);
    const rad = ((a + side * off) * Math.PI) / 180;
    strokes.push(
      <path key={i} d={`M${pt[0]} ${pt[1]} L${pt[0] + Math.cos(rad) * len} ${pt[1] + Math.sin(rad) * len}`} stroke={i % 3 ? color : color2} strokeWidth="1.1" strokeLinecap="round" opacity=".85" />,
    );
  }
  return (
    <g>
      <path d={`M${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} fill="none" stroke={color2} strokeWidth="1.2" />
      {strokes}
    </g>
  );
}

function Sparkle({ x, y, s = 1, fill, op = 0.9 }: { x: number; y: number; s?: number; fill: string; op?: number }) {
  return <path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2Z" transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={op} />;
}

const mirror = (n: ReactNode, w = 400) => <g transform={`translate(${w} 0) scale(-1 1)`}>{n}</g>;
const rot180 = (n: ReactNode, w = 400, h = 260) => <g transform={`translate(${w} ${h}) rotate(180)`}>{n}</g>;
const VB = '0 0 400 260';

/* ---------------------------------------------------------------- scenes */
function SageScene() {
  const corner = (
    <g>
      <Branch p0={[-6, -4]} p1={[130, 6]} p2={[170, 118]} n={8} size={1} fill="#a7b596" fill2="#7c8968" stroke="#566148" extra={(pt, _a, i) => (i === 3 || i === 6 ? <Flower x={pt[0]} y={pt[1]} s={0.7} petal="#f6ece0" center="#b99a5c" stroke="#d8c39a" /> : null)} />
      <Branch p0={[-4, 6]} p1={[30, 80]} p2={[74, 168]} n={6} size={0.9} fill="#c2cdb2" fill2="#8d9a78" stroke="#7c8968" />
      <Flower x={170} y={118} s={1.1} petal="#f6ece0" center="#b99a5c" stroke="#d8c39a" />
      <circle cx="44" cy="40" r="2.4" fill="#b99a5c" />
      <circle cx="92" cy="22" r="2" fill="#b99a5c" />
    </g>
  );
  return { top: <>{corner}{mirror(corner)}</>, bottom: <>{rot180(corner)}{mirror(rot180(corner))}</> };
}

function DriedBlueScene() {
  const blob = (
    <>
      <defs>
        <filter id="bl-b" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <g filter="url(#bl-b)">
        <ellipse cx="40" cy="20" rx="110" ry="60" fill="#a8bdcc" opacity=".55" />
        <ellipse cx="380" cy="30" rx="100" ry="55" fill="#8da6ba" opacity=".45" />
        <ellipse cx="200" cy="-10" rx="120" ry="30" fill="#dfe6ea" opacity=".6" />
      </g>
    </>
  );
  const dried = (x: number, y: number, h: number, lean: number) => (
    <g>
      <path d={`M${x} ${y} Q ${x + lean / 2} ${y - h * 0.6} ${x + lean} ${y - h}`} stroke="#8a9a7a" strokeWidth="1.1" fill="none" />
      {[
        [0, -6],
        [5, 0],
        [-5, 2],
        [3, 8],
        [-3, 9],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={x + lean + dx} cy={y - h + dy} r={3.2 - (i % 2) * 0.6} fill={i % 2 ? '#a8bdcc' : '#6d8aa3'} />
      ))}
    </g>
  );
  const top = (
    <>
      {blob}
      <Pampas p0={[8, -4]} p1={[24, 60]} p2={[70, 116]} color="#cdb994" color2="#a98f66" plume={34} />
      <Pampas p0={[30, -4]} p1={[70, 40]} p2={[118, 78]} color="#e1d3b5" color2="#b79b78" plume={28} />
      {mirror(<Pampas p0={[8, -4]} p1={[24, 60]} p2={[70, 116]} color="#cdb994" color2="#a98f66" plume={34} />)}
      {mirror(<Pampas p0={[30, -4]} p1={[70, 40]} p2={[118, 78]} color="#e1d3b5" color2="#b79b78" plume={28} />)}
    </>
  );
  const bottom = (
    <>
      <Pampas p0={[20, 264]} p1={[34, 190]} p2={[56, 120]} color="#cdb994" color2="#a98f66" plume={40} />
      <Pampas p0={[48, 264]} p1={[70, 205]} p2={[104, 160]} color="#e1d3b5" color2="#b79b78" plume={32} />
      <Pampas p0={[2, 264]} p1={[10, 215]} p2={[26, 170]} color="#b79b78" color2="#8f7757" plume={26} />
      {dried(84, 264, 80, 10)}
      {dried(104, 264, 56, -8)}
      {dried(130, 264, 38, 6)}
      {mirror(
        <>
          <Pampas p0={[20, 264]} p1={[34, 190]} p2={[56, 120]} color="#cdb994" color2="#a98f66" plume={40} />
          <Pampas p0={[48, 264]} p1={[70, 205]} p2={[104, 160]} color="#e1d3b5" color2="#b79b78" plume={32} />
          <Pampas p0={[2, 264]} p1={[10, 215]} p2={[26, 170]} color="#b79b78" color2="#8f7757" plume={26} />
          {dried(84, 264, 80, 10)}
          {dried(104, 264, 56, -8)}
        </>,
      )}
    </>
  );
  return { top, bottom };
}

function MinimalGreenScene() {
  const sprig = (x: number, y: number, flip: number) => (
    <g transform={`translate(${x} ${y}) scale(${flip} 1)`}>
      <path d="M0 0 Q 4 30 0 70" stroke="#2f5a45" strokeWidth="1" fill="none" />
      {[10, 22, 34, 46, 58].map((d, i) => (
        <g key={d}>
          <path d={LEAF} transform={`translate(1 ${d}) rotate(${58}) scale(${0.62 - i * 0.04})`} fill="none" stroke="#2f5a45" strokeWidth="1" />
          <path d={LEAF} transform={`translate(1 ${d + 5}) rotate(${-58}) scale(${0.62 - i * 0.04})`} fill="none" stroke="#2f5a45" strokeWidth="1" />
        </g>
      ))}
    </g>
  );
  const top = (
    <>
      {sprig(200, 8, 1)}
      <g opacity=".7">
        <path d="M40 40 H160" stroke="#a8935a" strokeWidth=".8" />
        <path d="M240 40 H360" stroke="#a8935a" strokeWidth=".8" />
      </g>
      <circle cx="200" cy="92" r="2.4" fill="#a8935a" />
    </>
  );
  const bottom = (
    <g transform="translate(0 260) scale(1 -1)">
      <g opacity=".7">
        <path d="M40 40 H160" stroke="#a8935a" strokeWidth=".8" />
        <path d="M240 40 H360" stroke="#a8935a" strokeWidth=".8" />
      </g>
      {sprig(200, 8, 1)}
    </g>
  );
  return { top, bottom };
}

function MagnoliaScene() {
  const cluster = (
    <g>
      <Branch p0={[-6, 20]} p1={[70, 30]} p2={[140, 120]} n={5} size={1.15} fill="#a9bba9" fill2="#7f9a85" stroke="#6f8a73" />
      <Branch p0={[10, -6]} p1={[30, 50]} p2={[24, 130]} n={4} size={0.9} fill="#b9c9b6" fill2="#8aa28c" stroke="#6f8a73" />
      <Magnolia x={64} y={86} s={1.25} r={-12} petal="#ffffff" edge="#d9b8be" center="#e6cdd2" />
      <Magnolia x={128} y={50} s={0.8} r={30} petal="#fbeff0" edge="#d9b8be" center="#e3cfd4" />
      <ellipse cx="30" cy="150" rx="5" ry="9" fill="#f3dde0" stroke="#d9b8be" strokeWidth=".8" transform="rotate(-12 30 150)" />
      <circle cx="100" cy="14" r="2" fill="#c4a57b" />
      <circle cx="160" cy="92" r="1.8" fill="#c4a57b" />
    </g>
  );
  const small = (
    <g>
      <Branch p0={[-6, 10]} p1={[50, 20]} p2={[100, 80]} n={4} size={0.9} fill="#a9bba9" fill2="#7f9a85" stroke="#6f8a73" />
      <Magnolia x={52} y={52} s={0.85} r={10} petal="#fbeff0" edge="#d9b8be" center="#e3cfd4" />
    </g>
  );
  return { top: <>{cluster}{mirror(small)}</>, bottom: <>{rot180(small)}{mirror(rot180(cluster))}</> };
}

function SpringScene() {
  const arc = (
    <g>
      <Branch
        p0={[-6, 14]}
        p1={[90, -6]}
        p2={[196, 44]}
        n={8}
        size={0.85}
        fill="#7fb8b4"
        fill2="#9fd0c8"
        stroke="#2c5963"
        spread={60}
        extra={(pt, a, i) => (i % 2 === 1 ? <Blossom x={pt[0]} y={pt[1] - 6} s={0.95} petal={i % 4 === 1 ? '#f7dfe4' : '#f5c6d0'} center="#d1a45a" r={a} /> : null)}
      />
      <Blossom x={196} y={44} s={1.15} petal="#f5c6d0" center="#d1a45a" />
      <Branch p0={[-4, 40]} p1={[30, 90]} p2={[56, 160]} n={4} size={0.8} fill="#9fd0c8" fill2="#7fb8b4" stroke="#2c5963" />
      <Blossom x={56} y={160} s={0.9} petal="#f7dfe4" center="#d1a45a" />
    </g>
  );
  const bot = (
    <g>
      <Branch p0={[-6, 14]} p1={[80, 0]} p2={[150, 40]} n={6} size={0.8} fill="#7fb8b4" fill2="#9fd0c8" stroke="#2c5963" extra={(pt, a, i) => (i % 2 === 0 ? <Blossom x={pt[0]} y={pt[1] - 5} s={0.8} petal="#f7dfe4" center="#d1a45a" r={a} /> : null)} />
      <circle cx="30" cy="70" r="3" fill="#d1a45a" />
      <circle cx="70" cy="84" r="2.2" fill="#d1a45a" />
    </g>
  );
  return { top: <>{arc}{mirror(arc)}</>, bottom: <>{rot180(bot)}{mirror(rot180(bot))}</> };
}

function NavyScene() {
  const G = '#d1ad63';
  const top = (
    <>
      <defs>
        <radialGradient id="nv-glow" cx="50%" cy="0%" r="70%">
          <stop offset="0" stopColor="#4a5f8c" stopOpacity=".55" />
          <stop offset="1" stopColor="#4a5f8c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill="url(#nv-glow)" />
      {/* crescent moon */}
      <path d="M200 36 A26 26 0 1 0 224 76 A21 21 0 1 1 200 36Z" fill="#eadfc4" opacity=".92" />
      <Sparkle x={246} y={44} s={0.9} fill={G} />
      <Sparkle x={150} y={70} s={0.6} fill="#eadfc4" />
      <Sparkle x={52} y={52} s={1} fill={G} />
      <Sparkle x={348} y={86} s={0.8} fill="#eadfc4" />
      <g stroke={G} strokeWidth=".7" opacity=".6" fill="none">
        <path d="M40 120 L84 92 L124 126 L170 104" />
        <path d="M250 112 L300 130 L338 98 L372 120" />
      </g>
      <g fill={G}>
        {[[40, 120], [84, 92], [124, 126], [170, 104], [250, 112], [300, 130], [338, 98], [372, 120], [20, 24], [110, 18], [290, 20], [380, 40]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i < 8 ? 2.2 : 1.4} opacity={i < 8 ? 0.95 : 0.6} />
        ))}
      </g>
    </>
  );
  const bottom = (
    <>
      <g stroke={G} strokeWidth=".7" opacity=".55" fill="none">
        <path d="M30 220 L70 240 L120 214" />
        <path d="M280 236 L324 212 L372 238" />
      </g>
      <g fill={G}>
        {[[30, 220], [70, 240], [120, 214], [280, 236], [324, 212], [372, 238], [200, 250], [160, 232], [240, 226]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i < 6 ? 2 : 1.3} opacity=".85" />
        ))}
      </g>
      <Sparkle x={200} y={226} s={0.9} fill="#eadfc4" />
    </>
  );
  return { top, bottom };
}

function RoseScene() {
  const cluster = (
    <g>
      <Branch p0={[-6, 30]} p1={[60, 20]} p2={[150, 100]} n={5} size={1} fill="#b9c7a8" fill2="#8fa77c" stroke="#6f8a5a" />
      <Branch p0={[14, -6]} p1={[30, 60]} p2={[18, 140]} n={4} size={0.85} fill="#b9c7a8" fill2="#8fa77c" stroke="#6f8a5a" />
      <Rose x={66} y={72} s={1.7} base="#f2c4cd" mid="#e8a3b2" edge="#c8788a" />
      <Rose x={138} y={44} s={1.05} base="#f8dde2" mid="#f2c4cd" edge="#d9919f" />
      <Rose x={34} y={150} s={0.8} base="#f8dde2" mid="#f2c4cd" edge="#d9919f" />
      <circle cx="108" cy="130" r="3" fill="#c8a374" />
      <circle cx="170" cy="96" r="2" fill="#c8a374" />
    </g>
  );
  const small = (
    <g>
      <Branch p0={[-6, 10]} p1={[50, 16]} p2={[110, 70]} n={4} size={0.9} fill="#b9c7a8" fill2="#8fa77c" stroke="#6f8a5a" />
      <Rose x={46} y={48} s={1.2} base="#f8dde2" mid="#f2c4cd" edge="#d9919f" />
    </g>
  );
  return { top: <>{cluster}{mirror(small)}</>, bottom: <>{rot180(small)}{mirror(rot180(cluster))}</> };
}

function BohoScene() {
  const arcs = ['#b9774f', '#d99a6c', '#e8c39a', '#efdcc3'];
  const top = (
    <>
      <g>
        {[120, 98, 76, 54].map((r, i) => (
          <path key={r} d={`M${200 - r} 150 A${r} ${r} 0 0 1 ${200 + r} 150 L${200 + r - 22} 150 A${r - 22} ${r - 22} 0 0 0 ${200 - r + 22} 150Z`} fill={arcs[i]} opacity={0.9} />
        ))}
      </g>
      <circle cx="200" cy="150" r="12" fill="#b88a3e" opacity=".9" />
      <Pampas p0={[8, -4]} p1={[20, 50]} p2={[40, 100]} color="#c9a56a" color2="#a07a3e" plume={30} />
      {mirror(<Pampas p0={[8, -4]} p1={[20, 50]} p2={[40, 100]} color="#c9a56a" color2="#a07a3e" plume={30} />)}
      {[[70, 40], [330, 40], [96, 80], [304, 80]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i < 2 ? 3 : 2} fill="#b9774f" opacity=".7" />
      ))}
    </>
  );
  const grass = (x: number) => (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${x + i * 12} 264 Q ${x + i * 12 + (i % 2 ? 22 : -18)} ${200 - i * 6} ${x + i * 16 - 10} ${150 - i * 10}`} stroke={i % 2 ? '#b88a3e' : '#c9a56a'} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ))}
      <ellipse cx={x + 4} cy="148" rx="3" ry="7" fill="#b9774f" transform={`rotate(-14 ${x + 4} 148)`} />
      <ellipse cx={x + 40} cy="120" rx="3" ry="7" fill="#8a6a4f" transform={`rotate(12 ${x + 40} 120)`} />
    </g>
  );
  const bottom = (
    <>
      {grass(6)}
      {mirror(grass(6))}
      <Pampas p0={[60, 264]} p1={[70, 210]} p2={[96, 160]} color="#e8c39a" color2="#b9774f" plume={34} />
      {mirror(<Pampas p0={[60, 264]} p1={[70, 210]} p2={[96, 160]} color="#e8c39a" color2="#b9774f" plume={34} />)}
    </>
  );
  return { top, bottom };
}

function RoyalScene() {
  const G = '#d4af61';
  const fan = (
    <g stroke={G} fill="none" strokeWidth=".9">
      {Array.from({ length: 13 }, (_, i) => {
        const a = (-90 + (i - 6) * 13) * (Math.PI / 180);
        return <path key={i} d={`M200 0 L${200 + Math.cos(a + Math.PI) * 0 + Math.sin((i - 6) * 0.23) * 140} ${Math.cos((i - 6) * 0.23) * 140}`} opacity={0.65} />;
      })}
      {[40, 70, 100, 130].map((r) => (
        <path key={r} d={`M${200 - r * 0.97} ${r * 0.24} A${r} ${r} 0 0 0 ${200 + r * 0.97} ${r * 0.24}`} opacity={0.75} />
      ))}
    </g>
  );
  const top = (
    <>
      {fan}
      <Sparkle x={52} y={50} s={1.1} fill={G} />
      <Sparkle x={348} y={50} s={1.1} fill={G} />
      <Sparkle x={86} y={96} s={0.6} fill="#f0dca8" />
      <Sparkle x={314} y={96} s={0.6} fill="#f0dca8" />
      <circle cx="200" cy="152" r="3" fill={G} />
    </>
  );
  const bottom = (
    <g transform="translate(0 260) scale(1 -1)">
      {fan}
      <Sparkle x={52} y={50} s={0.8} fill={G} />
      <Sparkle x={348} y={50} s={0.8} fill={G} />
    </g>
  );
  return { top, bottom };
}


function Lavender({ p0, p1, p2, bud, bud2, stem = '#7f9a6a' }: { p0: P; p1: P; p2: P; bud: string; bud2: string; stem?: string }) {
  const els: ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const t = 0.38 + (i / 12) * 0.62;
    const pt = bez(p0, p1, p2, t);
    const a = ang(p0, p1, p2, t);
    const k = 1 - (t - 0.4) * 0.55;
    [-1, 1].forEach((sd) =>
      els.push(<ellipse key={`${i}${sd}`} cx={pt[0]} cy={pt[1]} rx={2.6 * k} ry={6 * k} fill={(i + sd) % 2 ? bud : bud2} transform={`rotate(${a + 90 + sd * 32} ${pt[0]} ${pt[1]})`} />),
    );
  }
  const e = bez(p0, p1, p2, 1);
  els.push(<ellipse key="tip" cx={e[0]} cy={e[1]} rx="2.2" ry="5" fill={bud} transform={`rotate(${ang(p0, p1, p2, 1) + 90} ${e[0]} ${e[1]})`} />);
  return (
    <g>
      <path d={`M${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} fill="none" stroke={stem} strokeWidth="1.2" />
      {els}
    </g>
  );
}

function Sunflower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {Array.from({ length: 16 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-17" rx="4.6" ry="10" fill={i % 2 ? '#f6c744' : '#f2b72a'} transform={`rotate(${(360 / 16) * i})`} />
      ))}
      <circle r="11" fill="#6b4318" />
      <circle r="7" fill="#8a5a22" />
      {[[-3, -3], [3, -2], [0, 3], [-4, 3], [4, 4], [0, -6]].map(([a, b], i) => (
        <circle key={i} cx={a} cy={b} r=".9" fill="#d9a85a" />
      ))}
    </g>
  );
}

function SunflowerScene() {
  const L = '#7a9a4a';
  const corner = (
    <g>
      <Branch p0={[-6, 30]} p1={[70, 20]} p2={[150, 96]} n={4} size={1.2} fill="#8fae56" fill2={L} stroke="#5f7a34" />
      <Sunflower x={58} y={70} s={1.5} />
      <Sunflower x={130} y={34} s={0.85} />
      <Sunflower x={22} y={150} s={0.7} />
    </g>
  );
  const small = (
    <g>
      <Branch p0={[-6, 12]} p1={[50, 16]} p2={[112, 66]} n={3} size={1} fill="#8fae56" fill2={L} stroke="#5f7a34" />
      <Sunflower x={50} y={48} s={1.05} />
    </g>
  );
  return { top: <>{corner}{mirror(small)}</>, bottom: <>{rot180(small)}{mirror(rot180(corner))}</> };
}

function LavenderScene() {
  const set = (
    <g>
      <Lavender p0={[10, -6]} p1={[22, 60]} p2={[60, 128]} bud="#b8a3d8" bud2="#8a73ad" />
      <Lavender p0={[34, -6]} p1={[70, 40]} p2={[118, 84]} bud="#cbbde3" bud2="#9d86c4" />
      <Lavender p0={[-6, 20]} p1={[8, 90]} p2={[24, 170]} bud="#9d86c4" bud2="#cbbde3" />
      <Leaf x={20} y={14} r={150} s={0.8} fill="#a9b894" />
      <Leaf x={46} y={8} r={130} s={0.7} fill="#c2cdb2" />
    </g>
  );
  const up = (
    <g>
      <Lavender p0={[16, 266]} p1={[26, 200]} p2={[58, 140]} bud="#b8a3d8" bud2="#8a73ad" />
      <Lavender p0={[40, 266]} p1={[74, 220]} p2={[116, 184]} bud="#cbbde3" bud2="#9d86c4" />
      <Lavender p0={[-4, 266]} p1={[6, 210]} p2={[18, 156]} bud="#9d86c4" bud2="#cbbde3" />
    </g>
  );
  return { top: <>{set}{mirror(set)}</>, bottom: <>{up}{mirror(up)}</> };
}

function PeonyScene() {
  const C = { base: '#f8c9bd', mid: '#ef9d8c', edge: '#c9655a' };
  const corner = (
    <g>
      <Branch p0={[-6, 28]} p1={[60, 22]} p2={[148, 100]} n={5} size={1.1} fill="#a9bf96" fill2="#7f9a6c" stroke="#6f8a5a" />
      <Rose x={64} y={72} s={1.8} {...C} />
      <Rose x={138} y={40} s={1.1} base="#fde5dc" mid="#f8c9bd" edge="#d9867a" />
      <Blossom x={30} y={150} s={1.1} petal="#fde5dc" center="#c9a26a" />
      <Blossom x={104} y={128} s={0.8} petal="#f8c9bd" center="#c9a26a" />
    </g>
  );
  const small = (
    <g>
      <Branch p0={[-6, 10]} p1={[50, 16]} p2={[110, 70]} n={4} size={0.9} fill="#a9bf96" fill2="#7f9a6c" stroke="#6f8a5a" />
      <Rose x={46} y={48} s={1.25} base="#fde5dc" mid="#f8c9bd" edge="#d9867a" />
    </g>
  );
  return { top: <>{corner}{mirror(small)}</>, bottom: <>{rot180(small)}{mirror(rot180(corner))}</> };
}

function ForestScene() {
  const fern = (
    <g>
      <Branch p0={[-6, -4]} p1={[110, 10]} p2={[190, 110]} n={13} size={0.8} spread={70} fill="#3f6b57" fill2="#5f8f73" stroke="#9cc2a5" sw={1} />
      <Branch p0={[-4, 10]} p1={[26, 80]} p2={[64, 170]} n={9} size={0.75} spread={70} fill="#4c7d65" fill2="#2f5645" stroke="#9cc2a5" sw={1} />
      <Branch p0={[30, -4]} p1={[80, 20]} p2={[120, 60]} n={6} size={0.6} spread={72} fill="#5f8f73" fill2="#3f6b57" stroke="#9cc2a5" sw={1} />
    </g>
  );
  const fly = [[60, 120], [150, 70], [210, 120], [300, 80], [110, 190], [340, 150]] as P[];
  return {
    top: <>{fern}{mirror(fern)}{fly.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.2} fill="#e6c76e" opacity=".8" />)}</>,
    bottom: <>{rot180(fern)}{mirror(rot180(fern))}</>,
  };
}

function VintageScene() {
  const C = '#8b6a4a';
  const corner = (
    <g stroke={C} fill="none" strokeWidth="1.1" strokeLinecap="round">
      <path d="M8 90 V8 H90" />
      <path d="M18 70 V18 H70" opacity=".6" />
      <path d="M26 26 C 56 26, 60 60, 40 62 C 26 63, 24 46, 38 46" />
      <path d="M26 26 C 26 56, 60 60, 62 40 C 63 26, 46 24, 46 38" opacity=".7" />
      <circle cx="8" cy="8" r="3" fill={C} stroke="none" />
      <path d="M70 40 C 84 36, 96 44, 100 56 C 88 58, 74 54, 70 40Z" />
      <path d="M40 70 C 36 84, 44 96, 56 100 C 58 88, 54 74, 40 70Z" />
    </g>
  );
  const seal = (
    <g transform="translate(200 40)" stroke={C} fill="none" strokeWidth="1">
      <circle r="16" />
      <circle r="12" opacity=".6" />
      <path d="M-6 3 C -6 -6, 0 -8, 0 -2 C 0 -8, 6 -6, 6 3 C 6 8, 0 11, 0 11 C 0 11, -6 8, -6 3Z" fill={C} opacity=".55" stroke="none" />
    </g>
  );
  return { top: <>{corner}{mirror(corner)}{seal}</>, bottom: <>{rot180(corner)}{mirror(rot180(corner))}</> };
}

function OceanScene() {
  const wave = (y: number, c: string, o: number, amp = 14) => (
    <path d={`M0 ${y} Q 50 ${y - amp} 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y} V0 H0Z`} fill={c} opacity={o} />
  );
  const shell = (
    <g transform="translate(300 40)">
      {[-50, -30, -10, 10, 30, 50].map((a) => (
        <path key={a} d="M0 0 L0 -26" stroke="#d0a35c" strokeWidth="1" transform={`rotate(${a})`} />
      ))}
      <path d="M-24 -16 Q 0 -40 24 -16 Q 0 -4 -24 -16Z" fill="#f6ecd9" stroke="#d0a35c" strokeWidth="1" opacity=".9" />
      <path d="M0 0 L-8 10 H8Z" fill="#f6ecd9" stroke="#d0a35c" strokeWidth="1" />
    </g>
  );
  const top = (
    <>
      {wave(46, '#a9d6e0', 0.55, 16)}
      {wave(32, '#6fb4c6', 0.55, 14)}
      {wave(18, '#3d8fa6', 0.6, 10)}
      <g transform="translate(64 90)">
        {[0, 72, 144, 216, 288].map((a) => (
          <path key={a} d="M0 0 L-4 -20 L0 -26 L4 -20Z" fill="#f2c6a0" stroke="#d99a6c" strokeWidth=".8" transform={`rotate(${a})`} />
        ))}
      </g>
      {shell}
    </>
  );
  const bottom = (
    <g transform="translate(0 260) scale(1 -1)">
      {wave(46, '#a9d6e0', 0.55, 16)}
      {wave(32, '#6fb4c6', 0.55, 14)}
      {wave(18, '#3d8fa6', 0.6, 10)}
    </g>
  );
  return { top, bottom };
}

function NoirScene() {
  const G = '#d4b56a';
  const corner = (
    <g fill="none" stroke={G} strokeWidth=".9">
      {[28, 46, 64, 82, 100].map((r, i) => (
        <path key={r} d={`M0 ${r} A${r} ${r} 0 0 0 ${r} 0`} opacity={1 - i * 0.14} />
      ))}
      <path d="M0 0 L110 110" opacity=".35" />
      <circle cx="0" cy="0" r="4" fill={G} stroke="none" />
    </g>
  );
  const bar = (
    <g stroke={G} strokeWidth=".8" opacity=".7">
      <path d="M150 30 H250" />
      <path d="M170 38 H230" />
      <rect x="196" y="12" width="8" height="8" transform="rotate(45 200 16)" fill="none" />
    </g>
  );
  return { top: <>{corner}{mirror(corner)}{bar}</>, bottom: <>{rot180(corner)}{mirror(rot180(corner))}</> };
}

const SCENES: Record<SceneKind, () => { top: ReactNode; bottom: ReactNode }> = {
  sage: SageScene,
  'dried-blue': DriedBlueScene,
  'minimal-green': MinimalGreenScene,
  magnolia: MagnoliaScene,
  spring: SpringScene,
  navy: NavyScene,
  rose: RoseScene,
  boho: BohoScene,
  royal: RoyalScene,
  sunflower: SunflowerScene,
  lavender: LavenderScene,
  peony: PeonyScene,
  forest: ForestScene,
  vintage: VintageScene,
  ocean: OceanScene,
  noir: NoirScene,
};

/** Top + bottom artwork for the hero (and the footer). Pure decoration → aria-hidden. */
export function Scene({ part }: { part: 'top' | 'bottom' }) {
  const theme = useTheme();
  const s = SCENES[theme.scene]();
  return (
    <svg className={`scene scene-${part}`} viewBox={VB} preserveAspectRatio="xMidYMin meet" aria-hidden="true" focusable="false">
      {part === 'top' ? s.top : s.bottom}
    </svg>
  );
}

/** Small ornament that separates sections (replaces the plain line). */
export function Band() {
  const theme = useTheme();
  const k = theme.scene;
  const g = 'var(--gold)';
  const s = 'var(--sage)';
  return (
    <div className="band" aria-hidden="true">
      <svg viewBox="0 0 220 24" fill="none">
        <path d="M10 12 H88" stroke={g} strokeWidth=".8" opacity=".7" />
        <path d="M132 12 H210" stroke={g} strokeWidth=".8" opacity=".7" />
        {(k === 'sage' || k === 'spring' || k === 'forest' || k === 'lavender') && (
          <>
            <Leaf x={100} y={14} r={-60} s={0.45} fill="var(--moss)" />
            <Leaf x={120} y={14} r={60} s={0.45} fill="var(--moss)" />
            <circle cx="110" cy="12" r="3" fill={g} />
          </>
        )}
        {(k === 'dried-blue' || k === 'boho') && (
          <>
            {[-10, 0, 10].map((d) => (
              <path key={d} d={`M${110 + d} 20 Q ${110 + d * 1.6} 10 ${110 + d * 2.2} 2`} stroke={k === 'boho' ? '#b9774f' : '#b79b78'} strokeWidth="1.1" />
            ))}
            <circle cx="110" cy="12" r="2" fill={s} />
          </>
        )}
        {(k === 'minimal-green' || k === 'vintage') && (
          <>
            <rect x="106" y="8" width="8" height="8" transform="rotate(45 110 12)" stroke={s} strokeWidth="1" />
          </>
        )}
        {(k === 'magnolia' || k === 'rose' || k === 'peony' || k === 'sunflower') && (
          <>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="110" cy="5" rx="3" ry="5.5" fill="var(--blush)" stroke={s} strokeWidth=".7" transform={`rotate(${a} 110 12)`} />
            ))}
            <circle cx="110" cy="12" r="2" fill={g} />
          </>
        )}
        {(k === 'navy' || k === 'royal' || k === 'noir' || k === 'ocean') && (
          <>
            <Sparkle x={110} y={12} s={0.95} fill={g} />
            <Sparkle x={94} y={12} s={0.4} fill={g} />
            <Sparkle x={126} y={12} s={0.4} fill={g} />
          </>
        )}
      </svg>
    </div>
  );
}
