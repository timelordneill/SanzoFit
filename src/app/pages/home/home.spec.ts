import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ColorsService } from '../../services/colors.service';
import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      // The color tiles use routerLink, which needs the router (ActivatedRoute).
      providers: [provideRouter([])],
    }).compileComponents();

    // Load the colors up front so the tiles always render; otherwise whether they
    // exist during the test depends on timing (which differed on CI).
    await TestBed.inject(ColorsService).loadColors();
    fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows a tile for every color, with its name', () => {
    const tiles = element.querySelectorAll('.color');
    expect(tiles.length).toBe(159);
    expect(tiles[0].querySelector('.name')?.textContent).toBe('Hermosa Pink');
  });

  it('shows the CMYK values like the book', () => {
    const first = element.querySelector('.color')!;
    expect(first.querySelector('.cmyk')?.textContent).toBe('C0 M30 Y6 K0');
  });

  it('shows the RGB values beneath the CMYK values', () => {
    const values = element.querySelector('.color .values')!;
    expect(Array.from(values.children).map((el) => el.className)).toEqual(['cmyk', 'rgb']);
    expect(values.querySelector('.rgb')?.textContent).toBe('R249 G193 B206');
  });

  it('links each tile to its color page', () => {
    const links = element.querySelectorAll<HTMLAnchorElement>('a.color');
    expect(links[0].getAttribute('href')).toBe('/color/0');
    expect(links[158].getAttribute('href')).toBe('/color/158');
  });
});
