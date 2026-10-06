import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DetalheUnidade } from '@/components/cadastros/DetalheUnidade';
import { ListaVeiculos } from '@/components/cadastros/ListaVeiculos';
import { ListaVisitantes } from '@/components/cadastros/ListaVisitantes';
import { AppHeader, AppText, Fab, Screen, Segmented } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

type Aba = 'moradores' | 'visitantes' | 'veiculos';

const ABAS: { value: Aba; label: string }[] = [
  { value: 'moradores', label: 'Moradores' },
  { value: 'visitantes', label: 'Visitantes' },
  { value: 'veiculos', label: 'Veículos' },
];

/**
 * Cadastros da unidade num lugar só: quem mora (moradores, dependentes e pets),
 * quem pode entrar (visitantes) e o que estaciona (veículos).
 *
 * Eram três telas soltas no menu — "Minha unidade", "Visitantes" e "Veículos" —
 * e o morador precisava saber em qual delas cada coisa morava. A aba ativa vai
 * na URL (`?aba=visitantes`): as rotas antigas redirecionam para cá já na aba
 * certa, e voltar de um formulário reabre a aba de onde a pessoa saiu.
 */
export default function Cadastros() {
  const router = useRouter();
  const { membershipAtual } = useAuth();
  const unidadeId = membershipAtual?.unidade_id ?? null;
  const unidade = membershipAtual?.unidade;
  const param = useLocalSearchParams<{ aba?: string }>().aba;
  const aba: Aba = ABAS.some((a) => a.value === param) ? (param as Aba) : 'moradores';
  // Puxar para atualizar remonta a aba: cada lista busca os próprios dados ao
  // montar, então trocar a chave é o jeito de pedir tudo de novo.
  const [versao, setVersao] = useState(0);

  const nomeUnidade = unidade
    ? unidade.bloco
      ? `Bloco ${unidade.bloco} · Unidade ${unidade.numero}`
      : `Unidade ${unidade.numero}`
    : undefined;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={false} onRefresh={() => setVersao((v) => v + 1)}>
        <AppHeader title="Cadastros" subtitle={nomeUnidade} back />

        {!unidadeId ? (
          <AppText color="muted" center style={{ marginTop: spacing.lg }}>
            Você precisa estar vinculado a uma unidade para fazer cadastros.
          </AppText>
        ) : (
          <>
            <View style={{ marginBottom: spacing.lg }}>
              <Segmented options={ABAS} value={aba} onChange={(v) => router.setParams({ aba: v })} />
            </View>

            {aba === 'moradores' ? (
              <DetalheUnidade key={`m${versao}`} id={unidadeId} embutido />
            ) : aba === 'visitantes' ? (
              <ListaVisitantes key={`v${versao}`} unidadeId={unidadeId} />
            ) : (
              <ListaVeiculos key={`c${versao}`} unidadeId={unidadeId} />
            )}
          </>
        )}
      </Screen>

      {/* Moradores não têm botão flutuante: dependentes e pets se adicionam no
          próprio bloco, e quem tem conta entra pelo código de convite. */}
      {unidadeId && aba === 'visitantes' ? (
        <Fab icon="add" label="Autorizar" onPress={() => router.push('/(app)/visitantes/novo')} />
      ) : null}
      {unidadeId && aba === 'veiculos' ? (
        <Fab icon="add" label="Veículo" onPress={() => router.push('/(app)/veiculos/novo')} />
      ) : null}
    </View>
  );
}
