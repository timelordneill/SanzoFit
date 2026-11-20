import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ColorsService } from '../../services/colors.service';
import { ColorDetail } from './color-detail';

describe('ColorDetail', () => {
  let fixture: ComponentFixture<ColorDetail>;
  let element: HTMLElement;

  async function render(colorIndex: number, headingLevel?: number) {
    const colors = await TestBed.inject(ColorsService).loadColors();
    fixture = TestBed.createComponent(ColorDetail);
    fixture.componentRef.setInput('color', colors[colorIndex]);
    if (headingLevel !== undefined) {
      fixture.componentRef.setInput('headingLevel', headingLevel);
    }
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorDetail],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows every combination of the color, each containing the color', async () => {
    await render(0); // Hermosa Pink: combinations 176, 227, 273

    expect(element.querySelector('.title')?.textContent).toContain('Hermosa Pink');

    const combinations = Array.from(element.querySelectorAll('.combination'));
    expect(
      combinations.map((c) => c.querySelector('.combination-title')?.textContent?.trim()),
    ).toEqual(['Combination 176', 'Combination 227', 'Combination 273']);
    for (const combination of combinations) {
      const names = Array.from(combination.querySelectorAll('.name')).map((n) => n.textContent);
      expect(names).toContain('Hermosa Pink');
      expect(names.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('links partner colors to their own page', async () => {
    await render(0);
    const links = element.querySelectorAll('.combination a.member');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toMatch(/^\/color\/\d+$/);
  });

  it('uses the given heading level', async () => {
    await render(0, 3);
    expect(element.querySelector('.title')?.getAttribute('aria-level')).toBe('3');
    expect(element.querySelector('.combination-title')?.getAttribute('aria-level')).toBe('4');
  });
});
