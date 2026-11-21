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

    expect(element.querySelector('.item-name')?.textContent).toBe('Linen shirt');
    expect(element.querySelectorAll('.item .dot').length).toBe(2);
    expect(element.querySelector('a.item')?.getAttribute('href')).toBe('/wardrobe/1');
  });

  it('shows an error when the wardrobe cannot be loaded', async () => {
    vi.spyOn(TestBed.inject(WardrobeService), 'load').mockRejectedValue(new Error('blocked'));
    await render([]);

    expect(element.textContent).toContain('Could not load your wardrobe');
  });
});
