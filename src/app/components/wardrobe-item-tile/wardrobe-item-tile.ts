import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, toCssColor } from '../../models/color';
import { WardrobeItem } from '../../models/wardrobe-item';

/**
 * A wardrobe item as a link to its detail page, styled like the Home page color
 * tiles: photo (or placeholder), a narrow strip of colors, name and type, and a thin
 * vertical rule on the right.
 *
 * The photo width can be changed with the `--tile-image-width` CSS variable
 * (default 112px); the color strip always matches the photo's height.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-wardrobe-item-tile',
  styleUrl: './wardrobe-item-tile.scss',
  templateUrl: './wardrobe-item-tile.html',
})
export class WardrobeItemTile {
  readonly item = input.required<WardrobeItem>();

  /** Colors shown in the strip (e.g. all of the item's colors, or the relevant ones). */
  readonly colors = input<Color[]>([]);

  protected readonly swatchColor = toCssColor;
}
