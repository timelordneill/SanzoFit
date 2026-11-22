import { Routes } from '@angular/router';

export const routes: Routes = [
  // The wardrobe is the start screen.
  { path: '', pathMatch: 'full', redirectTo: 'wardrobe' },
  {
    path: 'colors',
    title: 'SanzoFit · Colors',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'color/:id',
    title: 'SanzoFit · Color',
    loadComponent: () => import('./pages/color/color').then((m) => m.ColorPage),
  },
  {
    path: 'wardrobe',
    title: 'SanzoFit · Wardrobe',
    loadComponent: () => import('./pages/wardrobe/wardrobe').then((m) => m.Wardrobe),
  },
  {
    path: 'wardrobe/new',
    title: 'SanzoFit · New wardrobe item',
    loadComponent: () =>
      import('./pages/wardrobe-item-form/wardrobe-item-form').then(
        (m) => m.WardrobeItemForm,
      ),
  },
  {
    // Must stay after 'wardrobe/new' so "new" isn't treated as an item id.
    path: 'wardrobe/:id',
    title: 'SanzoFit · Wardrobe item',
    loadComponent: () =>
      import('./pages/wardrobe-item-detail/wardrobe-item-detail').then(
        (m) => m.WardrobeItemDetail,
      ),
  },
  {
    // Same form as 'wardrobe/new'; the `:id` puts it in edit mode.
    path: 'wardrobe/:id/edit',
    title: 'SanzoFit · Edit wardrobe item',
    loadComponent: () =>
      import('./pages/wardrobe-item-form/wardrobe-item-form').then((m) => m.WardrobeItemForm),
  },
  { path: '**', redirectTo: 'wardrobe' },
];
