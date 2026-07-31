import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EMPTY,
  Subject,
  TimeoutError,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  switchMap,
  takeUntil,
  timeout,
} from 'rxjs';
import {
  Agendamento,
  AgendamentoRequest,
  StatusAgendamento,
  TipoAgendamento,
} from '../../../../core/models/agendamento.model';
import { Paciente } from '../../../../core/models/paciente.model';
import { Profissional } from '../../../../core/models/profissional.model';
import { Unidade } from '../../../../core/models/unidade.model';
import { AgendamentoService } from '../../../../core/services/agendamento.service';
import { PacienteService } from '../../../../core/services/paciente.service';
import { ProfissionalService } from '../../../../core/services/profissional.service';
import { UnidadeService } from '../../../../core/services/unidade.service';
import { getHttpErrorMessage } from '../../../../core/utils/http-error.util';

interface AgendaDia {
  data: string;
  rotulo: string;
  diaMes: string;
  hoje: boolean;
  selecionado: boolean;
}

interface CalendarHourRow {
  hora: number;
  height: number;
  offset: number;
}

interface AgendaCalendarItem {
  agendamento: Agendamento;
  dia: string;
  inicioMinutos: number;
  fimMinutos: number;
  top: number;
  height: number;
  left: number;
  width: number;
}

type ModoVisualizacaoAgenda = 'semana' | 'dia';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
})
export class AgendaComponent implements OnInit, OnDestroy {
  private readonly agendamentoService = inject(AgendamentoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly profissionalService = inject(ProfissionalService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly pacienteBuscaSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private readonly calendarRowHeight = 92;
  private readonly calendarCompactHourHeight = 192;
  private readonly calendarEventGap = 4;
  private readonly calendarMinEventHeight = 44;

  readonly horarios = this.criarOpcoesHorario();
  readonly tipos: Array<{ value: TipoAgendamento; label: string }> = [
    { value: 'CONSULTA', label: 'Consulta' },
    { value: 'NEUROMODULACAO', label: 'Neuromodulacao' },
  ];
  readonly statusOptions: Array<{ value: StatusAgendamento; label: string }> = [
    { value: 'AGENDADO', label: 'Agendado' },
    { value: 'CONFIRMADO', label: 'Confirmado' },
    { value: 'COMPARECEU', label: 'Compareceu' },
    { value: 'FALTOU', label: 'Faltou' },
    { value: 'CANCELADO', label: 'Cancelado' },
    { value: 'REMARCADO', label: 'Remarcado' },
  ];

  data = this.hoje();
  dataAgendamento = this.data;
  horarioInicio = '09:00';
  horarioFim = '10:00';
  agendamentos: Agendamento[] = [];
  diasDaSemana: AgendaDia[] = [];
  horas: number[] = [];
  calendarHourRows: CalendarHourRow[] = [];
  calendarItems: AgendaCalendarItem[] = [];
  pacientes: Paciente[] = [];
  profissionais: Profissional[] = [];
  unidades: Unidade[] = [];
  pacienteBusca = '';
  mostrarOpcoesPaciente = false;
  filtroProfissional = '';
  filtroUnidade = '';
  filtroTipo: TipoAgendamento | '' = '';
  modoVisualizacao: ModoVisualizacaoAgenda = 'semana';
  loading = false;
  loadingBase = false;
  buscandoPacientes = false;
  salvando = false;
  cancelandoId: string | null = null;
  error: string | null = null;
  formError: string | null = null;
  agora = new Date();
  private indicadorAgoraTimer: number | null = null;
  modalAberto = false;
  agendamentoEmEdicao: Agendamento | null = null;
  form: AgendamentoRequest = this.novoFormulario();

  ngOnInit(): void {
    this.atualizarEstruturaSemana();

    this.pacienteBuscaSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((busca) => {
          this.buscandoPacientes = true;
          this.changeDetectorRef.detectChanges();
          return this.pacienteService.listar(busca, 0, 30, true)
            .pipe(
              timeout(10_000),
              catchError((error: unknown) => {
                this.buscandoPacientes = false;
                this.error = this.mensagemErro(error, 'A busca de pacientes');
                this.changeDetectorRef.detectChanges();
                return EMPTY;
              }),
            );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.pacientes = response.conteudo;
          this.buscandoPacientes = false;
          this.changeDetectorRef.detectChanges();
        },
      });

    this.iniciarIndicadorAgora();
    this.carregarBase();
    this.carregarAgenda();
  }

  ngOnDestroy(): void {
    if (this.indicadorAgoraTimer) {
      window.clearInterval(this.indicadorAgoraTimer);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarBase(): void {
    this.loadingBase = true;

    forkJoin({
      profissionais: this.profissionalService.listar('', 0, 200, true),
      unidades: this.unidadeService.listar('', 0, 200, true),
    })
      .pipe(
        timeout(10_000),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ profissionais, unidades }) => {
          this.profissionais = profissionais.conteudo;
          this.unidades = unidades.conteudo;
          this.loadingBase = false;
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'O carregamento dos dados da agenda');
          this.loadingBase = false;
          this.changeDetectorRef.detectChanges();
        },
      });

    this.buscarPacientes();
  }

  buscarPacientes(): void {
    this.buscandoPacientes = true;
    this.pacienteService.listar(this.pacienteBusca, 0, 30, true)
      .pipe(
        timeout(10_000),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.pacientes = response.conteudo;
          this.buscandoPacientes = false;
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A busca de pacientes');
          this.buscandoPacientes = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  buscarPacientesEnquantoDigita(): void {
    this.form.pacienteId = null;
    this.mostrarOpcoesPaciente = true;
    this.pacienteBuscaSubject.next(this.pacienteBusca);
  }

  selecionarPaciente(paciente: Paciente): void {
    this.form.pacienteId = paciente.id;
    this.pacienteBusca = this.formatarPacienteOpcao(paciente);
    this.mostrarOpcoesPaciente = false;
  }

  esconderOpcoesPaciente(): void {
    window.setTimeout(() => this.mostrarOpcoesPaciente = false, 160);
  }

  formatarPacienteOpcao(paciente: Paciente): string {
    const contatos = [paciente.cpf, paciente.celular, paciente.telefone]
      .filter((valor): valor is string => !!valor)
      .join(' | ');

    return contatos ? `${paciente.id} - ${paciente.nome} (${contatos})` : `${paciente.id} - ${paciente.nome}`;
  }

  carregarAgenda(): void {
    this.loading = true;
    this.error = null;
    this.atualizarEstruturaSemana();

    const inicio = this.modoVisualizacao === 'dia'
      ? this.criarDataLocal(this.data)
      : this.inicioDaSemana(this.criarDataLocal(this.data));
    const fim = this.modoVisualizacao === 'dia' ? inicio : this.somarDias(inicio, 6);

    this.agendamentoService.listar(
      `${this.formatarDataInput(inicio)}T00:00:00`,
      `${this.formatarDataInput(fim)}T23:59:59`,
      {
        profissionalId: this.filtroProfissional || null,
        unidadeId: this.filtroUnidade || null,
        tipo: this.filtroTipo || null,
      },
    )
      .pipe(
        timeout(10_000),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.agendamentos = response.sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
          this.atualizarEstruturaSemana();
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'A consulta da agenda');
          this.loading = false;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  irParaPeriodoAnterior(): void {
    const dias = this.modoVisualizacao === 'dia' ? -1 : -7;
    this.data = this.formatarDataInput(this.somarDias(this.criarDataLocal(this.data), dias));
    this.carregarAgenda();
  }

  irParaProximoPeriodo(): void {
    const dias = this.modoVisualizacao === 'dia' ? 1 : 7;
    this.data = this.formatarDataInput(this.somarDias(this.criarDataLocal(this.data), dias));
    this.carregarAgenda();
  }

  irParaHoje(): void {
    this.data = this.hoje();
    this.carregarAgenda();
  }

  selecionarDia(data: string): void {
    this.data = data;
    if (this.modoVisualizacao === 'dia') {
      this.carregarAgenda();
      return;
    }

    this.atualizarEstruturaSemana();
  }

  alterarModoVisualizacao(modo: ModoVisualizacaoAgenda): void {
    this.modoVisualizacao = modo;
    this.carregarAgenda();
  }

  abrirNovo(dataReferencia = this.data, hora = 9): void {
    this.agendamentoEmEdicao = null;
    this.data = dataReferencia;
    this.form = this.novoFormulario(dataReferencia, hora);
    this.preencherCamposHorarioDoFormulario();
    this.pacienteBusca = '';
    this.mostrarOpcoesPaciente = false;
    this.formError = null;
    this.modalAberto = true;
  }

  abrirEdicao(agendamento: Agendamento): void {
    this.agendamentoEmEdicao = agendamento;
    this.form = {
      pacienteId: agendamento.pacienteId,
      profissionalId: agendamento.profissionalId,
      unidadeId: agendamento.unidadeId,
      tipo: agendamento.tipo,
      titulo: agendamento.titulo,
      dataHoraInicio: this.paraInputDateTime(agendamento.dataHoraInicio),
      dataHoraFim: this.paraInputDateTime(agendamento.dataHoraFim),
      status: agendamento.status,
      observacao: agendamento.observacao,
      confirmarConflito: false,
    };
    this.preencherCamposHorarioDoFormulario();
    this.garantirPacienteSelecionado(agendamento);
    this.pacienteBusca = `${agendamento.pacienteId} - ${agendamento.pacienteNome}`;
    this.mostrarOpcoesPaciente = false;
    this.formError = null;
    this.modalAberto = true;
  }

  alterarTipo(tipo: TipoAgendamento): void {
    this.form.tipo = tipo;
    this.aplicarDuracaoPadrao();
  }

  alterarDataAgendamento(): void {
    this.sincronizarFormularioComCamposHorario();
  }

  alterarHorarioInicio(): void {
    this.aplicarDuracaoPadrao();
  }

  alterarHorarioFim(): void {
    this.sincronizarFormularioComCamposHorario(false);
  }

  fecharModal(): void {
    if (this.salvando) {
      return;
    }

    this.modalAberto = false;
    this.formError = null;
  }

  salvar(confirmarConflito = false): void {
    this.sincronizarFormularioComCamposHorario();

    const erro = this.validarFormulario();
    if (erro) {
      this.formError = erro;
      return;
    }

    this.salvando = true;
    this.formError = null;

    const request = this.limparFormulario(this.form, confirmarConflito);
    const operacao = this.agendamentoEmEdicao
      ? this.agendamentoService.atualizar(this.agendamentoEmEdicao.id, request)
      : this.agendamentoService.criar(request);

    operacao
      .pipe(
        timeout(15_000),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.salvando = false;
          this.modalAberto = false;
          this.data = request.dataHoraInicio.slice(0, 10);
          this.carregarAgenda();
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.salvando = false;
          this.tratarErroSalvar(error);
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  cancelar(agendamento: Agendamento): void {
    if (!confirm(`Cancelar agendamento de ${agendamento.pacienteNome}?`)) {
      return;
    }

    this.cancelandoId = agendamento.id;
    this.error = null;

    this.agendamentoService.cancelar(agendamento.id)
      .pipe(
        timeout(15_000),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.cancelandoId = null;
          this.carregarAgenda();
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          this.error = this.mensagemErro(error, 'O cancelamento do agendamento');
          this.cancelandoId = null;
          this.changeDetectorRef.detectChanges();
        },
      });
  }

  tipoLabel(tipo: TipoAgendamento): string {
    return this.tipos.find((item) => item.value === tipo)?.label ?? tipo;
  }

  statusLabel(status: StatusAgendamento): string {
    return this.statusOptions.find((item) => item.value === status)?.label ?? status;
  }

  periodoLabel(): string {
    if (!this.diasDaSemana.length) {
      return '';
    }

    if (this.modoVisualizacao === 'dia') {
      const dia = this.diasDaSemana[0];
      return `${dia.rotulo}, ${this.formatarDataCurta(dia.data)}`;
    }

    const inicio = this.diasDaSemana[0].data;
    const fim = this.diasDaSemana[this.diasDaSemana.length - 1].data;
    return `${this.formatarDataCurta(inicio)} - ${this.formatarDataCurta(fim)}`;
  }

  eventosDoDia(data: string): AgendaCalendarItem[] {
    return this.calendarItems.filter((item) => item.dia === data);
  }

  contagemDia(data: string): number {
    return this.agendamentos.filter((agendamento) => agendamento.dataHoraInicio.slice(0, 10) === data).length;
  }

  gridAltura(): number {
    return this.calendarHourRows.reduce((total, row) => total + row.height, 0);
  }

  duracaoAtualLabel(): string {
    return this.form.tipo === 'NEUROMODULACAO' ? '15 min' : '1 hora';
  }

  duracaoAgendamentoLabel(agendamento: Agendamento): string {
    const inicio = this.criarDataHora(agendamento.dataHoraInicio);
    const fim = this.criarDataHora(agendamento.dataHoraFim);
    const minutos = Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 60000));

    if (minutos < 60) {
      return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    return minutosRestantes ? `${horas}h ${minutosRestantes}min` : `${horas}h`;
  }

  fimDataLabel(): string | null {
    if (!this.form.dataHoraFim || this.form.dataHoraFim.slice(0, 10) === this.dataAgendamento) {
      return null;
    }

    return `Termina em ${this.formatarDataCurta(this.form.dataHoraFim.slice(0, 10))}`;
  }

  indicadorAgoraTop(data: string): number | null {
    if (data !== this.hoje()) {
      return null;
    }

    const minutos = this.minutosDoDia(this.agora);
    const primeiraLinha = this.calendarHourRows[0];
    const ultimaLinha = this.calendarHourRows[this.calendarHourRows.length - 1];

    if (!primeiraLinha || !ultimaLinha) {
      return null;
    }

    const primeiroMinuto = primeiraLinha.hora * 60;
    const ultimoMinuto = (ultimaLinha.hora + 1) * 60;

    if (minutos < primeiroMinuto || minutos > ultimoMinuto) {
      return null;
    }

    return this.posicaoMinuto(minutos);
  }



  private iniciarIndicadorAgora(): void {
    this.indicadorAgoraTimer = window.setInterval(() => {
      const horaAnterior = this.agora.getHours();
      this.agora = new Date();

      if (this.agora.getHours() !== horaAnterior || this.semanaContemHoje()) {
        this.atualizarEstruturaSemana();
      }
    }, 30000);
  }
  private atualizarEstruturaSemana(): void {
    const inicio = this.modoVisualizacao === 'dia'
      ? this.criarDataLocal(this.data)
      : this.inicioDaSemana(this.criarDataLocal(this.data));
    const hoje = this.hoje();
    const quantidadeDias = this.modoVisualizacao === 'dia' ? 1 : 7;

    this.diasDaSemana = Array.from({ length: quantidadeDias }, (_, index) => {
      const dia = this.somarDias(inicio, index);
      const data = this.formatarDataInput(dia);

      return {
        data,
        rotulo: this.rotuloDiaSemana(dia),
        diaMes: dia.getDate().toString().padStart(2, '0'),
        hoje: data === hoje,
        selecionado: data === this.data,
      };
    });

    this.horas = this.criarHorasVisiveis();
    this.calendarHourRows = this.criarLinhasHoras();
    this.calendarItems = this.criarItensCalendario();
  }

  private criarHorasVisiveis(): number[] {
    const inicioPadrao = 8;
    const fimPadrao = 15;
    const horasEventos = this.agendamentos.flatMap((agendamento) => [
      this.extrairHora(agendamento.dataHoraInicio),
      this.horaFinalVisivel(agendamento.dataHoraFim),
    ]);
    const menorHora = horasEventos.length ? Math.min(inicioPadrao, ...horasEventos) : inicioPadrao;
    const maiorHora = horasEventos.length ? Math.max(fimPadrao, ...horasEventos) : fimPadrao;

    return Array.from({ length: maiorHora - menorHora + 1 }, (_, index) => menorHora + index);
  }

  private criarLinhasHoras(): CalendarHourRow[] {
    let offset = 0;

    return this.horas.map((hora) => {
      const height = this.horaTemAgendamentoCurto(hora)
        ? this.calendarCompactHourHeight
        : this.calendarRowHeight;
      const row = { hora, height, offset };
      offset += height;
      return row;
    });
  }

  private criarItensCalendario(): AgendaCalendarItem[] {
    if (!this.calendarHourRows.length) {
      return [];
    }

    const itensBase = this.agendamentos.map((agendamento) => {
      const inicio = this.criarDataHora(agendamento.dataHoraInicio);
      const fim = this.criarDataHora(agendamento.dataHoraFim);
      const inicioMinutos = this.minutosDoDia(inicio);
      const fimMinutos = this.minutosDoDia(fim);
      const top = this.posicaoMinuto(inicioMinutos);
      const bottom = this.posicaoMinuto(fimMinutos);
      const height = Math.max(this.calendarMinEventHeight, bottom - top - this.calendarEventGap);

      return {
        agendamento,
        dia: agendamento.dataHoraInicio.slice(0, 10),
        inicioMinutos,
        fimMinutos,
        top,
        height,
        left: 0,
        width: 100,
      };
    });

    return this.distribuirSobreposicoes(itensBase);
  }

  private distribuirSobreposicoes(itens: AgendaCalendarItem[]): AgendaCalendarItem[] {
    const porDia = new Map<string, AgendaCalendarItem[]>();

    for (const item of itens) {
      porDia.set(item.dia, [...(porDia.get(item.dia) ?? []), item]);
    }

    return Array.from(porDia.values()).flatMap((itensDoDia) => {
      const ordenados = itensDoDia.sort((a, b) => a.inicioMinutos - b.inicioMinutos || b.fimMinutos - a.fimMinutos);
      const grupos: AgendaCalendarItem[][] = [];
      let grupoAtual: AgendaCalendarItem[] = [];
      let fimGrupoAtual = -1;

      for (const item of ordenados) {
        if (!grupoAtual.length || item.inicioMinutos < fimGrupoAtual) {
          grupoAtual.push(item);
          fimGrupoAtual = Math.max(fimGrupoAtual, item.fimMinutos);
          continue;
        }

        grupos.push(grupoAtual);
        grupoAtual = [item];
        fimGrupoAtual = item.fimMinutos;
      }

      if (grupoAtual.length) {
        grupos.push(grupoAtual);
      }

      return grupos.flatMap((grupo) => this.distribuirGrupoSobreposto(grupo));
    });
  }

  private distribuirGrupoSobreposto(grupo: AgendaCalendarItem[]): AgendaCalendarItem[] {
    const colunasFim: number[] = [];
    const posicionados = grupo.map((item) => {
      const coluna = colunasFim.findIndex((fim) => fim <= item.inicioMinutos);
      const colunaFinal = coluna >= 0 ? coluna : colunasFim.length;
      colunasFim[colunaFinal] = item.fimMinutos;

      return { ...item, left: colunaFinal, width: 1 };
    });
    const totalColunas = Math.max(1, colunasFim.length);

    return posicionados.map((item) => ({
      ...item,
      left: (item.left / totalColunas) * 100,
      width: 100 / totalColunas,
    }));
  }

  private semanaContemHoje(): boolean {
    const inicio = this.inicioDaSemana(this.criarDataLocal(this.data));
    const fim = this.somarDias(inicio, 6);
    const hoje = this.criarDataLocal(this.hoje());

    return hoje >= inicio && hoje <= fim;
  }

  private horaTemAgendamentoCurto(hora: number): boolean {
    const inicioHora = hora * 60;
    const fimHora = inicioHora + 60;

    return this.agendamentos.some((agendamento) => {
      const inicio = this.criarDataHora(agendamento.dataHoraInicio);
      const fim = this.criarDataHora(agendamento.dataHoraFim);
      const inicioMinutos = this.minutosDoDia(inicio);
      const fimMinutos = this.minutosDoDia(fim);
      const duracao = fimMinutos - inicioMinutos;

      return duracao <= 15 && inicioMinutos < fimHora && fimMinutos > inicioHora;
    });
  }

  private posicaoMinuto(minutos: number): number {
    const hora = Math.floor(minutos / 60);
    const row = this.calendarHourRows.find((item) => item.hora === hora);

    if (!row) {
      const primeiraLinha = this.calendarHourRows[0];
      const ultimaLinha = this.calendarHourRows[this.calendarHourRows.length - 1];

      if (minutos <= primeiraLinha.hora * 60) {
        return 0;
      }

      return ultimaLinha.offset + ultimaLinha.height;
    }

    return row.offset + ((minutos - hora * 60) / 60) * row.height;
  }
  private tratarErroSalvar(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const mensagem = getHttpErrorMessage(error);
      if (confirm(`${mensagem}\n\nDeseja salvar mesmo assim?`)) {
        this.salvar(true);
      } else {
        this.formError = mensagem;
      }
      return;
    }

    this.formError = this.mensagemErro(error, 'O salvamento do agendamento');
  }

  private mensagemErro(error: unknown, operacao: string): string {
    return error instanceof TimeoutError
      ? `${operacao} excedeu o tempo limite. Tente novamente.`
      : getHttpErrorMessage(error);
  }

  private validarFormulario(): string | null {
    if (!this.form.pacienteId) {
      return 'Selecione o paciente.';
    }

    if (!this.form.profissionalId) {
      return 'Selecione o profissional.';
    }

    if (!this.form.unidadeId) {
      return 'Selecione a unidade.';
    }

    if (!this.form.dataHoraInicio || !this.form.dataHoraFim) {
      return 'Informe data, inicio e fim.';
    }

    if (this.form.dataHoraFim <= this.form.dataHoraInicio) {
      return 'O fim deve ser posterior ao inicio.';
    }

    return null;
  }

  private novoFormulario(dataReferencia = this.data, hora = 9): AgendamentoRequest {
    const horaInicio = hora.toString().padStart(2, '0');
    const inicio = `${dataReferencia}T${horaInicio}:00`;
    const fim = this.formatarDateTimeLocal(this.adicionarMinutos(inicio, 60));

    return {
      pacienteId: null,
      profissionalId: this.filtroProfissional || null,
      unidadeId: this.filtroUnidade || null,
      tipo: 'CONSULTA',
      titulo: null,
      dataHoraInicio: inicio,
      dataHoraFim: fim,
      status: 'AGENDADO',
      observacao: null,
      confirmarConflito: false,
    };
  }

  private preencherCamposHorarioDoFormulario(): void {
    this.dataAgendamento = this.form.dataHoraInicio?.slice(0, 10) || this.data;
    this.horarioInicio = this.form.dataHoraInicio?.slice(11, 16) || '09:00';
    this.horarioFim = this.form.dataHoraFim?.slice(11, 16) || '10:00';
  }

  private aplicarDuracaoPadrao(): void {
    const duracaoMinutos = this.form.tipo === 'NEUROMODULACAO' ? 15 : 60;
    this.form.dataHoraInicio = `${this.dataAgendamento}T${this.horarioInicio}`;
    this.form.dataHoraFim = this.formatarDateTimeLocal(this.adicionarMinutos(this.form.dataHoraInicio, duracaoMinutos));
    this.horarioFim = this.form.dataHoraFim.slice(11, 16);
  }

  private sincronizarFormularioComCamposHorario(recalcularFim = true): void {
    this.form.dataHoraInicio = `${this.dataAgendamento}T${this.horarioInicio}`;

    if (recalcularFim) {
      this.aplicarDuracaoPadrao();
      return;
    }

    this.form.dataHoraFim = `${this.dataAgendamento}T${this.horarioFim}`;
    if (this.form.dataHoraFim <= this.form.dataHoraInicio) {
      this.form.dataHoraFim = this.formatarDateTimeLocal(this.adicionarMinutos(this.form.dataHoraFim, 24 * 60));
    }
  }

  private limparFormulario(form: AgendamentoRequest, confirmarConflito: boolean): AgendamentoRequest {
    return {
      pacienteId: form.pacienteId,
      profissionalId: form.profissionalId,
      unidadeId: form.unidadeId,
      tipo: form.tipo,
      titulo: this.limparTexto(form.titulo),
      dataHoraInicio: form.dataHoraInicio,
      dataHoraFim: form.dataHoraFim,
      status: form.status ?? 'AGENDADO',
      observacao: this.limparTexto(form.observacao),
      confirmarConflito,
    };
  }

  private garantirPacienteSelecionado(agendamento: Agendamento): void {
    if (!this.pacientes.some((paciente) => paciente.id === agendamento.pacienteId)) {
      this.pacientes = [
        {
          id: agendamento.pacienteId,
          numeroPaciente: agendamento.pacienteId.toString(),
          nome: agendamento.pacienteNome,
          dataNascimento: null,
          cpf: null,
          rg: null,
          telefone: null,
          celular: null,
          email: null,
          endereco: null,
          cep: null,
          observacao: null,
          ativo: true,
          criadoEm: '',
          atualizadoEm: null,
        },
        ...this.pacientes,
      ];
    }
  }

  private inicioDaSemana(data: Date): Date {
    const inicio = new Date(data);
    const dia = inicio.getDay();
    const distanciaSegunda = dia === 0 ? -6 : 1 - dia;
    inicio.setDate(inicio.getDate() + distanciaSegunda);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }

  private somarDias(data: Date, dias: number): Date {
    const novaData = new Date(data);
    novaData.setDate(novaData.getDate() + dias);
    return novaData;
  }

  private criarDataLocal(valor: string): Date {
    const [ano, mes, dia] = valor.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  private criarDataHora(valor: string): Date {
    return new Date(valor);
  }

  private adicionarMinutos(valor: string, minutos: number): Date {
    const data = this.criarDataHora(valor);
    data.setMinutes(data.getMinutes() + minutos);
    return data;
  }

  private formatarDataInput(data: Date): string {
    const ano = data.getFullYear();
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const dia = data.getDate().toString().padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private formatarDateTimeLocal(data: Date): string {
    const hora = data.getHours().toString().padStart(2, '0');
    const minuto = data.getMinutes().toString().padStart(2, '0');
    return `${this.formatarDataInput(data)}T${hora}:${minuto}`;
  }

  private formatarDataCurta(valor: string): string {
    const data = this.criarDataLocal(valor);
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}`;
  }

  private rotuloDiaSemana(data: Date): string {
    return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][data.getDay()];
  }

  private extrairHora(valor: string): number {
    return this.criarDataHora(valor).getHours();
  }

  private horaFinalVisivel(valor: string): number {
    const data = this.criarDataHora(valor);
    const hora = data.getHours();
    return data.getMinutes() === 0 ? Math.max(0, hora - 1) : hora;
  }

  private minutosDoDia(data: Date): number {
    return data.getHours() * 60 + data.getMinutes();
  }

  private criarOpcoesHorario(): string[] {
    const opcoes: string[] = [];

    for (let hora = 0; hora < 24; hora++) {
      for (const minuto of [0, 15, 30, 45]) {
        opcoes.push(`${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`);
      }
    }

    return opcoes;
  }

  private hoje(): string {
    return this.formatarDataInput(new Date());
  }

  private paraInputDateTime(valor: string): string {
    return valor.slice(0, 16);
  }

  private limparTexto(valor: string | null | undefined): string | null {
    const texto = valor?.trim();
    return texto ? texto : null;
  }
}









