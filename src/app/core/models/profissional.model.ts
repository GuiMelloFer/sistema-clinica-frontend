export type TipoProfissional = 'MEDICO' | 'FISIOTERAPEUTA' | 'OUTRO';

export interface Profissional {
  id: string;
  nome: string;
  tipo: TipoProfissional;
  cor: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface ProfissionalRequest {
  nome: string;
  tipo: TipoProfissional;
  cor?: string | null;
  ativo?: boolean | null;
}
