import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  it('mantem a sessao em memoria quando o navegador bloqueia o sessionStorage', () => {
    sessionStorage.clear();
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Storage bloqueado', 'SecurityError');
      });
    const service = new TokenStorageService();
    const login = {
      token: 'jwt-token',
      tipo: 'Bearer',
      expiraEm: '2099-07-31T10:00:00Z',
      nome: 'Cliente',
      email: 'cliente@clinica.com',
    };

    expect(() => service.save(login)).not.toThrow();
    expect(service.token).toBe('jwt-token');
    expect(service.user).toEqual(login);

    setItem.mockRestore();
    service.clear();
  });
});
