import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WardrobeItem } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { WardrobeItemDetail } from './wardrobe-item-detail';

describe('WardrobeItemDetail', () => {
  let fixture: ComponentFixture<WardrobeItemDetail>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const shirt: WardrobeItem = {
    id: 'a1',
    name: 'Linen shirt',
    type: 'Top',
    colors: ['#f9c1ce', '#b5decc'], // Hermosa Pink, Turquoise Green
    image: 'data:image/jpeg;base64,AAAA',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WardrobeItemDetail],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    await TestBed.inject(ColorsService).loadColors();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WardrobeItemDetail);
    fixture.componentRef.setInput('id', 'a1');
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  /** Answers the item request and the full-wardrobe request (used for matching). */
  async function respond(item: Partial<WardrobeItem>, allItems: WardrobeItem[] = [shirt]) {
    http.expectOne('/api/wardrobeItems/a1').flush(item);
    http.expectOne('/api/wardrobeItems').flush(allItems);
    await fixture.whenStable();
  }

  it('shows the photo, details and a color detail per color', async () => {
    await respond(shirt);

    expect(element.querySelector('h2')?.textContent).toContain('Linen shirt');
    expect(element.querySelector<HTMLImageElement>('img.photo')?.getAttribute('src')).toBe(
      shirt.image,
    );

    const details = Array.from(element.querySelectorAll('app-color-detail'));
    expect(details.map((d) => d.querySelector('.title')?.textContent?.trim())).toEqual([
      'Hermosa Pink',
      'Turquoise Green',
    ]);
    expect(details[0].querySelector('.title')?.getAttribute('aria-level')).toBe('3');
    expect(details[0].querySelectorAll('.combination').length).toBe(3);
  });

  it('shows a placeholder when the item has no photo', async () => {
    await respond({ ...shirt, image: undefined });

    expect(element.querySelector('img.photo')).toBeNull();
    expect(element.querySelector('.placeholder')).not.toBeNull();
  });

  it('shows a message when the item does not exist', async () => {
    http
      .expectOne('/api/wardrobeItems/a1')
      .flush('Not found', { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/wardrobeItems').flush([]);
    await fixture.whenStable();

    expect(element.textContent).toContain("doesn't exist");
  });

  it('groups the matching items per combination', async () => {
    // The shirt is Hermosa Pink + Turquoise Green.
    // Combination 176: Hermosa Pink, Seashell Pink, Calamine Blue.
    // Combination 227: Hermosa Pink, Light Glaucous Blue, Cerulian Blue.
    // Combination 300: Grenadine Pink, Cream Yellow, Turquoise Green, Calamine Blue.
    const chinos: WardrobeItem = { id: 'b2', name: 'Chinos', type: 'Bottom', colors: ['#fdd4bd'] };
    const scarf: WardrobeItem = {
      id: 'c3',
      name: 'Scarf',
      type: 'Accessory',
      colors: ['#78cdd0', '#0093a5'], // Calamine Blue (176), Cerulian Blue (227)
    };
    const socks: WardrobeItem = { id: 'd4', name: 'Socks', type: 'Accessory', colors: ['#000001'] };
    await respond(shirt, [shirt, chinos, scarf, socks]);

    const groups = Array.from(element.querySelectorAll('.match-group'));
    const summary = groups.map((group) => ({
      title: group.querySelector('.combination-title')?.textContent?.trim(),
      items: Array.from(group.querySelectorAll('.match-name')).map((n) => n.textContent),
    }));
    expect(summary).toEqual([
      { title: 'Combination 176', items: ['Scarf', 'Chinos'] },
      { title: 'Combination 227', items: ['Scarf'] },
      { title: 'Combination 300', items: ['Scarf'] },
    ]);

    // The shirt's own color is highlighted in the combination strip.
    expect(groups[0].querySelector('.member.current .name')?.textContent).toBe('Hermosa Pink');
    // Each item card links to the item and shows the color it brings.
    const chinosCard = groups[0].querySelectorAll('a.match')[1];
    expect(chinosCard.getAttribute('href')).toBe('/wardrobe/b2');
    expect(chinosCard.querySelector('.dot')?.getAttribute('title')).toBe('Brings Seashell Pink');
  });

  it('says so when nothing matches', async () => {
    await respond(shirt, [shirt]);
    expect(element.textContent).toContain('No other items in your wardrobe match');
  });
});
