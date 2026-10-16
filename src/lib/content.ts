import { DEFAULT_THEME, isThemeId } from './themes';

// Editable wedding content. Stored as JSON in wedding_settings.content (editable from /#/admin).
// DEFAULT_CONTENT is used for every field that has not been saved yet.

export interface FamilyInfo {
  title: string;
  parent1: string;
  parent2: string;
  address1: string;
  address2: string;
}
export interface TimelineItem {
  time: string;
  label: string;
}
export const HERO_LAYOUTS = ['bg', 'arch', 'oval', 'top'] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];
export const GALLERY_LAYOUTS = ['grid', 'coverflow', 'masonry', 'slider', 'mosaic'] as const;
export type GalleryLayout = (typeof GALLERY_LAYOUTS)[number];
export const SECTION_KEYS = ['family', 'event', 'map', 'timeline', 'gallery', 'wishes', 'gift'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export interface LayoutConfig {
  hero: HeroLayout;
  gallery: GalleryLayout;
  order: SectionKey[]; // display order of the middle sections
  hidden: SectionKey[]; // sections switched off
}
export const DEFAULT_LAYOUT: LayoutConfig = { hero: 'bg', gallery: 'grid', order: [...SECTION_KEYS], hidden: [] };

export function mergeLayout(raw: unknown): LayoutConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, all: readonly T[], d: T): T => (typeof v === 'string' && (all as readonly string[]).includes(v) ? (v as T) : d);
  const keys = (v: unknown): SectionKey[] =>
    Array.isArray(v) ? [...new Set(v.filter((k): k is SectionKey => (SECTION_KEYS as readonly string[]).includes(k as string)))] : [];
  const order = keys(o.order);
  SECTION_KEYS.forEach((k) => {
    if (!order.includes(k)) order.push(k);
  });
  return { hero: pick(o.hero, HERO_LAYOUTS, 'bg'), gallery: pick(o.gallery, GALLERY_LAYOUTS, 'grid'), order, hidden: keys(o.hidden) };
}

export interface WeddingContent {
  groom: string; // short names (hero, footer)
  bride: string;
  groomFull: string; // full names (family section)
  brideFull: string;
  groomRole: string;
  brideRole: string;
  eventDateTime: string; // "YYYY-MM-DDTHH:mm", Vietnam time (UTC+7)
  lunar: string;
  groomFamily: FamilyInfo;
  brideFamily: FamilyInfo;
  venueName1: string;
  venueName2: string;
  venueHall: string;
  venueAddress: string;
  mapQuery: string; // text used by the embedded map
  mapLink: string; // "Chỉ đường" link
  timeline: TimelineItem[];
  thanks: string;
  theme: string; // id from src/lib/themes.ts
  layout: LayoutConfig;
  heroImage: string; // optional background photo, path inside bucket wedding-media ("bg/…")
}

export const DEFAULT_CONTENT: WeddingContent = {
  groom: 'Thanh Hải',
  bride: 'Ánh Minh',
  groomFull: 'Vũ Thanh Hải',
  brideFull: 'Trần Ngọc Ánh Minh',
  groomRole: 'Trưởng nam',
  brideRole: 'Thứ nữ',
  eventDateTime: '2026-10-30T19:00',
  lunar: '(Nhằm ngày 21 tháng 09 năm Bính Ngọ)',
  groomFamily: {
    title: 'Nhà trai',
    parent1: 'Ông Vũ Ngọc Thanh',
    parent2: 'Bà Nguyễn Thị Mỹ Lệ',
    address1: '10.01 Thái An 3A, Nguyễn Văn Quá,',
    address2: 'Đông Hưng Thuận, TP.HCM',
  },
  brideFamily: {
    title: 'Nhà gái',
    parent1: 'Ông Trần Anh Hùng',
    parent2: 'Bà Phùng Thị Đặt',
    address1: '35/1 Phan Văn Hớn,',
    address2: 'Đông Hưng Thuận, TP.HCM',
  },
  venueName1: 'TT Hội nghị & Tiệc cưới Pavillon',
  venueName2: 'Tân Sơn Nhất',
  venueHall: 'Sảnh Amber — Tầng 4',
  venueAddress: '202 Đường Hoàng Văn Thụ, Đức Nhuận, TP.HCM',
  mapQuery: 'Pavillon Tân Sơn Nhất, 202 Đường Hoàng Văn Thụ, Đức Nhuận, TP.HCM',
  mapLink: 'https://maps.app.goo.gl/Drod4QvtFB73pLS58',
  timeline: [
    { time: '18:00', label: 'Đón khách' },
    { time: '18:30', label: 'Khai tiệc' },
    { time: '18:45', label: 'Rót rượu, cắt bánh' },
    { time: '19:00', label: 'Phục vụ món chính' },
    { time: '21:00', label: 'Kết thúc tiệc' },
  ],
  thanks: 'Sự hiện diện của quý khách\nlà niềm vinh hạnh của gia đình chúng tôi!',
  theme: DEFAULT_THEME,
  heroImage: '',
  layout: DEFAULT_LAYOUT,
};

export const CONTENT_LIMITS = { short: 80, long: 200, thanks: 400, timeline: 12, url: 500 };

const str = (v: unknown, d: string, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : d);

function family(v: unknown, d: FamilyInfo): FamilyInfo {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    title: str(o.title, d.title, 40),
    parent1: str(o.parent1, d.parent1, 80),
    parent2: str(o.parent2, d.parent2, 80),
    address1: str(o.address1, d.address1, 120),
    address2: str(o.address2, d.address2, 120),
  };
}

/** Accepts anything coming from the database and always returns a complete, safe object. */
export function mergeContent(raw: unknown): WeddingContent {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const D = DEFAULT_CONTENT;
  let timeline = D.timeline;
  if (Array.isArray(o.timeline)) {
    timeline = o.timeline
      .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object')
      .slice(0, CONTENT_LIMITS.timeline)
      .map((t) => ({ time: str(t.time, '', 10), label: str(t.label, '', 80) }));
  }
  const dt = str(o.eventDateTime, D.eventDateTime, 16);
  return {
    groom: str(o.groom, D.groom, 40),
    bride: str(o.bride, D.bride, 40),
    groomFull: str(o.groomFull, D.groomFull, 60),
    brideFull: str(o.brideFull, D.brideFull, 60),
    groomRole: str(o.groomRole, D.groomRole, 40),
    brideRole: str(o.brideRole, D.brideRole, 40),
    eventDateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt) ? dt : D.eventDateTime,
    lunar: str(o.lunar, D.lunar, 100),
    groomFamily: family(o.groomFamily, D.groomFamily),
    brideFamily: family(o.brideFamily, D.brideFamily),
    venueName1: str(o.venueName1, D.venueName1, 80),
    venueName2: str(o.venueName2, D.venueName2, 80),
    venueHall: str(o.venueHall, D.venueHall, 80),
    venueAddress: str(o.venueAddress, D.venueAddress, 160),
    mapQuery: str(o.mapQuery, D.mapQuery, 200),
    mapLink: str(o.mapLink, D.mapLink, CONTENT_LIMITS.url),
    timeline,
    thanks: str(o.thanks, D.thanks, CONTENT_LIMITS.thanks),
    theme: isThemeId(o.theme) ? o.theme : D.theme,
    layout: mergeLayout(o.layout),
    heroImage: typeof o.heroImage === 'string' && /^bg\/[A-Za-z0-9._-]{1,100}$/.test(o.heroImage) ? o.heroImage : '',
  };
}

/** Only plain https links are ever used as hrefs (blocks javascript: and similar). */
export function safeHttpUrl(u: string): string | null {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const p2 = (n: number) => String(n).padStart(2, '0');

export interface DerivedEvent {
  year: number;
  month: number;
  day: number;
  dateLine: string;
  weekdayLine: string;
  time: string;
  iso: string; // with +07:00 for the countdown
  calStart: string;
  calEnd: string;
}

/** Everything date-related is derived from the single date/time field, in Vietnam time. */
export function deriveEvent(c: WeddingContent): DerivedEvent {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(c.eventDateTime) ?? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(DEFAULT_CONTENT.eventDateTime)!;
  const [y, mo, d, hh, mi] = m.slice(1).map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  const fmt = (t: Date) =>
    `${t.getUTCFullYear()}${p2(t.getUTCMonth() + 1)}${p2(t.getUTCDate())}T${p2(t.getUTCHours())}${p2(t.getUTCMinutes())}00`;
  const start = new Date(Date.UTC(y, mo - 1, d, hh, mi));
  const end = new Date(start.getTime() + 150 * 60000); // 2.5 h event
  return {
    year: y,
    month: mo,
    day: d,
    dateLine: `${p2(d)} · ${p2(mo)} · ${y}`,
    weekdayLine: `${wd}, ${d} tháng ${mo}`,
    time: `${p2(hh)}:${p2(mi)}`,
    iso: `${c.eventDateTime}:00+07:00`,
    calStart: fmt(start),
    calEnd: fmt(end),
  };
}
