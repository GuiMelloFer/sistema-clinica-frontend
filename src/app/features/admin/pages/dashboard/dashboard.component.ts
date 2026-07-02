import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly cards = [
    { label: 'Pacientes', value: 'Importacao pronta', path: '/pacientes' },
    { label: 'Agenda', value: 'Conflitos com confirmacao', path: '/agenda' },
    { label: 'Ficha', value: 'Impressao via backend', path: '/pacientes' },
  ];
}
