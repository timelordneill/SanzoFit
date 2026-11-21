# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start`: `ng serve` on http://localhost:4200. The app is fully static; there's no backend.
- `npm run build`: production build into `dist/sanzo-fit/browser`. Component style budgets are 4 kB (warning) / 8 kB (error) per stylesheet.
- `npm run build:pages`: the same, with base href `/SanzoFit/`, for GitHub Pages.
- `npx ng test --watch=false`: all unit tests (Vitest with jsdom, run through `@angular/build:unit-test`). Plain `ng test` keeps watching.
- Single spec file: `npx ng test --watch=false --include src/app/models/wardrobe-match.spec.ts`
- By test name: `npx ng test --watch=false --filter 'groups the matching'`
- Formatting: Prettier (`.prettierrc`: 100 columns, single quotes, Angular parser for HTML), e.g. `npx prettier --write src`. There is no linter configured.

## Architecture

Angular 22, standalone components and **zoneless** (there's no zone.js). State lives in signals; anything that finishes asynchronously must write to a signal for the view to update.

### Two data sources
1. **Colors (static, read-only):** `src/assets/colors.json` (159 colors). `src/assets` is *not* an asset folder in `angular.json` (only `public/` is), so it isn't served over HTTP. `ColorsService.loadColors()` loads it with a dynamic `import()`, which becomes a lazy chunk, and validates it into the `Color` model (`cmyk`/`lab`/`rgb` are fixed-length tuples). The service exposes signals: `colors`, `combinations` (`Map<combinationNumber, Color[]>`) and `byHex`.
   - Two colors are "in a combination" when they share a number in their `combinations` arrays. All combination and matching logic builds on `ColorsService.combinations`.
   - Color identity: in URLs a color is its **array index** (`/color/:id`, because names contain `/` and `|`). Stored data (wardrobe items) references colors by **hex**, which is unique.
   - Pages and components that render colors call `loadColors()` themselves (it's cached), so deep links work.
2. **Wardrobe items (read/write):** browser **localStorage**, key `sanzofit.wardrobeItems` (`WARDROBE_STORAGE_KEY`), holding a JSON array of `WardrobeItem`. Ids come from `crypto.randomUUID()`. Data is per browser and per origin: localhost and the Pages site don't share it.
   - `WardrobeService` keeps a promise-based API (`load`, `getById`, `create`) and exposes `items` as a signal. Unreadable storage counts as empty.
   - It throws typed errors: `WardrobeItemNotFoundError` (the detail page checks for it) and `WardrobeStorageFullError` (the create page shows its message).
   - Item photos are stored inline as resized JPEG data URLs (`ImageResizeService`, max 800px). They're what fills the roughly 5 MB localStorage quota.

### Deployment (GitHub Pages)
`.github/workflows/deploy.yml` runs on pushes to `main`: `npm ci`, the tests, then `npm run build:pages`. It copies `index.html` to `404.html`, because Pages has no SPA fallback and deep links would otherwise 404, and publishes `dist/sanzo-fit/browser`. The site lives at `https://<user>.github.io/SanzoFit/`. If the repo is renamed, change the base href in the `build:pages` script.

### Routing and components
- `app.routes.ts` lazy-loads every page. `withComponentInputBinding()` is enabled, so route params arrive as signal inputs (`id = input.required<string>()`). `wardrobe/new` must stay before `wardrobe/:id`.
- `pages/` holds routed screens; `components/` holds reusable pieces. Composition: `ColorDetail` (hero + list) renders one `ColorCombination` per combination, and the wardrobe item detail page reuses both. These components take a `headingLevel` input (rendered as `role="heading"` + `aria-level`) so they can be nested under a page heading.
- Wardrobe matching is pure functions in `models/wardrobe-match.ts`. `findWardrobeMatches` treats another item as a match when it has a *different* color of a combination that this item is in. `groupMatchesByCombination` regroups those matches per combination. Keep this logic out of components so it stays unit-testable.
- Naming: services use the `*.service.ts` suffix. The CLI now generates `foo.ts`, so rename new services to match. The color page class is `ColorPage` so it doesn't clash with the `Color` model.

### Testing conventions
- Specs load the real `colors.json` with `await TestBed.inject(ColorsService).loadColors()` and assert against real data. For example, Hermosa Pink is index 0 and is in combinations 176, 227 and 273. Check the data before choosing fixtures: test items often match more combinations than expected.
- Wardrobe specs use jsdom's real localStorage: `localStorage.clear()` in `beforeEach`, seed with `localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(items))` *before* creating the component, and simulate failures with `vi.spyOn(...)`.
- jsdom has no canvas or `createImageBitmap`: provide a fake `ImageResizeService` in component tests.
- Routed components need `provideRouter([])`. Set route-param inputs with `fixture.componentRef.setInput('id', ...)`.

### Styling
Global design tokens (`--color-primary`, `--color-text`, `--color-muted`, `--color-bg`) are defined in `src/styles.scss`. Everything else is component-scoped SCSS.
