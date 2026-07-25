import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Admin, AdminCodigoAcesso, AdminRequest } from '../../../../core/models/admin.model';
import { AlterarSenhaRequest } from '../../../../core/models/auth.model';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TokenStorageService } from '../../../../core/services/token-storage.service';
import { getHttpErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admins.component.html',
  styleUrl: './admins.component.scss',
})
export class AdminsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  readonly tokenStorage = inject(TokenStorageService);

  admins: Admin[] = [];
  loading = false;
  salvandoAdmin = false;
  salvandoSenha = false;
  gerandoCodigoId: string | null = null;
  removendoId: string | null = null;
  error: string | null = null;
  adminError: string | null = null;
  senhaError: string | null = null;
  senhaSuccess: string | null = null;
  codigoGerado: AdminCodigoAcesso | null = null;

  novoAdmin: AdminRequest = {
    nome: '',
    email: '',
  };

  senhaForm: AlterarSenhaRequest = {
    senhaAtual: '',
    novaSenha: '',
  };

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.error = null;

    this.adminService.listar()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (admins) => this.admins = admins,
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  criarAdmin(): void {
    if (!this.novoAdmin.nome.trim() || !this.novoAdmin.email.trim()) {
      this.adminError = 'Informe nome e e-mail do admin.';
      return;
    }

    this.salvandoAdmin = true;
    this.adminError = null;
    this.codigoGerado = null;

    this.adminService.criar({
      nome: this.novoAdmin.nome.trim(),
      email: this.novoAdmin.email.trim(),
    })
      .pipe(finalize(() => this.salvandoAdmin = false))
      .subscribe({
        next: (response) => {
          this.codigoGerado = response;
          this.novoAdmin = { nome: '', email: '' };
          this.carregar();
        },
        error: (error) => this.adminError = getHttpErrorMessage(error),
      });
  }

  gerarCodigo(admin: Admin): void {
    this.gerandoCodigoId = admin.id;
    this.error = null;
    this.codigoGerado = null;

    this.adminService.gerarCodigoAcesso(admin.id)
      .pipe(finalize(() => this.gerandoCodigoId = null))
      .subscribe({
        next: (response) => {
          this.codigoGerado = response;
          this.carregar();
        },
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  remover(admin: Admin): void {
    if (!confirm(`Remover acesso de ${admin.nome}?`)) {
      return;
    }

    this.removendoId = admin.id;
    this.error = null;

    this.adminService.remover(admin.id)
      .pipe(finalize(() => this.removendoId = null))
      .subscribe({
        next: () => this.carregar(),
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  alterarSenha(): void {
    if (!this.senhaForm.senhaAtual || !this.senhaForm.novaSenha) {
      this.senhaError = 'Informe a senha atual e a nova senha.';
      return;
    }

    if (this.senhaForm.novaSenha.length < 12) {
      this.senhaError = 'A nova senha deve ter pelo menos 12 caracteres.';
      return;
    }

    this.salvandoSenha = true;
    this.senhaError = null;
    this.senhaSuccess = null;

    this.authService.alterarSenha(this.senhaForm)
      .pipe(finalize(() => this.salvandoSenha = false))
      .subscribe({
        next: () => {
          this.senhaForm = { senhaAtual: '', novaSenha: '' };
          this.senhaSuccess = 'Senha alterada com sucesso.';
        },
        error: (error) => this.senhaError = getHttpErrorMessage(error),
      });
  }

  adminAtual(admin: Admin): boolean {
    return admin.email === this.tokenStorage.user?.email;
  }
}
