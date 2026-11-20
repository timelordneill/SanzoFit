import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NewWardrobeItem, WardrobeItem } from '../models/wardrobe-item';

/**
 * Reads and writes wardrobe items through the local json-server API
 * (`npm run api`, proxied at `/api`), which stores them in `data/db.json`.
 */
@Injectable({ providedIn: 'root' })
export class WardrobeService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/wardrobeItems';

  private readonly _items = signal<WardrobeItem[]>([]);

  /** The wardrobe items. Empty until `load()` has completed. */
  readonly items = this._items.asReadonly();

  /** Fetches all items from the API and stores them in `items`. */
  async load(): Promise<WardrobeItem[]> {
    const items = await firstValueFrom(this.http.get<WardrobeItem[]>(this.url));
    this._items.set(items);
    return items;
  }

  /** Fetches a single item by id. Rejects (HTTP 404) when it does not exist. */
  getById(id: string): Promise<WardrobeItem> {
    return firstValueFrom(
      this.http.get<WardrobeItem>(`${this.url}/${encodeURIComponent(id)}`),
    );
  }

  /** Saves a new item and adds it to `items`. */
  async create(item: NewWardrobeItem): Promise<WardrobeItem> {
    const created = await firstValueFrom(this.http.post<WardrobeItem>(this.url, item));
    this._items.update((items) => [...items, created]);
    return created;
  }
}
