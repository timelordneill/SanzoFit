import { TestBed } from '@angular/core/testing';
import { ColorsService } from '../services/colors.service';
import { Color } from './color';
import { deltaE2000, describeMatch, findClosestColors, Lab, rgbToLab } from './color-match';

describe('rgbToLab', () => {
  it('converts the sRGB primaries and neutrals to their standard Lab values', () => {
    const close = (actual: Lab, expected: Lab) =>
      actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 1));

    close(rgbToLab([255, 255, 255]), [100, 0, 0]);
    close(rgbToLab([0, 0, 0]), [0, 0, 0]);
    close(rgbToLab([255, 0, 0]), [53.24, 80.09, 67.2]);
    close(rgbToLab([0, 0, 255]), [32.3, 79.19, -107.86]);
  });
});

describe('deltaE2000', () => {
  // Reference pairs from Sharma, Wu & Dalal (2005), table 1.
  const pairs: [Lab, Lab, number][] = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, -1, 2], [50, 0, 0], 2.3669],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[50, 2.5, 0], [50, 3.2592, 0.3350], 1.0],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
    [[90.9257, -0.5406, -0.9208], [88.6381, -0.8985, -0.7239], 1.5381],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ];

  it.each(pairs)('matches the published value for %j vs %j', (lab1, lab2, expected) => {
    expect(deltaE2000(lab1, lab2)).toBeCloseTo(expected, 4);
  });

  it('is zero for identical colors', () => {
    expect(deltaE2000([40, 10, -20], [40, 10, -20])).toBe(0);
  });
});

describe('findClosestColors', () => {
  let colors: Color[];
  const byName = (name: string) => colors.find((c) => c.name === name)!;

  beforeEach(async () => {
    colors = await TestBed.inject(ColorsService).loadColors();
  });

  it('finds a palette color from its own RGB value, nearest first', () => {
    const matches = findClosestColors(byName('Hermosa Pink').rgb, colors);

    expect(matches).toHaveLength(3);
    expect(matches[0].color.name).toBe('Hermosa Pink');
    expect(matches[0].deltaE).toBeLessThan(1);
    expect(matches[1].deltaE).toBeGreaterThanOrEqual(matches[0].deltaE);
    expect(matches[2].deltaE).toBeGreaterThanOrEqual(matches[1].deltaE);
  });

  it('returns the requested number of matches', () => {
    expect(findClosestColors([128, 128, 128], colors, 5)).toHaveLength(5);
  });

  it('matches a slightly off sample (e.g. photo noise) to the intended color', () => {
    const [r, g, b] = byName('Lemon Yellow').rgb;
    expect(findClosestColors([r - 4, g + 3, b + 5], colors)[0].color.name).toBe('Lemon Yellow');
  });

  it('compares against the stored, print-based Lab values', () => {
    // Peacock Blue's printed color lies outside what sRGB can show, so its own RGB
    // is noticeably far from its stored Lab value and may match another color first.
    const peacock = byName('Peacock Blue');
    const ownMatch = findClosestColors(peacock.rgb, colors, colors.length).find(
      (m) => m.color === peacock,
    )!;
    expect(ownMatch.deltaE).toBeGreaterThan(5);
  });
});

describe('describeMatch', () => {
  it('labels distances', () => {
    expect(describeMatch(1.2)).toBe('Very close');
    expect(describeMatch(5)).toBe('Close');
    expect(describeMatch(12)).toBe('Approximate');
  });
});
