import { Injectable } from '@angular/core';

/** Largest width or height, in pixels, of a stored image. */
export const MAX_IMAGE_DIMENSION = 800;

/**
 * Shrinks image files in the browser so they can be stored inline (as data URLs)
 * in localStorage (which only holds about 5 MB) without filling it up.
 */
@Injectable({ providedIn: 'root' })
export class ImageResizeService {
  /**
   * Scales the image down so its longest side is at most `maxDimension`
   * (never up) and returns it as a JPEG data URL.
   */
  async toDataUrl(file: Blob, maxDimension = MAX_IMAGE_DIMENSION, quality = 0.85): Promise<string> {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not supported');
      }
      // JPEG has no transparency: paint a white background first.
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', quality);
    } finally {
      bitmap.close();
    }
  }
}
