import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WardrobeItem } from '../models/wardrobe-item';
import { WardrobeService } from './wardrobe.service';

describe('WardrobeService', () => {
  let service: WardrobeService;
  let http: HttpTestingController;

  const shirt: WardrobeItem = { id: 'a1', name: 'Shirt', type: 'Top', colors: ['#f9c1ce'] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WardrobeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads items from the API', async () => {
    const result = service.load();
    http.expectOne({ method: 'GET', url: '/api/wardrobeItems' }).flush([shirt]);

    expect(await result).toEqual([shirt]);
    expect(service.items()).toEqual([shirt]);
  });

  it('fetches a single item by id', async () => {
    const result = service.getById('a1');
    http.expectOne({ method: 'GET', url: '/api/wardrobeItems/a1' }).flush(shirt);

    expect(await result).toEqual(shirt);
  });

  it('creates an item and adds it to the list', async () => {
    const { id, ...newItem } = shirt;
    const result = service.create(newItem);

    const request = http.expectOne({ method: 'POST', url: '/api/wardrobeItems' });
    expect(request.request.body).toEqual(newItem);
    request.flush(shirt);

    expect(await result).toEqual(shirt);
    expect(service.items()).toEqual([shirt]);
  });
});
