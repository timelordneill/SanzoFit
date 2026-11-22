import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ColorTile } from '../color-tile/color-tile';
import { Color, rgbCss, toCmykString } from '../../models/color';
import { describeMatch, findClosestColors, Rgb } from '../../models/color-match';
import { ColorsService } from '../../services/colors.service';
import { ImageSamplerService } from '../../services/image-sampler.service';

/** Where the user clicked, as a percentage of the displayed photo (for the marker). */
interface Marker {
  x: number;
  y: number;
}

/**
 * Lets the user click a spot on a photo; the color there (averaged over a few pixels)
 * is matched to the closest colors from colors.json using CIEDE2000, and the user
 * can add a match via `colorChosen`.
 *
 * The photo is shown uncropped so click positions map directly to image pixels.
 * Expects `ColorsService.loadColors()` to have been called by the host page.
 */
@Component({
  imports: [ColorTile],
  selector: 'app-image-color-picker',
  styleUrl: './image-color-picker.scss',
  templateUrl: './image-color-picker.html',
})
export class ImageColorPicker {
  private readonly colorsService = inject(ColorsService);
  private readonly sampler = inject(ImageSamplerService);

  /** The photo (a data URL). */
  readonly src = input.required<string>();

  /** Hex values already selected on the item, shown as "Added". */
  readonly selectedHexes = input<readonly string[]>([]);

  /** Emitted when the user adds one of the matches. */
  readonly colorChosen = output<Color>();

  protected readonly marker = signal<Marker | null>(null);
  protected readonly sampled = signal<Rgb | null>(null);
  protected readonly error = signal<string | null>(null);

  /** The closest palette colors, each with the value lines its tile shows. */
  protected readonly matches = computed(() => {
    const rgb = this.sampled();
    return (rgb ? findClosestColors(rgb, this.colorsService.colors(), 3) : []).map((match) => ({
      ...match,
      lines: [
        toCmykString(match.color),
        `${describeMatch(match.deltaE)} · ΔE ${match.deltaE.toFixed(1)}`,
      ],
    }));
  });

  protected readonly sampledCss = computed(() => {
    const rgb = this.sampled();
    return rgb ? rgbCss(rgb) : null;
  });

  protected readonly sampledLabel = computed(() => {
    const rgb = this.sampled();
    return rgb ? `R${rgb[0]} G${rgb[1]} B${rgb[2]}` : '';
  });

  constructor() {
    // A new photo invalidates the previous pick.
    effect(() => {
      this.src();
      this.marker.set(null);
      this.sampled.set(null);
      this.error.set(null);
    });
  }

  protected async pick(event: MouseEvent): Promise<void> {
    const image = event.currentTarget as HTMLImageElement;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height || !image.naturalWidth) {
      return; // not rendered or not loaded yet
    }

    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;
    this.marker.set({ x: xRatio * 100, y: yRatio * 100 });
    this.error.set(null);

    try {
      this.sampled.set(
        await this.sampler.sample(
          this.src(),
          xRatio * image.naturalWidth,
          yRatio * image.naturalHeight,
        ),
      );
    } catch {
      this.sampled.set(null);
      this.error.set('Could not read the color from this photo.');
    }
  }

  protected isSelected(color: Color): boolean {
    return this.selectedHexes().includes(color.hex);
  }

  protected choose(color: Color): void {
    if (!this.isSelected(color)) {
      this.colorChosen.emit(color);
    }
  }
}
