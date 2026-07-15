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

  async getItem(chave: string) {
    const encriptado = await AsyncStorage.getItem(chave);
    if (!encriptado) return encriptado;
    return this.decriptar(chave, encriptado);
  }

  async setItem(chave: string, valor: string) {
    const encriptado = await this.encriptar(chave, valor);
    await AsyncStorage.setItem(chave, encriptado);
  }

  async removeItem(chave: string) {
    await AsyncStorage.removeItem(chave);
    await SecureStore.deleteItemAsync(chave);
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
