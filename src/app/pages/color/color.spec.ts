import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ColorsService } from '../../services/colors.service';
import { ColorPage } from './color';

describe('ColorPage', () => {
  let fixture: ComponentFixture<ColorPage>;
  let element: HTMLElement;

  async function render(id: string) {
    await TestBed.inject(ColorsService).loadColors();
    fixture = TestBed.createComponent(ColorPage);
    fixture.componentRef.setInput('id', id);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the color detail for the color in the route', async () => {
    await render('0');

    const detail = element.querySelector('app-color-detail');
    expect(detail?.querySelector('.title')?.textContent).toContain('Hermosa Pink');
    expect(detail?.querySelector('.title')?.getAttribute('aria-level')).toBe('2');
    expect(detail?.querySelectorAll('.combination').length).toBe(3);
  });

  it('shows a message for an unknown color', async () => {
    await render('9999');
    expect(element.querySelector('app-color-detail')).toBeNull();
    expect(element.textContent).toContain('Color not found');
  });
});
