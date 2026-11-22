import { TestBed } from '@angular/core/testing';
import { ColorsService } from '../services/colors.service';
import { findClosestColorsToLab, Rgb, rgbToLab } from './color-match';
import { estimateBackground, findDominantColors, kMeans } from './dominant-colors';

/** `count` copies of a color, each nudged a little (like texture/JPEG noise). */
function noisy([r, g, b]: Rgb, count: number, spread = 6): Rgb[] {
  return Array.from({ length: count }, (_, i) => {
    const n = ((i * 7919) % (2 * spread + 1)) - spread; // deterministic pseudo-noise
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    return [clamp(r + n), clamp(g - n), clamp(b + Math.round(n / 2))] as const;
  });
}

const WHITE: Rgb = [246, 246, 244];
const RED: Rgb = [200, 30, 40];
const NAVY: Rgb = [30, 40, 100];

describe('kMeans', () => {
  it('separates clearly distinct groups', () => {
    const points = [...noisy(RED, 50), ...noisy(NAVY, 30)].map(rgbToLab);
    const clusters = kMeans(points, 2);

    expect(clusters.map((c) => c.members.length).sort((a, b) => a - b)).toEqual([30, 50]);
  });

  it('is deterministic for the same seed', () => {
    const points = [...noisy(RED, 40), ...noisy(NAVY, 40), ...noisy(WHITE, 40)].map(rgbToLab);
    expect(kMeans(points, 4, { seed: 7 })).toEqual(kMeans(points, 4, { seed: 7 }));
  });

  it('returns fewer clusters than k when there are fewer distinct points', () => {
    const points = Array.from({ length: 10 }, () => rgbToLab(RED));
    expect(kMeans(points, 5)).toHaveLength(1);
  });

  it('handles no points', () => {
    expect(kMeans([], 3)).toEqual([]);
  });
});

describe('estimateBackground', () => {
  it('finds a plain background along the edges', () => {
    const background = estimateBackground([...noisy(WHITE, 90), ...noisy(RED, 10)])!;
    expect(background[0]).toBeGreaterThan(90); // very light
  });

  it('gives up when the edges are mixed (garment fills the frame)', () => {
    expect(estimateBackground([...noisy(WHITE, 50), ...noisy(RED, 50)])).toBeNull();
  });
});

describe('findDominantColors', () => {
  it('finds the garment colors and ignores a white background', () => {
    const pixels = [...noisy(WHITE, 500), ...noisy(RED, 300), ...noisy(NAVY, 200)];
    const border = noisy(WHITE, 200);

    const colors = findDominantColors(pixels, border);

    expect(colors).toHaveLength(2);
    expect(colors[0].rgb[0]).toBeGreaterThan(150); // red first (larger share)
    expect(colors[1].rgb[2]).toBeGreaterThan(80); // then navy
    expect(colors[0].share).toBeCloseTo(0.6, 1);
    expect(colors[1].share).toBeCloseTo(0.4, 1);
  });

  it('merges shades of the same fabric into one color', () => {
    const shade: Rgb = [185, 28, 37]; // slightly darker red
    const colors = findDominantColors([...noisy(RED, 200), ...noisy(shade, 200)], noisy(WHITE, 50));

    expect(colors).toHaveLength(1);
    expect(colors[0].share).toBeCloseTo(1);
  });

  it('drops tiny specks', () => {
    const colors = findDominantColors(
      [...noisy(RED, 485), ...noisy(NAVY, 15)], // navy is 3%
      noisy(WHITE, 50),
    );
    expect(colors).toHaveLength(1);
  });

  it('returns at most maxColors, largest first', () => {
    const palette: Rgb[] = [RED, NAVY, [240, 200, 20], [20, 150, 60], [140, 60, 160], [250, 140, 0]];
    const pixels = palette.flatMap((rgb, i) => noisy(rgb, 100 + i * 10, 3));

    const colors = findDominantColors(pixels, noisy(WHITE, 50), { maxColors: 4 });

    expect(colors).toHaveLength(4);
    const shares = colors.map((c) => c.share);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
  });

  it('keeps everything when there is no clear background', () => {
    const pixels = [...noisy(RED, 100), ...noisy(NAVY, 100)];
    const colors = findDominantColors(pixels, [...noisy(RED, 50), ...noisy(NAVY, 50)]);

    expect(colors).toHaveLength(2);
    expect(colors.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1);
  });

  it('returns nothing for a photo that is all background', () => {
    expect(findDominantColors(noisy(WHITE, 200), noisy(WHITE, 50))).toEqual([]);
  });

  it('is deterministic', () => {
    const pixels = [...noisy(WHITE, 300), ...noisy(RED, 200), ...noisy(NAVY, 100)];
    expect(findDominantColors(pixels, noisy(WHITE, 50))).toEqual(
      findDominantColors(pixels, noisy(WHITE, 50)),
    );
  });

  it('leads to sensible palette matches', async () => {
    const palette = await TestBed.inject(ColorsService).loadColors();
    const hermosaPink = palette.find((c) => c.name === 'Hermosa Pink')!;

    const [dominant] = findDominantColors(noisy(hermosaPink.rgb, 300), noisy(WHITE, 50));
    expect(findClosestColorsToLab(dominant.lab, palette, 1)[0].color.name).toBe('Hermosa Pink');
  });
});
