/**
 * Validação dos dados de conta: nome, e-mail, telefone e senha.
 *
 * Sem nenhum import, como `consulta.ts`, para ser testável fora do app. As
 * mesmas regras valem no cadastro, na recuperação de senha e na troca de senha
 * do perfil — antes cada tela tinha a sua, e a recuperação aceitava uma senha
 * que o cadastro recusaria.
 *
 * Tudo isto roda no aparelho e é contornável por quem chamar a API direto. A
 * barreira de verdade da senha é a política do Supabase (Authentication →
 * Providers → Email → requisitos de senha), que deve ser configurada com as
 * mesmas regras daqui; a validação local existe para a pessoa saber o que falta
 * enquanto digita, em vez de descobrir depois de enviar.
 */

// ------------------------------------------------------------------- Nome

/** Erro do nome completo, ou null se estiver válido. */
export function erroNome(nome: string): string | null {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if (!limpo) return 'Informe seu nome.';
  if (limpo.length > 100) return 'Nome longo demais.';
  // Letras de qualquer alfabeto, com acento, apóstrofo (D'Ávila), hífen e ponto
  // de abreviação. Dígito e símbolo num nome são quase sempre erro de digitação.
  if (!/^[\p{L}][\p{L}' .-]*$/u.test(limpo)) return 'Use apenas letras no nome.';
  const partes = limpo.split(' ').filter((p) => /\p{L}/u.test(p));
  if (partes.length < 2) return 'Informe nome e sobrenome.';
  return null;
}

// ------------------------------------------------------------------- E-mail

/** E-mail como o Supabase guarda: sem espaços e em minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function erroEmail(email: string): string | null {
  const e = normalizarEmail(email);
  if (!e) return 'Informe seu e-mail.';
  // Não tenta ser a RFC inteira: pega o que de fato acontece no celular — falta
  // de @, domínio sem ponto, espaço no meio, vírgula no lugar do ponto.
  if (e.length > 254 || !/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/.test(e)) return 'E-mail inválido.';
  if (e.includes('..')) return 'E-mail inválido.';
  return null;
}

// ----------------------------------------------------------------- Telefone

/** DDDs em uso no Brasil (Anatel). */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46,
  47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85,
  86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Só os dígitos do telefone, sem o +55 de quem cola o número completo. */
export function digitosTelefone(valor: string): string {
  let d = valor.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d.slice(0, 11);
}

/**
 * Máscara de digitação "(11) 91234-5678". Com 10 dígitos vira fixo,
 * "(11) 3123-4567"; o hífen muda de lugar quando entra o 11º.
 */
export function mascaraTelefone(valor: string): string {
  const d = digitosTelefone(valor);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function erroTelefone(valor: string): string | null {
  const d = digitosTelefone(valor);
  if (!d) return 'Informe seu telefone.';
  if (d.length < 10) return 'Telefone incompleto. Inclua o DDD.';
  if (!DDDS.has(Number(d.slice(0, 2)))) return 'DDD inválido.';
  // Celular tem 9 dígitos começando por 9; fixo tem 8 começando de 2 a 5.
  if (d.length === 11 && d[2] !== '9') return 'Celular deve começar com 9 depois do DDD.';
  if (d.length === 10 && !/[2-5]/.test(d[2])) return 'Telefone inválido.';
  if (/^(\d)\1+$/.test(d.slice(2))) return 'Telefone inválido.';
  return null;
}

// -------------------------------------------------------------------- Senha

export const SENHA_MINIMO = 10;

export type RequisitoSenha = { id: string; texto: string; ok: boolean };

/** Lista de requisitos com o estado de cada um — é o que a tela mostra ao vivo. */
export function requisitosSenha(senha: string): RequisitoSenha[] {
  return [
    { id: 'tamanho', texto: `Pelo menos ${SENHA_MINIMO} caracteres`, ok: senha.length >= SENHA_MINIMO },
    { id: 'maiuscula', texto: 'Uma letra maiúscula', ok: /\p{Lu}/u.test(senha) },
    { id: 'minuscula', texto: 'Uma letra minúscula', ok: /\p{Ll}/u.test(senha) },
    { id: 'numero', texto: 'Um número', ok: /\d/.test(senha) },
    { id: 'simbolo', texto: 'Um símbolo (ex.: ! @ # $ %)', ok: /[^\p{L}\d\s]/u.test(senha) },
  ];
}

/**
 * Palavras-base das senhas mais usadas no Brasil. "Senha@123" cumpre todos os
 * requisitos de composição e é das primeiras que um atacante tenta — por isso a
 * composição sozinha não basta.
 */
const BASES_FRACAS = [
  'senha', 'password', 'mudar', 'mudarsenha', 'trocar', 'brasil', 'qwerty', 'qwertyuiop', 'asdf', 'abc',
  'abcd', 'abcdef', 'admin', 'administrador', 'zelo', 'condominio', 'sindico', 'teste', 'usuario',
  'bemvindo', 'iloveyou', 'teamo', 'flamengo', 'corinthians', 'palmeiras', 'saopaulo', 'gremio',
  'internacional', 'vasco', 'cruzeiro', 'santos', 'jesus', 'deus', 'familia',
];

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Erro da senha, ou null se ela serve.
 *
 * `contexto` recebe nome e e-mail da pessoa: senha que contém o próprio nome ou
 * o começo do e-mail cai em qualquer ataque direcionado.
 */
export function erroSenha(senha: string, contexto: { nome?: string | null; email?: string | null } = {}): string | null {
  if (!senha) return 'Informe a senha.';
  if (senha.length > 72) return 'A senha pode ter no máximo 72 caracteres.';
  const falta = requisitosSenha(senha).filter((r) => !r.ok);
  if (falta.length) return `A senha precisa ter: ${falta.map((r) => r.texto.toLowerCase()).join(', ')}.`;

  const s = semAcento(senha);
  const letras = s.replace(/[^a-z]/g, '');
  if (/(.)\1{3,}/.test(s)) return 'Evite repetir o mesmo caractere várias vezes.';
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/.test(s) && letras.length <= 5)
    return 'Senha fácil de adivinhar. Evite sequências como 1234 ou abcd.';
  if (BASES_FRACAS.includes(letras)) return 'Senha fácil de adivinhar. Evite palavras comuns como "senha" ou "brasil".';

  const pedacos: string[] = [];
  if (contexto.nome) pedacos.push(...semAcento(contexto.nome).split(/\s+/));
  if (contexto.email) pedacos.push(...semAcento(contexto.email.split('@')[0]).split(/[^a-z0-9]+/));
  if (pedacos.some((p) => p.length >= 4 && s.includes(p)))
    return 'A senha não pode conter seu nome ou seu e-mail.';
  return null;
}

// --------------------------------------------------- Tentativas de login

/** Falhas seguidas toleradas antes de o login começar a pedir espera. */
export const FALHAS_LIVRES = 4;

/**
 * Segundos de espera depois da n-ésima falha seguida: nada até a 4ª, depois
 * 30s dobrando a cada erro, com teto de 15 minutos. Quem errou a senha uma ou
 * duas vezes não sente nada; um robô testando senhas sente muito.
 */
export function esperaAposFalhas(falhas: number): number {
  if (falhas <= FALHAS_LIVRES) return 0;
  return Math.min(30 * 2 ** (falhas - FALHAS_LIVRES - 1), 15 * 60);
}

/** "0:42", "12:05" — contagem regressiva do bloqueio. */
export function formatarEspera(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
