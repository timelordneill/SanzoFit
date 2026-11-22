import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Same router setup as app.config.ts: route params are bound to component inputs.
      providers: [provideRouter(routes, withComponentInputBinding())],
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

    it('opens the edit form at /wardrobe/:id/edit', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/wardrobe/abc/edit');
      expect(TestBed.inject(Router).url).toBe('/wardrobe/abc/edit');
      expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe(
        'Edit wardrobe item',
      );
    });

    it('sends unknown addresses to the wardrobe', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/does-not-exist');
      expect(TestBed.inject(Router).url).toBe('/wardrobe');
    });
  });
});
