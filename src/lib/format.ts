import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

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

export function iniciais(nome?: string | null): string {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function formatMoeda(valor?: number | null): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
}

export function primeiroNome(nome?: string | null): string {
  if (!nome) return '';
  return nome.trim().split(/\s+/)[0];
}
