import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
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
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    this.authService.login(this.form.getRawValue())
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  definirSenha(): void {
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
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.success = 'Senha criada com sucesso. Entre com seu e-mail e senha.';
          this.form.patchValue({ email: request.email.trim(), senha: '' });
          this.primeiroAcessoForm.reset();
          this.modo = 'login';
        },
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  alterarModo(modo: 'login' | 'primeiro-acesso' | 'recuperar'): void {
    this.modo = modo;
    this.error = null;
    this.success = null;
  }
}
