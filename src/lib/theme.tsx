import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { aplicarTema, palette, tone, type ModoTema, type Palette, type Tone } from '@/constants/theme';

const CHAVE_TEMA = 'zelo.tema';

/**
 * No web, lê o tema de forma síncrona do localStorage já na primeira renderização.
 * Sem isso, o provider renderiza `null` até o AsyncStorage responder e a tela pisca
 * em branco (no nativo o splash cobre essa janela; no web, não).
 */
function lerTemaInicialWeb(sistemaEscuro: boolean): ModoTema | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const salvo = window.localStorage.getItem(CHAVE_TEMA);
    return salvo === 'light' || salvo === 'dark' ? salvo : sistemaEscuro ? 'dark' : 'light';
  } catch {
    return null;
  }
}

type TemaContexto = {
  escuro: boolean;
  alternar: () => void;
  palette: Palette;
  tone: Record<Tone, { bg: string; fg: string }>;
};

const ThemeContext = createContext<TemaContexto | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sistemaEscuro = useColorScheme() === 'dark';
  const [modo, setModo] = useState<ModoTema | null>(() => {
    const inicial = lerTemaInicialWeb(sistemaEscuro);
    if (inicial) aplicarTema(inicial);
    return inicial;
  });

  useEffect(() => {
    if (modo !== null) return; // web já resolveu de forma síncrona
    let ativo = true;
    AsyncStorage.getItem(CHAVE_TEMA).then((salvo) => {
      if (!ativo) return;
      const inicial: ModoTema = salvo === 'light' || salvo === 'dark' ? salvo : sistemaEscuro ? 'dark' : 'light';
      aplicarTema(inicial);
      setModo(inicial);
    });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternar() {
    const novo: ModoTema = modo === 'dark' ? 'light' : 'dark';
    aplicarTema(novo);
    setModo(novo);
    AsyncStorage.setItem(CHAVE_TEMA, novo).catch(() => undefined);
  }

  // Enquanto o tema salvo ainda não carregou, não renderiza os filhos —
  // evita um flash com as cores do modo errado.
  if (modo === null) return null;

  return (
    <ThemeContext.Provider value={{ escuro: modo === 'dark', alternar, palette, tone }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): TemaContexto {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
