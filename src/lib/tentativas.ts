/**
 * Contador de falhas de login neste aparelho.
 *
 * Guardado no AsyncStorage, não em estado da tela: se ficasse só na memória,
 * fechar e reabrir o app zeraria a espera e o bloqueio não segurava nada. Vale
 * para a senha e para o código da verificação em duas etapas — os dois são
 * adivinháveis por tentativa.
 *
 * É uma barreira do aparelho. Quem chama a API direto passa por cima dela; quem
 * segura esse caso é o limite de tentativas do próprio Supabase (Authentication
 * → Rate Limits) e, se ligado, o CAPTCHA (Authentication → Attack Protection).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { esperaAposFalhas } from '@/lib/validacao';

const CHAVE = 'zelo.login_falhas';

type Registro = { falhas: number; bloqueadoAte: number };

async function ler(): Promise<Registro> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    const r = bruto ? (JSON.parse(bruto) as Registro) : null;
    if (r && typeof r.falhas === 'number' && typeof r.bloqueadoAte === 'number') return r;
  } catch {
    // Registro ilegível vale como nenhum: travar o login por um arquivo
    // corrompido seria pior que perder a contagem.
  }
  return { falhas: 0, bloqueadoAte: 0 };
}

/** Instante (ms) até quando o login está bloqueado; 0 se está livre. */
export async function lerBloqueio(): Promise<number> {
  const r = await ler();
  return r.bloqueadoAte > Date.now() ? r.bloqueadoAte : 0;
}

/** Soma uma falha e devolve até quando fica bloqueado (0 se ainda não). */
export async function registrarFalha(): Promise<number> {
  const r = await ler();
  const falhas = r.falhas + 1;
  const espera = esperaAposFalhas(falhas);
  const bloqueadoAte = espera ? Date.now() + espera * 1000 : 0;
  await AsyncStorage.setItem(CHAVE, JSON.stringify({ falhas, bloqueadoAte }));
  return bloqueadoAte;
}

export async function limparFalhas(): Promise<void> {
  await AsyncStorage.removeItem(CHAVE);
}
