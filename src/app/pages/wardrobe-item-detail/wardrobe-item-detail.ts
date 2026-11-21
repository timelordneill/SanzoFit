import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ColorCombination } from '../../components/color-combination/color-combination';
import { ColorDetail } from '../../components/color-detail/color-detail';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { WardrobeItemTile } from '../../components/wardrobe-item-tile/wardrobe-item-tile';
import { Color, toCmykString, toRgbLabel, toRgbString } from '../../models/color';
import {
  CombinationGroup,
  findWardrobeMatches,
  groupMatchesByCombination,
} from '../../models/wardrobe-match';
import { ColorsService } from '../../services/colors.service';
import { WardrobeItemNotFoundError, WardrobeService } from '../../services/wardrobe.service';

@Component({
  imports: [RouterLink, ColorDetail, ColorCombination, ConfirmDialog, WardrobeItemTile],
  selector: 'app-wardrobe-item-detail',
  styleUrl: './wardrobe-item-detail.scss',
  templateUrl: './wardrobe-item-detail.html',
})
export class WardrobeItemDetail {
  private readonly colorsService = inject(ColorsService);
  private readonly wardrobeService = inject(WardrobeService);
  private readonly router = inject(Router);

  /** Whether the "are you sure?" popup for deleting is shown. */
  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  /** Route parameter `:id`: the wardrobe item's id. */
  readonly id = input.required<string>();

  protected readonly item = resource({
    params: () => this.id(),
    loader: ({ params: id }) => this.wardrobeService.getById(id),
  });

  /** True when no item with this id is stored. */
  protected readonly notFound = computed(
    () => this.item.error() instanceof WardrobeItemNotFoundError,
  );

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
  protected readonly cmyk = toCmykString;
  protected readonly rgbValues = toRgbLabel;

  constructor() {
    this.colorsService.loadColors();
    this.wardrobeService.load().then(
      () => this.wardrobeState.set('loaded'),
      () => this.wardrobeState.set('error'),
    );
  }

  protected askToDelete(): void {
    this.deleteError.set(null);
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  /** Deletes the item after confirmation and returns to the wardrobe. */
  protected async confirmDelete(): Promise<void> {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.wardrobeService.delete(this.id());
      this.confirmingDelete.set(false);
      await this.router.navigateByUrl('/wardrobe');
    } catch {
      this.deleteError.set('Could not delete the item. Please try again.');
    } finally {
      this.deleting.set(false);
    }
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
