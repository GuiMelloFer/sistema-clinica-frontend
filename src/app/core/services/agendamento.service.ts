import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agendamento, AgendamentoRequest, StatusAgendamento, TipoAgendamento } from '../models/agendamento.model';

@Injectable({ providedIn: 'root' })
export class AgendamentoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(
    inicio: string,
    fim: string,
    filtros: {
      profissionalId?: string | null;
      unidadeId?: string | null;
      tipo?: TipoAgendamento | null;
      status?: StatusAgendamento | null;
    } = {},
  ): Observable<Agendamento[]> {
    let params = new HttpParams()
      .set('inicio', inicio)
      .set('fim', fim);

    if (filtros.profissionalId) {
      params = params.set('profissionalId', filtros.profissionalId);
    }

    if (filtros.unidadeId) {
      params = params.set('unidadeId', filtros.unidadeId);
    }

    if (filtros.tipo) {
      params = params.set('tipo', filtros.tipo);
    }

    if (filtros.status) {
      params = params.set('status', filtros.status);
    }

    return this.http.get<Agendamento[]>(`${this.apiUrl}/agendamentos`, { params });
  }

  criar(request: AgendamentoRequest): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.apiUrl}/agendamentos`, request);
  }

  atualizar(id: string, request: AgendamentoRequest): Observable<Agendamento> {
    return this.http.put<Agendamento>(`${this.apiUrl}/agendamentos/${id}`, request);
  }

  cancelar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/agendamentos/${id}`);
  }
}
