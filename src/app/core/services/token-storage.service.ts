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

    return sessionStorage.getItem(TOKEN_KEY);
  }

  get user(): LoginResponse | null {
    if (!this.hasStorage()) {
      return null;
    }

    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as LoginResponse;
    } catch {
      this.clear();
      return null;
    }
  }

  save(login: LoginResponse): void {
    if (!this.hasStorage()) {
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, login.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(login));
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  clear(): void {
    if (!this.hasStorage()) {
      return;
    }

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private hasStorage(): boolean {
    return typeof sessionStorage !== 'undefined';
  }
}
