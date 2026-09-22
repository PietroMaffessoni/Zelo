import {
  formatMoeda,
  iniciais,
  mascaraData,
  mascaraHora,
  mascaraMoeda,
  parseData,
  parseMoeda,
  primeiroNome,
  validadeCodigo,
} from '@/lib/format';

describe('mascaraData', () => {
  it('insere as barras conforme o usuário digita', () => {
    expect(mascaraData('1')).toBe('1');
    expect(mascaraData('0103')).toBe('01/03');
    expect(mascaraData('01032026')).toBe('01/03/2026');
  });

  it('descarta o que não é dígito', () => {
    expect(mascaraData('01/03/2026')).toBe('01/03/2026');
    expect(mascaraData('abc01')).toBe('01');
  });

  it('não deixa passar do tamanho de uma data', () => {
    expect(mascaraData('010320261234')).toBe('01/03/2026');
  });
});

describe('parseData', () => {
  it('lê o formato brasileiro', () => {
    const d = parseData('01/03/2026');
    expect(d.isValid()).toBe(true);
    expect(d.format('YYYY-MM-DD')).toBe('2026-03-01');
  });

  it('recusa data inexistente em vez de rolar para o mês seguinte', () => {
    // Sem `strict`, o dayjs transforma 31/02 em 03/03 — o boleto venceria numa
    // data que o síndico não escolheu.
    expect(parseData('31/02/2026').isValid()).toBe(false);
  });

  it('recusa entrada incompleta', () => {
    expect(parseData('01/03').isValid()).toBe(false);
  });

  it('combina data e hora quando a hora é informada', () => {
    const d = parseData('01/03/2026', '14:30');
    expect(d.format('YYYY-MM-DD HH:mm')).toBe('2026-03-01 14:30');
  });
});

describe('mascaraHora', () => {
  it('insere os dois pontos', () => {
    expect(mascaraHora('1430')).toBe('14:30');
    expect(mascaraHora('9')).toBe('9');
  });
});

describe('dinheiro', () => {
  it('formata em real', () => {
    //   é o espaço fixo que o Intl usa entre o símbolo e o número.
    expect(formatMoeda(1234.5).replace(/ /g, ' ')).toBe('R$ 1.234,50');
  });

  it('trata nulo como zero em vez de quebrar a tela', () => {
    expect(formatMoeda(null).replace(/ /g, ' ')).toBe('R$ 0,00');
  });

  it('a máscara e o parse são inversos', () => {
    // O usuário digita centavos da direita para a esquerda; o que for gravado
    // precisa voltar exatamente no valor mostrado.
    expect(parseMoeda(mascaraMoeda('35000'))).toBe(350);
    expect(parseMoeda(mascaraMoeda('1'))).toBe(0.01);
  });
});

describe('nomes', () => {
  it('extrai o primeiro nome', () => {
    expect(primeiroNome('Maria Aparecida Souza')).toBe('Maria');
    expect(primeiroNome(null)).toBe('');
  });

  it('monta as iniciais com o primeiro e o último nome', () => {
    expect(iniciais('Maria Aparecida Souza')).toBe('MS');
  });

  it('usa as duas primeiras letras quando só há um nome', () => {
    // Uma letra sozinha num avatar de 76px fica solta; duas preenchem o círculo.
    expect(iniciais('Pietro')).toBe('PI');
  });

  it('cai numa interrogação em vez de ficar em branco', () => {
    expect(iniciais(null)).toBe('?');
    expect(iniciais('')).toBe('?');
  });
});

describe('validadeCodigo', () => {
  function emDias(delta: number) {
    const d = new Date();
    d.setDate(d.getDate() + delta);
    return d.toISOString();
  }

  it('não diz nada sobre código antigo, sem data', () => {
    // Códigos gerados antes de a expiração existir seguem válidos; dizer
    // "sem validade" confundiria mais do que ficar calado.
    expect(validadeCodigo(null)).toBeNull();
    expect(validadeCodigo(undefined)).toBeNull();
  });

  it('avisa que expirou', () => {
    const v = validadeCodigo(emDias(-1));
    expect(v?.expirado).toBe(true);
  });

  it('mostra até quando vale', () => {
    const v = validadeCodigo(emDias(5));
    expect(v?.expirado).toBe(false);
    expect(v?.texto).toMatch(/Vale até/);
  });
});
