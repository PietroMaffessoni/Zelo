import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppHeader, AppText, Loading, Panel, Row, Screen } from '@/components/ui';
import { spacing, type Tone } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
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
        <Panel style={{ marginTop: spacing.sm }}>
          <HubTile
            icon="people-outline"
            tone="info"
            titulo="Visitantes"
            valor={data?.visitantesAutorizadosHoje ?? 0}
            legenda={`${data?.visitantesAutorizadosHoje ?? 0} autorizados hoje`}
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
        </Panel>
      )}
    </Screen>
  );
}

/**
 * Destino da portaria com o respectivo contador.
 *
 * Eram três cards flutuantes, cada um com um bloco colorido de 48px e um número
 * grande do outro lado — três pequenos painéis para o que é, na prática, um menu
 * de três itens. Vira linha dentro de um painel só: o número fica na direita,
 * tabular, onde o porteiro sempre o encontra no mesmo lugar ao trocar de turno.
 */
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
  const { palette } = useAppTheme();
  return (
    <Row onPress={onPress} accessibilityLabel={`${titulo}. ${legenda}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name={icon} size={19} color={palette.textSubtle} style={{ width: 22, textAlign: 'center' }} />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">{titulo}</AppText>
          <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
            {legenda}
          </AppText>
        </View>
        {valor !== undefined ? (
          <AppText variant="metric" style={{ color: valor > 0 ? palette.text : palette.textSubtle }}>
            {valor}
          </AppText>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} />
      </View>
    </Row>
  );
}
