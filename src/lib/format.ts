import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.locale('pt-br');

export function formatData(value?: string | null): string {
  if (!value) return '';
  return dayjs(value).format('DD/MM/YYYY');
}

export function formatDataHora(value?: string | null): string {
  if (!value) return '';
  return dayjs(value).format('DD/MM/YYYY [às] HH:mm');
}

export function formatHora(value?: string | null): string {
  if (!value) return '';
  return dayjs(value).format('HH:mm');
}

/** "há 3 horas", "ontem", "agora mesmo". */
export function tempoRelativo(value?: string | null): string {
  if (!value) return '';
  const d = dayjs(value);
  if (d.isToday()) return d.fromNow();
  if (d.isYesterday()) return `ontem às ${d.format('HH:mm')}`;
  return d.format('DD/MM/YYYY');
}

/** Rótulo amigável de dia: "Hoje", "Ontem" ou "12 de julho". */
export function rotuloDia(value?: string | null): string {
  if (!value) return '';
  const d = dayjs(value);
  if (d.isToday()) return 'Hoje';
  if (d.isYesterday()) return 'Ontem';
  return d.format('DD [de] MMMM');
}

/** Máscara de digitação DD/MM/AAAA: descarta o que não é dígito e insere as
 *  barras conforme o usuário digita. Use no `onChangeText` do campo. */
export function mascaraData(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Máscara de digitação MM/AAAA (competência). */
export function mascaraCompetencia(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 6);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Máscara de digitação HH:MM (mesma ideia de [mascaraData]). */
export function mascaraHora(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Lê "DD/MM/AAAA" (com "HH:MM" opcional) em modo estrito — recusa data
 *  inexistente (31/02) e hora inválida (25:30). Cheque `.isValid()`. */
export function parseData(data: string, hora?: string) {
  return hora
    ? dayjs(`${data} ${hora}`, 'DD/MM/YYYY HH:mm', true)
    : dayjs(data, 'DD/MM/YYYY', true);
}

export function iniciais(nome?: string | null): string {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function formatMoeda(valor?: number | null): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
}

/** Máscara de digitação de moeda: os dígitos entram pela direita como centavos
 *  e o campo já mostra "R$ 1.234,56" enquanto o usuário digita. Use no
 *  `onChangeText` e leia o número com [parseMoeda]. */
export function mascaraMoeda(valor: string): string {
  // sem os zeros à esquerda o campo volta a ficar vazio ao apagar tudo
  const d = valor.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
  if (!d) return '';
  return formatMoeda(Number(d) / 100);
}

/** Lê o número de um campo formatado por [mascaraMoeda]. */
export function parseMoeda(valor: string): number {
  const d = valor.replace(/\D/g, '');
  return d ? Number(d) / 100 : 0;
}

export function primeiroNome(nome?: string | null): string {
  if (!nome) return '';
  return nome.trim().split(/\s+/)[0];
}
