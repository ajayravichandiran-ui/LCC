
import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { ForgotPassword } from './pages/forgot-password/forgot-password';

import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  // 1. Authentication routes (without sidebar)
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPassword },

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
      }
    ]
  },

  // 3. Fallback route (unknown URLs)
  { path: '**', redirectTo: 'login' }
];
