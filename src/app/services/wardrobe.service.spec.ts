import { TestBed } from '@angular/core/testing';
import { NewWardrobeItem } from '../models/wardrobe-item';
import {
  WARDROBE_STORAGE_KEY,
  WardrobeItemNotFoundError,
  WardrobeService,
  WardrobeStorageFullError,
} from './wardrobe.service';

describe('WardrobeService', () => {
  const shirt: NewWardrobeItem = { name: 'Shirt', type: 'Top', colors: ['#f9c1ce'] };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => vi.restoreAllMocks());

  function freshService(): WardrobeService {
    TestBed.resetTestingModule();
    return TestBed.inject(WardrobeService);
  }

  it('starts empty', async () => {
    const service = TestBed.inject(WardrobeService);
    expect(await service.load()).toEqual([]);
    expect(service.items()).toEqual([]);
  });

  it('creates an item with an id and keeps it in storage', async () => {
    const service = TestBed.inject(WardrobeService);
    const created = await service.create(shirt);

    expect(created).toEqual({ ...shirt, id: expect.any(String) });
    expect(service.items()).toEqual([created]);

    // Survives a reload (a new service instance reading the same storage).
    expect(await freshService().load()).toEqual([created]);
  });

  it('gets an item by id', async () => {
    const service = TestBed.inject(WardrobeService);
    const created = await service.create(shirt);
    expect(await service.getById(created.id)).toEqual(created);
  });

  it('rejects with WardrobeItemNotFoundError for an unknown id', async () => {
    const service = TestBed.inject(WardrobeService);
    await expect(service.getById('nope')).rejects.toBeInstanceOf(WardrobeItemNotFoundError);
  });

  describe('update', () => {
    it('replaces the fields, keeping the id and position', async () => {
      const service = TestBed.inject(WardrobeService);
      const first = await service.create(shirt);
      const second = await service.create({ ...shirt, name: 'Second' });

      const updated = await service.update(first.id, {
        name: 'Linen shirt',
        type: 'Outerwear',
        colors: ['#b5decc'],
      });

      expect(updated).toEqual({ id: first.id, name: 'Linen shirt', type: 'Outerwear', colors: ['#b5decc'] });
      expect(service.items()).toEqual([updated, second]);
      expect(await freshService().load()).toEqual([updated, second]);
    });

    it('can remove the photo', async () => {
      const service = TestBed.inject(WardrobeService);
      const created = await service.create({ ...shirt, image: 'data:image/jpeg;base64,AAAA' });

      const updated = await service.update(created.id, shirt);
      expect(updated.image).toBeUndefined();
    });

    it('rejects an unknown id', async () => {
      const service = TestBed.inject(WardrobeService);
      await expect(service.update('nope', shirt)).rejects.toBeInstanceOf(WardrobeItemNotFoundError);
    });

    it('reports a readable error when storage is full', async () => {
      const service = TestBed.inject(WardrobeService);
      const created = await service.create(shirt);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

      await expect(service.update(created.id, { ...shirt, name: 'Big' })).rejects.toBeInstanceOf(
        WardrobeStorageFullError,
      );
      expect(service.items()).toEqual([created]);
    });
  });

  it('deletes an item from storage and from the list', async () => {
    const service = TestBed.inject(WardrobeService);
    const kept = await service.create(shirt);
    const removed = await service.create({ ...shirt, name: 'Old shirt' });

    await service.delete(removed.id);

    expect(service.items()).toEqual([kept]);
    expect(await freshService().load()).toEqual([kept]);
  });

  it('rejects deleting an unknown id', async () => {
    const service = TestBed.inject(WardrobeService);
    await expect(service.delete('nope')).rejects.toBeInstanceOf(WardrobeItemNotFoundError);
  });

  it('treats unreadable storage as an empty wardrobe', async () => {
    localStorage.setItem(WARDROBE_STORAGE_KEY, '{not json');
    expect(await TestBed.inject(WardrobeService).load()).toEqual([]);
  });

  it('reports a readable error when storage is full', async () => {
    const service = TestBed.inject(WardrobeService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    await expect(service.create(shirt)).rejects.toBeInstanceOf(WardrobeStorageFullError);
    expect(service.items()).toEqual([]);
  });
});
