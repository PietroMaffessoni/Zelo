import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, EmptyState, Fab, Input, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarEncomendas, marcarEncomendaRetirada } from '@/lib/db';
import { tempoRelativo } from '@/lib/format';
import * as L from '@/lib/labels';
import { useFetch } from '@/lib/useFetch';

export default function PortariaEncomendas() {
  const router = useRouter();
  const { condominioId } = useAuth();
  const [retirandoId, setRetirandoId] = useState<string | null>(null);
  const [nomeRetirada, setNomeRetirada] = useState('');
  const [assinou, setAssinou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarEncomendas(condominioId) : []),
    [condominioId],
  );

  const encomendas = data ?? [];
  const aguardando = encomendas.filter((e) => e.status === 'aguardando_retirada');
  const retiradas = encomendas.filter((e) => e.status === 'retirada');

  function abrirRetirada(id: string) {
    setRetirandoId(id);
    setNomeRetirada('');
    setAssinou(false);
  }

  async function confirmarRetirada(id: string) {
    if (!nomeRetirada.trim()) return;
    setSalvando(true);
    await marcarEncomendaRetirada(id, nomeRetirada.trim(), { assinaturaConfirmada: assinou });
    setSalvando(false);
    setRetirandoId(null);
    setNomeRetirada('');
    setAssinou(false);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Encomendas" back />

        {loading ? (
          <Loading />
        ) : encomendas.length === 0 ? (
          <EmptyState icon="cube-outline" title="Nenhuma encomenda registrada" />
        ) : (
          <View style={{ gap: spacing.xl }}>
            <View style={{ gap: spacing.md }}>
              <AppText variant="subtitle">Aguardando retirada ({aguardando.length})</AppText>
              {aguardando.length === 0 ? (
                <AppText color="muted" variant="caption">
                  Nenhuma encomenda pendente.
                </AppText>
              ) : (
                aguardando.map((e) => (
                  <Card key={e.id}>
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      {e.foto_url ? (
                        <Image source={{ uri: e.foto_url }} style={{ width: 56, height: 56, borderRadius: radius.md }} contentFit="cover" />
                      ) : (
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: radius.md,
                            backgroundColor: palette.surfaceAlt,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Badge label="?" tone="warning" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <AppText variant="subtitle" numberOfLines={1}>
                          {e.descricao}
                        </AppText>
                        <AppText color="muted" variant="caption">
                          {e.unidade?.bloco ? `Bloco ${e.unidade.bloco} · ` : ''}
                          {e.unidade ? `Unidade ${e.unidade.numero}` : ''}
                          {e.remetente ? ` · ${e.remetente}` : ''}
                        </AppText>
                        <AppText color="subtle" variant="caption">
                          {tempoRelativo(e.created_at)}
                        </AppText>
                      </View>
                    </View>
                    {retirandoId === e.id ? (
                      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                        <Input placeholder="Nome de quem retirou" value={nomeRetirada} onChangeText={setNomeRetirada} />
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.sm,
                            backgroundColor: palette.surfaceAlt,
                            borderRadius: radius.md,
                            padding: spacing.md,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <AppText variant="label">Assinatura eletrônica</AppText>
                            <AppText color="muted" variant="caption">Morador confirmou o recebimento</AppText>
                          </View>
                          <Switch value={assinou} onValueChange={setAssinou} trackColor={{ true: palette.primary, false: palette.borderStrong }} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <Button title="Cancelar" variant="secondary" size="sm" onPress={() => setRetirandoId(null)} />
                          <Button title="Confirmar" size="sm" loading={salvando} onPress={() => confirmarRetirada(e.id)} />
                        </View>
                      </View>
                    ) : (
                      <View style={{ marginTop: spacing.md }}>
                        <Button
                          title="Marcar retirada"
                          size="sm"
                          fullWidth={false}
                          icon="checkmark-circle-outline"
                          onPress={() => abrirRetirada(e.id)}
                        />
                      </View>
                    )}
                  </Card>
                ))
              )}
            </View>

            {retiradas.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <AppText variant="subtitle">Retiradas recentemente</AppText>
                {retiradas.slice(0, 10).map((e) => (
                  <Card key={e.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                        {e.descricao}
                      </AppText>
                      <Badge label={L.encomendaStatus.retirada.label} tone={L.encomendaStatus.retirada.tone} />
                    </View>
                    <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
                      Retirada por {e.retirado_por_nome} · {e.retirado_em ? tempoRelativo(e.retirado_em) : ''}
                      {e.assinatura_confirmada ? ' · ✍️ assinado' : ''}
                    </AppText>
                  </Card>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Encomenda" onPress={() => router.push('/(app)/portaria/encomenda-nova')} />
    </View>
  );
}
