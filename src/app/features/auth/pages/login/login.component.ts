import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TimeoutError, timeout } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { getHttpErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  modo: 'login' | 'primeiro-acesso' | 'recuperar' = 'login';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  readonly primeiroAcessoForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    codigoAcesso: ['', [Validators.required]],
    senha: ['', [Validators.required, Validators.minLength(12)]],
  });

  submit(): void {
    this.form.controls.email.setValue(this.form.controls.email.value.trim());

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const request = this.form.getRawValue();

    this.authService.login({
      email: request.email.trim(),
      senha: request.senha,
    })
      .pipe(timeout(60_000))
      .subscribe({
        next: () => {
          this.loading = false;
          this.changeDetectorRef.detectChanges();

          void this.router.navigate(['/dashboard'])
            .then((navegou) => {
              if (!navegou) {
                this.error = 'Nao foi possivel abrir o sistema. Tente entrar novamente.';
                this.changeDetectorRef.detectChanges();
              }
            })
            .catch(() => {
              this.error = 'Nao foi possivel abrir o sistema. Tente entrar novamente.';
              this.changeDetectorRef.detectChanges();
            });
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'O login');
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  definirSenha(): void {
    this.primeiroAcessoForm.patchValue({
      email: this.primeiroAcessoForm.controls.email.value.trim(),
      codigoAcesso: this.primeiroAcessoForm.controls.codigoAcesso.value.trim(),
    });

    if (this.primeiroAcessoForm.invalid || this.loading) {
      this.primeiroAcessoForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    const request = this.primeiroAcessoForm.getRawValue();

    this.authService.definirSenha({
      email: request.email.trim(),
      codigoAcesso: request.codigoAcesso.trim(),
      senha: request.senha,
    })
      .pipe(timeout(60_000))
      .subscribe({
        next: () => {
          this.loading = false;
          this.success = 'Senha criada com sucesso. Entre com seu e-mail e senha.';
          this.form.patchValue({ email: request.email.trim(), senha: '' });
          this.primeiroAcessoForm.reset();
          this.modo = 'login';
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A criacao da senha');
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  alterarModo(modo: 'login' | 'primeiro-acesso' | 'recuperar'): void {
    this.modo = modo;
    this.error = null;
    this.success = null;
  }

  private mensagemErro(error: unknown, operacao: string): string {
    return error instanceof TimeoutError
      ? `${operacao} excedeu o tempo limite. Verifique sua conexao e tente novamente.`
      : getHttpErrorMessage(error);
  }
}
