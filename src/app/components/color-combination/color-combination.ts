import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Color, toRgbString } from '../../models/color';
import { ColorsService } from '../../services/colors.service';

interface CombinationMember {
  color: Color;
  /** Position in the colors list, used as the `/color/:id` route id. */
  index: number;
}

/**
 * One color combination: a title ("Combination N") and a strip of its colors with
 * their names. Colors link to their own page, except `current` (the color being
 * viewed), which is shown in bold without a link.
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

  /** Heading level of the "Combination N" title. */
  readonly headingLevel = input(3);

  protected readonly members = computed<CombinationMember[]>(() => {
    const colors = this.colorsService.colors();
    return (this.colorsService.combinations().get(this.combinationId()) ?? []).map((color) => ({
      color,
      index: colors.indexOf(color),
    }));
  });

  protected readonly rgb = toRgbString;
}
