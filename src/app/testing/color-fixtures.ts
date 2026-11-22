import { Color, colorProperties } from '../models/color';

/**
 * Builds a `Color` for tests. Only pass what the test cares about; everything else
 * gets a neutral default, and `properties` is derived from `lab` like the real loader
 * does. New model fields only need a default here, not in every spec.
 */
export function makeColor(overrides: Partial<Color> = {}): Color {
  const lab = overrides.lab ?? [50, 0, 0];
  return {
    id: 0,
    name: overrides.hex ?? 'Test color',
    hex: '#000000',
    combinations: [],
    cmyk: [0, 0, 0, 0],
    rgb: [0, 0, 0],
    ...overrides,
    lab,
    properties: overrides.properties ?? colorProperties(lab),
  };
}
