export type TipoAgendamento = 'CONSULTA' | 'NEUROMODULACAO';
export type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'COMPARECEU' | 'FALTOU' | 'CANCELADO' | 'REMARCADO';

export interface Agendamento {
  id: string;
  pacienteId: number;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  profissionalCor: string | null;
  unidadeId: string;
  unidadeNome: string;
  tipo: TipoAgendamento;
  titulo: string | null;
  dataHoraInicio: string;
  dataHoraFim: string;
  status: StatusAgendamento;
  observacao: string | null;
  avisos: string[];
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface AgendamentoRequest {
  pacienteId: number | null;
  profissionalId: string | null;
  unidadeId: string | null;
  tipo: TipoAgendamento;
  titulo?: string | null;
  dataHoraInicio: string;
  dataHoraFim: string;
  status?: StatusAgendamento | null;
  observacao?: string | null;
  confirmarConflito?: boolean | null;
}
