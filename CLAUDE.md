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
1. **Colors (static, read-only):** `src/assets/colors.json` (159 colors) and `src/assets/combinations.json` (348 combinations).
   - `src/assets` is *not* an asset folder in `angular.json` (only `public/` is), so these files aren't served over HTTP. `ColorsService.loadColors()` loads both with dynamic `import()`s, which become lazy chunks, and validates them into the `Color` model (`cmyk`/`lab`/`rgb` are fixed-length tuples).
   - The service exposes signals: `colors`, `combinations` (`Map<combinationNumber, Color[]>`), `byHex` and `byId`.
   - `combinations.json` lists each combination's colours (by hex) **in the book's order**: left to right for 2 and 3 colours; top, middle left, middle right, bottom for 4. `ColorCombination` relies on that order. It is the **only** place membership is stored: `color.combinations` (ascending combination ids) is derived from it at load, and `colors.json` has no `combinations` field. To change a combination, edit only `combinations.json`. All combination and matching logic builds on `ColorsService.combinations`.
   - Colour identity: in URLs a colour is its stable **`id`** (`/color/:id`; the ids equal the original array positions, so old links still work). Stored data (wardrobe items) references colours by **hex**, which is unique.
   - `color.properties` (lightness, chroma, hue, warmth) is **derived at load** from `lab` by `colorProperties`, not stored in the JSON. It depends on design choices, such as the 60° warm axis, that may be tuned.
   - Pages and components that render colors call `loadColors()` themselves (it's cached), so deep links work.
   - **Paint palette swatches with `toCssColor(color)`** (`models/color.ts`), not RGB. It emits CSS `lab()` from the stored, print/CMYK-based Lab values, and falls back to RGB in browsers without `lab()`. RGB is only for text labels (`toRgbLabel`) and real screen pixels (the photo sample in `ImageColorPicker`).
2. **Wardrobe items (read/write):** browser **localStorage**, key `sanzofit.wardrobeItems` (`WARDROBE_STORAGE_KEY`), holding a JSON array of `WardrobeItem`. Ids come from `crypto.randomUUID()`. Data is per browser and per origin: localhost and the Pages site don't share it.
   - `WardrobeService` keeps a promise-based API (`load`, `getById`, `create`) and exposes `items` as a signal. Unreadable storage counts as empty.
   - It throws typed errors: `WardrobeItemNotFoundError` (the detail page checks for it) and `WardrobeStorageFullError` (the create page shows its message).
   - Item photos are stored inline as resized JPEG data URLs (`ImageResizeService`, max 800px). They're what fills the roughly 5 MB localStorage quota.

### Deployment (GitHub Pages)
`.github/workflows/deploy.yml` runs on pushes to `main`: `npm ci`, the tests, then `npm run build:pages`. It copies `index.html` to `404.html`, because Pages has no SPA fallback and deep links would otherwise 404, and publishes `dist/sanzo-fit/browser`. The site lives at `https://<user>.github.io/SanzoFit/`. If the repo is renamed, change the base href in the `build:pages` script.

### Routing and components
- `app.routes.ts` lazy-loads every page. `withComponentInputBinding()` is enabled, so route params arrive as signal inputs (`id = input.required<string>()`). `wardrobe/new` must stay before `wardrobe/:id`. The start screen (`''`) redirects to `/wardrobe`, and the colour list lives at `/colors`.
- `WardrobeItemForm` (`pages/wardrobe-item-form/`) handles both **create** (`/wardrobe/new`) and **edit** (`/wardrobe/:id/edit`): the optional `id` input switches it to edit mode, where it loads the item, fills the form and photo, and saves via `WardrobeService.update`. Tests that route to it need `provideRouter(routes, withComponentInputBinding())`, as in `app.config.ts`.
- `pages/` holds routed screens; `components/` holds reusable pieces. Composition: `ColorDetail` (hero + list) renders one `ColorCombination` per combination, and the wardrobe item detail page reuses both. These components take a `headingLevel` input (rendered as `role="heading"` + `aria-level`) so they can be nested under a page heading.
- Picking a color from a photo: `ImageColorPicker` (item form) samples an averaged pixel area through `ImageSamplerService` (canvas) and matches it with `models/color-match.ts`. That file converts the *sample* from sRGB to Lab (D65) and compares it with CIEDE2000 against each palette color's **stored `lab` value**, which is print/CMYK-based (a deliberate choice; a few intense colors like Peacock Blue lie outside what sRGB can show). `deltaE2000` is verified against the Sharma et al. reference pairs.
- Automatic suggestions: `PhotoColorSuggestions` (item form) gets a ≤100px copy of the photo from `ImageSamplerService.pixels()` and runs `findDominantColors` (`models/dominant-colors.ts`):
  - k-means (k = 6, seeded k-means++, so it's deterministic) on Lab values
  - drops clusters within ΔE₀₀ 12 of the background, which is estimated from the photo's edge frame (the median colour, if it covers ≥ 60% of the frame)
  - merges clusters within ΔE₀₀ 8 of each other, drops ones under 5%, and keeps at most 5
  - matches each remaining colour with `findClosestColorsToLab`; nothing is added without the user clicking
- Harmony-aware substitutes, `models/harmony.ts`:
  - `harmonyScore(target, candidate, combination)` = ΔE₀₀, plus penalties for lightness changes beyond 5, light/dark order flips against the other combination colours, warm ↔ cool flips (warmth = chroma·cos(hue − 60°); neutrals are exempt) and muted ↔ vivid role changes within the combination
  - all weights are in `HARMONY_WEIGHTS`
  - `NEAR_MATCH_MAX_SCORE` (12) was calibrated on the palette; recalibrate it if you change the weights
- Wardrobe matching is pure functions in `models/wardrobe-match.ts`. With `{ byHex }` passed (the detail page does), an item without an exact combination colour can still match as a **near match** (`nearMatch` on the combination). Exact matches always win and sort first. `findWardrobeMatches` treats another item as a match when it has a *different* color of a combination that this item is in. `groupMatchesByCombination` regroups those matches per combination. Keep this logic out of components so it stays unit-testable.
- **`ColorTile`** (`[appColorTile]`, an attribute component) is the one book-style colour tile: swatch, name, value lines and a right rule. Put it on whatever element is needed (`<a>`, `<button>`, `<div>`). Use `size` (`sm`/`md`/`lg`), `values` for custom lines, `swatch`/`name` for non-palette colours (photo pixels), a `tileStart` element for content before the swatch, and other content after the text. Don't hand-build swatch-and-name markup.
- The wardrobe item detail page only loads data and computes the match groups. `MatchGroups` ("Goes well with") and `MoreCombinations` (the remaining plates) render the sections.
- Async loading uses Angular's `resource()` (status, error and value; outdated loads are ignored), not hand-written state signals or run counters. **Testing note:** a pending `resource()` keeps `fixture.whenStable()` waiting, so to test a never-finishing load, render with `fixture.detectChanges()` instead.
- Naming: services use the `*.service.ts` suffix. The CLI now generates `foo.ts`, so rename new services to match. The color page class is `ColorPage` so it doesn't clash with the `Color` model.

### Testing conventions
- Build synthetic colors with `makeColor({ … })` from `src/app/testing/color-fixtures.ts` (defaults for every field, `properties` derived from `lab`) instead of hand-writing `Color` objects.
- Specs load the real `colors.json` with `await TestBed.inject(ColorsService).loadColors()` and assert against real data. For example, Hermosa Pink is index 0 and is in combinations 176, 227 and 273. Check the data before choosing fixtures: test items often match more combinations than expected.
- Wardrobe specs use jsdom's real localStorage: `localStorage.clear()` in `beforeEach`, seed with `localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(items))` *before* creating the component, and simulate failures with `vi.spyOn(...)`.
- jsdom has no canvas or `createImageBitmap`: provide fakes for `ImageResizeService` and `ImageSamplerService` in component tests. To simulate a click on a photo, stub `naturalWidth`/`naturalHeight` and `getBoundingClientRect` on the `<img>`.
- Routed components need `provideRouter([])`. Set route-param inputs with `fixture.componentRef.setInput('id', ...)`.

### Styling
`src/styles.scss` holds the global design tokens and the few shared utility classes. Everything else is component-scoped SCSS.
- **Tokens:** `--color-primary`, `--color-text`, `--color-text-soft`, `--color-muted`, `--color-bg`, `--color-danger`, `--color-border`, `--color-rule` (the thin book-style rules) and `--swatch-edge` (the faint inset edge on swatches). Use these instead of hex values.
- **Utility classes:** `.muted`, `.error` and `.back` (the "← …" link at the top of a page). Components only add local tweaks such as `margin`/`font-size` on top; don't redefine their colours.
