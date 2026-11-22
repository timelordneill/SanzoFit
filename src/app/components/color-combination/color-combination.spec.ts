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

  const names = () => Array.from(element.querySelectorAll('.name')).map((n) => n.textContent);
  const byName = (name: string) => colors.find((c) => c.name === name)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorCombination],
      providers: [provideRouter([])],
    }).compileComponents();
    colors = await TestBed.inject(ColorsService).loadColors();
  });

  it('shows the zero-padded number, announced as "Combination N"', async () => {
    await render({ combinationId: 2 });

    const title = element.querySelector('.combination-title')!;
    expect(title.textContent?.trim()).toBe('Combination 002');
    expect(title.querySelector('.visually-hidden')?.textContent).toBe('Combination ');
  });

  it('shows 2 colors side by side, in book order', async () => {
    await render({ combinationId: 2 });

    expect(element.querySelector('.body')?.classList).toContain('count-2');
    expect(names()).toEqual(['Dark Tyrian Blue', 'Yellow Orange']);
    expect(element.querySelectorAll('.figure .swatch').length).toBe(2);
  });

  it('shows 3 colors side by side, in book order', async () => {
    await render({ combinationId: 121 });

    expect(element.querySelector('.body')?.classList).toContain('count-3');
    expect(names()).toEqual(['Lincoln Green', 'Ochraceous Salmon', 'Brown']);
  });

  it('lays out 4 colors as a cross (top, middle left, middle right, bottom)', async () => {
    await render({ combinationId: 245 });

    expect(element.querySelector('.body')?.classList).toContain('count-4');
    const placed = (selector: string) =>
      Array.from(element.querySelectorAll(selector)).map((el) => {
        const pos = Array.from(el.classList).find((c) => c.startsWith('pos-'));
        return [pos, el.textContent?.trim() || el.getAttribute('style')];
      });

    expect(placed('.label')).toEqual([
      ['pos-top', 'Oil Green'],
      ['pos-left', 'Slate Color'],
      ['pos-right', 'Dark Tyrian Blue'],
      ['pos-bottom', 'Carmine Red'],
    ]);
    expect(placed('.figure .swatch').map(([pos]) => pos)).toEqual([
      'pos-top',
      'pos-left',
      'pos-right',
      'pos-bottom',
    ]);
  });

  it('links every color when there is no current color', async () => {
    await render({ combinationId: 2 });

    const links = Array.from(element.querySelectorAll('a.member'));
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe(
      `/color/${colors.indexOf(byName('Dark Tyrian Blue'))}`,
    );
    // The swatches link too, but are hidden from keyboard and screen readers (names suffice).
    const swatchLink = element.querySelector('a.swatch')!;
    expect(swatchLink.getAttribute('tabindex')).toBe('-1');
    expect(element.querySelector('.figure')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('highlights the current color without linking it', async () => {
    await render({ combinationId: 176, current: colors[0] });

    expect(element.querySelector('.member.current .name')?.textContent).toBe('Hermosa Pink');
    expect(element.querySelectorAll('a.member').length).toBe(2);
    expect(element.querySelectorAll('a.swatch').length).toBe(2);
  });

  it('uses the given heading level', async () => {
    await render({ combinationId: 176, headingLevel: 4 });
    expect(element.querySelector('.combination-title')?.getAttribute('aria-level')).toBe('4');
  });
});
