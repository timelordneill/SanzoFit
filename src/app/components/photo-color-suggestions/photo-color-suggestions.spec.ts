import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Color } from '../../models/color';
import { Rgb } from '../../models/color-match';
import { ColorsService } from '../../services/colors.service';
import { ImageSamplerService } from '../../services/image-sampler.service';
import { PhotoColorSuggestions } from './photo-color-suggestions';

const PHOTO = 'data:image/jpeg;base64,AAAA';
const WHITE: Rgb = [246, 246, 244];

function repeat(rgb: Rgb, count: number): Rgb[] {
  return Array.from({ length: count }, () => rgb);
}

describe('PhotoColorSuggestions', () => {
  let fixture: ComponentFixture<PhotoColorSuggestions>;
  let element: HTMLElement;
  let colors: Color[];
  let pixels: ReturnType<typeof vi.fn>;
  let chosen: Color[];

  const byName = (name: string) => colors.find((c) => c.name === name)!;
  const names = () => Array.from(element.querySelectorAll('.suggestion .name')).map((n) => n.textContent);

  /** A photo of a mostly Hermosa Pink item with some Blue, on a white background. */
  function pinkAndBluePhoto() {
    return {
      pixels: [
        ...repeat(WHITE, 300),
        ...repeat(byName('Hermosa Pink').rgb, 210),
        ...repeat(byName('Blue').rgb, 90),
      ],
      border: repeat(WHITE, 100),
    };
  }

  async function render(src = PHOTO) {
    fixture.componentRef.setInput('src', src);
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    pixels = vi.fn();
    await TestBed.configureTestingModule({
      imports: [PhotoColorSuggestions],
      providers: [{ provide: ImageSamplerService, useValue: { pixels } }],
    }).compileComponents();
    colors = await TestBed.inject(ColorsService).loadColors();
    pixels.mockResolvedValue(pinkAndBluePhoto());

    fixture = TestBed.createComponent(PhotoColorSuggestions);
    chosen = [];
    fixture.componentInstance.colorChosen.subscribe((color) => chosen.push(color));
    element = fixture.nativeElement as HTMLElement;
  });

  it('suggests the closest palette color for each dominant color, largest first', async () => {
    await render();

    expect(pixels).toHaveBeenCalledWith(PHOTO);
    expect(names()).toEqual(['Hermosa Pink', 'Blue']);
    const first = element.querySelector('.suggestion')!;
    expect(first.textContent).toContain('≈ 70% of the item');
    expect(first.textContent).toContain('Very close');
    // The background (white) is not suggested.
    expect(names()).not.toContain('White');
  });

  it('adds a single suggestion', async () => {
    await render();
    element.querySelectorAll<HTMLButtonElement>('.suggestion')[1].click();

    expect(chosen.map((c) => c.name)).toEqual(['Blue']);
  });

  it('adds all suggestions that are not selected yet', async () => {
    fixture.componentRef.setInput('selectedHexes', [byName('Blue').hex]);
    await render();

    const blue = element.querySelectorAll<HTMLButtonElement>('.suggestion')[1];
    expect(blue.disabled).toBe(true);
    expect(blue.querySelector('.action')?.textContent).toBe('Added');
    // Only one left to add, so no "Add all" button.
    expect(element.querySelector('.add-all')).toBeNull();

    fixture.componentRef.setInput('selectedHexes', []);
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.add-all')!.click();
    expect(chosen.map((c) => c.name)).toEqual(['Hermosa Pink', 'Blue']);
  });

  it('shows a progress message while analysing', async () => {
    pixels.mockReturnValue(new Promise(() => {})); // never resolves
    await render();
    expect(element.textContent).toContain('Analysing photo…');
  });

  it('says so when no clear colors are found', async () => {
    pixels.mockResolvedValue({ pixels: repeat(WHITE, 100), border: repeat(WHITE, 50) });
    await render();
    expect(element.textContent).toContain('No clear colors found');
  });

  it('shows an error when the photo cannot be analysed', async () => {
    pixels.mockRejectedValue(new Error('broken'));
    await render();
    expect(element.textContent).toContain('Could not analyse this photo');
  });

  it('analyses again when the photo changes', async () => {
    await render();
    pixels.mockResolvedValue({
      pixels: repeat(byName('Lemon Yellow').rgb, 100),
      border: repeat(WHITE, 50),
    });
    await render('data:image/jpeg;base64,BBBB');

    expect(pixels).toHaveBeenLastCalledWith('data:image/jpeg;base64,BBBB');
    expect(names()).toEqual(['Lemon Yellow']);
  });
});
