import { computed, Injectable, signal } from '@angular/core';
import { Color, colorProperties } from '../models/color';

@Injectable({ providedIn: 'root' })
export class ColorsService {
  private readonly _colors = signal<Color[]>([]);
  private readonly _combinations = signal<ReadonlyMap<number, Color[]>>(new Map());

  /** The parsed colors. Empty until `loadColors()` has completed. */
  readonly colors = this._colors.asReadonly();

  /**
   * Combination number → its colors, **in the book's order** (from combinations.json):
   * left to right for 2 and 3 colors; top, middle left, middle right, bottom for 4.
   */
  readonly combinations = this._combinations.asReadonly();

  /** Hex value → color, for resolving colors stored by hex (e.g. on wardrobe items). */
  readonly byHex = computed(
    () => new Map(this.colors().map((color) => [color.hex, color] as const)),
  );

  /** Stable id (as used in `/color/:id`) → color. */
  readonly byId = computed(
    () => new Map(this.colors().map((color) => [color.id, color] as const)),
  );

  private loading?: Promise<Color[]>;

  /**
   * Loads and parses `src/assets/colors.json` and `combinations.json`, storing the
   * results in `colors` and `combinations`. The files are lazy-loaded as separate
   * chunks and only parsed once; later calls return the cached result.
   */
  loadColors(): Promise<Color[]> {
    this.loading ??= Promise.all([
      import('../../assets/colors.json'),
      import('../../assets/combinations.json'),
    ])
      .then(([colorsModule, combinationsModule]) => {
        const colors = (colorsModule.default as unknown[]).map(parseColor);
        const combinations = parseCombinations(combinationsModule.default as unknown[], colors);
        this._colors.set(colors);
        this._combinations.set(combinations);
        return colors;
      })
      .catch((error) => {
        this.loading = undefined; // allow a retry
        throw error;
      });
    return this.loading;
  }
}

function parseColor(raw: unknown): Color {
  const o = raw as Record<string, unknown>;
  const lab = toTuple(o['lab'], 3) as Color['lab'];
  return {
    id: toId(o['id']),
    name: String(o['name']),
    combinations: [], // filled from combinations.json, see parseCombinations
    cmyk: toTuple(o['cmyk'], 4) as Color['cmyk'],
    lab,
    rgb: toTuple(o['rgb'], 3) as Color['rgb'],
    hex: String(o['hex']),
    properties: colorProperties(lab),
  };
}

/**
 * Builds the combination map from combinations.json (the single source of
 * membership), resolving hex values to colors, and fills each color's
 * `combinations` (ascending ids). Throws if a combination names an unknown color
 * or lists a color twice.
 */
function parseCombinations(raw: unknown[], colors: Color[]): Map<number, Color[]> {
  const byHex = new Map(colors.map((color) => [color.hex, color]));
  const map = new Map<number, Color[]>();

  for (const entry of raw) {
    const o = entry as Record<string, unknown>;
    const id = toId(o['id']);
    const members = (Array.isArray(o['colors']) ? o['colors'] : []).map((hex) => {
      const color = byHex.get(String(hex));
      if (!color) {
        throw new Error(`Combination ${id} names unknown color ${String(hex)}`);
      }
      if (color.combinations.includes(id)) {
        throw new Error(`Combination ${id} lists ${color.name} twice`);
      }
      color.combinations.push(id);
      return color;
    });
    map.set(id, members);
  }

  for (const color of colors) {
    color.combinations.sort((a, b) => a - b);
  }
  return map;
}

function toId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 0) {
    throw new Error(`Invalid id ${JSON.stringify(value)}`);
  }
  return id;
}

function toNumbers(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number) : [];
}

function toTuple(value: unknown, length: number): number[] {
  const numbers = toNumbers(value);
  if (numbers.length !== length) {
    throw new Error(`Expected ${length} numbers, got ${JSON.stringify(value)}`);
  }
  return numbers;
}
