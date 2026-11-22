import { Component, computed, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WardrobeItemTile } from '../../components/wardrobe-item-tile/wardrobe-item-tile';
import { Color, resolveColors } from '../../models/color';
import { WardrobeItem } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { WardrobeService } from '../../services/wardrobe.service';

@Component({
  imports: [RouterLink, WardrobeItemTile],
  selector: 'app-wardrobe',
  styleUrl: './wardrobe.scss',
  templateUrl: './wardrobe.html',
})
export class Wardrobe {
  private readonly colorsService = inject(ColorsService);
  private readonly wardrobeService = inject(WardrobeService);

  protected readonly items = this.wardrobeService.items;

  /** Loads the wardrobe; `items` (the service signal) holds the result. */
  private readonly wardrobe = resource({ loader: () => this.wardrobeService.load() });

  protected readonly state = computed(() =>
    this.wardrobe.isLoading() ? 'loading' : this.wardrobe.error() ? 'error' : 'loaded',
  );

  constructor() {
    this.colorsService.loadColors();
  }

  /** The item's colors, resolved from their stored hex values. */
  protected colorsOf(item: WardrobeItem): Color[] {
    return resolveColors(item.colors, this.colorsService.byHex());
  }
}
