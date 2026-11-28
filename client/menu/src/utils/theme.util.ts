// ============================================================
// Readable colours for any restaurant theme.
// Text, cards and borders are derived from the background colour so a dark
// background gets light text (and vice versa). Primary / secondary are only
// used as text when they stand out enough; otherwise we fall back to the
// normal text colour. Keep identical in client/menu and client/admin.
// ============================================================

type Rgb = [number, number, number];

export interface IReadablePalette {
  dark: boolean;
  /** Main text */
  ink: string;
  /** Secondary text (descriptions, sub-titles) */
  ink2: string;
  /** Faint text (counts, hints, placeholders) */
  ink3: string;
  /** Cards, buttons and chips that sit on the background */
  surface: string;
  /** Borders and dividers */
  line: string;
  /** Very light fill (search box, pressed states) */
  tint: string;
  /** Sticky bottom bar */
  bar: string;
  /** Text on a primary-coloured button */
  onPrimary: string;
  /** Primary used as text on a card (ADD, links) */
  primaryText: string;
  /** Secondary colour used for category headings */
  accent: string;
  /** False when the primary colour is too faint to use as text (ADD) on this background */
  primaryReadable: boolean;
  /** False when the secondary colour is too faint for headings on this background */
  accentReadable: boolean;
}

const WHITE: Rgb = [255, 255, 255];
const DARK_INK: Rgb = [17, 24, 39]; // #111827

const toRgb = (hex: string | undefined): Rgb | null => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};

const toHex = (rgb: Rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, 1 (none) … 21 (black on white). */
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
  from.map((v, i) => v + (to[i] - v) * amount) as Rgb;

export const readablePalette = (background: string, primary: string, secondary: string): IReadablePalette => {
  const bg = toRgb(background) ?? WHITE;
  const dark = contrast(bg, WHITE) > contrast(bg, DARK_INK);
  const surface = dark ? mix(bg, WHITE, 0.09) : WHITE;
  const ink = dark ? '#f5f5f5' : '#111827';
  const p = toRgb(primary);
  const s = toRgb(secondary);
  const primaryReadable = !!p && contrast(p, surface) >= 2.5;
  const accentReadable = !!s && contrast(s, bg) >= 3;

  return {
    dark,
    ink,
    ink2: dark ? 'rgba(255, 255, 255, 0.7)' : '#6b7280',
    ink3: dark ? 'rgba(255, 255, 255, 0.5)' : '#9ca3af',
    surface: toHex(surface),
    line: dark ? 'rgba(255, 255, 255, 0.14)' : '#e5e7eb',
    tint: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    bar: `rgba(${surface.map(Math.round).join(', ')}, 0.96)`,
    onPrimary: p && contrast(p, WHITE) < 2.2 ? '#111827' : '#ffffff',
    primaryText: p && primaryReadable ? toHex(p) : ink,
    accent: s && accentReadable ? toHex(s) : ink,
    primaryReadable,
    accentReadable,
  };
};
