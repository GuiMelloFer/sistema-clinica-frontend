import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimeoutError, timeout } from 'rxjs';
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
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

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
      .pipe(timeout(10_000))
      .subscribe({
        next: (response) => {
          this.unidades = response.conteudo;
          this.total = response.totalElementos;
          this.pagina = response.pagina;
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A consulta de unidades');
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
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
      .pipe(timeout(15_000))
      .subscribe({
        next: () => {
          this.salvando = false;
          this.modalAberto = false;
          this.carregar(this.unidadeEmEdicao ? this.pagina : 0);
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.formError = this.mensagemErro(error, 'O salvamento da unidade');
          this.salvando = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  desativar(unidade: Unidade): void {
    if (!confirm(`Desativar ${unidade.nome}?`)) {
      return;
    }

    this.desativandoId = unidade.id;
    this.error = null;

    this.unidadeService.desativar(unidade.id)
      .pipe(timeout(15_000))
      .subscribe({
        next: () => {
          this.desativandoId = null;
          this.carregar(this.pagina);
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A desativacao da unidade');
          this.desativandoId = null;
          this.changeDetectorRef.detectChanges();
        },
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

  private mensagemErro(error: unknown, operacao: string): string {
    return error instanceof TimeoutError
      ? `${operacao} excedeu o tempo limite. Tente novamente.`
      : getHttpErrorMessage(error);
  }
}
