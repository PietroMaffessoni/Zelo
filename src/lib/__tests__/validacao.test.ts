import {
  erroEmail,
  erroNome,
  erroSenha,
  erroTelefone,
  esperaAposFalhas,
  formatarEspera,
  mascaraTelefone,
  requisitosSenha,
} from '@/lib/validacao';

describe('erroNome', () => {
  it('exige nome e sobrenome', () => {
    expect(erroNome('Maria')).toBe('Informe nome e sobrenome.');
    expect(erroNome('  Maria   Silva ')).toBeNull();
  });

  it('aceita acento, apóstrofo e hífen', () => {
    expect(erroNome("João D'Ávila Souza-Lima")).toBeNull();
  });

  it('recusa número no nome', () => {
    expect(erroNome('Maria S1lva')).toBe('Use apenas letras no nome.');
  });
});

describe('erroEmail', () => {
  it('aceita e-mail comum, com maiúsculas e espaço nas pontas', () => {
    expect(erroEmail(' Voce@Email.com ')).toBeNull();
  });

  it('recusa os erros típicos de digitação', () => {
    expect(erroEmail('voce@email')).toBe('E-mail inválido.');
    expect(erroEmail('voce email.com')).toBe('E-mail inválido.');
    expect(erroEmail('voce@email,com')).toBe('E-mail inválido.');
    expect(erroEmail('voce@@email.com')).toBe('E-mail inválido.');
  });
});

describe('mascaraTelefone', () => {
  it('formata o celular enquanto o usuário digita', () => {
    expect(mascaraTelefone('1')).toBe('(1');
    expect(mascaraTelefone('11')).toBe('(11');
    expect(mascaraTelefone('119')).toBe('(11) 9');
    expect(mascaraTelefone('1191234')).toBe('(11) 9123-4');
    expect(mascaraTelefone('11912345678')).toBe('(11) 91234-5678');
  });

  it('formata fixo com 10 dígitos', () => {
    expect(mascaraTelefone('1131234567')).toBe('(11) 3123-4567');
  });

  it('descarta o +55 de número colado e o excesso de dígitos', () => {
    expect(mascaraTelefone('+55 11 91234-5678')).toBe('(11) 91234-5678');
    expect(mascaraTelefone('119123456789')).toBe('(11) 91234-5678');
  });
});

describe('erroTelefone', () => {
  it('aceita celular e fixo válidos', () => {
    expect(erroTelefone('(11) 91234-5678')).toBeNull();
    expect(erroTelefone('(51) 3123-4567')).toBeNull();
  });

  it('recusa DDD inexistente, celular sem 9 e número incompleto', () => {
    expect(erroTelefone('(20) 91234-5678')).toBe('DDD inválido.');
    expect(erroTelefone('(11) 81234-5678')).toBe('Celular deve começar com 9 depois do DDD.');
    expect(erroTelefone('(11) 9123')).toBe('Telefone incompleto. Inclua o DDD.');
    expect(erroTelefone('(11) 99999-9999')).toBe('Telefone inválido.');
  });
});

describe('erroSenha', () => {
  it('lista o que falta', () => {
    expect(erroSenha('abc')).toMatch(/^A senha precisa ter:/);
    expect(requisitosSenha('Abcdefghi1!').every((r) => r.ok)).toBe(true);
  });

  it('aceita senha forte', () => {
    expect(erroSenha('Varanda#Azul27')).toBeNull();
  });

  it('recusa senha comum mesmo cumprindo a composição', () => {
    expect(erroSenha('Senha@12345')).toMatch(/fácil de adivinhar/);
    expect(erroSenha('Brasil#2026')).toMatch(/fácil de adivinhar/);
    expect(erroSenha('Aaaaaaa1!x')).toMatch(/repetir/);
  });

  it('recusa senha que contém o nome ou o e-mail', () => {
    expect(erroSenha('Pietro#Casa9', { nome: 'Pietro Maffessoni' })).toMatch(/nome ou seu e-mail/);
    expect(erroSenha('Xmaffe#99Kk', { email: 'maffe@email.com' })).toMatch(/nome ou seu e-mail/);
  });
});

describe('esperaAposFalhas', () => {
  it('não pune os primeiros erros e dobra depois, até 15 minutos', () => {
    expect(esperaAposFalhas(4)).toBe(0);
    expect(esperaAposFalhas(5)).toBe(30);
    expect(esperaAposFalhas(6)).toBe(60);
    expect(esperaAposFalhas(20)).toBe(900);
  });

  it('formata a contagem', () => {
    expect(formatarEspera(42)).toBe('0:42');
    expect(formatarEspera(725)).toBe('12:05');
  });
});
