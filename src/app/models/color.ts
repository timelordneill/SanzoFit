/** A single color entry from `src/assets/colors.json`. */
export interface Color {
  /** Display name, e.g. "Hermosa Pink". */
  name: string;
  /** Ids of the color combinations this color appears in. */
  combinations: number[];
  /** Index of the swatch group the color belongs to (0–5 in the current data). */
  swatch: number;
  /** CMYK values: [cyan, magenta, yellow, key], each 0–100. */
  cmyk: [c: number, m: number, y: number, k: number];
  /** CIELAB values: [lightness, a, b]. */
  lab: [l: number, a: number, b: number];
  /** RGB values: [red, green, blue], each 0–255. */
  rgb: [r: number, g: number, b: number];
  /** Hex color string, e.g. "#f9c1ce". */
  hex: string;
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

/** CSS color string built from the color's RGB values, e.g. "rgb(249, 193, 206)". */
export function toRgbString(color: Color): string {
  const [r, g, b] = color.rgb;
  return `rgb(${r}, ${g}, ${b})`;
}
