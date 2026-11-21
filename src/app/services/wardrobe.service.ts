import { Injectable, signal } from '@angular/core';
import { NewWardrobeItem, WardrobeItem } from '../models/wardrobe-item';

/** localStorage key holding the wardrobe as a JSON array of `WardrobeItem`. */
export const WARDROBE_STORAGE_KEY = 'sanzofit.wardrobeItems';

/** Thrown by `WardrobeService.getById` when no item has the given id. */
export class WardrobeItemNotFoundError extends Error {
  constructor(readonly id: string) {
    super(`Wardrobe item "${id}" not found`);
    this.name = 'WardrobeItemNotFoundError';
  }
}

/** Thrown when the browser refuses to store more data (usually because of photos). */
export class WardrobeStorageFullError extends Error {
  constructor() {
    super('Browser storage is full. Remove some items or use a smaller photo.');
    this.name = 'WardrobeStorageFullError';
  }
}

/**
 * Stores wardrobe items in the browser's localStorage, so the app works as a fully
 * static site (e.g. GitHub Pages). Data is per browser and per site address.
 *
 * Methods return promises so callers don't depend on storage being synchronous.
 */
@Injectable({ providedIn: 'root' })
export class WardrobeService {
  private readonly _items = signal<WardrobeItem[]>([]);

  /** The wardrobe items. Empty until `load()` has completed. */
  readonly items = this._items.asReadonly();

  /** Reads all items from storage and stores them in `items`. */
  async load(): Promise<WardrobeItem[]> {
    const items = this.read();
    this._items.set(items);
    return items;
  }

  /** Reads a single item. Rejects with `WardrobeItemNotFoundError` when it doesn't exist. */
  async getById(id: string): Promise<WardrobeItem> {
    const item = this.read().find((candidate) => candidate.id === id);
    if (!item) {
      throw new WardrobeItemNotFoundError(id);
    }
    return item;
  }

  /** Saves a new item (assigning its id) and adds it to `items`. */
  async create(item: NewWardrobeItem): Promise<WardrobeItem> {
    const created: WardrobeItem = { ...item, id: crypto.randomUUID() };
    const items = [...this.read(), created];
    this.write(items);
    this._items.set(items);
    return created;
  }

  /** Removes an item. Rejects with `WardrobeItemNotFoundError` when it doesn't exist. */
  async delete(id: string): Promise<void> {
    const items = this.read();
    const remaining = items.filter((item) => item.id !== id);
    if (remaining.length === items.length) {
      throw new WardrobeItemNotFoundError(id);
    }
    this.write(remaining);
    this._items.set(remaining);
  }

  /** The stored items; an empty list when storage is empty, unreadable or blocked. */
  private read(): WardrobeItem[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(WARDROBE_STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? (parsed as WardrobeItem[]) : [];
    } catch {
      return [];
    }
  }

  private write(items: WardrobeItem[]): void {
    try {
      localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new WardrobeStorageFullError();
      }
      throw error;
    }
  }
}
