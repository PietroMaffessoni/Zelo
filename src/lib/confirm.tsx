import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { Acoes } from '@/components/ui/Form';
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
  const { height } = useWindowDimensions();
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
                // Em celular deitado a viewport tem ~375px de altura: sem teto, um
                // diálogo com mensagem longa passava das duas bordas e os botões
                // ficavam fora do alcance. Com teto, o texto rola e a decisão
                // continua visível.
                maxHeight: height - spacing.xl * 2,
                backgroundColor: palette.surface,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: palette.border,
                padding: spacing.xl - 2,
                gap: spacing.sm,
              },
              // Um diálogo modal de fato paira sobre a página: aqui a sombra
              // trabalha, separando a decisão do conteúdo que ficou atrás.
              shadow.floating,
            ]}
          >
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: spacing.sm }}
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="heading">{opcoes?.titulo}</AppText>
              {opcoes?.mensagem ? (
                <AppText color="muted" variant="caption">
                  {opcoes.mensagem}
                </AppText>
              ) : null}
            </ScrollView>
            {/* Rótulos como "Gerar novo código" não cabem em meia largura num
                celular pequeno: a fileira quebra em vez de truncar a ação. */}
            <Acoes minimo={130} style={{ marginTop: spacing.md }}>
              <Button title={opcoes?.cancelar ?? 'Cancelar'} variant="secondary" onPress={() => responder(false)} />
              <Button
                title={opcoes?.confirmar ?? 'Confirmar'}
                variant={opcoes?.destrutivo ? 'danger' : 'primary'}
                onPress={() => responder(true)}
              />
            </Acoes>
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
