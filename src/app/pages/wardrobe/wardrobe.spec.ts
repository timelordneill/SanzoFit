import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ColorsService } from '../../services/colors.service';
import { Wardrobe } from './wardrobe';

describe('Wardrobe', () => {
  let fixture: ComponentFixture<Wardrobe>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wardrobe],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    await TestBed.inject(ColorsService).loadColors();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Wardrobe);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('has an Add link to the create page', async () => {
    http.expectOne('/api/wardrobeItems').flush([]);
    await fixture.whenStable();

    expect(element.querySelector('a.add')?.getAttribute('href')).toBe('/wardrobe/new');
    expect(element.textContent).toContain('No items yet');
  });

  it('lists items with their colors', async () => {
    http
      .expectOne('/api/wardrobeItems')
      .flush([{ id: '1', name: 'Linen shirt', type: 'Top', colors: ['#f9c1ce', '#f8b6ba'] }]);
    await fixture.whenStable();

    expect(element.querySelector('.item-name')?.textContent).toBe('Linen shirt');
    expect(element.querySelectorAll('.item .dot').length).toBe(2);
    expect(element.querySelector('a.item')?.getAttribute('href')).toBe('/wardrobe/1');
  });

  it('shows an error when the API is unreachable', async () => {
    http.expectOne('/api/wardrobeItems').error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(element.textContent).toContain('Could not load your wardrobe');
  });
});
