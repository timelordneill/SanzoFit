import { Injectable } from '@angular/core';
import { Rgb } from '../models/color-match';

/**
 * Reads colors from an image by drawing it onto an off-screen canvas.
 * Works for the app's own photos (same-origin data URLs), which don't "taint" the canvas.
 *
 * Kept as a service so component tests can replace it (jsdom has no canvas).
 */
@Injectable({ providedIn: 'root' })
export class ImageSamplerService {
  private cached?: { src: string; context: Promise<CanvasRenderingContext2D> };

  /**
   * The average color of a small square around (x, y), in the image's own pixel
   * coordinates. Averaging smooths out fabric texture and JPEG noise.
   */
  async sample(src: string, x: number, y: number, radius = 3): Promise<Rgb> {
    const context = await this.contextFor(src);
    const { width, height } = context.canvas;

    const left = clamp(Math.round(x) - radius, 0, width - 1);
    const top = clamp(Math.round(y) - radius, 0, height - 1);
    const right = clamp(Math.round(x) + radius, 0, width - 1);
    const bottom = clamp(Math.round(y) + radius, 0, height - 1);

    const { data } = context.getImageData(left, top, right - left + 1, bottom - top + 1);
    let r = 0;
    let g = 0;
    let b = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    return [Math.round(r / pixels), Math.round(g / pixels), Math.round(b / pixels)];
  }

  /**
   * All pixels of a scaled-down copy of the image (longest side at most `maxSize`),
   * split into the inner area and the frame along the edges (`borderFraction` of the
   * width/height on each side), which is used to estimate the background.
   * Mostly transparent pixels are skipped.
   */
  async pixels(
    src: string,
    maxSize = 100,
    borderFraction = 0.08,
  ): Promise<{ pixels: Rgb[]; border: Rgb[] }> {
    const image = await this.load(src);
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Canvas is not supported');
    }
    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);

    const borderX = Math.max(1, Math.round(width * borderFraction));
    const borderY = Math.max(1, Math.round(height * borderFraction));
    const pixels: Rgb[] = [];
    const border: Rgb[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128) {
          continue;
        }
        const rgb: Rgb = [data[i], data[i + 1], data[i + 2]];
        const onEdge = x < borderX || x >= width - borderX || y < borderY || y >= height - borderY;
        (onEdge ? border : pixels).push(rgb);
      }
    }
    // Very small images: everything is "edge"; analyse it all anyway.
    return { pixels: pixels.length ? pixels : border, border };
  }

  /** Draws the image once per source and reuses the canvas for later samples. */
  private contextFor(src: string): Promise<CanvasRenderingContext2D> {
    if (this.cached?.src !== src) {
      this.cached = { src, context: this.draw(src) };
    }
    return this.cached.context;
  }

  private async load(src: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
  }

  private async draw(src: string): Promise<CanvasRenderingContext2D> {
    const image = await this.load(src);

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Canvas is not supported');
    }
    context.drawImage(image, 0, 0);
    return context;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
