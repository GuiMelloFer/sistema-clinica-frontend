import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error?.mensagem) {
      return error.error.mensagem;
    }

    if (error.status === 0) {
      return 'Nao foi possivel conectar ao servidor.';
    }

    if (error.status === 401 || error.status === 403) {
      return 'Sessao expirada ou acesso nao autorizado.';
    }
  }

  return 'Nao foi possivel concluir a operacao.';
}
