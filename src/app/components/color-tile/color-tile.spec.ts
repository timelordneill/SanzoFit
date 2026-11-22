import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { Color } from '../../models/color';
import { makeColor } from '../../testing/color-fixtures';
import { ColorTile } from './color-tile';

const pink = makeColor({
  id: 0,
  name: 'Hermosa Pink',
  hex: '#f9c1ce',
  cmyk: [0, 30, 6, 0],
  rgb: [249, 193, 206],
  lab: [83.43, 22.14, 1.64],
});

@Component({
  imports: [ColorTile, RouterLink],
  template: `
    <a appColorTile id="link" size="lg" [color]="color()" routerLink="/color/0"></a>
    <button
      appColorTile
      id="button"
      [color]="color()"
      [values]="['custom line']"
      [disabled]="disabled()"
    >
      <span tileStart class="before">→</span>
      <span class="after">+ Add</span>
    </button>
    <div
      appColorTile
      id="plain"
      swatch="rgb(1, 2, 3)"
      name="Picked from photo"
      [values]="['R1 G2 B3']"
    ></div>
  `,
})
class Host {
  readonly color = signal<Color>(pink);
  readonly disabled = signal(false);
}

describe('ColorTile', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  const tile = (id: string) => element.querySelector<HTMLElement>(`#${id}`)!;
  const texts = (el: Element, selector: string) =>
    Array.from(el.querySelectorAll(selector)).map((n) => n.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the color name with its CMYK and RGB values by default', () => {
    const link = tile('link');
    expect(link.querySelector('.name')?.textContent).toBe('Hermosa Pink');
    expect(texts(link, '.value')).toEqual(['C0 M30 Y6 K0', 'R249 G193 B206']);
    expect(link.getAttribute('href')).toBe('/color/0');
    expect(link.classList).toContain('color-tile');
    expect(link.classList).toContain('tile-lg');
  });

  it('accepts custom value lines and projected content before and after', () => {
    const button = tile('button');
    expect(texts(button, '.value')).toEqual(['custom line']);
    // Order: projected "tileStart" content, swatch, text, other projected content.
    const order = Array.from(button.children).map((c) => c.className.split(' ')[0]);
    expect(order).toEqual(['before', 'swatch', 'text', 'after']);
  });

  it('works without a palette color (e.g. a photo pixel)', () => {
    const plain = tile('plain');
    expect(plain.querySelector('.name')?.textContent).toBe('Picked from photo');
    expect(texts(plain, '.value')).toEqual(['R1 G2 B3']);
    expect(plain.querySelector<HTMLElement>('.swatch')!.style.backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('leaves behaviour like disabling to the host element', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(tile('button').hasAttribute('disabled')).toBe(true);
  });
});
