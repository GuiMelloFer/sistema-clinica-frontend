import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly tokenStorage = inject(TokenStorageService);

  readonly menu = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Pacientes', path: '/pacientes' },
    { label: 'Agenda', path: '/agenda' },
    { label: 'Profissionais', path: '/profissionais' },
    { label: 'Unidades', path: '/unidades' },
    { label: 'Admins', path: '/admins' },
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
