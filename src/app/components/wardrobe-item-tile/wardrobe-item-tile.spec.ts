import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WardrobeItem } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { WardrobeItemTile } from './wardrobe-item-tile';

describe('WardrobeItemTile', () => {
  let fixture: ComponentFixture<WardrobeItemTile>;
  let element: HTMLElement;

  async function render(item: WardrobeItem, colorCount = 0) {
    const colors = await TestBed.inject(ColorsService).loadColors();
    fixture = TestBed.createComponent(WardrobeItemTile);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('colors', colors.slice(0, colorCount));
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WardrobeItemTile],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows photo, color strip, then name and type, linking to the item', async () => {
    await render(
      { id: 'a1', name: 'Shirt', type: 'Top', colors: [], image: 'data:image/jpeg;base64,AAAA' },
      2,
    );

    const link = element.querySelector('a.item')!;
    expect(link.getAttribute('href')).toBe('/wardrobe/a1');
    const parts = link.querySelectorAll('.item-image, .item-colors, .info');
    expect(Array.from(parts).map((el) => el.classList[0])).toEqual([
      'item-image',
      'item-colors',
      'info',
    ]);
    expect(link.querySelector('img.item-image')?.getAttribute('src')).toBe(
      'data:image/jpeg;base64,AAAA',
    );
    expect(
      Array.from(link.querySelectorAll('.swatch')).map((s) => s.getAttribute('title')),
    ).toEqual(['Hermosa Pink', 'Corinthian Pink']);
    expect(link.querySelector('.item-name')?.textContent).toBe('Shirt');
    expect(link.querySelector('.item-type')?.textContent).toBe('Top');
  });

  it('shows a placeholder when there is no photo', async () => {
    await render({ id: 'a1', name: 'Socks', type: 'Accessory', colors: [] });

    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.item-image.placeholder')).not.toBeNull();
  });
});
