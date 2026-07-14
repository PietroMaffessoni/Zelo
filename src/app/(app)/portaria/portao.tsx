import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Card, Divider, EmptyState, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarAcessosPortao, registrarAcessoPortao } from '@/lib/db';
import { formatDataHora, primeiroNome } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import { type TipoAcessoPortao } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const PORTOES: { tipo: TipoAcessoPortao; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { tipo: 'social', label: 'Portão social', icon: 'walk-outline' },
  { tipo: 'garagem', label: 'Garagem', icon: 'car-outline' },
  { tipo: 'servico', label: 'Serviço', icon: 'cube-outline' },
];

const tipoLabel: Record<TipoAcessoPortao, string> = { social: 'Portão social', garagem: 'Garagem', servico: 'Serviço' };

export default function Portao() {
  const { palette } = useAppTheme();
  const { condominioId, user, papel } = useAuth();
  const origem = papel === 'porteiro' ? 'portaria' : 'app';

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarAcessosPortao(condominioId) : []),
    [condominioId],
  );
  const [acionando, setAcionando] = useState<TipoAcessoPortao | null>(null);

  async function acionar(tipo: TipoAcessoPortao) {
    if (!condominioId || !user) return;
    setAcionando(tipo);
    await registrarAcessoPortao({ condominio_id: condominioId, user_id: user.id, tipo, origem });
    await refetch();
    setAcionando(null);
  }

  const acessos = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title="Portão" back subtitle="Acionamento e histórico" />

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        {PORTOES.map((p) => (
          <Card key={p.tipo} onPress={() => acionar(p.tipo)} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.lg, opacity: acionando ? 0.6 : 1 }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={p.icon} size={24} color={palette.primary} />
            </View>
            <AppText variant="label" center style={{ marginTop: spacing.sm }}>{p.label}</AppText>
          </Card>
        ))}
      </View>

      <Card style={{ backgroundColor: palette.warningSoft, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Ionicons name="information-circle-outline" size={18} color={palette.warning} />
          <AppText color="muted" variant="caption" style={{ flex: 1 }}>
            O acionamento fica registrado no histórico. A abertura física do portão depende da integração com o equipamento (a ser configurada).
          </AppText>
        </View>
      </Card>

      <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>Histórico</AppText>
      {loading ? (
        <Loading />
      ) : acessos.length === 0 ? (
        <EmptyState icon="time-outline" title="Nenhum acionamento" description="Os acionamentos do portão aparecerão aqui." />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {acessos.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
                <Ionicons name="enter-outline" size={18} color={palette.textMuted} />
                <View style={{ flex: 1 }}>
                  <AppText variant="label">{tipoLabel[a.tipo]}</AppText>
                  <AppText color="subtle" variant="caption">
                    {primeiroNome(a.autor?.nome_completo) || 'Sistema'} · {a.origem === 'portaria' ? 'portaria' : 'app'}
                  </AppText>
                </View>
                <AppText color="muted" variant="caption">{formatDataHora(a.created_at)}</AppText>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
