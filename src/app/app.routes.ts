import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'pacientes',
        loadComponent: () => import('./features/admin/pages/pacientes/pacientes.component').then((m) => m.PacientesComponent),
      },
      {
        path: 'agenda',
        loadComponent: () => import('./features/admin/pages/agenda/agenda.component').then((m) => m.AgendaComponent),
      },
      {
        path: 'profissionais',
        loadComponent: () => import('./features/admin/pages/profissionais/profissionais.component').then((m) => m.ProfissionaisComponent),
      },
      {
        path: 'unidades',
        loadComponent: () => import('./features/admin/pages/unidades/unidades.component').then((m) => m.UnidadesComponent),
      },
      {
        path: 'admins',
        loadComponent: () => import('./features/admin/pages/admins/admins.component').then((m) => m.AdminsComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
