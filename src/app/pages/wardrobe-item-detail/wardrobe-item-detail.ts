import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ColorTile } from '../../components/color-tile/color-tile';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { MatchGroups } from '../../components/match-groups/match-groups';
import { MoreCombinations } from '../../components/more-combinations/more-combinations';
import { Color, resolveColors } from '../../models/color';
import {
  CombinationGroup,
  findWardrobeMatches,
  groupMatchesByCombination,
} from '../../models/wardrobe-match';
import { ColorsService } from '../../services/colors.service';
import { WardrobeItemNotFoundError, WardrobeService } from '../../services/wardrobe.service';

@Component({
  imports: [RouterLink, ColorTile, ConfirmDialog, MatchGroups, MoreCombinations],
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
    return resolveColors(item?.colors ?? [], this.colorsService.byHex());
  });

  /** The full wardrobe, needed to find matching items. */
  private readonly wardrobe = resource({ loader: () => this.wardrobeService.load() });

  protected readonly wardrobeState = computed(() =>
    this.wardrobe.isLoading() ? 'loading' : this.wardrobe.error() ? 'error' : 'loaded',
  );

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
      // Also include items whose color can harmoniously stand in for a combination color.
      { byHex: this.colorsService.byHex() },
    );
    return groupMatchesByCombination(matches);
  });

  /** Combinations already shown under "Goes well with", not repeated further down. */
  protected readonly shownCombinationIds = computed(() => this.matchGroups().map((g) => g.id));

  constructor() {
    this.colorsService.loadColors();
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
}
