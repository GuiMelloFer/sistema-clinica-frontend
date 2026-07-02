import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImportacaoPacientesResponse, Paciente, PacienteRequest } from '../models/paciente.model';
import { PaginaResponse } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(busca = '', page = 0, size = 20, ativo: boolean | null = true): Observable<PaginaResponse<Paciente>> {
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

    return this.http.get<PaginaResponse<Paciente>>(`${this.apiUrl}/pacientes`, { params });
  }

  criar(request: PacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(`${this.apiUrl}/pacientes`, request);
  }

  atualizar(id: number, request: PacienteRequest): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.apiUrl}/pacientes/${id}`, request);
  }

  desativar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/pacientes/${id}`);
  }

  importar(arquivo: File): Observable<ImportacaoPacientesResponse> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);

    return this.http.post<ImportacaoPacientesResponse>(`${this.apiUrl}/pacientes/importar`, formData);
  }
}
