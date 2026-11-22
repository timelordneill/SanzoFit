import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WardrobeItem } from '../../models/wardrobe-item';
import { ColorsService } from '../../services/colors.service';
import { ImageResizeService } from '../../services/image-resize.service';
import { ImageSamplerService } from '../../services/image-sampler.service';
import { WardrobeItemNotFoundError, WardrobeService } from '../../services/wardrobe.service';
import { WardrobeItemForm } from './wardrobe-item-form';

const FAKE_DATA_URL = 'data:image/jpeg;base64,AAAA';

describe('WardrobeItemForm', () => {
  let fixture: ComponentFixture<WardrobeItemForm>;
  let element: HTMLElement;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let getById: ReturnType<typeof vi.fn>;
  let toDataUrl: ReturnType<typeof vi.fn>;

  /** An existing item, used in edit mode. */
  const stored: WardrobeItem = {
    id: 'a1',
    name: 'Linen shirt',
    type: 'Top',
    colors: ['#f9c1ce', '#b5decc'], // Hermosa Pink, Turquoise Green
    image: 'data:image/jpeg;base64,STORED',
  };

  beforeEach(async () => {
    create = vi.fn(async (item: Omit<WardrobeItem, 'id'>) => ({ id: 'new', ...item }));
    update = vi.fn(async (id: string, item: Omit<WardrobeItem, 'id'>) => ({ id, ...item }));
    getById = vi.fn(async (id: string) => {
      if (id !== stored.id) throw new WardrobeItemNotFoundError(id);
      return stored;
    });
    toDataUrl = vi.fn(async () => FAKE_DATA_URL);

    await TestBed.configureTestingModule({
      imports: [WardrobeItemForm],
      providers: [
        provideRouter([]),
        { provide: WardrobeService, useValue: { create, update, getById } },
        { provide: ImageResizeService, useValue: { toDataUrl } },
        // Hermosa Pink's RGB, as if sampled from the photo (jsdom has no canvas).
        {
          provide: ImageSamplerService,
          useValue: {
            sample: async () => [249, 193, 206],
            // A Hermosa Pink item on a white background.
            pixels: async () => ({
              pixels: [
                ...Array.from({ length: 60 }, () => [246, 246, 244]),
                ...Array.from({ length: 40 }, () => [249, 193, 206]),
              ],
              border: Array.from({ length: 30 }, () => [246, 246, 244]),
            }),
          },
        },
      ],
    }).compileComponents();

    await TestBed.inject(ColorsService).loadColors();
    fixture = TestBed.createComponent(WardrobeItemForm);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  function setInput(selector: string, value: string) {
    const input = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
  }

  async function submit() {
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  }

  it('does not save until name, type and a color are given', async () => {
    await submit();

    expect(create).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Enter a name.');
    expect(element.textContent).toContain('Choose a type.');
    expect(element.textContent).toContain('Pick at least one color.');
  });

  it('saves the item with the selected colors and returns to the wardrobe', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    setInput('#name', '  Linen shirt ');
    setInput('#type', 'Top');
    const picks = element.querySelectorAll<HTMLButtonElement>('.pick');
    picks[0].click(); // Hermosa Pink
    picks[1].click(); // Corinthian Pink
    await fixture.whenStable();

    expect(element.querySelectorAll('.chip').length).toBe(2);

    await submit();

    expect(create).toHaveBeenCalledWith({
      name: 'Linen shirt',
      type: 'Top',
      colors: ['#f9c1ce', '#f8b6ba'],
    });
    expect(navigate).toHaveBeenCalledWith('/wardrobe');
  });

  async function chooseFile(file: File) {
    const input = element.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve)); // let the async handler finish
    await fixture.whenStable();
  }

  it('previews an uploaded photo and saves it with the item', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await chooseFile(new File(['x'], 'shirt.png', { type: 'image/png' }));
    expect(element.querySelector<HTMLImageElement>('img.preview')?.getAttribute('src')).toBe(
      FAKE_DATA_URL,
    );

    setInput('#name', 'Shirt');
    setInput('#type', 'Top');
    element.querySelector<HTMLButtonElement>('.pick')!.click();
    await submit();

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ image: FAKE_DATA_URL }));
  });

  it('adds a color picked from the photo to the selection', async () => {
    expect(element.querySelector('app-image-color-picker')).toBeNull();
    await chooseFile(new File(['x'], 'shirt.png', { type: 'image/png' }));

    const photo = element.querySelector<HTMLImageElement>('app-image-color-picker img.photo')!;
    Object.defineProperty(photo, 'naturalWidth', { value: 100, configurable: true });
    Object.defineProperty(photo, 'naturalHeight', { value: 100, configurable: true });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    photo.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 50 }));
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    element.querySelector<HTMLButtonElement>('app-image-color-picker .match')!.click();
    await fixture.whenStable();

    expect(Array.from(element.querySelectorAll('.selected .chip')).map((c) => c.textContent)).toEqual([
      expect.stringContaining('Hermosa Pink'),
    ]);
    // Picking the same color again doesn't remove it.
    expect(element.querySelector<HTMLButtonElement>('app-image-color-picker .match')!.disabled).toBe(
      true,
    );
  });

  it('suggests colors from the photo, which can be added', async () => {
    await chooseFile(new File(['x'], 'shirt.png', { type: 'image/png' }));
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    const suggestion = element.querySelector<HTMLButtonElement>(
      'app-photo-color-suggestions .suggestion',
    )!;
    expect(suggestion.querySelector('.name')?.textContent).toBe('Hermosa Pink');

    suggestion.click();
    await fixture.whenStable();

    expect(Array.from(element.querySelectorAll('.selected .chip')).map((c) => c.textContent)).toEqual([
      expect.stringContaining('Hermosa Pink'),
    ]);
  });

  it('can remove the photo again', async () => {
    await chooseFile(new File(['x'], 'shirt.png', { type: 'image/png' }));
    element.querySelector<HTMLButtonElement>('.link-button')!.click();
    await fixture.whenStable();

    expect(element.querySelector('img.preview')).toBeNull();
  });

  it('rejects files that are not images', async () => {
    await chooseFile(new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(toDataUrl).not.toHaveBeenCalled();
    expect(element.textContent).toContain('That file is not an image.');
  });

  it('filters the color picker by name', async () => {
    setInput('.search', 'olive');
    await fixture.whenStable();

    const names = Array.from(element.querySelectorAll('.pick')).map((p) => p.getAttribute('title'));
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((n) => n!.toLowerCase().includes('olive'))).toBe(true);
  });

  it('is in create mode without an id', () => {
    expect(element.querySelector('h2')?.textContent).toBe('New wardrobe item');
    expect(element.querySelector('a.back')?.getAttribute('href')).toBe('/wardrobe');
    expect(getById).not.toHaveBeenCalled();
  });

  describe('edit mode', () => {
    /** Renders the form for an existing item, as the `/wardrobe/:id/edit` route does. */
    async function renderEdit(id = stored.id) {
      fixture = TestBed.createComponent(WardrobeItemForm);
      fixture.componentRef.setInput('id', id);
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve)); // let the item load
      await fixture.whenStable();
      element = fixture.nativeElement as HTMLElement;
    }

    const chipNames = () =>
      Array.from(element.querySelectorAll('.selected .chip')).map((c) => c.textContent?.replace('×', '').trim());

    it('fills the form with the stored item', async () => {
      await renderEdit();

      expect(getById).toHaveBeenCalledWith('a1');
      expect(element.querySelector('h2')?.textContent).toBe('Edit wardrobe item');
      expect(element.querySelector<HTMLInputElement>('#name')!.value).toBe('Linen shirt');
      expect(element.querySelector<HTMLSelectElement>('#type')!.value).toBe('Top');
      expect(chipNames()).toEqual(['Hermosa Pink', 'Turquoise Green']);
      expect(element.querySelector<HTMLImageElement>('img.preview')?.getAttribute('src')).toBe(
        stored.image,
      );
    });

    it('saves the changes and returns to the item', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await renderEdit();

      setInput('#name', 'Linen shirt (blue)');
      setInput('#type', 'Outerwear');
      // Remove Turquoise Green via its chip.
      element.querySelectorAll<HTMLButtonElement>('.selected .chip')[1].click();
      await submit();

      expect(create).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith('a1', {
        name: 'Linen shirt (blue)',
        type: 'Outerwear',
        colors: ['#f9c1ce'],
        image: stored.image,
      });
      expect(navigate).toHaveBeenCalledWith('/wardrobe/a1');
    });

    it('saves without a photo when it was removed', async () => {
      vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await renderEdit();

      element.querySelector<HTMLButtonElement>('.link-button')!.click(); // Remove photo
      await fixture.whenStable();
      await submit();

      expect(update.mock.calls[0][1]).not.toHaveProperty('image');
    });

    it('links back and cancels to the item', async () => {
      await renderEdit();

      expect(element.querySelector('a.back')?.getAttribute('href')).toBe('/wardrobe/a1');
      const cancel = Array.from(element.querySelectorAll('.actions a')).find(
        (a) => a.textContent?.trim() === 'Cancel',
      )!;
      expect(cancel.getAttribute('href')).toBe('/wardrobe/a1');
    });

    it('says so when the item does not exist', async () => {
      await renderEdit('nope');

      expect(element.querySelector('form')).toBeNull();
      expect(element.textContent).toContain("doesn't exist");
    });
  });
});
