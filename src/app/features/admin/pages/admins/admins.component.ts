import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeoutError, timeout } from 'rxjs';
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
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
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
      .pipe(timeout(10_000))
      .subscribe({
        next: (admins) => {
          this.admins = admins;
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A consulta de administradores');
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
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
      .pipe(timeout(15_000))
      .subscribe({
        next: (response) => {
          this.salvandoAdmin = false;
          this.codigoGerado = response;
          this.novoAdmin = { nome: '', email: '' };
          this.carregar();
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.adminError = this.mensagemErro(error, 'A criacao do administrador');
          this.salvandoAdmin = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  gerarCodigo(admin: Admin): void {
    this.gerandoCodigoId = admin.id;
    this.error = null;
    this.codigoGerado = null;

    this.adminService.gerarCodigoAcesso(admin.id)
      .pipe(timeout(15_000))
      .subscribe({
        next: (response) => {
          this.gerandoCodigoId = null;
          this.codigoGerado = response;
          this.carregar();
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A geracao do codigo de acesso');
          this.gerandoCodigoId = null;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  remover(admin: Admin): void {
    if (!confirm(`Remover acesso de ${admin.nome}?`)) {
      return;
    }

    this.removendoId = admin.id;
    this.error = null;

    this.adminService.remover(admin.id)
      .pipe(timeout(15_000))
      .subscribe({
        next: () => {
          this.removendoId = null;
          this.carregar();
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A remocao do administrador');
          this.removendoId = null;
          this.changeDetectorRef.detectChanges();
        },
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
      .pipe(timeout(15_000))
      .subscribe({
        next: () => {
          this.salvandoSenha = false;
          this.senhaForm = { senhaAtual: '', novaSenha: '' };
          this.senhaSuccess = 'Senha alterada com sucesso.';
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.senhaError = this.mensagemErro(error, 'A alteracao da senha');
          this.salvandoSenha = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  adminAtual(admin: Admin): boolean {
    return admin.email === this.tokenStorage.user?.email;
  }

  private mensagemErro(error: unknown, operacao: string): string {
    return error instanceof TimeoutError
      ? `${operacao} excedeu o tempo limite. Tente novamente.`
      : getHttpErrorMessage(error);
  }
}
