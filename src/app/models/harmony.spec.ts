import { TestBed } from '@angular/core/testing';
import { ColorsService } from '../services/colors.service';
import { Color } from './color';
import { Lab } from './color-match';
import { colorProperties, findHarmoniousSubstitutes, harmonyScore } from './harmony';

function color(name: string, lab: Lab): Color {
  return {
    id: 0,
    name,
    hex: `#${name}`,
    lab: [...lab],
    combinations: [],
    swatch: 0,
    cmyk: [0, 0, 0, 0],
    rgb: [0, 0, 0],
    properties: colorProperties(lab),
  };
}

describe('colorProperties', () => {
  it('derives value, saturation and temperature from Lab', () => {
    const orange = colorProperties([65, 40, 60]);
    expect(orange.lightness).toBe(65);
    expect(orange.chroma).toBeCloseTo(72.1, 1);
    expect(orange.warmth).toBeGreaterThan(60); // clearly warm

    expect(colorProperties([45, 0, -50]).warmth).toBeLessThan(-30); // blue: cool
    expect(Math.abs(colorProperties([60, 1, 1]).warmth)).toBeLessThan(2); // grey: neutral
  });
});

describe('harmonyScore', () => {
  // A muted earthy tone next to a vivid accent, plus a light partner.
  const earthy = color('earthy', [45, 8, 15]); // muted warm brown
  const accent = color('accent', [55, 55, 45]); // vivid warm red-orange
  const cream = color('cream', [90, 0, 15]);
  const combination = [earthy, accent, cream];

  it('is zero for the target itself', () => {
    expect(harmonyScore(earthy, earthy, combination).score).toBe(0);
  });

  it('penalises turning the muted tone vivid (saturation balance)', () => {
    const similarMuted = color('similarMuted', [47, 10, 18]);
    const vivid = color('vivid', [47, 45, 45]);

    const keep = harmonyScore(earthy, similarMuted, combination);
    const lose = harmonyScore(earthy, vivid, combination);
    expect(keep.breakdown.roleChange).toBe(false);
    expect(lose.breakdown.roleChange).toBe(true);
    expect(lose.score).toBeGreaterThan(keep.score + 10);
  });

  it('penalises warm ↔ cool flips but not neutrals', () => {
    const cool = color('cool', [45, -10, -20]);
    const grey = color('grey', [45, 1, 2]);

    expect(harmonyScore(earthy, cool, combination).breakdown.temperatureFlip).toBe(true);
    expect(harmonyScore(earthy, grey, combination).breakdown.temperatureFlip).toBe(false);
  });

  it('penalises changing the light/dark order with a partner (contrast)', () => {
    const lighterThanAccent = color('light', [60, 8, 15]); // earthy was darker than accent

    const result = harmonyScore(earthy, lighterThanAccent, combination);
    expect(result.breakdown.contrastFlips).toBe(1);
    expect(result.breakdown.lightness).toBeCloseTo(10); // 15 lighter, 5 free
  });

  it('allows small lightness changes for free', () => {
    const slightlyLighter = color('slight', [49, 8, 15]);
    expect(harmonyScore(earthy, slightlyLighter, combination).breakdown.lightness).toBe(0);
  });

  it('has no saturation roles when all colors are similarly saturated', () => {
    const muted = [color('a', [40, 5, 10]), color('b', [70, 8, 12])];
    expect(harmonyScore(muted[0], color('c', [42, 15, 20]), muted).breakdown.roleChange).toBe(false);
  });
});

describe('findHarmoniousSubstitutes', () => {
  it('ranks stand-ins and skips colors already in the combination', async () => {
    const service = TestBed.inject(ColorsService);
    const palette = await service.loadColors();
    const combination = service.combinations().get(176)!; // Hermosa Pink, Seashell Pink, Calamine Blue
    const seashell = combination.find((c) => c.name === 'Seashell Pink')!;

    const substitutes = findHarmoniousSubstitutes(seashell, combination, palette, 3);

    expect(substitutes).toHaveLength(3);
    expect(substitutes[0].color.name).toBe('Light Pinkish Cinnamon');
    expect(substitutes.map((s) => s.color.hex)).not.toContain(seashell.hex);
    expect(substitutes.map((s) => s.score)).toEqual([...substitutes.map((s) => s.score)].sort((a, b) => a - b));
  });
});
