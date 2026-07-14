import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Card, Loading, Screen } from '@/components/ui';
import { radius, spacing, type Tone } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { resumoPortaria } from '@/lib/db';
import { useFetch } from '@/lib/useFetch';

export default function PortariaHub() {
  const router = useRouter();
  const { condominioId, membershipAtual } = useAuth();
  const totalVagas = membershipAtual?.condominio?.total_vagas_visitante ?? 0;

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? resumoPortaria(condominioId) : null),
    [condominioId],
  );

  const vagasLivres = Math.max(0, totalVagas - (data?.visitantesNoLocal ?? 0));

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title="Portaria" subtitle="Visitantes, encomendas e veículos" />

      {loading ? (
        <Loading />
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          <HubTile
            icon="people-outline"
            tone="info"
            titulo="Visitantes"
            valor={data?.visitantesNoLocal ?? 0}
            legenda={`${data?.visitantesNoLocal ?? 0} no local agora · ${data?.visitantesAutorizadosHoje ?? 0} autorizados hoje`}
            onPress={() => router.push('/(app)/portaria/visitantes')}
          />
          <HubTile
            icon="cube-outline"
            tone="warning"
            titulo="Encomendas"
            valor={data?.encomendasAguardando ?? 0}
            legenda="aguardando retirada"
            onPress={() => router.push('/(app)/portaria/encomendas')}
          />
          <HubTile
            icon="car-outline"
            tone="primary"
            titulo="Veículos"
            legenda="Consultar cadastro por placa ou unidade"
            onPress={() => router.push('/(app)/portaria/veiculos')}
          />
          <HubTile
            icon="car-sport-outline"
            tone="success"
            titulo="Vagas de visitante"
            valor={totalVagas > 0 ? vagasLivres : undefined}
            legenda={totalVagas > 0 ? `${vagasLivres} livres de ${totalVagas}` : 'Toque para configurar as vagas'}
            onPress={() => router.push('/(app)/portaria/vagas')}
          />
          <HubTile
            icon="enter-outline"
            tone="primary"
            titulo="Portão"
            legenda="Registrar acionamento e ver histórico"
            onPress={() => router.push('/(app)/portaria/portao')}
          />
          <HubTile
            icon="warning-outline"
            tone="danger"
            titulo="Emergências (SOS)"
            legenda="Alertas acionados pelos moradores"
            onPress={() => router.push('/(app)/sos')}
          />
        </View>
      )}
    </Screen>
  );
}

function HubTile({
  icon,
  tone = 'primary',
  titulo,
  valor,
  legenda,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  titulo: string;
  valor?: number;
  legenda: string;
  onPress: () => void;
}) {
  const { tone: tones } = useAppTheme();
  const t = tones[tone];
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: t.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={24} color={t.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">{titulo}</AppText>
          <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
            {legenda}
          </AppText>
        </View>
        {valor !== undefined ? <AppText variant="title">{valor}</AppText> : null}
      </View>
    </Card>
  );
}
