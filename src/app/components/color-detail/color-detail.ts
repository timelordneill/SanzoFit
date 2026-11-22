import { Component, input } from '@angular/core';
import { Color, toCssColor } from '../../models/color';
import { ColorCombination } from '../color-combination/color-combination';

/**
 * Shows a color (large swatch, name, hex/RGB) and every combination it belongs to,
 * one `ColorCombination` row per combination.
 *
 * Expects `ColorsService.loadColors()` to have been called by the host page.
 */
@Component({
  imports: [ColorCombination],
  selector: 'app-color-detail',
  styleUrl: './color-detail.scss',
  templateUrl: './color-detail.html',
})
export class ColorDetail {
  readonly color = input.required<Color>();

  /**
   * Heading level of the color name (2 on its own page, 3 when nested under another
   * heading, e.g. on a wardrobe item). Combination titles use the next level.
   */
  readonly headingLevel = input(2);

  protected readonly swatchColor = toCssColor;
}
