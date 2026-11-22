import { Color } from './color';
import { harmonyScore, NEAR_MATCH_MAX_SCORE } from './harmony';
import { WardrobeItem } from './wardrobe-item';

/** An item color that isn't in the combination but could stand in for one of its colors. */
export interface NearMatch {
  /** The matching item's own color. */
  hex: string;
  /** The combination color it stands in for. */
  standsInFor: string;
  /** Harmony score (lower is better), see `harmonyScore`. */
  score: number;
}

/** One color combination that links two wardrobe items. */
export interface MatchingCombination {
  /** Combination number. */
  id: number;
  /** All colors of the combination, in data order. */
  colors: Color[];
  /** Hex values of the combination's colors that the item being viewed has. */
  ownHexes: string[];
  /** Hex values of the combination's colors that the matching item has (exact matches). */
  matchHexes: string[];
  /** Set instead of `matchHexes` when the item only matches through a stand-in color. */
  nearMatch?: NearMatch;
}

export interface WardrobeMatchOptions {
  /**
   * Palette lookup by hex. When given, items without an exact color of a combination
   * can still match through a harmonious stand-in (a "near match").
   */
  byHex?: ReadonlyMap<string, Color>;
  /** Highest harmony score that counts as a near match. */
  maxNearScore?: number;
}

/** Another wardrobe item that can be combined with the item being viewed. */
export interface WardrobeMatch {
  item: WardrobeItem;
  combinations: MatchingCombination[];
}

/** A wardrobe item within a combination group, with the colors it brings to it. */
export interface CombinationGroupItem {
  item: WardrobeItem;
  /** Hex values of the combination's colors that this item has. */
  matchHexes: string[];
  /** Set when the item only fits through a stand-in color. */
  nearMatch?: NearMatch;
}

/** A color combination together with all wardrobe items that complete it. */
export interface CombinationGroup {
  /** Combination number. */
  id: number;
  /** All colors of the combination, in data order. */
  colors: Color[];
  /** Hex values of the combination's colors that the item being viewed has. */
  ownHexes: string[];
  items: CombinationGroupItem[];
}

/**
 * Regroups matches per combination: each group lists every item that forms that
 * combination with the item being viewed. An item can appear in several groups.
 *
 * Groups with the most exact items come first, then the most items overall, then by
 * combination number. Within a group, exact items come before near matches; otherwise
 * items keep the order of `matches`.
 */
export function groupMatchesByCombination(matches: readonly WardrobeMatch[]): CombinationGroup[] {
  const groups = new Map<number, CombinationGroup>();
  for (const match of matches) {
    for (const combination of match.combinations) {
      let group = groups.get(combination.id);
      if (!group) {
        group = {
          id: combination.id,
          colors: combination.colors,
          ownHexes: combination.ownHexes,
          items: [],
        };
        groups.set(combination.id, group);
      }
      group.items.push({
        item: match.item,
        matchHexes: combination.matchHexes,
        ...(combination.nearMatch ? { nearMatch: combination.nearMatch } : {}),
      });
    }
  }
  const exactCount = (group: CombinationGroup) => group.items.filter((i) => !i.nearMatch).length;
  for (const group of groups.values()) {
    // Stable sort: exact items first, near matches after.
    group.items.sort((a, b) => Number(!!a.nearMatch) - Number(!!b.nearMatch));
  }
  return [...groups.values()].sort(
    (a, b) => exactCount(b) - exactCount(a) || b.items.length - a.items.length || a.id - b.id,
  );
}

/**
 * Finds the other wardrobe items that form a color combination with `item`.
 *
 * An item matches when, for some combination, `item` has one of its colors and
 * the other item has a *different* color of that same combination (sharing the
 * exact same color is not a combination).
 *
 * With `options.byHex`, an item that has no exact color of the combination can still
 * match as a **near match**: one of its colors is a harmonious stand-in (see
 * `harmonyScore`: similar look, same value/contrast, temperature and saturation role)
 * for a combination color the viewed item doesn't provide. Only the best stand-in per
 * item and combination is kept, and only if it scores ≤ `maxNearScore`.
 *
 * Results are sorted by the number of exact combinations, then all combinations
 * (most first), then by name.
 */
export function findWardrobeMatches(
  item: WardrobeItem,
  allItems: readonly WardrobeItem[],
  combinations: ReadonlyMap<number, readonly Color[]>,
  options: WardrobeMatchOptions = {},
): WardrobeMatch[] {
  const { byHex, maxNearScore = NEAR_MATCH_MAX_SCORE } = options;
  const ownHexes = new Set(item.colors);

  // Combinations that contain at least one of the item's colors.
  const relevant = [...combinations].filter(([, colors]) =>
    colors.some((color) => ownHexes.has(color.hex)),
  );

  const matches: WardrobeMatch[] = [];
  for (const other of allItems) {
    if (other.id === item.id) {
      continue;
    }
    const otherHexes = new Set(other.colors);
    const linking: MatchingCombination[] = [];

    for (const [id, colors] of relevant) {
      const own = colors.filter((c) => ownHexes.has(c.hex)).map((c) => c.hex);
      // A different color of the combination than the one(s) we already contribute.
      const theirs = colors
        .filter((c) => otherHexes.has(c.hex) && !own.includes(c.hex))
        .map((c) => c.hex);
      if (theirs.length > 0) {
        linking.push({ id, colors: [...colors], ownHexes: own, matchHexes: theirs });
        continue;
      }

      const nearMatch = byHex && bestNearMatch(other, colors, own, byHex, maxNearScore);
      if (nearMatch) {
        linking.push({ id, colors: [...colors], ownHexes: own, matchHexes: [], nearMatch });
      }
    }

    if (linking.length > 0) {
      matches.push({ item: other, combinations: linking.sort((a, b) => a.id - b.id) });
    }
  }

  const exact = (match: WardrobeMatch) => match.combinations.filter((c) => !c.nearMatch).length;
  return matches.sort(
    (a, b) =>
      exact(b) - exact(a) ||
      b.combinations.length - a.combinations.length ||
      a.item.name.localeCompare(b.item.name),
  );
}

/**
 * The best stand-in one of `other`'s colors offers for a combination color that the
 * viewed item doesn't already provide, if it scores well enough.
 */
function bestNearMatch(
  other: WardrobeItem,
  combination: readonly Color[],
  ownHexes: readonly string[],
  byHex: ReadonlyMap<string, Color>,
  maxScore: number,
): NearMatch | undefined {
  const members = new Set(combination.map((c) => c.hex));
  const targets = combination.filter((c) => !ownHexes.includes(c.hex));
  let best: NearMatch | undefined;

  for (const hex of other.colors) {
    const candidate = byHex.get(hex);
    // Colors in the combination would be exact matches; the viewed item's own colors
    // can't pair with themselves.
    if (!candidate || members.has(hex) || ownHexes.includes(hex)) {
      continue;
    }
    for (const target of targets) {
      const { score } = harmonyScore(target, candidate, combination);
      if (score <= maxScore && (!best || score < best.score)) {
        best = { hex, standsInFor: target.hex, score };
      }
    }
  }
  return best;
}
