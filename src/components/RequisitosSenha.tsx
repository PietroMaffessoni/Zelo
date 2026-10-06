import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
import { requisitosSenha } from '@/lib/validacao';

/**
 * Requisitos da senha marcados ao vivo, logo abaixo do campo.
 *
 * Com cinco regras, dizer só "senha fraca" depois de enviar faria a pessoa
 * adivinhar o que faltou. Aqui cada item vira verde quando é cumprido. Só a
 * marca carrega cor — o texto fica neutro para a lista não virar um semáforo.
 */
export function RequisitosSenha({ senha }: { senha: string }) {
  const { palette } = useAppTheme();
  if (!senha) return null;
  return (
    <View style={{ gap: 4, marginTop: -spacing.sm }} accessibilityLiveRegion="polite">
      {requisitosSenha(senha).map((r) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons
            name={r.ok ? 'checkmark-circle' : 'ellipse-outline'}
            size={15}
            color={r.ok ? palette.success : palette.textSubtle}
          />
          <AppText variant="caption" color={r.ok ? 'muted' : 'subtle'}>
            {r.texto}
          </AppText>
        </View>
      ))}
    </View>
  );
}
