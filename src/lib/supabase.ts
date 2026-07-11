import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Falso quando as variáveis de ambiente ainda não foram preenchidas. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// Placeholders evitam que o app quebre no boot antes de configurar a nuvem.
// Enquanto `isSupabaseConfigured` for falso, a UI mostra a tela de configuração.
const safeUrl = url ?? 'https://placeholder.supabase.co';
const safeKey = anonKey ?? 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
