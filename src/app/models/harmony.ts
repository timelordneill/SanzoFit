import { Color } from './color';
import { deltaE2000, Lab } from './color-match';

/** A color described by the properties that matter for harmony. */
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

/** How a candidate's score breaks down (each part in ΔE-like units). */
export interface HarmonyBreakdown {
  /** Plain visual difference (ΔE₀₀). */
  deltaE: number;
  lightness: number;
  temperature: number;
  saturation: number;
  /** How many other combination colors the candidate swaps light/dark order with. */
  contrastFlips: number;
  /** Whether the candidate flips warm ↔ cool. */
  temperatureFlip: boolean;
  /** Whether the candidate changes muted ↔ vivid within the combination. */
  roleChange: boolean;
}

export interface HarmonyMatch {
  color: Color;
  /** Lower is better; 0 = the target itself. */
  score: number;
  breakdown: HarmonyBreakdown;
}

/**
 * Highest score that still counts as a "near match" stand-in. Calibrated on the
 * palette: the best substitute for a typical combination color scores ≈ 8 (median),
 * 75% score under ≈ 11; a single flip or role change adds 10 on top.
 */
export const NEAR_MATCH_MAX_SCORE = 12;

/** Tuning knobs, in ΔE-like units so they compare with ΔE₀₀. */
export const HARMONY_WEIGHTS = {
  /** Lightness differences up to this are free. */
  lightnessTolerance: 5,
  lightness: 1,
  /** Per other color whose light/dark order flips (changes the contrast). */
  contrastFlip: 10,
  /** Lightness gaps smaller than this don't count as an order. */
  contrastMinGap: 4,
  // Kept small: ΔE₀₀ already includes hue/chroma differences; the flip and role
  // penalties below carry the harmony rules.
  temperature: 0.2,
  /** Warm ↔ cool swap between two clearly chromatic colors. */
  temperatureFlip: 10,
  /** |warmth| below this is treated as neutral (no flip possible). */
  neutralWarmth: 8,
  saturation: 0.15,
  /** Muted ↔ vivid role change within the combination. */
  roleChange: 10,
  /** If the combination's chroma range is smaller than this, there are no roles. */
  minChromaSpread: 15,
} as const;

const toDeg = (rad: number) => (rad * 180) / Math.PI;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Temperature axis: warm points toward orange (Lab hue ≈ 60°), cool toward blue. */
const WARM_HUE = 60;

export function colorProperties([l, a, b]: Lab): ColorProperties {
  const chroma = Math.hypot(a, b);
  const angle = toDeg(Math.atan2(b, a));
  const hue = angle < 0 ? angle + 360 : angle;
  return { lightness: l, chroma, hue, warmth: chroma * Math.cos(toRad(hue - WARM_HUE)) };
}

type Role = 'muted' | 'vivid' | null;

/** Muted or vivid relative to the other colors of the combination; null if all are alike. */
function saturationRole(chroma: number, otherChromas: readonly number[]): Role {
  const all = [chroma, ...otherChromas];
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (max - min < HARMONY_WEIGHTS.minChromaSpread) {
    return null;
  }
  return (chroma - min) / (max - min) < 0.5 ? 'muted' : 'vivid';
}

/**
 * How well `candidate` could replace `target` inside `combination` without breaking
 * its harmony: it should look similar (ΔE₀₀), keep the value and temperature (so the
 * light/dark contrast and warm/cool feel stay), and keep the saturation balance (a
 * muted tone stays muted next to a vivid accent, and vice versa).
 */
export function harmonyScore(
  target: Color,
  candidate: Color,
  combination: readonly Color[],
): { score: number; breakdown: HarmonyBreakdown } {
  const w = HARMONY_WEIGHTS;
  const t = colorProperties(target.lab);
  const c = colorProperties(candidate.lab);
  const others = combination.filter((color) => color.hex !== target.hex).map((o) => colorProperties(o.lab));

  const deltaE = deltaE2000(target.lab, candidate.lab);

  // Value: small changes are fine; swapping light/dark order with a partner is not.
  const lightness = w.lightness * Math.max(0, Math.abs(c.lightness - t.lightness) - w.lightnessTolerance);
  const contrastFlips = others.filter((o) => {
    const before = t.lightness - o.lightness;
    const after = c.lightness - o.lightness;
    return Math.abs(before) >= w.contrastMinGap && Math.sign(before) !== Math.sign(after);
  }).length;

  // Temperature: neutrals have (almost) none, so they never "flip".
  const temperatureFlip =
    Math.abs(t.warmth) >= w.neutralWarmth &&
    Math.abs(c.warmth) >= w.neutralWarmth &&
    Math.sign(t.warmth) !== Math.sign(c.warmth);
  const temperature = w.temperature * Math.abs(c.warmth - t.warmth);

  // Saturation balance: keep the role (muted/vivid) relative to the other colors.
  const otherChromas = others.map((o) => o.chroma);
  const roleBefore = saturationRole(t.chroma, otherChromas);
  const roleAfter = saturationRole(c.chroma, otherChromas);
  const roleChange = roleBefore !== null && roleAfter !== null && roleBefore !== roleAfter;
  const saturation = w.saturation * Math.abs(c.chroma - t.chroma);

  const score =
    deltaE +
    lightness +
    w.contrastFlip * contrastFlips +
    temperature +
    (temperatureFlip ? w.temperatureFlip : 0) +
    saturation +
    (roleChange ? w.roleChange : 0);

  return {
    score,
    breakdown: { deltaE, lightness, temperature, saturation, contrastFlips, temperatureFlip, roleChange },
  };
}

/**
 * The candidates that could best stand in for `target` within `combination`,
 * best (lowest score) first. Candidates that already belong to the combination are
 * skipped: they are part of it, not substitutes.
 */
export function findHarmoniousSubstitutes(
  target: Color,
  combination: readonly Color[],
  candidates: readonly Color[],
  count = 3,
): HarmonyMatch[] {
  const members = new Set(combination.map((color) => color.hex));
  return candidates
    .filter((candidate) => !members.has(candidate.hex))
    .map((candidate) => ({ color: candidate, ...harmonyScore(target, candidate, combination) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count);
}
