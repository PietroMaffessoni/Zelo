import { TAMANHO_PAGINA, faixaDaPagina, termoBusca } from '@/lib/consulta';

describe('faixaDaPagina', () => {
  it('começa no zero e cobre exatamente uma página', () => {
    expect(faixaDaPagina(0)).toEqual([0, TAMANHO_PAGINA - 1]);
  });

  it('não sobrepõe nem deixa buraco entre páginas seguidas', () => {
    // O `range` do PostgREST é inclusivo nas duas pontas. Um erro de 1 aqui faz
    // o último registro de cada página reaparecer no topo da seguinte — ou some
    // um registro a cada 40, o que é pior porque ninguém percebe.
    const [, fim0] = faixaDaPagina(0);
    const [ini1] = faixaDaPagina(1);
    expect(ini1).toBe(fim0 + 1);
  });

  it('respeita um tamanho de página customizado', () => {
    expect(faixaDaPagina(2, 10)).toEqual([20, 29]);
  });

  it('trata página negativa como a primeira', () => {
    expect(faixaDaPagina(-1)).toEqual(faixaDaPagina(0));
  });
});

describe('termoBusca', () => {
  it('ignora busca vazia ou só com espaços', () => {
    expect(termoBusca(undefined)).toBeNull();
    expect(termoBusca(null)).toBeNull();
    expect(termoBusca('')).toBeNull();
    expect(termoBusca('   ')).toBeNull();
  });

  it('envolve o termo em curingas', () => {
    expect(termoBusca('vazamento')).toBe('%vazamento%');
  });

  it('remove espaços nas pontas', () => {
    expect(termoBusca('  piscina  ')).toBe('%piscina%');
  });

  it('escapa os curingas do LIKE digitados pelo usuário', () => {
    // Sem escape, buscar "%" casaria com tudo e "_" com qualquer caractere: a
    // lista inteira apareceria e o usuário concluiria que a busca não funciona.
    expect(termoBusca('100%')).toBe('%100\\%%');
    expect(termoBusca('a_b')).toBe('%a\\_b%');
    expect(termoBusca('c\\d')).toBe('%c\\\\d%');
  });

  it('preserva acento e caixa (o ilike cuida da caixa no servidor)', () => {
    expect(termoBusca('Manutenção')).toBe('%Manutenção%');
  });
});
