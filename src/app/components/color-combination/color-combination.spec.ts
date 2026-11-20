import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Color } from '../../models/color';
import { ColorsService } from '../../services/colors.service';
import { ColorCombination } from './color-combination';

describe('ColorCombination', () => {
  let fixture: ComponentFixture<ColorCombination>;
  let element: HTMLElement;
  let colors: Color[];

  async function render(inputs: { combinationId: number; current?: Color; headingLevel?: number }) {
    fixture = TestBed.createComponent(ColorCombination);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorCombination],
      providers: [provideRouter([])],
    }).compileComponents();
    colors = await TestBed.inject(ColorsService).loadColors();
  });

  it('shows the title and every color of the combination', async () => {
    await render({ combinationId: 176 });

    expect(element.querySelector('.combination-title')?.textContent?.trim()).toBe('Combination 176');
    expect(Array.from(element.querySelectorAll('.name')).map((n) => n.textContent)).toEqual([
      'Hermosa Pink',
      'Seashell Pink',
      'Calamine BLue',
    ]);
  });

  it('links every color when there is no current color', async () => {
    await render({ combinationId: 176 });

    const links = Array.from(element.querySelectorAll('a.member'));
    expect(links.length).toBe(3);
    expect(links[0].getAttribute('href')).toBe('/color/0');
  });

  it('highlights the current color without linking it', async () => {
    await render({ combinationId: 176, current: colors[0] });

    expect(element.querySelector('.member.current .name')?.textContent).toBe('Hermosa Pink');
    expect(element.querySelectorAll('a.member').length).toBe(2);
  });

  it('uses the given heading level', async () => {
    await render({ combinationId: 176, headingLevel: 4 });
    expect(element.querySelector('.combination-title')?.getAttribute('aria-level')).toBe('4');
  });
});
