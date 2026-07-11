import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Badge, Card, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing, tone as tones } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarSolicitacoes } from '@/lib/db';
import { primeiroNome, tempoRelativo } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function CentralLista() {
  const router = useRouter();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarSolicitacoes(condominioId) : []),
    [condominioId],
  );

  const itens = data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader
          title="Central do morador"
          back
          subtitle={gestor ? 'Solicitações dos moradores' : 'Suas solicitações à administração'}
        />

        {loading ? (
          <Loading />
        ) : itens.length === 0 ? (
          <EmptyState
            icon="documents-outline"
            title="Nenhuma solicitação"
            description={
              gestor
                ? 'As solicitações dos moradores aparecerão aqui.'
                : 'Peça 2ª via de boleto, autorizações, documentos e muito mais.'
            }
            actionLabel={gestor ? undefined : 'Nova solicitação'}
            onAction={gestor ? undefined : () => router.push('/(app)/central/nova')}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {itens.map((s) => {
              const cat = L.solicitacaoCategoria[s.categoria];
              const st = L.solicitacaoStatus[s.status];
              return (
                <Card key={s.id} onPress={() => router.push(`/(app)/central/${s.id}`)}>
                  <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: radius.md,
                        backgroundColor: tones[cat.tone].bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={(cat.icon as any) || 'document-outline'} size={20} color={tones[cat.tone].fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" numberOfLines={1}>
                        {s.titulo}
                      </AppText>
                      <AppText color="muted" variant="caption">
                        {cat.label}
                        {gestor ? ` · ${primeiroNome(s.morador?.nome_completo) || 'Morador'}` : ''} · {tempoRelativo(s.created_at)}
                      </AppText>
                    </View>
                    <Badge label={st.label} tone={st.tone} />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Solicitar" onPress={() => router.push('/(app)/central/nova')} />
    </View>
  );
}
