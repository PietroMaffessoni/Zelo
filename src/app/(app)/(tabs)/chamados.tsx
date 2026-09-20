import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, EmptyState, ErrorState, Fab, MetaLine, Panel, Row, Screen, Segmented, SkeletonList } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarChamados } from '@/lib/db';
import { primeiroNome, tempoRelativo } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor, type Chamado, type ChamadoStatus } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

type Filtro = 'todos' | ChamadoStatus;

const filtros: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'aberto', label: 'Abertos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvido', label: 'Resolvidos' },
];

export default function ChamadosTab() {
  const router = useRouter();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const { data, loading, refreshing, error, refetch } = useFetch(
    async () => (condominioId ? listarChamados(condominioId) : []),
    [condominioId],
  );

  const lista = useMemo(() => {
    const todos = data ?? [];
    return filtro === 'todos' ? todos : todos.filter((c) => c.status === filtro);
  }, [data, filtro]);

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch} edges={['top']}>
        <AppHeader
          title="Chamados"
          subtitle={gestor ? 'Todos os chamados do condomínio' : 'Seus chamados'}
          onRefresh={refetch}
        />

        <View style={{ marginBottom: spacing.md }}>
          <Segmented options={filtros} value={filtro} onChange={setFiltro} />
        </View>

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : lista.length === 0 ? (
          <EmptyState
            icon="construct-outline"
            title="Nenhum chamado"
            description={gestor ? 'Não há chamados neste filtro.' : 'Abra um chamado para falar com a administração.'}
            actionLabel="Abrir chamado"
            onAction={() => router.push('/(app)/chamados/novo')}
          />
        ) : (
          <Panel>
            {lista.map((c) => (
              <ChamadoLinha key={c.id} chamado={c} gestor={gestor} onPress={() => router.push(`/(app)/chamados/${c.id}`)} />
            ))}
          </Panel>
        )}
      </Screen>
      <Fab icon="add" label="Novo" onPress={() => router.push('/(app)/chamados/novo')} />
    </View>
  );
}

/**
 * Um chamado na lista.
 *
 * Antes: dois selos coloridos no topo, título, duas linhas de descrição e o autor
 * embaixo — cada registro virava um bloco com cinco alturas diferentes, e vinte
 * deles empilhados não davam para varrer. Agora a leitura é sempre a mesma: o
 * título e o status na primeira linha, o resumo na segunda, o resto como metadado.
 * A categoria saiu do selo e virou texto: dois selos por linha faziam status e
 * categoria disputarem o mesmo destaque, e é o status que muda e exige decisão.
 */
function ChamadoLinha({ chamado, gestor, onPress }: { chamado: Chamado; gestor: boolean; onPress: () => void }) {
  const cat = L.chamadoCategoria[chamado.categoria];
  const st = L.chamadoStatus[chamado.status];
  const unidade = chamado.unidade
    ? `${chamado.unidade.bloco ? chamado.unidade.bloco + ' ' : ''}${chamado.unidade.numero}`
    : null;

  return (
    <Row onPress={onPress} accessibilityLabel={chamado.titulo}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" numberOfLines={1}>
            {chamado.titulo}
          </AppText>
          <AppText color="muted" variant="caption" numberOfLines={2} style={{ marginTop: 3 }}>
            {chamado.descricao}
          </AppText>
          <MetaLine
            color="subtle"
            style={{ marginTop: 5 }}
            itens={[
              cat.label,
              tempoRelativo(chamado.created_at),
              gestor ? primeiroNome(chamado.autor?.nome_completo) || 'Morador' : null,
              gestor ? unidade : null,
            ]}
          />
        </View>
        <Badge label={st.label} tone={st.tone} />
      </View>
    </Row>
  );
}
