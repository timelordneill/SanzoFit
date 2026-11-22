import { makeColor } from '../testing/color-fixtures';
import {
  Color,
  rgbCss,
  resolveColors,
  toCmykString,
  toCssColor,
  toRgbLabel,
  toRgbString,
} from './color';

describe('color helpers', () => {
  const hermosaPink = makeColor({
    name: 'Hermosa Pink',
    combinations: [176, 227, 273],
    cmyk: [0, 30, 6, 0],
    lab: [83.42717631799802, 22.136186770428026, 1.6381322957198563],
    rgb: [249, 193, 206],
    hex: '#f9c1ce',
  });

  it('paints swatches from the stored (print-based) Lab values', () => {
    expect(toCssColor(hermosaPink, true)).toBe('lab(83.43% 22.14 1.64)');
  });

  it('keeps negative Lab components', () => {
    const peacockBlue = { ...hermosaPink, lab: [52.785, -48.9105, -17.5175] } as Color;
    expect(toCssColor(peacockBlue, true)).toBe('lab(52.79% -48.91 -17.52)');
  });

  it('falls back to the stored RGB in browsers without lab() support', () => {
    expect(toCssColor(hermosaPink, false)).toBe('rgb(249, 193, 206)');
    expect(toCssColor(hermosaPink, false)).toBe(toRgbString(hermosaPink));
  });

  it('formats CMYK and RGB labels like the book', () => {
    expect(toCmykString(hermosaPink)).toBe('C0 M30 Y6 K0');
    expect(toRgbLabel(hermosaPink)).toBe('R249 G193 B206');
  });

  it('builds a CSS color from raw RGB values (e.g. a photo pixel)', () => {
    expect(rgbCss([12, 34, 56])).toBe('rgb(12, 34, 56)');
  });

  it('resolves hex values to colors, skipping unknown ones', () => {
    const byHex = new Map([[hermosaPink.hex, hermosaPink]]);
    expect(resolveColors(['#f9c1ce', '#unknown', '#f9c1ce'], byHex)).toEqual([
      hermosaPink,
      hermosaPink,
    ]);
    expect(resolveColors([], byHex)).toEqual([]);
  });
});
