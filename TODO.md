# TODO

## Tune the near-match cutoff with a real wardrobe

The cutoff for near matches is a first estimate based on statistics from the palette, not on real items.

- [ ] Add a realistic set of wardrobe items, with photos, and look at the near matches in "Goes well with" on several item detail pages.
- [ ] If near matches feel too loose (stand-ins that don't really fit the combination), lower `NEAR_MATCH_MAX_SCORE` to about **10**.
- [ ] If near matches seem too rare, raise it to about **14**.
- [ ] If one specific rule seems too strict or too lenient, adjust that weight in `HARMONY_WEIGHTS` instead. The rules are value/contrast, warm ↔ cool, and muted ↔ vivid. If you change the weights, recalibrate the cutoff too.

**Where:** [`src/app/models/harmony.ts`](src/app/models/harmony.ts): `NEAR_MATCH_MAX_SCORE` and `HARMONY_WEIGHTS`.

**Reference values from the palette calibration** (current weights):
- The best stand-in for a typical combination colour scores about **8** (median); 75% score under about **11.3**.
- A single contrast flip, warm ↔ cool flip or muted ↔ vivid role change adds **10**.
- Example: for Seashell Pink in combination 176, Light Pinkish Cinnamon scores **11.2** (currently just inside the cutoff) and Ivory Buff **13.0** (outside).

**After changing values:** run `npx ng test --watch=false`. Some tests depend on the Seashell Pink → Light Pinkish Cinnamon example being a near match (score ≤ cutoff), so they need updating if you go below about 11.2.
