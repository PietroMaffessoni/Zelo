import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Acoes, AppHeader, AppText, Badge, Button, EmptyState, ErrorState, Fab, Input, MetaLine, Panel, Row, Screen, SectionHeader, SkeletonList } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarEncomendas, marcarEncomendaRetirada } from '@/lib/db';
import { tempoRelativo } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';
import * as L from '@/lib/labels';
import { urlsAssinadas } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Encomenda } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function PortariaEncomendas() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const toast = useToast();
  const { condominioId } = useAuth();
  const [retirandoId, setRetirandoId] = useState<string | null>(null);
  const [nomeRetirada, setNomeRetirada] = useState('');
  const [assinou, setAssinou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data, loading, refreshing, error, refetch } = useFetch(async () => {
    if (!condominioId) return { encomendas: [] as Encomenda[], fotoUrls: {} as Record<string, string> };
    const encomendas = await listarEncomendas(condominioId);
    const paths = encomendas.map((e) => e.foto_url).filter((p): p is string => !!p);
    const fotoUrls = await urlsAssinadas('portaria', paths);
    return { encomendas, fotoUrls };
  }, [condominioId]);

  const encomendas = data?.encomendas ?? [];
  const fotoUrls = data?.fotoUrls ?? {};
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
    try {
      await marcarEncomendaRetirada(id, nomeRetirada.trim(), { assinaturaConfirmada: assinou });
      toast.sucesso('Retirada registrada ✓');
      hapticSuccess();
    } catch (e: any) {
      toast.erro(e?.message ?? 'Não foi possível registrar a retirada.');
    }
    setSalvando(false);
    setRetirandoId(null);
    setNomeRetirada('');
    setAssinou(false);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Encomendas" back onRefresh={refetch} />

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : encomendas.length === 0 ? (
          <EmptyState icon="cube-outline" title="Nenhuma encomenda registrada" />
        ) : (
          <View style={{ gap: spacing.xl }}>
            <View>
              <SectionHeader title={`Aguardando retirada (${aguardando.length})`} />
              {aguardando.length === 0 ? (
                <Panel>
                  <Row>
                    <AppText color="muted" variant="caption">
                      Nenhuma encomenda pendente.
                    </AppText>
                  </Row>
                </Panel>
              ) : (
                <Panel>
                  {aguardando.map((e) => (
                  <Row key={e.id}>
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      {e.foto_url && fotoUrls[e.foto_url] ? (
                        <Image source={{ uri: fotoUrls[e.foto_url] }} style={{ width: 56, height: 56, borderRadius: radius.md }} contentFit="cover" />
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
                          <Ionicons name="cube-outline" size={22} color={palette.textSubtle} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <AppText variant="subtitle" numberOfLines={1}>
                          {e.descricao}
                        </AppText>
                        <MetaLine
                          style={{ marginTop: 2 }}
                          itens={[
                            e.unidade
                              ? `${e.unidade.bloco ? `Bloco ${e.unidade.bloco} · ` : ''}Unidade ${e.unidade.numero}`
                              : null,
                            e.remetente,
                            tempoRelativo(e.created_at),
                          ]}
                        />
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
                        <Acoes minimo={120}>
                          <Button title="Cancelar" variant="secondary" size="sm" onPress={() => setRetirandoId(null)} />
                          <Button title="Confirmar" size="sm" loading={salvando} onPress={() => confirmarRetirada(e.id)} />
                        </Acoes>
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
                  </Row>
                  ))}
                </Panel>
              )}
            </View>

            {retiradas.length > 0 ? (
              <View>
                <SectionHeader title="Retiradas recentemente" />
                <Panel>
                  {retiradas.slice(0, 10).map((e) => (
                    <Row key={e.id} compact>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="subtitle" numberOfLines={1}>
                            {e.descricao}
                          </AppText>
                          <MetaLine
                            style={{ marginTop: 2 }}
                            itens={[
                              `Retirada por ${e.retirado_por_nome}`,
                              e.retirado_em ? tempoRelativo(e.retirado_em) : null,
                              e.assinatura_confirmada ? 'assinado' : null,
                            ]}
                          />
                        </View>
                        <Badge label={L.encomendaStatus.retirada.label} tone={L.encomendaStatus.retirada.tone} />
                      </View>
                    </Row>
                  ))}
                </Panel>
              </View>
            ) : null}
          </View>
        )}
      </Screen>
      <Fab icon="add" label="Encomenda" onPress={() => router.push('/(app)/portaria/encomenda-nova')} />
    </View>
  );
}
