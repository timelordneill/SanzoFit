import { Component, computed, inject, input, output, resource } from '@angular/core';
import { ColorTile } from '../color-tile/color-tile';
import { Color, rgbCss, toCmykString } from '../../models/color';
import { describeMatch, findClosestColorsToLab, Rgb } from '../../models/color-match';
import { DominantColor, findDominantColors } from '../../models/dominant-colors';
import { ColorsService } from '../../services/colors.service';
import { ImageSamplerService } from '../../services/image-sampler.service';

/** A palette color suggested for the photo. */
interface Suggestion {
  color: Color;
  /** The photo's own color (average of the cluster), shown next to the match. */
  sampleRgb: Rgb;
  deltaE: number;
  /** Fraction (0–1) of the garment covered by this color. */
  share: number;
  /** Value lines shown on the tile: CMYK, then share and match quality. */
  lines: string[];
}

/**
 * Analyses a photo as soon as it is set: finds its dominant colors (k-means on Lab,
 * background removed) and proposes the closest palette color for each. The user adds
 * suggestions via `colorChosen`; nothing is added automatically.
 *
 * Expects `ColorsService.loadColors()` to have been called by the host page.
 */
@Component({
  imports: [ColorTile],
  selector: 'app-photo-color-suggestions',
  styleUrl: './photo-color-suggestions.scss',
  templateUrl: './photo-color-suggestions.html',
})
export class PhotoColorSuggestions {
  private readonly colorsService = inject(ColorsService);
  private readonly sampler = inject(ImageSamplerService);

  /** The photo (a data URL). */
  readonly src = input.required<string>();

  /** Hex values already selected on the item, shown as "Added". */
  readonly selectedHexes = input<readonly string[]>([]);

  /** Emitted for each suggestion the user adds. */
  readonly colorChosen = output<Color>();

  /** The photo's dominant colors, re-analysed whenever `src` changes. */
  private readonly analysis = resource({
    params: () => this.src(),
    loader: async ({ params: src }): Promise<DominantColor[]> => {
      const { pixels, border } = await this.sampler.pixels(src);
      return findDominantColors(pixels, border);
    },
  });

  protected readonly state = computed(() =>
    this.analysis.isLoading() ? 'analysing' : this.analysis.error() ? 'error' : 'done',
  );

  private readonly dominant = computed(() =>
    this.analysis.hasValue() ? this.analysis.value() : [],
  );

  /** One suggestion per palette color; dominant colors that match the same one are combined. */
  protected readonly suggestions = computed<Suggestion[]>(() => {
    const palette = this.colorsService.colors();
    if (palette.length === 0) {
      return [];
    }
    const byHex = new Map<string, Suggestion>();
    for (const dominant of this.dominant()) {
      const [match] = findClosestColorsToLab(dominant.lab, palette, 1);
      const existing = byHex.get(match.color.hex);
      if (existing) {
        existing.share += dominant.share;
        existing.deltaE = Math.min(existing.deltaE, match.deltaE);
      } else {
        byHex.set(match.color.hex, {
          color: match.color,
          sampleRgb: dominant.rgb,
          deltaE: match.deltaE,
          share: dominant.share,
          lines: [],
        });
      }
    }
    return [...byHex.values()]
      .sort((a, b) => b.share - a.share)
      .map((s) => ({
        ...s,
        lines: [
          toCmykString(s.color),
          `≈ ${percent(s.share)}% of the item · ${describeMatch(s.deltaE)}`,
        ],
      }));
  });

  /** Suggestions that aren't selected yet. */
  protected readonly addable = computed(() =>
    this.suggestions().filter((s) => !this.isSelected(s.color)),
  );

  protected readonly rgbCss = rgbCss;

  protected isSelected(color: Color): boolean {
    return this.selectedHexes().includes(color.hex);
  }

  protected choose(color: Color): void {
    if (!this.isSelected(color)) {
      this.colorChosen.emit(color);
    }
  }

  protected addAll(): void {
    for (const suggestion of this.addable()) {
      this.colorChosen.emit(suggestion.color);
    }
  }
}

/** A share as a whole percentage, at least 1%. */
function percent(share: number): number {
  return Math.max(1, Math.round(share * 100));
}
