import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { aplicarTema, palette, tone, type ModoTema, type Palette, type Tone } from '@/constants/theme';

const CHAVE_TEMA = 'condoos.tema';

type TemaContexto = {
  escuro: boolean;
  alternar: () => void;
  palette: Palette;
  tone: Record<Tone, { bg: string; fg: string }>;
};

const ThemeContext = createContext<TemaContexto | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sistemaEscuro = useColorScheme() === 'dark';
  const [modo, setModo] = useState<ModoTema | null>(null);

  useEffect(() => {
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
