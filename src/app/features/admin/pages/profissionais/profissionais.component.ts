import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Profissional, ProfissionalRequest, TipoProfissional } from '../../../../core/models/profissional.model';
import { ProfissionalService } from '../../../../core/services/profissional.service';
import { getHttpErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-profissionais',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profissionais.component.html',
  styleUrl: './profissionais.component.scss',
})
export class ProfissionaisComponent implements OnInit {
  private readonly profissionalService = inject(ProfissionalService);

  readonly tipos: Array<{ value: TipoProfissional; label: string }> = [
    { value: 'MEDICO', label: 'Medico' },
    { value: 'FISIOTERAPEUTA', label: 'Fisioterapeuta' },
    { value: 'OUTRO', label: 'Outro' },
  ];

  busca = '';
  filtroStatus: 'ativos' | 'inativos' | 'todos' = 'ativos';
  filtroTipo: TipoProfissional | 'todos' = 'todos';
  profissionais: Profissional[] = [];
  total = 0;
  pagina = 0;
  tamanho = 20;
  loading = false;
  salvando = false;
  desativandoId: string | null = null;
  error: string | null = null;
  formError: string | null = null;
  modalAberto = false;
  profissionalEmEdicao: Profissional | null = null;
  form: ProfissionalRequest = this.novoFormulario();

  ngOnInit(): void {
    this.carregar();
  }

  carregar(pagina = 0): void {
    this.loading = true;
    this.error = null;
    this.pagina = pagina;

    this.profissionalService.listar(
      this.busca,
      this.pagina,
      this.tamanho,
      this.ativoSelecionado(),
      this.tipoSelecionado(),
    )
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.profissionais = response.conteudo;
          this.total = response.totalElementos;
          this.pagina = response.pagina;
        },
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  abrirNovo(): void {
    this.profissionalEmEdicao = null;
    this.form = this.novoFormulario();
    this.formError = null;
    this.modalAberto = true;
  }

  abrirEdicao(profissional: Profissional): void {
    this.profissionalEmEdicao = profissional;
    this.form = {
      nome: profissional.nome,
      tipo: profissional.tipo,
      cor: profissional.cor,
      ativo: profissional.ativo,
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
      this.formError = 'Informe o nome do profissional.';
      return;
    }

    this.salvando = true;
    this.formError = null;

    const request = this.limparFormulario(this.form);
    const operacao = this.profissionalEmEdicao
      ? this.profissionalService.atualizar(this.profissionalEmEdicao.id, request)
      : this.profissionalService.criar(request);

    operacao
      .pipe(finalize(() => this.salvando = false))
      .subscribe({
        next: () => {
          this.modalAberto = false;
          this.carregar(this.profissionalEmEdicao ? this.pagina : 0);
        },
        error: (error) => this.formError = getHttpErrorMessage(error),
      });
  }

  desativar(profissional: Profissional): void {
    if (!confirm(`Desativar ${profissional.nome}?`)) {
      return;
    }

    this.desativandoId = profissional.id;
    this.error = null;

    this.profissionalService.desativar(profissional.id)
      .pipe(finalize(() => this.desativandoId = null))
      .subscribe({
        next: () => this.carregar(this.pagina),
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  tipoLabel(tipo: TipoProfissional): string {
    return this.tipos.find((item) => item.value === tipo)?.label ?? tipo;
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

  private tipoSelecionado(): TipoProfissional | null {
    return this.filtroTipo === 'todos' ? null : this.filtroTipo;
  }

  private novoFormulario(): ProfissionalRequest {
    return {
      nome: '',
      tipo: 'MEDICO',
      cor: '#2f7d68',
      ativo: true,
    };
  }

  private limparFormulario(form: ProfissionalRequest): ProfissionalRequest {
    return {
      nome: form.nome.trim(),
      tipo: form.tipo,
      cor: this.limparTexto(form.cor),
      ativo: form.ativo ?? true,
    };
  }

  private limparTexto(valor: string | null | undefined): string | null {
    const texto = valor?.trim();
    return texto ? texto : null;
  }
}
