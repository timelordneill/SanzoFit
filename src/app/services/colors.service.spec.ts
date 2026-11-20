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

  it('only parses the file once', async () => {
    const first = await service.loadColors();
    const second = await service.loadColors();
    expect(second).toBe(first);
  });
});
