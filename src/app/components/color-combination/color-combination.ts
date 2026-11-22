import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, toCssColor } from '../../models/color';
import { ColorsService } from '../../services/colors.service';

/** Where a color sits in the 4-color cross layout. */
type CrossPosition = 'top' | 'left' | 'right' | 'bottom';

interface CombinationMember {
  color: Color;
  /** Placement in the 4-color layout; undefined for 2 and 3 colors (side by side). */
  position?: CrossPosition;
}

/** combinations.json lists 4-color combinations in this reading order. */
const CROSS_ORDER: readonly CrossPosition[] = ['top', 'left', 'right', 'bottom'];

/**
 * One color combination in the style of the source book: a zero-padded number with
 * a vertical rule, the colors as touching blocks, and their names underneath.
 *
 * - 2 colors: two blocks side by side.
 * - 3 colors: three squares side by side.
 * - 4 colors: a cross: one block on top, a band of two in the middle, one below,
 *   with the names laid out the same way, separated by thin rules.
 *
 * Colors link to their own page, except `current` (the color being viewed), whose
 * name is shown in bold without a link.
 *
 * Expects `ColorsService.loadColors()` to have been called by the host page.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-color-combination',
  styleUrl: './color-combination.scss',
  templateUrl: './color-combination.html',
})
export class ColorCombination {
  private readonly colorsService = inject(ColorsService);

  /** The combination number. */
  readonly combinationId = input.required<number>();

  /** The color being viewed, highlighted and not linked. Optional. */
  readonly current = input<Color>();

  /** Heading level of the combination number. */
  readonly headingLevel = input(3);

  /** The number as printed in the book, e.g. 2 → "002". */
  protected readonly displayNumber = computed(() => String(this.combinationId()).padStart(3, '0'));

  /** The combination's colors in display order, with their layout position. */
  protected readonly members = computed<CombinationMember[]>(() => {
    // Already in book order (combinations.json): left to right, or for 4 colors
    // top, middle left, middle right, bottom.
    const colors = this.colorsService.combinations().get(this.combinationId()) ?? [];
    return colors.map((color, i) => ({
      color,
      position: colors.length === 4 ? CROSS_ORDER[i] : undefined,
    }));
  });

  protected readonly layout = computed(() => `count-${this.members().length}`);

  protected readonly swatchColor = toCssColor;
}
