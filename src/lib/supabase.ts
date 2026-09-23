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

// SecureStore/Keychain não existem no web — lá o cliente usa o storage padrão (localStorage).
const authStorage = Platform.OS === 'web' ? undefined : new LargeSecureStore();

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
