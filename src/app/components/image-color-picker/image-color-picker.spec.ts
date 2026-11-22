import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Color } from '../../models/color';
import { ColorsService } from '../../services/colors.service';
import { ImageSamplerService } from '../../services/image-sampler.service';
import { ImageColorPicker } from './image-color-picker';

const PHOTO = 'data:image/jpeg;base64,AAAA';

describe('ImageColorPicker', () => {
  let fixture: ComponentFixture<ImageColorPicker>;
  let element: HTMLElement;
  let colors: Color[];
  let sample: ReturnType<typeof vi.fn>;
  let chosen: Color[];

  beforeEach(async () => {
    sample = vi.fn(async () => [249, 193, 206]); // Hermosa Pink's RGB
    await TestBed.configureTestingModule({
      imports: [ImageColorPicker],
      providers: [{ provide: ImageSamplerService, useValue: { sample } }],
    }).compileComponents();
    colors = await TestBed.inject(ColorsService).loadColors();

    fixture = TestBed.createComponent(ImageColorPicker);
    fixture.componentRef.setInput('src', PHOTO);
    chosen = [];
    fixture.componentInstance.colorChosen.subscribe((color) => chosen.push(color));
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  /** Simulates a click at (x, y) on a photo displayed at 200×100 with 800×400 pixels. */
  async function clickPhoto(x: number, y: number) {
    const photo = element.querySelector<HTMLImageElement>('img.photo')!;
    Object.defineProperty(photo, 'naturalWidth', { value: 800, configurable: true });
    Object.defineProperty(photo, 'naturalHeight', { value: 400, configurable: true });
    photo.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 100 }) as DOMRect;
    photo.dispatchEvent(new MouseEvent('click', { clientX: 10 + x, clientY: 20 + y }));
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  const matchNames = () =>
    Array.from(element.querySelectorAll('.match .name')).map((n) => n.textContent);

  it('shows only the photo and a hint before clicking', () => {
    expect(element.querySelector<HTMLImageElement>('img.photo')?.getAttribute('src')).toBe(PHOTO);
    expect(element.querySelector('.marker')).toBeNull();
    expect(element.querySelector('.result')).toBeNull();
  });

  it('samples the clicked spot in image pixels and shows the closest colors', async () => {
    await clickPhoto(50, 25); // a quarter across and down

    expect(sample).toHaveBeenCalledWith(PHOTO, 200, 100);
    const marker = element.querySelector<HTMLElement>('.marker')!;
    expect(marker.style.left).toBe('25%');
    expect(marker.style.top).toBe('25%');

    expect(element.querySelector('.sample .value')?.textContent).toBe('R249 G193 B206');
    expect(matchNames()).toHaveLength(3);
    expect(matchNames()[0]).toBe('Hermosa Pink');
    expect(element.querySelector('.match .value:last-child')?.textContent).toContain('Very close');
  });

  it('emits the chosen match', async () => {
    await clickPhoto(50, 25);
    element.querySelector<HTMLButtonElement>('.match')!.click();

    expect(chosen.map((c) => c.name)).toEqual(['Hermosa Pink']);
  });

  it('marks matches that are already selected as added', async () => {
    fixture.componentRef.setInput('selectedHexes', [colors[0].hex]);
    await clickPhoto(50, 25);

    const first = element.querySelector<HTMLButtonElement>('.match')!;
    expect(first.disabled).toBe(true);
    expect(first.querySelector('.action')?.textContent).toBe('Added');
    first.click();
    expect(chosen).toEqual([]);
  });

  it('shows an error when the photo cannot be read', async () => {
    sample.mockRejectedValueOnce(new Error('broken'));
    await clickPhoto(50, 25);

    expect(element.textContent).toContain('Could not read the color');
    expect(element.querySelector('.result')).toBeNull();
  });

  it('clears the pick when the photo changes', async () => {
    await clickPhoto(50, 25);
    fixture.componentRef.setInput('src', 'data:image/jpeg;base64,BBBB');
    await fixture.whenStable();

    expect(element.querySelector('.marker')).toBeNull();
    expect(element.querySelector('.result')).toBeNull();
  });
});
