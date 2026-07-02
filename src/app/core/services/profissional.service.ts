import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginaResponse } from '../models/pagina.model';
import { Profissional, ProfissionalRequest, TipoProfissional } from '../models/profissional.model';

@Injectable({ providedIn: 'root' })
export class ProfissionalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(
    busca = '',
    page = 0,
    size = 20,
    ativo: boolean | null = true,
    tipo: TipoProfissional | null = null,
  ): Observable<PaginaResponse<Profissional>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'nome');

    if (busca.trim()) {
      params = params.set('busca', busca.trim());
    }

    if (ativo !== null) {
      params = params.set('ativo', ativo);
    }

    if (tipo !== null) {
      params = params.set('tipo', tipo);
    }

    return this.http.get<PaginaResponse<Profissional>>(`${this.apiUrl}/profissionais`, { params });
  }

  criar(request: ProfissionalRequest): Observable<Profissional> {
    return this.http.post<Profissional>(`${this.apiUrl}/profissionais`, request);
  }

  atualizar(id: string, request: ProfissionalRequest): Observable<Profissional> {
    return this.http.put<Profissional>(`${this.apiUrl}/profissionais/${id}`, request);
  }

  desativar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/profissionais/${id}`);
  }
}
