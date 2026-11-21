import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WardrobeItem } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { WARDROBE_STORAGE_KEY, WardrobeService } from '../../services/wardrobe.service';
import { Wardrobe } from './wardrobe';

describe('Wardrobe', () => {
  let fixture: ComponentFixture<Wardrobe>;
  let element: HTMLElement;

  async function render(items: WardrobeItem[]) {
    localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(items));
    await TestBed.inject(ColorsService).loadColors();
    fixture = TestBed.createComponent(Wardrobe);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Wardrobe],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('has an Add link to the create page', async () => {
    await render([]);

    expect(element.querySelector('a.add')?.getAttribute('href')).toBe('/wardrobe/new');
    expect(element.textContent).toContain('No items yet');
  });

  it('lists stored items with their colors', async () => {
    await render([{ id: '1', name: 'Linen shirt', type: 'Top', colors: ['#f9c1ce', '#f8b6ba'] }]);

    expect(element.querySelectorAll('.items app-wardrobe-item-tile').length).toBe(1);
    const item = element.querySelector('a.item')!;
    expect(item.getAttribute('href')).toBe('/wardrobe/1');
    // Order: photo (or placeholder), color strip, then name and type.
    const parts = item.querySelectorAll('.item-image, .item-colors, .info');
    expect(Array.from(parts).map((el) => el.classList[0])).toEqual([
      'item-image',
      'item-colors',
      'info',
    ]);
    expect(item.querySelectorAll('.item-colors .swatch').length).toBe(2);
    expect(item.querySelector('.item-name')?.textContent).toBe('Linen shirt');
    expect(item.querySelector('.item-type')?.textContent).toBe('Top');
  });

  it('shows the photo when the item has one, otherwise a placeholder', async () => {
    await render([
      { id: '1', name: 'Shirt', type: 'Top', colors: [], image: 'data:image/jpeg;base64,AAAA' },
      { id: '2', name: 'Socks', type: 'Accessory', colors: [] },
    ]);

    const [withPhoto, withoutPhoto] = Array.from(element.querySelectorAll('a.item'));
    expect(withPhoto.querySelector('img.item-image')?.getAttribute('src')).toBe(
      'data:image/jpeg;base64,AAAA',
    );
    expect(withoutPhoto.querySelector('img')).toBeNull();
    expect(withoutPhoto.querySelector('.item-image.placeholder')).not.toBeNull();
  });

  it('shows an error when the wardrobe cannot be loaded', async () => {
    vi.spyOn(TestBed.inject(WardrobeService), 'load').mockRejectedValue(new Error('blocked'));
    await render([]);

    expect(element.textContent).toContain('Could not load your wardrobe');
  });
});
