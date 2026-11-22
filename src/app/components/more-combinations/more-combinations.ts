import { Component, computed, input } from '@angular/core';
import { Color } from '../../models/color';
import { ColorCombination } from '../color-combination/color-combination';

/**
 * Per color, its combination plates, under a small "With <color>" heading. Leaves out
 * `excludedCombinations` (e.g. those already shown elsewhere on the page), and lists a
 * combination containing several of the colors only once, under the first.
 */
@Component({
  imports: [ColorCombination],
  selector: 'app-more-combinations',
  styleUrl: './more-combinations.scss',
  templateUrl: './more-combinations.html',
})
export class MoreCombinations {
  readonly colors = input.required<readonly Color[]>();
  readonly excludedCombinations = input<readonly number[]>([]);

  protected readonly entries = computed(() => {
    const seen = new Set(this.excludedCombinations());
    return this.colors()
      .map((color) => {
        const ids = color.combinations.filter((id) => !seen.has(id));
        ids.forEach((id) => seen.add(id));
        return { color, ids };
      })
      .filter((entry) => entry.ids.length > 0);
  });
}
