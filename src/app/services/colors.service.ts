import { computed, Injectable, signal } from '@angular/core';
import { Color } from '../models/color';

@Injectable({ providedIn: 'root' })
export class ColorsService {
  private readonly _colors = signal<Color[]>([]);

  /** The parsed colors. Empty until `loadColors()` has completed. */
  readonly colors = this._colors.asReadonly();

  /**
   * Combination number → the colors in that combination.
   * Colors belong to the same combination when they share a number in `combinations`.
   */
  readonly combinations = computed(() => {
    const map = new Map<number, Color[]>();
    for (const color of this.colors()) {
      for (const id of color.combinations) {
        const members = map.get(id);
        if (members) {
          members.push(color);
        } else {
          map.set(id, [color]);
        }
      }
    }
    return map;
  });

  /** Hex value → color, for resolving colors stored by hex (e.g. on wardrobe items). */
  readonly byHex = computed(
    () => new Map(this.colors().map((color) => [color.hex, color] as const)),
  );

  private loading?: Promise<Color[]>;

  /**
   * Loads and parses `src/assets/colors.json`, storing the result in `colors`.
   * The file is lazy-loaded as a separate chunk and only parsed once;
   * later calls return the cached result.
   */
  loadColors(): Promise<Color[]> {
    this.loading ??= import('../../assets/colors.json')
      .then((module) => {
        const colors = (module.default as unknown[]).map(parseColor);
        this._colors.set(colors);
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
  return {
    name: String(o['name']),
    combinations: toNumbers(o['combinations']),
    swatch: Number(o['swatch']),
    cmyk: toTuple(o['cmyk'], 4) as Color['cmyk'],
    lab: toTuple(o['lab'], 3) as Color['lab'],
    rgb: toTuple(o['rgb'], 3) as Color['rgb'],
    hex: String(o['hex']),
  };
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
