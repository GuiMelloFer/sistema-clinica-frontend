import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, finalize, switchMap, takeUntil } from 'rxjs';
import { ImportacaoPacientesResponse, Paciente, PacienteRequest } from '../../../../core/models/paciente.model';
import { PacienteService } from '../../../../core/services/paciente.service';
import { getHttpErrorMessage } from '../../../../core/utils/http-error.util';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss',
})
export class PacientesComponent implements OnInit, OnDestroy {
  private readonly pacienteService = inject(PacienteService);
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
  baixandoFichaId: number | null = null;
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
      rg: paciente.rg,
      telefone: paciente.telefone,
      celular: paciente.celular,
      email: paciente.email,
      endereco: paciente.endereco,
      cep: paciente.cep,
      observacao: paciente.observacao,
    };
    this.formError = null;
    this.modalAberto = true;
  }

  fecharModal(): void {
    if (this.salvando || this.desativandoId !== null) {
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

  desativarPacienteEmEdicao(): void {
    if (!this.pacienteEmEdicao) {
      return;
    }

    this.desativar(this.pacienteEmEdicao);
  }

  private desativar(paciente: Paciente): void {
    if (!confirm(`Desativar ${paciente.nome}?`)) {
      return;
    }

    this.desativandoId = paciente.id;
    this.error = null;
    this.formError = null;

    this.pacienteService.desativar(paciente.id)
      .pipe(finalize(() => this.desativandoId = null))
      .subscribe({
        next: () => {
          this.modalAberto = false;
          this.carregar(this.pagina);
        },
        error: (error) => this.formError = getHttpErrorMessage(error),
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

  abrirFicha(paciente: Paciente): void {
    const novaJanela = window.open('about:blank', '_blank');
    if (!novaJanela) {
      this.error = 'O navegador bloqueou a abertura da ficha. Libere pop-ups para este site.';
      return;
    }

    novaJanela.opener = null;
    this.baixandoFichaId = paciente.id;
    this.error = null;

    this.pacienteService.ficha(paciente.id)
      .pipe(finalize(() => this.baixandoFichaId = null))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          novaJanela.addEventListener('load', () => novaJanela.print(), { once: true });
          novaJanela.location.href = url;
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        error: (error) => {
          novaJanela.close();
          this.error = getHttpErrorMessage(error);
        },
      });
  }

  aplicarMascaraCpf(valor: string | null | undefined): void {
    this.form.cpf = this.formatarCpf(valor);
  }

  aplicarMascaraRg(valor: string | null | undefined): void {
    this.form.rg = this.formatarRg(valor);
  }

  aplicarMascaraCep(valor: string | null | undefined): void {
    this.form.cep = this.formatarCep(valor);
  }

  aplicarMascaraTelefone(campo: 'telefone' | 'celular', valor: string | null | undefined): void {
    this.form[campo] = this.formatarTelefone(valor);
  }

  normalizarEmail(): void {
    this.form.email = this.limparTexto(this.form.email)?.toLowerCase() ?? null;
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
      rg: null,
      telefone: null,
      celular: null,
      email: null,
      endereco: null,
      cep: null,
      observacao: null,
    };
  }

  private limparFormulario(form: PacienteRequest): PacienteRequest {
    return {
      numeroPaciente: this.limparTexto(form.numeroPaciente),
      nome: form.nome.trim(),
      dataNascimento: this.limparTexto(form.dataNascimento),
      cpf: this.limparTexto(this.formatarCpf(form.cpf)),
      rg: this.limparTexto(this.formatarRg(form.rg)),
      telefone: this.limparTexto(this.formatarTelefone(form.telefone)),
      celular: this.limparTexto(this.formatarTelefone(form.celular)),
      email: this.limparTexto(form.email)?.toLowerCase() ?? null,
      endereco: this.limparTexto(form.endereco),
      cep: this.limparTexto(this.formatarCep(form.cep, true)),
      observacao: this.limparTexto(form.observacao),
      ativo: true,
    };
  }

  private limparTexto(valor: string | null | undefined): string | null {
    const texto = valor?.trim();
    return texto ? texto : null;
  }

  private formatarCpf(valor: string | null | undefined): string | null {
    const digitos = this.digitos(valor).slice(0, 11);
    if (!digitos) {
      return null;
    }

    if (digitos.length <= 3) {
      return digitos;
    }

    if (digitos.length <= 6) {
      return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    }

    if (digitos.length <= 9) {
      return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    }

    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }

  private formatarCep(valor: string | null | undefined, completarZeroEsquerda = false): string | null {
    let digitos = this.digitos(valor).slice(0, 8);
    if (!digitos) {
      return null;
    }

    if (completarZeroEsquerda && digitos.length === 7) {
      digitos = `0${digitos}`;
    }

    if (digitos.length <= 5) {
      return digitos;
    }

    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  }

  private formatarRg(valor: string | null | undefined): string | null {
    const caracteres = (valor ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 9);
    if (!caracteres) {
      return null;
    }

    if (caracteres.length <= 2) {
      return caracteres;
    }

    if (caracteres.length === 8) {
      return `${caracteres.slice(0, 1)}.${caracteres.slice(1, 4)}.${caracteres.slice(4, 7)}-${caracteres.slice(7)}`;
    }

    if (caracteres.length <= 5) {
      return `${caracteres.slice(0, 2)}.${caracteres.slice(2)}`;
    }

    if (caracteres.length <= 8) {
      return `${caracteres.slice(0, 2)}.${caracteres.slice(2, 5)}.${caracteres.slice(5)}`;
    }

    return `${caracteres.slice(0, 2)}.${caracteres.slice(2, 5)}.${caracteres.slice(5, 8)}-${caracteres.slice(8)}`;
  }

  private formatarTelefone(valor: string | null | undefined): string | null {
    const digitos = this.digitos(valor).slice(0, 11);
    if (!digitos) {
      return null;
    }

    if (digitos.length <= 2) {
      return digitos;
    }

    if (digitos.length <= 6) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    }

    if (digitos.length <= 10) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    }

    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  private digitos(valor: string | null | undefined): string {
    return (valor ?? '').replace(/\D/g, '');
  }
}
