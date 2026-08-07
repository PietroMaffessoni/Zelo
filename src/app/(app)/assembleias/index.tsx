import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Fab, Loading, Screen, Segmented } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarAssembleias } from '@/lib/db';
import { formatDataHora } from '@/lib/format';
import { assembleiaStatus } from '@/lib/labels';
import { isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

type Filtro = 'proximas' | 'encerradas';

export default function AssembleiasLista() {
  const router = useRouter();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const [filtro, setFiltro] = useState<Filtro>('proximas');

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarAssembleias(condominioId) : []),
    [condominioId],
  );

  const assembleias = (data ?? []).filter((a) =>
    filtro === 'proximas' ? a.status === 'convocada' || a.status === 'em_andamento' : a.status === 'encerrada' || a.status === 'cancelada',
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Assembleias" back subtitle="Convocações e votações do condomínio" />

        <Segmented
          value={filtro}
          onChange={setFiltro}
          shape="box"
          options={[
            { value: 'proximas', label: 'Próximas' },
            { value: 'encerradas', label: 'Encerradas' },
          ]}
        />

        <View style={{ marginTop: spacing.lg }}>
          {loading ? (
            <Loading />
          ) : assembleias.length === 0 ? (
            <EmptyState icon="podium-outline" title="Nenhuma assembleia por aqui" />
          ) : (
            <View style={{ gap: spacing.md }}>
              {assembleias.map((a) => {
                const st = assembleiaStatus[a.status];
                return (
                  <Card key={a.id} onPress={() => router.push(`/(app)/assembleias/${a.id}`)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
                        {a.titulo}
                      </AppText>
                      <Badge label={st.label} tone={st.tone} />
                    </View>
                    <AppText color="muted" variant="caption" style={{ marginTop: 4 }}>
                      {formatDataHora(a.data_hora)}
                      {a.local ? ` · ${a.local}` : ''}
                    </AppText>
                    {a.quorum_minimo_unidades ? (
                      <AppText color="subtle" variant="caption" style={{ marginTop: 2 }}>
                        Quórum mínimo: {a.quorum_minimo_unidades} unidades
                      </AppText>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </Screen>
      {gestor ? <Fab icon="add" label="Convocar" onPress={() => router.push('/(app)/assembleias/novo')} /> : null}
    </View>
  );
}
