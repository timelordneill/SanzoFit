import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ColorCombination } from '../../components/color-combination/color-combination';
import { ColorDetail } from '../../components/color-detail/color-detail';
import { Color, toRgbString } from '../../models/color';
import {
  CombinationGroup,
  findWardrobeMatches,
  groupMatchesByCombination,
} from '../../models/wardrobe-match';
import { ColorsService } from '../../services/colors.service';
import { WardrobeService } from '../../services/wardrobe.service';

@Component({
  imports: [RouterLink, ColorDetail, ColorCombination],
  selector: 'app-wardrobe-item-detail',
  styleUrl: './wardrobe-item-detail.scss',
  templateUrl: './wardrobe-item-detail.html',
})
export class WardrobeItemDetail {
  private readonly colorsService = inject(ColorsService);
  private readonly wardrobeService = inject(WardrobeService);

  /** Route parameter `:id`: the wardrobe item's id. */
  readonly id = input.required<string>();

  protected readonly item = resource({
    params: () => this.id(),
    loader: ({ params: id }) => this.wardrobeService.getById(id),
  });

  /** True when the API answered that the item does not exist. */
  protected readonly notFound = computed(() => {
    const error = this.item.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  protected readonly colorsLoaded = computed(() => this.colorsService.colors().length > 0);

  /** The item's colors, resolved from their stored hex values. */
  protected readonly colors = computed<Color[]>(() => {
    const item = this.item.hasValue() ? this.item.value() : undefined;
    const byHex = this.colorsService.byHex();
    return (item?.colors ?? []).map((hex) => byHex.get(hex)).filter((c): c is Color => !!c);
  });

  /** Whether the full wardrobe (needed for matching) has loaded. */
  protected readonly wardrobeState = signal<'loading' | 'loaded' | 'error'>('loading');

  /**
   * Combinations this item shares with other wardrobe items, each with the items
   * that complete it.
   */
  protected readonly matchGroups = computed<CombinationGroup[]>(() => {
    if (!this.item.hasValue() || this.wardrobeState() !== 'loaded') {
      return [];
    }
    const matches = findWardrobeMatches(
      this.item.value(),
      this.wardrobeService.items(),
      this.colorsService.combinations(),
    );
    return groupMatchesByCombination(matches);
  });

  protected readonly rgb = toRgbString;

  constructor() {
    this.colorsService.loadColors();
    this.wardrobeService.load().then(
      () => this.wardrobeState.set('loaded'),
      () => this.wardrobeState.set('error'),
    );
  }

  /** This item's color within the group's combination, highlighted in the strip. */
  protected ownColor(group: CombinationGroup): Color | undefined {
    return this.colorsService.byHex().get(group.ownHexes[0]);
  }

  /** Resolves hex values to colors, skipping unknown ones. */
  protected colorsFor(hexes: readonly string[]): Color[] {
    const byHex = this.colorsService.byHex();
    return hexes.map((hex) => byHex.get(hex)).filter((c): c is Color => !!c);
  }
}
