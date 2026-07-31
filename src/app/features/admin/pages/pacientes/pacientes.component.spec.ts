import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Paciente } from '../../../../core/models/paciente.model';
import { PaginaResponse } from '../../../../core/models/pagina.model';
import { PacienteService } from '../../../../core/services/paciente.service';
import { PacientesComponent } from './pacientes.component';

describe('PacientesComponent', () => {
  it('deve retirar o carregamento e exibir os pacientes recebidos', async () => {
    const resposta$ = new Subject<PaginaResponse<Paciente>>();

    await TestBed.configureTestingModule({
      imports: [PacientesComponent],
      providers: [
        {
          provide: PacienteService,
          useValue: {
            listar: () => resposta$,
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PacientesComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Carregando...');

    resposta$.next({
      conteudo: [{
        id: 1,
        numeroPaciente: '1',
        nome: 'Maria da Silva',
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
        criadoEm: '2026-01-01T10:00:00',
        atualizadoEm: null,
      }],
      pagina: 0,
      tamanho: 20,
      totalElementos: 1,
      totalPaginas: 1,
      primeira: true,
      ultima: true,
    });
    resposta$.complete();

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Maria da Silva');
    expect(fixture.nativeElement.textContent).toContain('1 registros');
  });
});
