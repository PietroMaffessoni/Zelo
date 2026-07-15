import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { radius, shadow, spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type ConfirmOpcoes = {
  titulo: string;
  mensagem?: string;
  confirmar?: string;
  cancelar?: string;
  destrutivo?: boolean;
};

type ConfirmContexto = (opcoes: ConfirmOpcoes) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContexto | undefined>(undefined);

/**
 * Diálogo de confirmação próprio (Modal do RN, que funciona igual no web,
 * onde `Alert.alert` não existe). Use `const confirm = useConfirm()` e
 * `if (await confirm({ titulo, destrutivo: true })) { ... }`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { palette } = useAppTheme();
  const [opcoes, setOpcoes] = useState<ConfirmOpcoes | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirmar = useCallback((opts: ConfirmOpcoes) => {
    setOpcoes(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const responder = useCallback((valor: boolean) => {
    resolverRef.current?.(valor);
    resolverRef.current = null;
    setOpcoes(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal visible={!!opcoes} transparent animationType="fade" onRequestClose={() => responder(false)}>
        <Pressable
          onPress={() => responder(false)}
          style={{
            flex: 1,
            backgroundColor: palette.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              {
                width: '100%',
                maxWidth: 400,
                backgroundColor: palette.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: palette.border,
                padding: spacing.xl,
                gap: spacing.md,
              },
              shadow.floating,
            ]}
          >
            <AppText variant="subtitle">{opcoes?.titulo}</AppText>
            {opcoes?.mensagem ? <AppText color="muted">{opcoes.mensagem}</AppText> : null}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title={opcoes?.cancelar ?? 'Cancelar'} variant="secondary" onPress={() => responder(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={opcoes?.confirmar ?? 'Confirmar'}
                  variant={opcoes?.destrutivo ? 'danger' : 'primary'}
                  onPress={() => responder(true)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContexto {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de ConfirmProvider');
  return ctx;
}
