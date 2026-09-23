/**
 * Última barreira: o que aparece quando uma tela quebra ao renderizar.
 *
 * Sem isto, um erro de render em produção deixa a pessoa olhando para uma tela
 * branca — sem mensagem, sem botão, sem saber se o problema é a internet, o
 * celular ou o app. É o pior desfecho possível, e é o padrão quando ninguém
 * declara um limite de erro.
 *
 * Não usa nenhum contexto (tema, sessão, toast) de propósito: este componente
 * roda justamente quando alguma coisa acima dele já falhou, e depender de um
 * provider aqui seria arriscar que o próprio tratamento de erro quebre. Só
 * primitivos do React Native e as constantes estáticas da paleta.
 */
import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

export function ErroFatal({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={estilos.fundo}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.selo}>
          <Ionicons name="warning-outline" size={28} color={palette.warning} />
        </View>

        <Text style={estilos.titulo}>Algo deu errado</Text>
        <Text style={estilos.texto}>
          O app encontrou um problema nesta tela. Tentar de novo costuma resolver — seus dados
          continuam salvos.
        </Text>

        <Pressable
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
          style={({ pressed }) => [estilos.botao, pressed && estilos.botaoPressionado]}
        >
          <Text style={estilos.botaoTexto}>Tentar novamente</Text>
        </Pressable>

        {/* A mensagem técnica fica por último e em corpo pequeno: não é para a
            pessoa entender, é para ela conseguir copiar num pedido de suporte. */}
        {error?.message ? (
          <View style={estilos.detalhe}>
            <Text style={estilos.detalheRotulo}>Detalhe técnico</Text>
            <Text style={estilos.detalheTexto} selectable>
              {error.message}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: palette.background },
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  selo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.warningSoft,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  texto: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSubtle,
    textAlign: 'center',
    maxWidth: 420,
  },
  botao: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    marginTop: spacing.sm,
  },
  botaoPressionado: { opacity: 0.85 },
  botaoTexto: { color: palette.onPrimary, fontSize: 16, fontWeight: '600' },
  detalhe: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
    maxWidth: 480,
    width: '100%',
  },
  detalheRotulo: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.textSubtle,
    marginBottom: spacing.xs,
  },
  detalheTexto: { fontSize: 12, lineHeight: 18, color: palette.textSubtle },
});
