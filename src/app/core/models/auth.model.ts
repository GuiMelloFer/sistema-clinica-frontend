export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEm: string;
  nome: string;
  email: string;
}

export interface DefinirSenhaRequest {
  email: string;
  codigoAcesso: string;
  senha: string;
}

export interface AlterarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
}
