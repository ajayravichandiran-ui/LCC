
import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';


import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  // 1. Authentication routes (without sidebar)
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },


  // 2. Application routes (with sidebar)
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products/products').then(m => m.Products)
      },
      {
        path: 'lcc',
        loadComponent: () =>
          import('./pages/lcc/lcc.component').then(m => m.LccComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/reports').then(m => m.ReportsComponent)
      },
      {
        path: 'distribution',
        loadComponent: () =>
          import('./pages/distribution/distribution').then(m => m.Distribution)
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./pages/members/members').then(m => m.MembersComponent)
      }
    ]
  },

  // 3. Fallback route (unknown URLs)
  { path: '**', redirectTo: 'login' }
];
