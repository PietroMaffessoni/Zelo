import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AppHeader,
  AppText,
  CarregarMais,
  EmptyState,
  ErrorState,
  MetaLine,
  Panel,
  Row,
  Screen,
  Segmented,
  SkeletonList,
} from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarAuditoria } from '@/lib/db';
import { formatDataHora, tempoRelativo } from '@/lib/format';
import { descreverAuditoria, entidadeLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isConselho } from '@/lib/types';
import { useListaPaginada } from '@/lib/useListaPaginada';

type Filtro = 'tudo' | keyof typeof entidadeLabel;

const filtros: { value: Filtro; label: string }[] = [
  { value: 'tudo', label: 'Tudo' },
  { value: 'lancamentos_financeiros', label: 'Financeiro' },
  { value: 'memberships', label: 'Moradores' },
  { value: 'reservas', label: 'Reservas' },
  { value: 'infracoes', label: 'Infrações' },
  { value: 'documentos', label: 'Documentos' },
];

/**
 * Trilha de auditoria: quem fez o quê no condomínio.
 *
 * Existe para a prestação de contas. O síndico responde pela administração e,
 * até aqui, não tinha como demonstrar quem aprovou uma reserva, quem baixou um
 * boleto ou quem removeu um morador — nem como se defender de uma acusação.
 *
 * A leitura é restrita a síndico e conselho fiscal pela própria RLS
 * (`auditoria_select`); a checagem abaixo só evita mostrar uma tela que viria
 * vazia a quem não é do conselho.
 */
export default function Auditoria() {
  const { palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>('tudo');

  const { itens, loading, refreshing, error, carregandoMais, temMais, carregarMais, refetch } =
    useListaPaginada(
      (pagina) =>
        condominioId
          ? listarAuditoria(condominioId, pagina, filtro === 'tudo' ? undefined : filtro)
          : Promise.resolve([]),
      [condominioId, filtro],
    );

  if (!isConselho(papel)) return <Redirect href="/(app)/(tabs)/inicio" />;

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader
        title="Registro de atividades"
        back
        subtitle="Quem fez o quê na administração"
        onRefresh={refetch}
      />

      <View style={{ marginBottom: spacing.md }}>
        <Segmented options={filtros} value={filtro} onChange={setFiltro} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : itens.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Nada registrado ainda"
          description="Alterações em financeiro, moradores, reservas e documentos aparecem aqui conforme acontecem."
        />
      ) : (
        <Panel>
          {itens.map((r) => {
            const meta = entidadeLabel[r.entidade] ?? { label: r.entidade, icon: 'ellipse-outline' };
            const mudanca = descreverAuditoria(r.detalhes);
            return (
              <Row key={r.id} compact>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                  <Ionicons
                    name={meta.icon as never}
                    size={19}
                    color={palette.textSubtle}
                    style={{ width: 22, textAlign: 'center' }}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="subtitle" numberOfLines={2}>
                      {r.ator_nome || 'Alguém'} {r.acao} — {meta.label.toLowerCase()}
                    </AppText>
                    {mudanca ? (
                      <AppText variant="caption" color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                        {mudanca}
                      </AppText>
                    ) : null}
                    <MetaLine
                      color="subtle"
                      style={{ marginTop: 3 }}
                      itens={[tempoRelativo(r.created_at), formatDataHora(r.created_at)]}
                    />
                  </View>
                </View>
              </Row>
            );
          })}
        </Panel>
      )}

      <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
    </Screen>
  );
}
