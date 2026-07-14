import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { atenderSos, dispararSos, listarAlertasSos } from '@/lib/db';
import { formatDataHora, primeiroNome } from '@/lib/format';
import { notificarLocal } from '@/lib/notificacoes';
import { statusSos, tipoSosLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type TipoSos } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const TIPOS: TipoSos[] = ['emergencia', 'seguranca', 'incendio', 'saude', 'outro'];

export default function Sos() {
  const { palette, tone } = useAppTheme();
  const { condominioId, user, papel, membershipAtual } = useAuth();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';
  const staff = gestor || porteiro;

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarAlertasSos(condominioId) : []),
    [condominioId],
  );
  const [enviando, setEnviando] = useState<TipoSos | null>(null);

  const alertas = data ?? [];
  const meusAlertas = alertas.filter((a) => a.user_id === user?.id);

  async function acionar(tipo: TipoSos) {
    if (!condominioId || !user) return;
    Alert.alert(
      'Acionar ' + tipoSosLabel[tipo].label,
      'A portaria e o síndico serão avisados imediatamente. Use apenas em caso real.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Acionar agora',
          style: 'destructive',
          onPress: async () => {
            setEnviando(tipo);
            try {
              await dispararSos({
                condominio_id: condominioId,
                user_id: user.id,
                unidade_id: membershipAtual?.unidade_id ?? null,
                tipo,
              });
              await notificarLocal({ titulo: 'Alerta enviado', corpo: 'A portaria foi avisada. Ajuda a caminho.' });
              await refetch();
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível enviar o alerta.');
            }
            setEnviando(null);
          },
        },
      ],
    );
  }

  async function atender(id: string, status: 'atendido' | 'encerrado') {
    if (!user) return;
    await atenderSos(id, user.id, status);
    await refetch();
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title={staff ? 'Alertas de emergência' : 'Emergência (SOS)'} back subtitle={staff ? 'Acionamentos dos moradores' : 'Acione a portaria em caso de emergência'} />

      {/* Morador: botões de acionamento */}
      {!staff ? (
        <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
          <Pressable
            onPress={() => acionar('emergencia')}
            disabled={enviando !== null}
            style={{
              backgroundColor: palette.danger,
              borderRadius: radius.lg,
              paddingVertical: spacing.xxl,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              opacity: enviando ? 0.6 : 1,
            }}
          >
            <Ionicons name="warning" size={48} color={palette.white} />
            <AppText variant="title" style={{ color: palette.white }}>SOS — Emergência</AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>Toque para acionar a portaria</AppText>
          </Pressable>

          <AppText variant="label" color="muted" style={{ marginTop: spacing.sm }}>Outros tipos</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {TIPOS.filter((t) => t !== 'emergencia').map((t) => {
              const meta = tipoSosLabel[t];
              const tn = tone[meta.tone];
              return (
                <Pressable
                  key={t}
                  onPress={() => acionar(t)}
                  disabled={enviando !== null}
                  style={{
                    flexGrow: 1,
                    flexBasis: '46%',
                    backgroundColor: tn.bg,
                    borderRadius: radius.md,
                    paddingVertical: spacing.lg,
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name={(meta.icon ?? 'help-circle-outline') as any} size={26} color={tn.fg} />
                  <AppText variant="label" style={{ color: tn.fg }}>{meta.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {loading ? (
        <Loading />
      ) : (staff ? alertas : meusAlertas).length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title={staff ? 'Nenhum alerta ativo' : 'Sem acionamentos'} description={staff ? 'Tudo tranquilo por aqui.' : 'Seus acionamentos aparecerão aqui.'} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {(staff ? alertas : meusAlertas).map((a) => {
            const meta = tipoSosLabel[a.tipo];
            const sMeta = statusSos[a.status];
            return (
              <Card key={a.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name={(meta.icon ?? 'warning') as any} size={20} color={tone[meta.tone].fg} />
                  <AppText variant="subtitle" style={{ flex: 1 }}>{meta.label}</AppText>
                  <Badge label={sMeta.label} tone={sMeta.tone} />
                </View>
                {staff ? (
                  <AppText color="muted" variant="caption" style={{ marginTop: 4 }}>
                    {primeiroNome(a.autor?.nome_completo) || 'Morador'}
                    {a.unidade ? ` · ${a.unidade.bloco ? 'Bloco ' + a.unidade.bloco + ' · ' : ''}Un. ${a.unidade.numero}` : ''}
                  </AppText>
                ) : null}
                <AppText color="subtle" variant="caption" style={{ marginTop: 2 }}>{formatDataHora(a.created_at)}</AppText>
                {staff && a.status !== 'encerrado' ? (
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                    {a.status === 'aberto' ? (
                      <View style={{ flex: 1 }}>
                        <Button title="Atender" icon="hand-right-outline" size="sm" onPress={() => atender(a.id, 'atendido')} />
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Button title="Encerrar" variant="secondary" icon="checkmark" size="sm" onPress={() => atender(a.id, 'encerrado')} />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
