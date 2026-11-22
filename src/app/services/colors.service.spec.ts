import { TestBed } from '@angular/core/testing';
import { ColorsService } from './colors.service';

describe('ColorsService', () => {
  let service: ColorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ColorsService);
  });

  it('starts with no colors', () => {
    expect(service.colors()).toEqual([]);
  });

  it('loads and stores the colors', async () => {
    const colors = await service.loadColors();

    expect(colors.length).toBeGreaterThan(0);
    expect(service.colors()).toBe(colors);
    expect(colors[0]).toEqual(
      expect.objectContaining({ name: 'Hermosa Pink', hex: '#f9c1ce', rgb: [249, 193, 206] }),
    );
  });

  it('groups colors by combination number', async () => {
    await service.loadColors();
    const combinations = service.combinations();

    expect(combinations.get(176)?.map((c) => c.name)).toContain('Hermosa Pink');
    for (const [id, members] of combinations) {
      expect(members.length).toBeGreaterThan(0);
      for (const color of members) {
        expect(color.combinations).toContain(id);
      }
    }
  });

  it('gives every color a unique, stable id and looks colors up by it', async () => {
    const colors = await service.loadColors();

    const ids = colors.map((c) => c.id);
    expect(new Set(ids).size).toBe(colors.length);
    expect(ids.every(Number.isInteger)).toBe(true);
    expect(service.byId().get(0)?.name).toBe('Hermosa Pink');
    expect(service.byId().get(87)?.name).toBe('Turquoise Green');
  });

  it('derives each color’s combinations from combinations.json', async () => {
    const colors = await service.loadColors();
    const combinations = service.combinations();

    expect(combinations.size).toBe(348);
    expect(colors[0].combinations).toEqual([176, 227, 273]); // Hermosa Pink, ascending
    // Both views describe the same memberships.
    for (const color of colors) {
      expect(color.combinations.length).toBeGreaterThan(0);
      for (const id of color.combinations) {
        expect(combinations.get(id)).toContain(color);
      }
    }
    for (const [id, members] of combinations) {
      for (const color of members) {
        expect(color.combinations).toContain(id);
      }
    }
  });

  it('keeps combinations in the book order', async () => {
    await service.loadColors();
    const names = (id: number) => service.combinations().get(id)!.map((c) => c.name);

    expect(names(2)).toEqual(['Dark Tyrian Blue', 'Yellow Orange']);
    expect(names(121)).toEqual(['Lincoln Green', 'Ochraceous Salmon', 'Brown']);
    // 4 colors: top, middle left, middle right, bottom.
    expect(names(245)).toEqual(['Oil Green', 'Slate Color', 'Dark Tyrian Blue', 'Carmine Red']);
  });

  it('precomputes value, saturation and temperature for each color', async () => {
    const colors = await service.loadColors();
    const hermosaPink = colors[0].properties;

    expect(hermosaPink.lightness).toBeCloseTo(83.43, 2);
    expect(hermosaPink.chroma).toBeCloseTo(22.2, 1);
    expect(hermosaPink.warmth).toBeGreaterThan(0); // a warm pink
  });

  it('only parses the file once', async () => {
    const first = await service.loadColors();
    const second = await service.loadColors();
    expect(second).toBe(first);
  });
});
