import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText, Input } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import type { Unidade } from '@/lib/types';

/** Campo de seleção de unidade (busca por bloco/número) usado nas telas de portaria. */
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
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const selecionada = unidades.find((u) => u.id === value) ?? null;

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return unidades;
    return unidades.filter((u) => `${u.bloco ?? ''} ${u.numero}`.toLowerCase().includes(termo));
  }, [unidades, busca]);

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" color="muted">
        {label}
      </AppText>
      <Pressable
        onPress={() => setAberto((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          minHeight: 50,
        }}
      >
        <AppText style={{ flex: 1 }} color={selecionada ? 'default' : 'subtle'}>
          {selecionada
            ? `${selecionada.bloco ? 'Bloco ' + selecionada.bloco + ' · ' : ''}Unidade ${selecionada.numero}`
            : 'Selecionar unidade'}
        </AppText>
        <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textSubtle} />
      </Pressable>
      {aberto ? (
        <View
          style={{
            borderWidth: 1.5,
            borderColor: palette.border,
            borderRadius: radius.md,
            padding: spacing.sm,
            gap: spacing.xs,
          }}
        >
          <Input placeholder="Buscar bloco/número..." value={busca} onChangeText={setBusca} />
          <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
            {filtradas.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => {
                  onChange(u.id);
                  setAberto(false);
                  setBusca('');
                }}
                style={{ paddingVertical: spacing.sm }}
              >
                <AppText>
                  {u.bloco ? `Bloco ${u.bloco} · ` : ''}Unidade {u.numero}
                </AppText>
              </Pressable>
            ))}
            {filtradas.length === 0 ? (
              <AppText color="subtle" variant="caption" style={{ paddingVertical: spacing.sm }}>
                Nenhuma unidade encontrada.
              </AppText>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
