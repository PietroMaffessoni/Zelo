import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, ErrorState, Fab, Screen, Segmented, SkeletonList } from '@/components/ui';
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
      <Screen refreshing={refreshing} onRefresh={refetch} edges={['top']} maxWidth={920}>
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
          <View style={{ gap: spacing.md }}>
            {lista.map((c) => (
              <ChamadoCard key={c.id} chamado={c} gestor={gestor} onPress={() => router.push(`/(app)/chamados/${c.id}`)} />
            ))}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Novo" onPress={() => router.push('/(app)/chamados/novo')} />
    </View>
  );
}

function ChamadoCard({ chamado, gestor, onPress }: { chamado: Chamado; gestor: boolean; onPress: () => void }) {
  const cat = L.chamadoCategoria[chamado.categoria];
  const st = L.chamadoStatus[chamado.status];
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 }}>
        <Badge label={cat.label} tone={cat.tone} />
        <Badge label={st.label} tone={st.tone} />
        <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
          {tempoRelativo(chamado.created_at)}
        </AppText>
      </View>
      <AppText variant="subtitle" numberOfLines={1}>
        {chamado.titulo}
      </AppText>
      <AppText color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
        {chamado.descricao}
      </AppText>
      {gestor ? (
        <AppText color="subtle" variant="caption" style={{ marginTop: spacing.sm }}>
          {primeiroNome(chamado.autor?.nome_completo) || 'Morador'}
          {chamado.unidade ? ` · ${chamado.unidade.bloco ? chamado.unidade.bloco + ' ' : ''}${chamado.unidade.numero}` : ''}
        </AppText>
      ) : null}
    </Card>
  );
}
