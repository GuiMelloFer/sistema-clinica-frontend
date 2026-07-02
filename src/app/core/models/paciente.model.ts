export interface Paciente {
  id: number;
  numeroPaciente: string | null;
  nome: string;
  dataNascimento: string | null;
  cpf: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  endereco: string | null;
  observacao: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface PacienteRequest {
  numeroPaciente?: string | null;
  nome: string;
  dataNascimento?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  celular?: string | null;
  email?: string | null;
  endereco?: string | null;
  observacao?: string | null;
  ativo?: boolean | null;
}

export interface ImportacaoPacientesResponse {
  totalLinhas: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: string[];
}
