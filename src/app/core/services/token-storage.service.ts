import { Injectable } from '@angular/core';
import { LoginResponse } from '../models/auth.model';

const TOKEN_KEY = 'clinica.token';
const USER_KEY = 'clinica.user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  get token(): string | null {
    if (!this.hasStorage()) {
      return null;
    }

    return localStorage.getItem(TOKEN_KEY);
  }

  get user(): LoginResponse | null {
    if (!this.hasStorage()) {
      return null;
    }

    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as LoginResponse : null;
  }

  save(login: LoginResponse): void {
    if (!this.hasStorage()) {
      return;
    }

    localStorage.setItem(TOKEN_KEY, login.token);
    localStorage.setItem(USER_KEY, JSON.stringify(login));
  }

  clear(): void {
    if (!this.hasStorage()) {
      return;
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private hasStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
