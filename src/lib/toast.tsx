import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/Text';
import { radius, shadow, spacing } from '@/constants/theme';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useAppTheme } from '@/lib/theme';

export type ToastTone = 'success' | 'error' | 'info';

type ToastOpcoes = { tone?: ToastTone; duracao?: number };

type ToastContexto = {
  show: (mensagem: string, opcoes?: ToastOpcoes) => void;
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
};

const ToastContext = createContext<ToastContexto | undefined>(undefined);

type ToastAtual = { mensagem: string; tone: ToastTone } | null;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [atual, setAtual] = useState<ToastAtual>(null);
  const opacidade = useRef(new Animated.Value(0)).current;
  const deslocamento = useRef(new Animated.Value(12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const esconder = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacidade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(deslocamento, { toValue: 12, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setAtual(null);
    });
  }, [opacidade, deslocamento]);

  const show = useCallback(
    (mensagem: string, opcoes?: ToastOpcoes) => {
      const tone = opcoes?.tone ?? 'info';
      if (timer.current) clearTimeout(timer.current);
      setAtual({ mensagem, tone });
      if (tone === 'success') hapticSuccess();
      else if (tone === 'error') hapticError();
      opacidade.setValue(0);
      deslocamento.setValue(12);
      Animated.parallel([
        Animated.timing(opacidade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(deslocamento, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(esconder, opcoes?.duracao ?? 2800);
    },
    [opacidade, deslocamento, esconder],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const valor: ToastContexto = {
    show,
    sucesso: (m) => show(m, { tone: 'success' }),
    erro: (m) => show(m, { tone: 'error' }),
  };

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {atual ? <ToastView atual={atual} opacidade={opacidade} deslocamento={deslocamento} onPress={esconder} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({
  atual,
  opacidade,
  deslocamento,
  onPress,
}: {
  atual: { mensagem: string; tone: ToastTone };
  opacidade: Animated.Value;
  deslocamento: Animated.Value;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const cfg = {
    success: { icon: 'checkmark-circle' as const, cor: palette.success },
    error: { icon: 'alert-circle' as const, cor: palette.danger },
    info: { icon: 'information-circle' as const, cor: palette.primary },
  }[atual.tone];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.lg) + (Platform.OS === 'web' ? spacing.md : 72),
        alignItems: 'center',
      }}
    >
      <Animated.View
        onTouchEnd={onPress}
        style={[
          {
            width: '100%',
            maxWidth: 480,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.md,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
            opacity: opacidade,
            transform: [{ translateY: deslocamento }],
          },
          shadow.floating,
        ]}
      >
        <Ionicons name={cfg.icon} size={20} color={cfg.cor} />
        <AppText variant="label" style={{ flex: 1, color: palette.text }} numberOfLines={2}>
          {atual.mensagem}
        </AppText>
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastContexto {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
