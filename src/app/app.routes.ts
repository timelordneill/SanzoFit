import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'SanzoFit',
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
      import('./pages/wardrobe-item-create/wardrobe-item-create').then(
        (m) => m.WardrobeItemCreate,
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
  { path: '**', redirectTo: '' },
];
