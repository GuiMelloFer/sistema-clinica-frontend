export interface Admin {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  senhaDefinida: boolean;
  codigoExpiraEm: string | null;
  criadoEm: string;
}

export interface AdminRequest {
  nome: string;
  email: string;
}

export interface AdminCodigoAcesso {
  id: string;
  nome: string;
  email: string;
  codigoAcesso: string;
  expiraEm: string;
}
