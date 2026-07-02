import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, finalize, switchMap, takeUntil } from 'rxjs';
import { ImportacaoPacientesResponse, Paciente, PacienteRequest } from '../../../../core/models/paciente.model';
import { PacienteService } from '../../../../core/services/paciente.service';
import { TokenStorageService } from '../../../../core/services/token-storage.service';
import { getHttpErrorMessage } from '../../../../core/utils/http-error.util';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss',
})
export class PacientesComponent implements OnInit, OnDestroy {
  private readonly pacienteService = inject(PacienteService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly buscaSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  busca = '';
  pacientes: Paciente[] = [];
  total = 0;
  pagina = 0;
  tamanho = 20;
  filtroStatus: 'ativos' | 'inativos' | 'todos' = 'ativos';
  loading = false;
  importando = false;
  salvando = false;
  desativandoId: number | null = null;
  error: string | null = null;
  formError: string | null = null;
  importacao: ImportacaoPacientesResponse | null = null;
  modalAberto = false;
  pacienteEmEdicao: Paciente | null = null;
  form: PacienteRequest = this.novoFormulario();

  ngOnInit(): void {
    this.buscaSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(() => {
          this.loading = true;
          this.error = null;
          this.pagina = 0;
          return this.pacienteService.listar(this.busca, this.pagina, this.tamanho, this.ativoSelecionado())
            .pipe(finalize(() => this.loading = false));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.pacientes = response.conteudo;
          this.total = response.totalElementos;
          this.pagina = response.pagina;
        },
        error: (error) => this.error = getHttpErrorMessage(error),
      });

    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregar(pagina = 0): void {
    this.loading = true;
    this.error = null;
    this.pagina = pagina;

    this.pacienteService.listar(this.busca, this.pagina, this.tamanho, this.ativoSelecionado())
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.pacientes = response.conteudo;
          this.total = response.totalElementos;
          this.pagina = response.pagina;
        },
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  buscarEnquantoDigita(): void {
    this.buscaSubject.next(this.busca);
  }

  abrirNovo(): void {
    this.pacienteEmEdicao = null;
    this.form = this.novoFormulario();
    this.formError = null;
    this.modalAberto = true;
  }

  abrirEdicao(paciente: Paciente): void {
    this.pacienteEmEdicao = paciente;
    this.form = {
      numeroPaciente: paciente.numeroPaciente,
      nome: paciente.nome,
      dataNascimento: paciente.dataNascimento,
      cpf: paciente.cpf,
      telefone: paciente.telefone,
      celular: paciente.celular,
      email: paciente.email,
      endereco: paciente.endereco,
      observacao: paciente.observacao,
      ativo: paciente.ativo,
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
    if (!this.form.nome?.trim()) {
      this.formError = 'Informe o nome do paciente.';
      return;
    }

    this.salvando = true;
    this.formError = null;

    const request = this.limparFormulario(this.form);
    const operacao = this.pacienteEmEdicao
      ? this.pacienteService.atualizar(this.pacienteEmEdicao.id, request)
      : this.pacienteService.criar(request);

    operacao
      .pipe(finalize(() => this.salvando = false))
      .subscribe({
        next: () => {
          this.modalAberto = false;
          this.carregar(this.pacienteEmEdicao ? this.pagina : 0);
        },
        error: (error) => this.formError = getHttpErrorMessage(error),
      });
  }

  desativar(paciente: Paciente): void {
    if (!confirm(`Desativar ${paciente.nome}?`)) {
      return;
    }

    this.desativandoId = paciente.id;
    this.error = null;

    this.pacienteService.desativar(paciente.id)
      .pipe(finalize(() => this.desativandoId = null))
      .subscribe({
        next: () => this.carregar(this.pagina),
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  importarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    this.importando = true;
    this.error = null;
    this.importacao = null;

    this.pacienteService.importar(arquivo)
      .pipe(finalize(() => {
        this.importando = false;
        input.value = '';
      }))
      .subscribe({
        next: (response) => {
          this.importacao = response;
          this.carregar(0);
        },
        error: (error) => this.error = getHttpErrorMessage(error),
      });
  }

  fichaUrl(paciente: Paciente): string {
    const token = this.tokenStorage.token;
    const url = new URL(`${environment.apiUrl}/pacientes/${paciente.id}/ficha`);

    if (token) {
      url.searchParams.set('token', token);
    }

    return url.toString();
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

  private novoFormulario(): PacienteRequest {
    return {
      numeroPaciente: null,
      nome: '',
      dataNascimento: null,
      cpf: null,
      telefone: null,
      celular: null,
      email: null,
      endereco: null,
      observacao: null,
      ativo: true,
    };
  }

  private limparFormulario(form: PacienteRequest): PacienteRequest {
    return {
      numeroPaciente: this.limparTexto(form.numeroPaciente),
      nome: form.nome.trim(),
      dataNascimento: this.limparTexto(form.dataNascimento),
      cpf: this.limparTexto(form.cpf),
      telefone: this.limparTexto(form.telefone),
      celular: this.limparTexto(form.celular),
      email: this.limparTexto(form.email),
      endereco: this.limparTexto(form.endereco),
      observacao: this.limparTexto(form.observacao),
      ativo: form.ativo ?? true,
    };
  }

  private limparTexto(valor: string | null | undefined): string | null {
    const texto = valor?.trim();
    return texto ? texto : null;
  }
}
