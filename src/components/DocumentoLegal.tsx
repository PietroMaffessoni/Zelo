import { View } from 'react-native';

import { AppHeader, AppText, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';

export type SecaoLegal = {
  titulo: string;
  /** Parágrafos corridos da seção. */
  paragrafos?: string[];
  /** Itens de lista (renderizados com marcador). */
  itens?: string[];
};

/**
 * Renderiza um documento jurídico (Termos, Política de Privacidade) com título,
 * data de vigência e seções numeradas automaticamente. Só apresentação — o
 * conteúdo vem por props para manter cada documento em seu próprio arquivo.
 */
export function DocumentoLegal({
  titulo,
  vigencia,
  intro,
  secoes,
  rodape,
}: {
  titulo: string;
  vigencia: string;
  intro?: string[];
  secoes: SecaoLegal[];
  rodape?: string;
}) {
  return (
    <Screen>
      <AppHeader title={titulo} back />

      <AppText variant="caption" color="subtle" style={{ marginTop: spacing.xs }}>
        Última atualização: {vigencia}
      </AppText>

      {intro?.map((p, i) => (
        <AppText key={`intro-${i}`} color="muted" style={{ marginTop: spacing.md, lineHeight: 22 }}>
          {p}
        </AppText>
      ))}

      <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
        {secoes.map((secao, i) => (
          <View key={secao.titulo} style={{ gap: spacing.sm }}>
            <AppText variant="subtitle">
              {i + 1}. {secao.titulo}
            </AppText>
            {secao.paragrafos?.map((p, j) => (
              <AppText key={`p-${j}`} color="muted" style={{ lineHeight: 22 }}>
                {p}
              </AppText>
            ))}
            {secao.itens?.map((item, j) => (
              <View key={`i-${j}`} style={{ flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.xs }}>
                <AppText color="muted">•</AppText>
                <AppText color="muted" style={{ flex: 1, lineHeight: 22 }}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>
        ))}
      </View>

      {rodape ? (
        <AppText variant="caption" color="subtle" style={{ marginTop: spacing.xl, lineHeight: 20 }}>
          {rodape}
        </AppText>
      ) : null}
    </Screen>
  );
}
