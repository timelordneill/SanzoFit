import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, toRgbString } from '../../models/color';
import { ColorsService } from '../../services/colors.service';

/** Where a color sits in the 4-color cross layout. */
type CrossPosition = 'top' | 'left' | 'right' | 'bottom';

interface CombinationMember {
  color: Color;
  /** Position in the colors list, used as the `/color/:id` route id. */
  index: number;
  /** Placement in the 4-color layout; undefined for 2 and 3 colors (side by side). */
  position?: CrossPosition;
}

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
  protected readonly displayNumber = computed(() =>
    String(this.combinationId()).padStart(3, '0'),
  );

  /** The combination's colors in display order, with their layout position. */
  protected readonly members = computed<CombinationMember[]>(() => {
    const colors = this.colorsService.colors();
    // The data lists colors in the reverse of the book's left-to-right order.
    const ordered = [...(this.colorsService.combinations().get(this.combinationId()) ?? [])]
      .reverse()
      .map((color) => ({ color, index: colors.indexOf(color) }));

    if (ordered.length !== 4) {
      return ordered;
    }
    // Book order for 4 colors (reversed data): middle band left, middle band right,
    // top, bottom. Return them in reading order: top, left, right, bottom.
    const [left, right, top, bottom] = ordered;
    return [
      { ...top, position: 'top' },
      { ...left, position: 'left' },
      { ...right, position: 'right' },
      { ...bottom, position: 'bottom' },
    ];
  });

  protected readonly layout = computed(() => `count-${this.members().length}`);

  protected readonly rgb = toRgbString;
}
