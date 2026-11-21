import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WardrobeItem } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { WARDROBE_STORAGE_KEY } from '../../services/wardrobe.service';
import { WardrobeItemDetail } from './wardrobe-item-detail';

describe('WardrobeItemDetail', () => {
  let fixture: ComponentFixture<WardrobeItemDetail>;
  let element: HTMLElement;

  const shirt: WardrobeItem = {
    id: 'a1',
    name: 'Linen shirt',
    type: 'Top',
    colors: ['#f9c1ce', '#b5decc'], // Hermosa Pink, Turquoise Green
    image: 'data:image/jpeg;base64,AAAA',
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [WardrobeItemDetail],
      providers: [provideRouter([])],
    }).compileComponents();
    await TestBed.inject(ColorsService).loadColors();
  });

  /** Stores the wardrobe, then renders the detail page for item `a1`. */
  async function render(items: WardrobeItem[]) {
    localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(items));
    fixture = TestBed.createComponent(WardrobeItemDetail);
    fixture.componentRef.setInput('id', 'a1');
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  it('shows the photo, details and a color detail per color', async () => {
    await render([shirt]);

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

    // Each color chip is a list item linking to the color's page.
    const chipLinks = Array.from(element.querySelectorAll('.color-chips > li > a'));
    expect(chipLinks.map((a) => a.getAttribute('href'))).toEqual(['/color/0', '/color/87']);
    // Each chip is a miniature Home tile: swatch, name, CMYK and RGB values.
    expect(
      Array.from(chipLinks[0].querySelectorAll('.chip-name, .chip-value')).map((el) => el.textContent),
    ).toEqual(['Hermosa Pink', 'C0 M30 Y6 K0', 'R249 G193 B206']);
    expect(chipLinks[0].querySelector('.chip-swatch')).not.toBeNull();
    expect(details[0].querySelectorAll('.combination').length).toBe(3);
  });

  it('shows a placeholder when the item has no photo', async () => {
    await render([{ ...shirt, image: undefined }]);

    expect(element.querySelector('img.photo')).toBeNull();
    expect(element.querySelector('.placeholder')).not.toBeNull();
  });

  it('shows a message when the item does not exist', async () => {
    await render([]);

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
    await render([shirt, chinos, scarf, socks]);

    const groups = Array.from(element.querySelectorAll('.match-group'));
    const summary = groups.map((group) => ({
      title: group.querySelector('.combination-title')?.textContent?.trim(),
      items: Array.from(group.querySelectorAll('.item-name')).map((n) => n.textContent),
    }));
    expect(summary).toEqual([
      { title: 'Combination 176', items: ['Scarf', 'Chinos'] },
      { title: 'Combination 227', items: ['Scarf'] },
      { title: 'Combination 300', items: ['Scarf'] },
    ]);

    // The shirt's own color is highlighted in the combination strip.
    expect(groups[0].querySelector('.member.current .name')?.textContent).toBe('Hermosa Pink');
    // Matching items use the wardrobe tile, hung on a rule instead of inside a box;
    // the strip shows the color the item brings to this combination.
    expect(groups[0].querySelectorAll('.match-list app-wardrobe-item-tile').length).toBe(2);
    const chinosTile = groups[0].querySelectorAll('a.item')[1];
    expect(chinosTile.getAttribute('href')).toBe('/wardrobe/b2');
    expect(
      Array.from(chinosTile.querySelectorAll('.item-colors .swatch')).map((s) => s.getAttribute('title')),
    ).toEqual(['Seashell Pink']);
  });

  describe('deleting', () => {
    const dialog = () => element.querySelector('dialog')!;
    const deleteButton = () => element.querySelector<HTMLButtonElement>('button.delete')!;

    it('asks for confirmation before deleting', async () => {
      await render([shirt]);
      expect(dialog().open).toBe(false);

      deleteButton().click();
      await fixture.whenStable();

      expect(dialog().open).toBe(true);
      expect(dialog().querySelector('.title')?.textContent).toBe('Delete “Linen shirt”?');
      // Nothing is deleted yet.
      expect(JSON.parse(localStorage.getItem(WARDROBE_STORAGE_KEY)!)).toHaveLength(1);
    });

    it('keeps the item when cancelled', async () => {
      await render([shirt]);
      deleteButton().click();
      await fixture.whenStable();

      dialog().querySelector<HTMLButtonElement>('.cancel')!.click();
      await fixture.whenStable();

      expect(dialog().open).toBe(false);
      expect(JSON.parse(localStorage.getItem(WARDROBE_STORAGE_KEY)!)).toHaveLength(1);
    });

    it('deletes the item and returns to the wardrobe when confirmed', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const other: WardrobeItem = { id: 'b2', name: 'Chinos', type: 'Bottom', colors: ['#fdd4bd'] };
      await render([shirt, other]);
      deleteButton().click();
      await fixture.whenStable();

      dialog().querySelector<HTMLButtonElement>('.confirm')!.click();
      await fixture.whenStable();

      expect(JSON.parse(localStorage.getItem(WARDROBE_STORAGE_KEY)!)).toEqual([other]);
      expect(navigate).toHaveBeenCalledWith('/wardrobe');
    });
  });

  it('says so when nothing matches', async () => {
    await render([shirt]);
    expect(element.textContent).toContain('No other items in your wardrobe match');
  });
});
