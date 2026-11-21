import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WardrobeItemTile } from '../../components/wardrobe-item-tile/wardrobe-item-tile';
import { Color } from '../../models/color';
import { WardrobeItem } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { WardrobeService } from '../../services/wardrobe.service';

type LoadState = 'loading' | 'loaded' | 'error';

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
  protected readonly state = signal<LoadState>('loading');

  constructor() {
    this.colorsService.loadColors();
    this.wardrobeService.load().then(
      () => this.state.set('loaded'),
      () => this.state.set('error'),
    );
  }

  /** Resolves the item's stored hex values to colors, skipping unknown ones. */
  protected colorsOf(item: WardrobeItem): Color[] {
    const byHex = this.colorsService.byHex();
    return item.colors.map((hex) => byHex.get(hex)).filter((c): c is Color => !!c);
  }
}
