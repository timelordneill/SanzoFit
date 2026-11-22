import { Color } from './color';

export type Rgb = readonly [r: number, g: number, b: number];
export type Lab = readonly [l: number, a: number, b: number];

/** A palette color and how far it is from the sampled color (CIEDE2000). */
export interface ColorMatch {
  color: Color;
  deltaE: number;
}

/**
 * Converts an sRGB color (0–255 per channel) to CIELAB, using the D65 white point.
 * Only photo samples are converted; palette colors use their stored `lab` values,
 * which describe the book's printed (CMYK) colors.
 */
export function rgbToLab([r, g, b]: Rgb): Lab {
  const linear = (channel: number) => {
    const v = channel / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];

  // Linear sRGB → XYZ, normalised by the D65 reference white.
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * CIEDE2000 color difference (ΔE₀₀) between two CIELAB colors: how different they
 * look to a person. Roughly: < 1 imperceptible, < 3 very close, > 10 clearly different.
 *
 * Implementation follows Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference
 * Formula: Implementation Notes", with kL = kC = kH = 1.
 */
export function deltaE2000([l1, a1, b1]: Lab, [l2, a2, b2]: Lab): number {
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cBar7 = ((c1 + c2) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));

  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);

  const hue = (b: number, ap: number) => {
    if (b === 0 && ap === 0) return 0;
    const h = toDeg(Math.atan2(b, ap));
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);

  const dLp = l2 - l1;
  const dCp = c2p - c1p;

  let dhp = 0;
  if (c1p * c2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(toRad(dhp / 2));

  const lBarP = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;

  let hBarP = h1p + h2p;
  if (c1p * c2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hBarP /= 2;
    else if (h1p + h2p < 360) hBarP = (hBarP + 360) / 2;
    else hBarP = (hBarP - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos(toRad(hBarP - 30)) +
    0.24 * Math.cos(toRad(2 * hBarP)) +
    0.32 * Math.cos(toRad(3 * hBarP + 6)) -
    0.2 * Math.cos(toRad(4 * hBarP - 63));

  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const cBarP7 = cBarP ** 7;
  const rC = 2 * Math.sqrt(cBarP7 / (cBarP7 + 25 ** 7));
  const sL = 1 + (0.015 * (lBarP - 50) ** 2) / Math.sqrt(20 + (lBarP - 50) ** 2);
  const sC = 1 + 0.045 * cBarP;
  const sH = 1 + 0.015 * cBarP * t;
  const rT = -Math.sin(toRad(2 * dTheta)) * rC;

  const l = dLp / sL;
  const c = dCp / sC;
  const h = dHp / sH;
  return Math.sqrt(l * l + c * c + h * h + rT * c * h);
}

/**
 * The palette colors closest to a sampled sRGB color, nearest first. The sample is
 * converted to Lab and compared with each color's stored (print-based) `lab` value.
 */
export function findClosestColors(
  rgb: Rgb,
  colors: readonly Color[],
  count = 3,
): ColorMatch[] {
  return findClosestColorsToLab(rgbToLab(rgb), colors, count);
}

/** Like `findClosestColors`, for a color that is already in Lab (e.g. a cluster center). */
export function findClosestColorsToLab(
  lab: Lab,
  colors: readonly Color[],
  count = 3,
): ColorMatch[] {
  return colors
    .map((color) => ({ color, deltaE: deltaE2000(lab, color.lab) }))
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, count);
}

/** A human-friendly description of a ΔE₀₀ distance. */
export function describeMatch(deltaE: number): 'Very close' | 'Close' | 'Approximate' {
  if (deltaE < 3) return 'Very close';
  if (deltaE < 8) return 'Close';
  return 'Approximate';
}
