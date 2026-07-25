import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlterarSenhaRequest, DefinirSenhaRequest, LoginRequest, LoginResponse } from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly apiUrl = environment.apiUrl;

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap((response) => this.tokenStorage.save(response)),
    );
  }

  definirSenha(request: DefinirSenhaRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/definir-senha`, request);
  }

  alterarSenha(request: AlterarSenhaRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/alterar-senha`, request);
  }

  logout(): void {
    this.tokenStorage.clear();
  }

  isAuthenticated(): boolean {
    const token = this.tokenStorage.token;
    const user = this.tokenStorage.user;
    if (!token || !user || new Date(user.expiraEm).getTime() <= Date.now()) {
      this.tokenStorage.clear();
      return false;
    }
    return true;
  }
}
