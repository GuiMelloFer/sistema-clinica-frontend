import { Injectable } from '@angular/core';
import { LoginResponse } from '../models/auth.model';

const TOKEN_KEY = 'clinica.token';
const USER_KEY = 'clinica.user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private memoryLogin: LoginResponse | null = null;

  get token(): string | null {
    return this.readSession(TOKEN_KEY) ?? this.memoryLogin?.token ?? null;
  }

  get user(): LoginResponse | null {
    const raw = this.readSession(USER_KEY);
    if (!raw) {
      return this.memoryLogin;
    }

    try {
      return JSON.parse(raw) as LoginResponse;
    } catch {
      this.removeSession(USER_KEY);
      return this.memoryLogin;
    }
  }

  save(login: LoginResponse): void {
    this.memoryLogin = login;

    const storage = this.sessionStorageOrNull();
    if (storage) {
      try {
        storage.setItem(TOKEN_KEY, login.token);
        storage.setItem(USER_KEY, JSON.stringify(login));
      } catch {
        this.removeSession(TOKEN_KEY);
        this.removeSession(USER_KEY);
      }
    }

    this.removeLocal(TOKEN_KEY);
    this.removeLocal(USER_KEY);
  }

  clear(): void {
    this.memoryLogin = null;
    this.removeSession(TOKEN_KEY);
    this.removeSession(USER_KEY);
    this.removeLocal(TOKEN_KEY);
    this.removeLocal(USER_KEY);
  }

  private readSession(key: string): string | null {
    try {
      return this.sessionStorageOrNull()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private removeSession(key: string): void {
    try {
      this.sessionStorageOrNull()?.removeItem(key);
    } catch {
      // A sessao em memoria continua sendo usada quando o navegador bloqueia o storage.
    }
  }

  private removeLocal(key: string): void {
    try {
      this.localStorageOrNull()?.removeItem(key);
    } catch {
      // A limpeza de dados legados nao deve impedir o login.
    }
  }

  private sessionStorageOrNull(): Storage | null {
    try {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
      return null;
    }
  }

  private localStorageOrNull(): Storage | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }
}
