import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Unidade, UnidadeRequest } from '../../../../core/models/unidade.model';
import { UnidadeService } from '../../../../core/services/unidade.service';
import { getHttpErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './unidades.component.html',
  styleUrl: './unidades.component.scss',
})
export class UnidadesComponent implements OnInit {
  private readonly unidadeService = inject(UnidadeService);

  busca = '';
  filtroStatus: 'ativos' | 'inativos' | 'todos' = 'ativos';
  unidades: Unidade[] = [];
  total = 0;
  pagina = 0;
  tamanho = 20;
  loading = false;
  salvando = false;
  desativandoId: string | null = null;
  error: string | null = null;
  formError: string | null = null;
  modalAberto = false;
  unidadeEmEdicao: Unidade | null = null;
  form: UnidadeRequest = this.novoFormulario();

  ngOnInit(): void {
    this.carregar();
  }

  carregar(pagina = 0): void {
    this.loading = true;
    this.error = null;
    this.pagina = pagina;

    this.unidadeService.listar(this.busca, this.pagina, this.tamanho, this.ativoSelecionado())
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.unidades = response.conteudo;
          this.total = response.totalElementos;
          this.pagina = response.pagina;
        },
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  abrirNovo(): void {
    this.unidadeEmEdicao = null;
    this.form = this.novoFormulario();
    this.formError = null;
    this.modalAberto = true;
  }

  abrirEdicao(unidade: Unidade): void {
    this.unidadeEmEdicao = unidade;
    this.form = {
      nome: unidade.nome,
      endereco: unidade.endereco,
      ativo: unidade.ativo,
    };
    this.formError = null;
    this.modalAberto = true;
  }

  fecharModal(): void {
    if (this.salvando) {
      return;
    }

    this.modalAberto = false;
    this.formError = null;
  }

  salvar(): void {
    if (!this.form.nome.trim()) {
      this.formError = 'Informe o nome da unidade.';
      return;
    }

    this.salvando = true;
    this.formError = null;

    const request = this.limparFormulario(this.form);
    const operacao = this.unidadeEmEdicao
      ? this.unidadeService.atualizar(this.unidadeEmEdicao.id, request)
      : this.unidadeService.criar(request);

    operacao
      .pipe(finalize(() => this.salvando = false))
      .subscribe({
        next: () => {
          this.modalAberto = false;
          this.carregar(this.unidadeEmEdicao ? this.pagina : 0);
        },
        error: (error) => this.formError = getHttpErrorMessage(error),
      });
  }

  desativar(unidade: Unidade): void {
    if (!confirm(`Desativar ${unidade.nome}?`)) {
      return;
    }

    this.desativandoId = unidade.id;
    this.error = null;

    this.unidadeService.desativar(unidade.id)
      .pipe(finalize(() => this.desativandoId = null))
      .subscribe({
        next: () => this.carregar(this.pagina),
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  private ativoSelecionado(): boolean | null {
    if (this.filtroStatus === 'ativos') {
      return true;
    }

    if (this.filtroStatus === 'inativos') {
      return false;
    }

    return null;
  }

  private novoFormulario(): UnidadeRequest {
    return {
      nome: '',
      endereco: null,
      ativo: true,
    };
  }

  private limparFormulario(form: UnidadeRequest): UnidadeRequest {
    return {
      nome: form.nome.trim(),
      endereco: this.limparTexto(form.endereco),
      ativo: form.ativo ?? true,
    };
  }

  private limparTexto(valor: string | null | undefined): string | null {
    const texto = valor?.trim();
    return texto ? texto : null;
  }
}
