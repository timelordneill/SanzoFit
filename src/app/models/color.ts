/** A color described by the properties that matter for harmony, derived from Lab. */
export interface ColorProperties {
  /** Value: 0 = black, 100 = white (Lab L). */
  lightness: number;
  /** Saturation: 0 = grey; ≲ 20 muted/earthy, ≳ 50 vivid (Lab chroma). */
  chroma: number;
  /** Hue angle in degrees (0–360) around the Lab a/b plane. */
  hue: number;
  /** Temperature: > 0 warm (reds/oranges/yellows), < 0 cool (blues), ≈ 0 neutral. */
  warmth: number;
}

/** A single color entry from `src/assets/colors.json`. */
export interface Color {
  /** Stable id, used in URLs (`/color/:id`). Doesn't change if the file is reordered. */
  id: number;
  /** Display name, e.g. "Hermosa Pink". */
  name: string;
  /** Ids of the color combinations this color appears in. */
  combinations: number[];
  /** CMYK values: [cyan, magenta, yellow, key], each 0–100. */
  cmyk: [c: number, m: number, y: number, k: number];
  /** CIELAB values: [lightness, a, b]. */
  lab: [l: number, a: number, b: number];
  /** RGB values: [red, green, blue], each 0–255. */
  rgb: [r: number, g: number, b: number];
  /** Hex color string, e.g. "#f9c1ce". */
  hex: string;
  /** Derived once at load from `lab` (not stored in the JSON), see `colorProperties`. */
  properties: ColorProperties;
}

/** Temperature axis: warm points toward orange (Lab hue ≈ 60°), cool toward blue. */
const WARM_HUE = 60;

/** Value, saturation, hue and temperature of a Lab color. */
export function colorProperties([l, a, b]: readonly [number, number, number]): ColorProperties {
  const chroma = Math.hypot(a, b);
  const angle = (Math.atan2(b, a) * 180) / Math.PI;
  const hue = angle < 0 ? angle + 360 : angle;
  const warmth = chroma * Math.cos(((hue - WARM_HUE) * Math.PI) / 180);
  return { lightness: l, chroma, hue, warmth };
}

/** CMYK values as printed in the book, e.g. "C0 M30 Y6 K0". */
export function toCmykString(color: Color): string {
  const [c, m, y, k] = color.cmyk;
  return `C${c} M${m} Y${y} K${k}`;
}

/** RGB values in the same style as `toCmykString`, e.g. "R249 G193 B206". */
export function toRgbLabel(color: Color): string {
  const [r, g, b] = color.rgb;
  return `R${r} G${g} B${b}`;
}

/** Whether the browser understands CSS `lab()` colors (all current major browsers do). */
const SUPPORTS_LAB =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('color', 'lab(50% 0 0)');

/**
 * The CSS color used to paint a swatch, built from the color's stored Lab values:
 * the book's printed (CMYK-based) color, e.g. "lab(83.43% 22.14 1.64)". The browser
 * maps colors a screen can't show to the nearest displayable one (and shows more of
 * them on wide-gamut screens). Falls back to the stored RGB in browsers without `lab()`.
 */
export function toCssColor(color: Color, labSupported = SUPPORTS_LAB): string {
  if (!labSupported) {
    return toRgbString(color);
  }
  const [l, a, b] = color.lab.map((v) => Math.round(v * 100) / 100);
  return `lab(${l}% ${a} ${b})`;
}

/** CSS color string built from the color's RGB values, e.g. "rgb(249, 193, 206)". */
export function toRgbString(color: Color): string {
  return rgbCss(color.rgb);
}

/** CSS color string for raw RGB values, e.g. a pixel sampled from a photo. */
export function rgbCss([r, g, b]: readonly [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Resolves stored hex values (e.g. on wardrobe items) to colors, skipping unknown ones. */
export function resolveColors(
  hexes: readonly string[],
  byHex: ReadonlyMap<string, Color>,
): Color[] {
  return hexes.map((hex) => byHex.get(hex)).filter((color): color is Color => !!color);
}
