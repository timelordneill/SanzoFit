import { Component, computed, input } from '@angular/core';
import { Color, toCmykString, toCssColor, toRgbLabel } from '../../models/color';

/**
 * A color in the style of the book's color index: a flat swatch, the name, small
 * value lines underneath, and a thin vertical rule closing the tile on the right.
 *
 * Used as an attribute so the host element can be whatever the page needs:
 *   <a appColorTile [color]="c" routerLink="…">        (link)
 *   <button appColorTile [color]="c" (click)="…">      (action; :disabled is styled)
 *   <div appColorTile swatch="rgb(…)" name="…">        (plain, e.g. a photo pixel)
 *
 * Extra content: an element marked `tileStart` goes before the swatch; anything else
 * goes after the text (e.g. an "+ Add" label).
 */
@Component({
  selector: '[appColorTile]',
  styleUrl: './color-tile.scss',
  templateUrl: './color-tile.html',
  host: {
    class: 'color-tile',
    '[class.tile-sm]': "size() === 'sm'",
    '[class.tile-lg]': "size() === 'lg'",
  },
})
export class ColorTile {
  /** The palette color. Optional when `swatch` and `name` are given instead. */
  readonly color = input<Color>();
  /** CSS color for the swatch; defaults to the color's (Lab-based) swatch color. */
  readonly swatch = input<string>();
  /** Text next to the swatch; defaults to the color's name. */
  readonly name = input<string>();
  /** Small lines under the name; defaults to the color's CMYK and RGB values. */
  readonly values = input<readonly string[]>();
  /** sm: 44px swatch, md: 48px, lg: 80px with larger text (the Colors page). */
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly swatchCss = computed(() => {
    const color = this.color();
    return this.swatch() ?? (color ? toCssColor(color) : 'transparent');
  });

  protected readonly displayName = computed(() => this.name() ?? this.color()?.name ?? '');

  protected readonly displayValues = computed(() => {
    const color = this.color();
    return this.values() ?? (color ? [toCmykString(color), toRgbLabel(color)] : []);
  });
}
