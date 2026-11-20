import { Color } from './color';
import { WardrobeItem } from './wardrobe-item';

/** One color combination that links two wardrobe items. */
export interface MatchingCombination {
  /** Combination number. */
  id: number;
  /** All colors of the combination, in data order. */
  colors: Color[];
  /** Hex values of the combination's colors that the item being viewed has. */
  ownHexes: string[];
  /** Hex values of the combination's colors that the matching item has. */
  matchHexes: string[];
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
 * Groups with the most items come first, then by combination number; items keep
 * the order of `matches`.
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
      group.items.push({ item: match.item, matchHexes: combination.matchHexes });
    }
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length || a.id - b.id);
}

/**
 * Finds the other wardrobe items that form a color combination with `item`.
 *
 * An item matches when, for some combination, `item` has one of its colors and
 * the other item has a *different* color of that same combination (sharing the
 * exact same color is not a combination).
 *
 * Results are sorted by the number of matching combinations (most first), then by name.
 */
export function findWardrobeMatches(
  item: WardrobeItem,
  allItems: readonly WardrobeItem[],
  combinations: ReadonlyMap<number, readonly Color[]>,
): WardrobeMatch[] {
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
      }
    }

    if (linking.length > 0) {
      matches.push({ item: other, combinations: linking.sort((a, b) => a.id - b.id) });
    }
  }

  return matches.sort(
    (a, b) =>
      b.combinations.length - a.combinations.length || a.item.name.localeCompare(b.item.name),
  );
}
