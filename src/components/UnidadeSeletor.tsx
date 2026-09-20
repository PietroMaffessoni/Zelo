import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText, Input } from '@/components/ui';
import { focusRing } from '@/components/ui/controls';
import { radius, spacing } from '@/constants/theme';
import { TOQUE_MINIMO } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';
import type { Unidade } from '@/lib/types';

/**
 * Campo de seleção de unidade (busca por bloco/número) usado nas telas de
 * portaria e financeiro.
 *
 * Lê as cores por `useAppTheme()` e não mais pelo `palette` importado direto de
 * `@/constants/theme`. O objeto é o mesmo nos dois casos — ele é mutado no lugar
 * ao trocar de tema —, mas só quem consome o contexto volta a renderizar quando
 * o modo muda; pelo import solto, este campo ficava com as cores do tema
 * anterior até algo mais na tela forçar uma nova renderização.
 */
export function UnidadeSeletor({
  unidades,
  value,
  onChange,
  label = 'Unidade',
}: {
  unidades: Unidade[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
}) {
  const { palette } = useAppTheme();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const selecionada = unidades.find((u) => u.id === value) ?? null;

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return unidades;
    return unidades.filter((u) => `${u.bloco ?? ''} ${u.numero}`.toLowerCase().includes(termo));
  }, [unidades, busca]);

  function nomeDe(u: Unidade) {
    return `${u.bloco ? `Bloco ${u.bloco} · ` : ''}Unidade ${u.numero}`;
  }

  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" style={{ color: palette.text }}>
        {label}
      </AppText>
      <Pressable
        onPress={() => setAberto((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        accessibilityLabel={selecionada ? `Unidade: ${nomeDe(selecionada)}` : 'Selecionar unidade'}
        style={({ hovered, focused }: any) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderWidth: aberto ? 1.5 : 1,
            borderColor: aberto ? palette.primary : hovered ? palette.borderStrong : palette.border,
            borderRadius: radius.md,
            // Compensa o engrossar da borda para o campo não "pular" ao abrir —
            // mesmo ajuste do `Input`, para os dois ficarem na mesma vertical.
            paddingHorizontal: aberto ? spacing.md - 0.5 : spacing.md,
            backgroundColor: palette.surface,
            minHeight: TOQUE_MINIMO,
          },
          focusRing(focused, palette.primary),
        ]}
      >
        <AppText
          variant="body"
          numberOfLines={1}
          style={{ flex: 1, minWidth: 0 }}
          color={selecionada ? 'default' : 'subtle'}
        >
          {selecionada ? nomeDe(selecionada) : 'Selecionar unidade'}
        </AppText>
        <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={16} color={palette.textSubtle} />
      </Pressable>
      {aberto ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: radius.md,
            backgroundColor: palette.surface,
            padding: spacing.sm,
            gap: spacing.xs,
            overflow: 'hidden',
          }}
        >
          <Input placeholder="Buscar bloco/número..." value={busca} onChangeText={setBusca} autoFocus />
          {/* 240px cabe em pé e deitado; a lista rola por dentro em vez de
              empurrar o botão de salvar para fora da tela. */}
          <ScrollView style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtradas.map((u) => {
              const ativa = u.id === value;
              return (
                <Pressable
                  key={u.id}
                  onPress={() => {
                    onChange(u.id);
                    setAberto(false);
                    setBusca('');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativa }}
                  accessibilityLabel={nomeDe(u)}
                  style={({ hovered, pressed, focused }: any) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      // Era `paddingVertical: 8`, um alvo de ~28px de altura —
                      // abaixo do mínimo de toque e difícil de acertar numa lista
                      // de unidades parecidas entre si.
                      minHeight: TOQUE_MINIMO,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.sm,
                      backgroundColor:
                        ativa ? palette.primarySoft : hovered || pressed ? palette.surfaceAlt : 'transparent',
                    },
                    focusRing(focused, palette.primary, true),
                  ]}
                >
                  <AppText numberOfLines={1} style={{ flex: 1, minWidth: 0 }} color={ativa ? 'primary' : 'default'}>
                    {nomeDe(u)}
                  </AppText>
                  {ativa ? <Ionicons name="checkmark" size={16} color={palette.primary} /> : null}
                </Pressable>
              );
            })}
            {filtradas.length === 0 ? (
              <AppText color="subtle" variant="caption" style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
                Nenhuma unidade encontrada.
              </AppText>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
