import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AdminCodigoAcesso } from '../../../core/models/admin.model';
import { Agendamento } from '../../../core/models/agendamento.model';
import { PaginaResponse } from '../../../core/models/pagina.model';
import { Profissional } from '../../../core/models/profissional.model';
import { Unidade } from '../../../core/models/unidade.model';
import { AdminService } from '../../../core/services/admin.service';
import { AgendamentoService } from '../../../core/services/agendamento.service';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { UnidadeService } from '../../../core/services/unidade.service';
import { AdminsComponent } from './admins/admins.component';
import { AgendaComponent } from './agenda/agenda.component';
import { ProfissionaisComponent } from './profissionais/profissionais.component';
import { UnidadesComponent } from './unidades/unidades.component';

function paginaVazia<T>(): PaginaResponse<T> {
  return {
    conteudo: [],
    pagina: 0,
    tamanho: 20,
    totalElementos: 0,
    totalPaginas: 0,
    primeira: true,
    ultima: true,
  };
}

describe('Estados assincronos das telas administrativas', () => {
  it('encerra o salvamento de profissional e recarrega a lista', async () => {
    const cadastro$ = new Subject<Profissional>();
    const profissional: Profissional = {
      id: 'prof-1',
      nome: 'Dra. Maria',
      tipo: 'MEDICO',
      cor: '#2f7d68',
      ativo: true,
      criadoEm: '2026-07-31T10:00:00',
      atualizadoEm: null,
    };
    let chamadaListar = 0;
    const listar = vi.fn(() => {
      const pagina = paginaVazia<Profissional>();
      if (chamadaListar++ > 0) {
        pagina.conteudo = [profissional];
        pagina.totalElementos = 1;
        pagina.totalPaginas = 1;
      }
      return of(pagina);
    });

    await TestBed.configureTestingModule({
      imports: [ProfissionaisComponent],
      providers: [{
        provide: ProfissionalService,
        useValue: {
          listar,
          criar: () => cadastro$,
          atualizar: () => cadastro$,
          desativar: () => of(undefined),
        },
      }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProfissionaisComponent);
    fixture.detectChanges();
    fixture.componentInstance.abrirNovo();
    fixture.componentInstance.form.nome = 'Dra. Maria';
    fixture.componentInstance.salvar();

    expect(fixture.componentInstance.salvando).toBe(true);

    cadastro$.next(profissional);

    expect(fixture.componentInstance.salvando).toBe(false);
    expect(fixture.componentInstance.modalAberto).toBe(false);
    expect(listar).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Dra. Maria');
  });

  it('encerra o salvamento de unidade e recarrega a lista', async () => {
    const cadastro$ = new Subject<Unidade>();
    const unidade: Unidade = {
      id: 'unidade-1',
      nome: 'Unidade Centro',
      endereco: null,
      ativo: true,
      criadoEm: '2026-07-31T10:00:00',
      atualizadoEm: null,
    };
    let chamadaListar = 0;
    const listar = vi.fn(() => {
      const pagina = paginaVazia<Unidade>();
      if (chamadaListar++ > 0) {
        pagina.conteudo = [unidade];
        pagina.totalElementos = 1;
        pagina.totalPaginas = 1;
      }
      return of(pagina);
    });

    await TestBed.configureTestingModule({
      imports: [UnidadesComponent],
      providers: [{
        provide: UnidadeService,
        useValue: {
          listar,
          criar: () => cadastro$,
          atualizar: () => cadastro$,
          desativar: () => of(undefined),
        },
      }],
    }).compileComponents();

    const fixture = TestBed.createComponent(UnidadesComponent);
    fixture.detectChanges();
    fixture.componentInstance.abrirNovo();
    fixture.componentInstance.form.nome = 'Unidade Centro';
    fixture.componentInstance.salvar();

    expect(fixture.componentInstance.salvando).toBe(true);

    cadastro$.next(unidade);

    expect(fixture.componentInstance.salvando).toBe(false);
    expect(fixture.componentInstance.modalAberto).toBe(false);
    expect(listar).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Unidade Centro');
  });

  it('encerra a criacao de admin e recarrega a lista', async () => {
    const cadastro$ = new Subject<AdminCodigoAcesso>();
    let chamadaListar = 0;
    const listar = vi.fn(() => of(chamadaListar++ > 0 ? [{
      id: 'admin-1',
      nome: 'Administrador',
      email: 'admin@clinica.com',
      ativo: true,
      senhaDefinida: false,
      codigoExpiraEm: '2026-08-01T10:00:00',
      criadoEm: '2026-07-31T10:00:00',
    }] : []));

    await TestBed.configureTestingModule({
      imports: [AdminsComponent],
      providers: [
        {
          provide: AdminService,
          useValue: {
            listar,
            criar: () => cadastro$,
            gerarCodigoAcesso: () => cadastro$,
            remover: () => of(undefined),
          },
        },
        { provide: AuthService, useValue: { alterarSenha: () => of(undefined) } },
        { provide: TokenStorageService, useValue: { user: null } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminsComponent);
    fixture.detectChanges();
    fixture.componentInstance.novoAdmin = { nome: 'Administrador', email: 'admin@clinica.com' };
    fixture.componentInstance.criarAdmin();

    expect(fixture.componentInstance.salvandoAdmin).toBe(true);

    cadastro$.next({
      id: 'admin-1',
      nome: 'Administrador',
      email: 'admin@clinica.com',
      codigoAcesso: 'ABC123',
      expiraEm: '2026-08-01T10:00:00',
    });

    expect(fixture.componentInstance.salvandoAdmin).toBe(false);
    expect(listar).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Administrador');
    expect(fixture.nativeElement.textContent).toContain('ABC123');
  });

  it('encerra o salvamento de agendamento, recarrega a agenda e usa um unico scroll', async () => {
    const cadastro$ = new Subject<Agendamento>();
    const agendamento: Agendamento = {
      id: 'agenda-1',
      pacienteId: 1,
      pacienteNome: 'Maria da Silva',
      profissionalId: 'prof-1',
      profissionalNome: 'Dra. Maria',
      profissionalCor: '#2f7d68',
      unidadeId: 'unidade-1',
      unidadeNome: 'Unidade Centro',
      tipo: 'CONSULTA',
      titulo: null,
      dataHoraInicio: '2026-07-31T09:00:00',
      dataHoraFim: '2026-07-31T10:00:00',
      status: 'AGENDADO',
      observacao: null,
      avisos: [],
      criadoEm: '2026-07-31T08:00:00',
      atualizadoEm: null,
    };
    let chamadaListar = 0;
    const listarAgenda = vi.fn(() => of(chamadaListar++ > 0 ? [agendamento] : []));

    await TestBed.configureTestingModule({
      imports: [AgendaComponent],
      providers: [
        {
          provide: AgendamentoService,
          useValue: {
            listar: listarAgenda,
            criar: () => cadastro$,
            atualizar: () => cadastro$,
            cancelar: () => of(undefined),
          },
        },
        { provide: PacienteService, useValue: { listar: () => of(paginaVazia()) } },
        { provide: ProfissionalService, useValue: { listar: () => of(paginaVazia()) } },
        { provide: UnidadeService, useValue: { listar: () => of(paginaVazia()) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AgendaComponent);
    fixture.detectChanges();
    fixture.componentInstance.abrirNovo('2026-07-31', 9);
    fixture.componentInstance.form.pacienteId = 1;
    fixture.componentInstance.form.profissionalId = 'prof-1';
    fixture.componentInstance.form.unidadeId = 'unidade-1';
    fixture.componentInstance.salvar();

    expect(fixture.componentInstance.salvando).toBe(true);

    cadastro$.next(agendamento);

    expect(fixture.componentInstance.salvando).toBe(false);
    expect(fixture.componentInstance.modalAberto).toBe(false);
    expect(listarAgenda).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Maria da Silva');

    const scroll = fixture.nativeElement.querySelector('.calendar-scroll');
    expect(scroll.querySelector('.calendar-head')).not.toBeNull();
    expect(scroll.querySelector('.calendar-body')).not.toBeNull();

    fixture.destroy();
  });
});
