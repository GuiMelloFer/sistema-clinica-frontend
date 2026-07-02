import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginaResponse } from '../models/pagina.model';
import { Unidade, UnidadeRequest } from '../models/unidade.model';

@Injectable({ providedIn: 'root' })
export class UnidadeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(busca = '', page = 0, size = 20, ativo: boolean | null = true): Observable<PaginaResponse<Unidade>> {
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

    return this.http.get<PaginaResponse<Unidade>>(`${this.apiUrl}/unidades`, { params });
  }

  criar(request: UnidadeRequest): Observable<Unidade> {
    return this.http.post<Unidade>(`${this.apiUrl}/unidades`, request);
  }

  atualizar(id: string, request: UnidadeRequest): Observable<Unidade> {
    return this.http.put<Unidade>(`${this.apiUrl}/unidades/${id}`, request);
  }

  desativar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/unidades/${id}`);
  }
}
