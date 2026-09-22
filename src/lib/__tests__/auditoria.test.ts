import { descreverAuditoria, entidadeLabel } from '@/lib/labels';

describe('descreverAuditoria', () => {
  it('mostra o antes e o depois dos campos de decisão', () => {
    // É o que se contesta numa prestação de contas: não basta saber que o
    // lançamento mudou, é preciso saber de quê para quê.
    expect(descreverAuditoria({ status: { de: 'pendente', para: 'pago' } })).toBe('situação: pendente → pago');
  });

  it('diz apenas que o campo mudou quando o valor pode ser dado pessoal', () => {
    // O gatilho guarda só o NOME dos campos fora da lista de decisão — copiar o
    // valor colocaria CPF e telefone em mais um lugar.
    expect(descreverAuditoria({ descricao: 'alterado' })).toBe('descricao');
  });

  it('traduz o nome da coluna para o vocabulário do síndico', () => {
    expect(descreverAuditoria({ pago_em: { de: null, para: '2026-03-01' } })).toBe(
      'data de pagamento: — → 2026-03-01',
    );
  });

  it('usa travessão para valor ausente em vez de "null"', () => {
    expect(descreverAuditoria({ valor: { de: null, para: 350 } })).toBe('valor: — → 350');
  });

  it('escreve booleano em português', () => {
    expect(descreverAuditoria({ fixado: { de: false, para: true } })).toBe('destaque: não → sim');
  });

  it('junta vários campos numa linha só', () => {
    const texto = descreverAuditoria({
      status: { de: 'pendente', para: 'pago' },
      valor: { de: 100, para: 120 },
    });
    expect(texto).toBe('situação: pendente → pago · valor: 100 → 120');
  });

  it('devolve vazio quando não há o que descrever', () => {
    // Acontece em inserção e remoção, onde não existe "antes e depois".
    expect(descreverAuditoria({})).toBe('');
  });
});

describe('entidadeLabel', () => {
  it('nomeia as tabelas auditadas em português', () => {
    // O gatilho grava `TG_TABLE_NAME`, que é vocabulário de banco:
    // "lancamentos_financeiros" não diz nada a quem presta contas.
    expect(entidadeLabel.lancamentos_financeiros.label).toBe('Lançamento financeiro');
    expect(entidadeLabel.memberships.label).toBe('Morador / vínculo');
  });

  it('cobre todas as tabelas com gatilho de auditoria', () => {
    // Se uma tabela entrar no gatilho do setup.sql e não aqui, a tela mostra o
    // nome cru da tabela para o síndico.
    const comGatilho = [
      'lancamentos_financeiros',
      'memberships',
      'reservas',
      'infracoes',
      'documentos',
      'areas_comuns',
      'assembleias',
    ];
    for (const t of comGatilho) {
      expect(entidadeLabel[t]).toBeDefined();
    }
  });
});
