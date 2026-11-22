import { Component, computed, inject, input } from '@angular/core';
import { Color, resolveColors } from '../../models/color';
import { CombinationGroup, CombinationGroupItem } from '../../models/wardrobe-match';
import { ColorsService } from '../../services/colors.service';
import { ColorCombination } from '../color-combination/color-combination';
import { WardrobeItemTile } from '../wardrobe-item-tile/wardrobe-item-tile';

/**
 * The "Goes well with" list on a wardrobe item: one combination plate per group,
 * with the wardrobe items that complete it hanging below on a continuous rule.
 * Near matches (stand-in colors) are explained with a note and a hint.
 *
 * Expects `ColorsService.loadColors()` to have been called by the host page.
 */
@Component({
  imports: [ColorCombination, WardrobeItemTile],
  selector: 'app-match-groups',
  styleUrl: './match-groups.scss',
  templateUrl: './match-groups.html',
})
export class MatchGroups {
  private readonly colorsService = inject(ColorsService);

  readonly groups = input.required<readonly CombinationGroup[]>();

  protected readonly hasNearMatches = computed(() =>
    this.groups().some((group) => group.items.some((entry) => entry.nearMatch)),
  );

  /** The viewed item's color within the group's combination, highlighted in the plate. */
  protected ownColor(group: CombinationGroup): Color | undefined {
    return this.colorsService.byHex().get(group.ownHexes[0]);
  }

  /** The color(s) an item brings to the combination (for a near match: its stand-in). */
  protected stripColors(entry: CombinationGroupItem): Color[] {
    const hexes = entry.nearMatch ? [entry.nearMatch.hex] : entry.matchHexes;
    return resolveColors(hexes, this.colorsService.byHex());
  }

  /** Explains a near match, e.g. "Near match: stands in for Seashell Pink". */
  protected nearMatchNote(entry: CombinationGroupItem): string | undefined {
    if (!entry.nearMatch) {
      return undefined;
    }
    const target = this.colorsService.byHex().get(entry.nearMatch.standsInFor);
    return `Near match: stands in for ${target?.name ?? 'a combination color'}`;
  }
}
