import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Card, Loading, Screen } from '@/components/ui';
import { radius, spacing, tone as tones, type Tone } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { resumoPortaria } from '@/lib/db';
import { useFetch } from '@/lib/useFetch';

export default function PortariaHub() {
  const router = useRouter();
  const { condominioId } = useAuth();

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? resumoPortaria(condominioId) : null),
    [condominioId],
  );

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
