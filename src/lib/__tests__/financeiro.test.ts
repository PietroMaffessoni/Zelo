import { isConselho, isGestor, statusFinanceiroEfetivo, veManutencao } from '@/lib/types';

/** Data no formato que o banco usa para `vencimento` (coluna `date`). */
function emDias(delta: number): string {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

describe('statusFinanceiroEfetivo', () => {
  it('trata boleto pendente vencido como atrasado', () => {
    // Esta é a regra que pinta a tela de vermelho e alimenta a inadimplência.
    // O banco nunca reescreve `status`, então "atrasado" existe só aqui: se a
    // conta estiver errada, o síndico cobra quem está em dia ou deixa de cobrar
    // quem não está.
    expect(statusFinanceiroEfetivo({ status: 'pendente', vencimento: emDias(-1) })).toBe('atrasado');
  });

  it('não antecipa o atraso: vencimento hoje ainda é pendente', () => {
    // O morador tem o dia todo para pagar. Marcar como atrasado às 00h01 do
    // vencimento seria cobrança indevida.
    expect(statusFinanceiroEfetivo({ status: 'pendente', vencimento: emDias(0) })).toBe('pendente');
  });

  it('mantém pendente enquanto não venceu', () => {
    expect(statusFinanceiroEfetivo({ status: 'pendente', vencimento: emDias(5) })).toBe('pendente');
  });

  it('não mexe em quem já foi pago, mesmo com vencimento passado', () => {
    // Pagar em atraso e continuar marcado como atrasado faria o valor aparecer
    // duas vezes: no total pago e no total em aberto.
    expect(statusFinanceiroEfetivo({ status: 'pago', vencimento: emDias(-30) })).toBe('pago');
  });

  it('não ressuscita lançamento cancelado', () => {
    expect(statusFinanceiroEfetivo({ status: 'cancelado', vencimento: emDias(-30) })).toBe('cancelado');
  });
});

describe('papéis', () => {
  it('reconhece quem administra o condomínio', () => {
    expect(isGestor('sindico')).toBe(true);
    expect(isGestor('admin')).toBe(true);
    expect(isGestor('morador')).toBe(false);
    expect(isGestor('porteiro')).toBe(false);
    expect(isGestor('zelador')).toBe(false);
    expect(isGestor(null)).toBe(false);
  });

  it('inclui o conselheiro na visão de gestão, sem lhe dar a administração', () => {
    // O conselho fiscal ENXERGA o financeiro (presta contas) mas não é gestor:
    // confundir os dois daria a ele o poder de lançar e remover.
    expect(isConselho('conselheiro')).toBe(true);
    expect(isGestor('conselheiro')).toBe(false);
  });

  it('dá manutenção ao zelador sem torná-lo gestor', () => {
    expect(veManutencao('zelador')).toBe(true);
    expect(isGestor('zelador')).toBe(false);
    expect(veManutencao('morador')).toBe(false);
  });
});
