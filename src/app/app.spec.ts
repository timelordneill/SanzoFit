import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('SanzoFit');
  });

  it('lists Wardrobe first, then Colors, in the nav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'));

    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Wardrobe', '/wardrobe'],
      ['Colors', '/colors'],
    ]);
  });

  describe('routing', () => {
    it('opens the wardrobe as the start screen', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/');
      expect(TestBed.inject(Router).url).toBe('/wardrobe');
    });

    it('shows the colors at /colors', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/colors');
      expect(TestBed.inject(Router).url).toBe('/colors');
      expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe('Colors');
    });

    it('sends unknown addresses to the wardrobe', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/does-not-exist');
      expect(TestBed.inject(Router).url).toBe('/wardrobe');
    });
  });
});
