export interface Unidade {
  id: string;
  nome: string;
  endereco: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface UnidadeRequest {
  nome: string;
  endereco?: string | null;
  ativo?: boolean | null;
}
