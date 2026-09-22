import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Acoes, AppHeader, AppText, Button, Input, Panel, Row, Screen, Section, SectionHeader } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { atualizarRetencao } from '@/lib/db';
import { isGestor } from '@/lib/types';

/** Só dígitos, limitado a 4 (9999 dias ≈ 27 anos, teto mais que suficiente). */
function soNumero(v: string) {
  return v.replace(/\D/g, '').slice(0, 4);
}

function rotuloPrazo(dias: number) {
  if (dias === 0) return 'Nunca expurgar';
  if (dias % 365 === 0) return `${dias} dias (~${dias / 365} ano${dias / 365 > 1 ? 's' : ''})`;
  if (dias % 30 === 0) return `${dias} dias (~${dias / 30} ${dias / 30 > 1 ? 'meses' : 'mês'})`;
  return `${dias} dias`;
}

/**
 * Prazos de retenção dos dados de portaria.
 *
 * A LGPD manda eliminar o dado pessoal quando se esgota a finalidade que
 * justificou coletá-lo (art. 15, I). "Quem entrou no prédio na terça" cumpre sua
 * função em semanas — e guardar para sempre não é só irregular, é acumular
 * passivo: cada mês a mais é mais gente exposta se a base vazar.
 *
 * Fica configurável, e não fixo no código, porque a convenção de cada condomínio
 * pode exigir prazo diferente. O expurgo em si é a função `expurgar_dados_antigos`
 * do banco (setup.sql seção 14).
 */
export default function PrivacidadeDados() {
  const { condominioId, membershipAtual, papel, recarregar } = useAuth();
  const acao = useAcao();
  const cond = membershipAtual?.condominio;

  const [visitantes, setVisitantes] = useState(String(cond?.retencao_visitantes_dias ?? 90));
  const [encomendas, setEncomendas] = useState(String(cond?.retencao_encomendas_dias ?? 180));
  const [salvando, setSalvando] = useState(false);

  if (!isGestor(papel)) return <Redirect href="/(app)/(tabs)/inicio" />;

  const dVisitantes = Number(visitantes || 0);
  const dEncomendas = Number(encomendas || 0);
  const mudou =
    dVisitantes !== (cond?.retencao_visitantes_dias ?? 90) ||
    dEncomendas !== (cond?.retencao_encomendas_dias ?? 180);

  async function salvar() {
    if (!condominioId) return;
    setSalvando(true);
    await acao(
      async () => {
        await atualizarRetencao(condominioId, {
          retencao_visitantes_dias: dVisitantes,
          retencao_encomendas_dias: dEncomendas,
        });
        await recarregar();
      },
      { sucesso: 'Prazos atualizados ✓', sempre: () => setSalvando(false) },
    );
  }

  return (
    <Screen>
      <AppHeader title="Privacidade e retenção" back subtitle="Por quanto tempo os dados de portaria são guardados" />

      <Panel padded>
        <AppText variant="caption" color="muted">
          A LGPD pede que um dado pessoal seja eliminado quando acaba a finalidade que justificou
          coletá-lo. Registros de portaria cumprem sua função em semanas — mantê-los para sempre
          expõe moradores e visitantes sem necessidade. Use 0 para nunca expurgar, se a convenção
          do seu condomínio exigir.
        </AppText>
      </Panel>

      <Section>
        <SectionHeader title="Prazos" />
        <View style={{ gap: spacing.lg }}>
          <Input
            label="Entradas de visitantes"
            hint={rotuloPrazo(dVisitantes)}
            keyboardType="number-pad"
            value={visitantes}
            onChangeText={(v) => setVisitantes(soNumero(v))}
          />
          <Input
            label="Encomendas já retiradas"
            hint={rotuloPrazo(dEncomendas)}
            keyboardType="number-pad"
            value={encomendas}
            onChangeText={(v) => setEncomendas(soNumero(v))}
          />
        </View>
      </Section>

      <Section>
        <Acoes minimo={150}>
          <Button title="Salvar prazos" icon="checkmark" loading={salvando} disabled={!mudou} onPress={salvar} />
        </Acoes>
      </Section>

      <Section>
        <SectionHeader title="O que nunca é apagado" />
        <Panel>
          <Row compact>
            <AppText variant="caption" color="muted">
              Lançamentos financeiros, assembleias, atas, advertências e o registro de atividades
              permanecem. São prova da prestação de contas do condomínio — apagá-los prejudicaria
              todos os moradores, e a própria LGPD prevê a guarda para cumprimento de obrigação
              legal (art. 16, I).
            </AppText>
          </Row>
          <Row compact>
            <AppText variant="caption" color="muted">
              Encomenda aguardando retirada nunca expira, por mais antiga que seja: ela ainda está
              fisicamente na portaria.
            </AppText>
          </Row>
        </Panel>
      </Section>
    </Screen>
  );
}
