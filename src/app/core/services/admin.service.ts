import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Admin, AdminCodigoAcesso, AdminRequest } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(): Observable<Admin[]> {
    return this.http.get<Admin[]>(`${this.apiUrl}/admins`);
  }

  criar(request: AdminRequest): Observable<AdminCodigoAcesso> {
    return this.http.post<AdminCodigoAcesso>(`${this.apiUrl}/admins`, request);
  }

  gerarCodigoAcesso(id: string): Observable<AdminCodigoAcesso> {
    return this.http.post<AdminCodigoAcesso>(`${this.apiUrl}/admins/${id}/codigo-acesso`, {});
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admins/${id}`);
  }
}
