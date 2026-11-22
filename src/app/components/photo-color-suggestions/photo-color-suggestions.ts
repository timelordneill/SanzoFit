import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Color, toCmykString, toCssColor } from '../../models/color';
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
}

/**
 * Analyses a photo as soon as it is set: finds its dominant colors (k-means on Lab,
 * background removed) and proposes the closest palette color for each. The user adds
 * suggestions via `colorChosen`; nothing is added automatically.
 *
 * Expects `ColorsService.loadColors()` to have been called by the host page.
 */
@Component({
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

  protected readonly state = signal<'analysing' | 'done' | 'error'>('analysing');
  private readonly dominant = signal<DominantColor[]>([]);

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
        });
      }
    }
    return [...byHex.values()].sort((a, b) => b.share - a.share);
  });

  /** Suggestions that aren't selected yet. */
  protected readonly addable = computed(() =>
    this.suggestions().filter((s) => !this.isSelected(s.color)),
  );

  protected readonly swatchColor = toCssColor;
  protected readonly cmyk = toCmykString;
  protected readonly describe = describeMatch;

  /** Guards against an older, slower analysis overwriting a newer one. */
  private run = 0;

  constructor() {
    effect(() => {
      this.analyse(this.src());
    });
  }

  private async analyse(src: string): Promise<void> {
    const run = ++this.run;
    this.state.set('analysing');
    this.dominant.set([]);
    try {
      const { pixels, border } = await this.sampler.pixels(src);
      if (run !== this.run) return;
      this.dominant.set(findDominantColors(pixels, border));
      this.state.set('done');
    } catch {
      if (run !== this.run) return;
      this.state.set('error');
    }
  }

  protected sampleCss([r, g, b]: Rgb): string {
    return `rgb(${r}, ${g}, ${b})`;
  }

  protected percent(share: number): number {
    return Math.max(1, Math.round(share * 100));
  }

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
