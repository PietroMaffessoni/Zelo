import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Falso quando as variáveis de ambiente ainda não foram preenchidas. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Placeholders evitam que o app quebre no boot antes de configurar a nuvem.
// Enquanto `isSupabaseConfigured` for falso, a UI mostra a tela de configuração.
const safeUrl = url ?? 'https://placeholder.supabase.co';
const safeKey = anonKey ?? 'placeholder-anon-key';

/**
 * A sessão do Supabase (access + refresh token) não pode ir em AsyncStorage puro —
 * fica em texto plano no disco. O ideal seria o Keychain/Keystore via expo-secure-store,
 * mas o SecureStore rejeita valores acima de ~2048 bytes, e a sessão (com o objeto do
 * usuário) costuma passar disso. Por isso o padrão recomendado pela própria Supabase
 * para RN: a sessão é criptografada (AES-256-CTR) e o blob cifrado fica no AsyncStorage;
 * só a chave de criptografia (pequena) fica no SecureStore.
 */
class LargeSecureStore {
  private async encriptar(chave: string, valor: string) {
    const chaveEncriptacao = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cifra = new aesjs.ModeOfOperation.ctr(chaveEncriptacao, new aesjs.Counter(1));
    const bytesEncriptados = cifra.encrypt(aesjs.utils.utf8.toBytes(valor));
    await SecureStore.setItemAsync(chave, aesjs.utils.hex.fromBytes(chaveEncriptacao));
    return aesjs.utils.hex.fromBytes(bytesEncriptados);
  }

  private async decriptar(chave: string, valor: string) {
    const chaveHex = await SecureStore.getItemAsync(chave);
    if (!chaveHex) return null;
    const cifra = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(chaveHex), new aesjs.Counter(1));
    const bytesDecriptados = cifra.decrypt(aesjs.utils.hex.toBytes(valor));
    return aesjs.utils.utf8.fromBytes(bytesDecriptados);
  }

  /**
   * Nunca lança. Os dois lados desta gaveta podem sair de sincronia: o blob
   * cifrado vive no AsyncStorage e a chave que o abre vive no Keychain/Keystore.
   * O backup automático do Android restaura o primeiro e **não** o segundo, e
   * depois de um "restaurar do backup" ou de certas reinstalações sobra um blob
   * que nenhuma chave decifra.
   *
   * Deixar o erro subir daqui travava o app na tela de abertura para sempre:
   * `getSession()` rejeitava, `ready` nunca virava true e a splash nunca saía —
   * sem reinstalar, não tinha volta. Descartar a sessão ilegível custa um login;
   * mantê-la custava o app.
   */
  async getItem(chave: string) {
    try {
      const encriptado = await AsyncStorage.getItem(chave);
      if (!encriptado) return encriptado;
      return await this.decriptar(chave, encriptado);
    } catch {
      await this.removeItem(chave);
      return null;
    }
  }

  /** Falha em silêncio: sem persistir, a sessão dura enquanto o app estiver
   *  aberto — degradação bem menor do que derrubar o login inteiro. */
  async setItem(chave: string, valor: string) {
    try {
      const encriptado = await this.encriptar(chave, valor);
      await AsyncStorage.setItem(chave, encriptado);
    } catch {
      // ver acima
    }
  }

  /** Idem: se apagar falhasse, `signOut()` rejeitaria e a pessoa ficaria presa
   *  numa sessão que ela mandou encerrar. */
  async removeItem(chave: string) {
    try {
      await AsyncStorage.removeItem(chave);
      await SecureStore.deleteItemAsync(chave);
    } catch {
      // ver acima
    }
  }
}

type Gaveta = {
  getItem: (chave: string) => Promise<string | null>;
  setItem: (chave: string, valor: string) => Promise<void>;
  removeItem: (chave: string) => Promise<void>;
};

/** Embrulha o `Storage` do navegador na interface assíncrona. Se o acesso lançar
 *  (aba anônima, dados do site bloqueados), a sessão só não é guardada. */
function gavetaDoNavegador(qual: 'localStorage' | 'sessionStorage'): Gaveta {
  const alvo = () => (typeof window === 'undefined' ? null : window[qual]);
  return {
    async getItem(chave) {
      try { return alvo()?.getItem(chave) ?? null; } catch { return null; }
    },
    async setItem(chave, valor) {
      try { alvo()?.setItem(chave, valor); } catch { /* sem onde guardar */ }
    },
    async removeItem(chave) {
      try { alvo()?.removeItem(chave); } catch { /* idem */ }
    },
  };
}

/** Gaveta que some junto com o processo: fechar o app é sair. */
function gavetaEmMemoria(): Gaveta {
  const itens = new Map<string, string>();
  return {
    async getItem(chave) { return itens.get(chave) ?? null; },
    async setItem(chave, valor) { itens.set(chave, valor); },
    async removeItem(chave) { itens.delete(chave); },
  };
}

// SecureStore/Keychain não existem no web — lá o persistente é o localStorage.
const persistente: Gaveta = Platform.OS === 'web' ? gavetaDoNavegador('localStorage') : new LargeSecureStore();
// No web, sessionStorage e não memória: recarregar a página não desloga, mas
// fechar a aba sim — o mesmo que "fechar o app" no celular.
const volatil: Gaveta = Platform.OS === 'web' ? gavetaDoNavegador('sessionStorage') : gavetaEmMemoria();

/**
 * "Manter conectado".
 *
 * A escolha decide ONDE a sessão mora, não se ela vale: marcada, o token vai
 * para o disco e sobrevive ao app fechado; desmarcada, vai para uma gaveta
 * volátil e a próxima abertura cai no login. A preferência em si não é segredo
 * e fica em AsyncStorage para ser lida no boot, antes da sessão.
 *
 * Quem nunca escolheu (instalações anteriores a esta opção) continua conectado,
 * que era o comportamento de antes.
 */
const CHAVE_MANTER_CONECTADO = 'zelo.manter_conectado';
let manterConectado = true;
const preferenciaCarregada: Promise<void> = AsyncStorage.getItem(CHAVE_MANTER_CONECTADO)
  .then((v) => {
    manterConectado = v !== '0';
  })
  .catch(() => undefined);

export async function lerManterConectado(): Promise<boolean> {
  await preferenciaCarregada;
  return manterConectado;
}

/** Chamar ANTES do login: a sessão nova já é gravada na gaveta escolhida. */
export async function definirManterConectado(valor: boolean): Promise<void> {
  await preferenciaCarregada;
  manterConectado = valor;
  await AsyncStorage.setItem(CHAVE_MANTER_CONECTADO, valor ? '1' : '0').catch(() => undefined);
}

/**
 * Toda escrita limpa a outra gaveta. Sem isso, trocar de "manter" para "não
 * manter" deixaria um token antigo no disco, que voltaria a valer se a pessoa
 * marcasse a opção de novo — ou que qualquer um com o aparelho recuperaria.
 */
const authStorage: Gaveta = {
  async getItem(chave) {
    await preferenciaCarregada;
    return (manterConectado ? persistente : volatil).getItem(chave);
  },
  async setItem(chave, valor) {
    await preferenciaCarregada;
    const [destino, outra] = manterConectado ? [persistente, volatil] : [volatil, persistente];
    await destino.setItem(chave, valor);
    await outra.removeItem(chave);
  },
  async removeItem(chave) {
    await Promise.all([persistente.removeItem(chave), volatil.removeItem(chave)]);
  },
};

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
