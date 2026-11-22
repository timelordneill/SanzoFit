import { TestBed } from '@angular/core/testing';
import { ColorsService } from '../services/colors.service';
import { makeColor } from '../testing/color-fixtures';
import { Color } from './color';
import { WardrobeItem } from './wardrobe-item';
import { findWardrobeMatches, groupMatchesByCombination } from './wardrobe-match';

function color(hex: string, name = hex): Color {
  return makeColor({ hex, name });
}

function item(id: string, colors: string[], name = id): WardrobeItem {
  return { id, name, type: 'Top', colors };
}

describe('findWardrobeMatches', () => {
  const pink = color('#pink');
  const olive = color('#olive');
  const blue = color('#blue');
  const sepia = color('#sepia');

  // 1: pink + olive + blue, 2: pink + sepia, 3: olive + sepia
  const combinations = new Map<number, Color[]>([
    [1, [pink, olive, blue]],
    [2, [pink, sepia]],
    [3, [olive, sepia]],
  ]);

  const shirt = item('shirt', ['#pink']);

  it('matches items that have another color of a shared combination', () => {
    const trousers = item('trousers', ['#olive']);
    const matches = findWardrobeMatches(shirt, [shirt, trousers], combinations);

    expect(matches).toEqual([
      {
        item: trousers,
        combinations: [{ id: 1, colors: [pink, olive, blue], ownHexes: ['#pink'], matchHexes: ['#olive'] }],
      },
    ]);
  });

  it('does not match on the exact same color or on unrelated combinations', () => {
    const samePink = item('same', ['#pink']);
    const unrelated = item('unrelated', ['#nope']);

    expect(findWardrobeMatches(shirt, [shirt, samePink, unrelated], combinations)).toEqual([]);
  });

  it('never matches the item with itself', () => {
    const multi = item('multi', ['#pink', '#olive']);
    expect(findWardrobeMatches(multi, [multi], combinations)).toEqual([]);
  });

  it('lists every linking combination and sorts by number of combinations', () => {
    const jacket = item('jacket', ['#sepia'], 'Jacket'); // via 2
    const scarf = item('scarf', ['#blue', '#sepia'], 'Scarf'); // via 1 and 2
    const matches = findWardrobeMatches(shirt, [jacket, scarf], combinations);

    expect(matches.map((m) => m.item.id)).toEqual(['scarf', 'jacket']);
    expect(matches[0].combinations.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe('groupMatchesByCombination', () => {
  const pink = color('#pink');
  const olive = color('#olive');
  const blue = color('#blue');
  const sepia = color('#sepia');
  const combinations = new Map<number, Color[]>([
    [1, [pink, olive, blue]],
    [2, [pink, sepia]],
  ]);
  const shirt = item('shirt', ['#pink']);

  it('groups the matching items per combination, largest group first', () => {
    const trousers = item('trousers', ['#olive'], 'Trousers'); // 1
    const scarf = item('scarf', ['#blue', '#sepia'], 'Scarf'); // 1 and 2
    const groups = groupMatchesByCombination(
      findWardrobeMatches(shirt, [shirt, trousers, scarf], combinations),
    );

    expect(groups.map((g) => g.id)).toEqual([1, 2]);
    expect(groups[0]).toEqual({
      id: 1,
      colors: [pink, olive, blue],
      ownHexes: ['#pink'],
      items: [
        { item: scarf, matchHexes: ['#blue'] },
        { item: trousers, matchHexes: ['#olive'] },
      ],
    });
    expect(groups[1].items).toEqual([{ item: scarf, matchHexes: ['#sepia'] }]);
  });

  it('returns no groups when nothing matches', () => {
    expect(groupMatchesByCombination([])).toEqual([]);
  });
});

describe('near matches (harmonious stand-ins)', () => {
  let service: ColorsService;
  const hex = (name: string) => service.colors().find((c) => c.name === name)!.hex;

  beforeEach(async () => {
    service = TestBed.inject(ColorsService);
    await service.loadColors();
  });

  // Combination 176 is Hermosa Pink + Seashell Pink + Calamine Blue.
  const shirtOf = () => item('shirt', [hex('Hermosa Pink')], 'Shirt');

  it('lets an item stand in for a combination color it is close to', () => {
    const chinos = item('chinos', [hex('Light Pinkish Cinnamon')], 'Chinos');

    const [match] = findWardrobeMatches(shirtOf(), [chinos], service.combinations(), {
      byHex: service.byHex(),
    });

    const combo176 = match.combinations.find((c) => c.id === 176)!;
    expect(combo176.matchHexes).toEqual([]);
    expect(combo176.nearMatch).toEqual({
      hex: hex('Light Pinkish Cinnamon'),
      standsInFor: hex('Seashell Pink'),
      score: expect.any(Number),
    });
    expect(combo176.nearMatch!.score).toBeLessThanOrEqual(12);
  });

  it('only finds near matches when the palette lookup is given', () => {
    const chinos = item('chinos', [hex('Light Pinkish Cinnamon')], 'Chinos');
    expect(findWardrobeMatches(shirtOf(), [chinos], service.combinations())).toEqual([]);
  });

  it('respects the score limit', () => {
    const chinos = item('chinos', [hex('Light Pinkish Cinnamon')], 'Chinos');
    const matches = findWardrobeMatches(shirtOf(), [chinos], service.combinations(), {
      byHex: service.byHex(),
      maxNearScore: 1,
    });
    expect(matches).toEqual([]);
  });

  it('prefers an exact match over a near match for the same combination', () => {
    // Has the exact Seashell Pink and a stand-in color.
    const both = item('both', [hex('Seashell Pink'), hex('Light Pinkish Cinnamon')], 'Both');

    const [match] = findWardrobeMatches(shirtOf(), [both], service.combinations(), {
      byHex: service.byHex(),
    });
    const combo176 = match.combinations.find((c) => c.id === 176)!;
    expect(combo176.matchHexes).toEqual([hex('Seashell Pink')]);
    expect(combo176.nearMatch).toBeUndefined();
  });

  it('never uses the viewed item’s own color as a stand-in', () => {
    const twin = item('twin', [hex('Hermosa Pink')], 'Twin');
    expect(
      findWardrobeMatches(shirtOf(), [twin], service.combinations(), { byHex: service.byHex() }),
    ).toEqual([]);
  });

  it('lists exact items before near matches, within and across groups', () => {
    const exact = item('exact', [hex('Calamine BLue')], 'Exact');
    const near = item('near', [hex('Light Pinkish Cinnamon')], 'Near');

    const matches = findWardrobeMatches(shirtOf(), [near, exact], service.combinations(), {
      byHex: service.byHex(),
    });
    expect(matches[0].item.id).toBe('exact');

    const group176 = groupMatchesByCombination(matches).find((g) => g.id === 176)!;
    expect(group176.items.map((i) => [i.item.id, !!i.nearMatch])).toEqual([
      ['exact', false],
      ['near', true],
    ]);
  });
});
