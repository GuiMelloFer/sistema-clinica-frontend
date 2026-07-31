import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { LoginResponse } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('encerra o carregamento e navega depois que o login responde', async () => {
    const login$ = new Subject<LoginResponse>();
    const navigate = vi.fn(() => Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: () => login$,
            definirSenha: () => of(undefined),
          },
        },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      email: ' cliente@clinica.com ',
      senha: 'senha-segura',
    });

    fixture.componentInstance.submit();
    expect(fixture.componentInstance.loading).toBe(true);

    login$.next({
      token: 'jwt-token',
      tipo: 'Bearer',
      expiraEm: '2099-07-31T10:00:00Z',
      nome: 'Cliente',
      email: 'cliente@clinica.com',
    });

    await Promise.resolve();

    expect(fixture.componentInstance.loading).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(fixture.nativeElement.textContent).toContain('Entrar no sistema');
    expect(fixture.nativeElement.textContent).not.toContain('Entrando...');
  });

  it('encerra o carregamento quando o login falha', async () => {
    const login$ = new Subject<LoginResponse>();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: () => login$,
            definirSenha: () => of(undefined),
          },
        },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      email: 'cliente@clinica.com',
      senha: 'senha-incorreta',
    });
    fixture.componentInstance.submit();

    login$.error(new Error('Falha no login'));

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.error).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Entrando...');
  });
});
