import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ActionTile, AppText, Avatar, Badge, Card, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing, tone as tones, type Tone } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarComunicados, resumoGestor, resumoPortaria, type ResumoGestor, type ResumoPortaria } from '@/lib/db';
import { primeiroNome, tempoRelativo } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { isGestor, type Comunicado } from '@/lib/types';

export default function Inicio() {
  const router = useRouter();
  const { profile, membershipAtual, condominioId, user, papel } = useAuth();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';
  const cond = membershipAtual?.condominio;

  const dados = useFetch(async () => {
    if (!condominioId || !user)
      return { comunicados: [] as Comunicado[], resumo: null as ResumoGestor | null, resumoPortaria: null as ResumoPortaria | null };
    const [comunicados, resumo, resumoPort] = await Promise.all([
      listarComunicados(condominioId, user.id),
      gestor ? resumoGestor(condominioId) : Promise.resolve(null),
      porteiro ? resumoPortaria(condominioId) : Promise.resolve(null),
    ]);
    return { comunicados, resumo, resumoPortaria: resumoPort };
  }, [condominioId, gestor, porteiro]);

  const comunicados = dados.data?.comunicados ?? [];
  const resumo = dados.data?.resumo ?? null;
  const resumoPort = dados.data?.resumoPortaria ?? null;

  return (
    <Screen refreshing={dados.refreshing} onRefresh={dados.refetch}>
      {/* Cabeçalho */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
        <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={48} />
        <View style={{ flex: 1 }}>
          <AppText color="muted" variant="caption">
            {gestor ? 'Painel do síndico' : porteiro ? 'Painel da portaria' : 'Bem-vindo(a)'}
          </AppText>
          <AppText variant="subtitle" numberOfLines={1}>
            {primeiroNome(profile?.nome_completo) || 'Morador'}
          </AppText>
        </View>
      </View>

      {/* Cartão do condomínio */}
      <Card style={{ backgroundColor: palette.primary, borderColor: palette.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="business" size={24} color={palette.white} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ color: palette.white }} variant="subtitle" numberOfLines={1}>
              {cond?.nome ?? 'Meu condomínio'}
            </AppText>
            {cond?.cidade ? (
              <AppText style={{ color: 'rgba(255,255,255,0.8)' }} variant="caption">
                {cond.cidade}
                {cond.uf ? ` · ${cond.uf}` : ''}
              </AppText>
            ) : null}
          </View>
        </View>
        {gestor && cond?.codigo_convite ? (
          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.2)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <AppText style={{ color: 'rgba(255,255,255,0.85)' }} variant="caption">
              Código para moradores entrarem
            </AppText>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: spacing.md,
                paddingVertical: 4,
                borderRadius: radius.sm,
              }}
            >
              <AppText style={{ color: palette.white, fontWeight: '700', letterSpacing: 2 }}>
                {cond.codigo_convite}
              </AppText>
            </View>
          </View>
        ) : null}
      </Card>

      {/* Dashboard do gestor */}
      {gestor ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg }}>
          <StatCard
            label="Chamados abertos"
            valor={resumo?.chamadosAbertos ?? 0}
            icon="construct"
            tone="warning"
            onPress={() => router.push('/(app)/(tabs)/chamados')}
          />
          <StatCard
            label="Reservas pendentes"
            valor={resumo?.reservasPendentes ?? 0}
            icon="calendar"
            tone="info"
            onPress={() => router.push('/(app)/(tabs)/reservas')}
          />
          <StatCard
            label="Solicitações"
            valor={resumo?.solicitacoesAbertas ?? 0}
            icon="documents"
            tone="primary"
            onPress={() => router.push('/(app)/central')}
          />
          <StatCard label="Moradores" valor={resumo?.moradores ?? 0} icon="people" tone="success" />
        </View>
      ) : null}

      {/* Dashboard da portaria */}
      {porteiro ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg }}>
          <StatCard
            label="No local agora"
            valor={resumoPort?.visitantesNoLocal ?? 0}
            icon="people"
            tone="info"
            onPress={() => router.push('/(app)/portaria/visitantes')}
          />
          <StatCard
            label="Autorizados hoje"
            valor={resumoPort?.visitantesAutorizadosHoje ?? 0}
            icon="calendar"
            tone="primary"
            onPress={() => router.push('/(app)/portaria/visitantes')}
          />
          <StatCard
            label="Encomendas aguardando"
            valor={resumoPort?.encomendasAguardando ?? 0}
            icon="cube"
            tone="warning"
            onPress={() => router.push('/(app)/portaria/encomendas')}
          />
        </View>
      ) : null}

      {/* Ações rápidas */}
      <AppText variant="subtitle" style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        Ações rápidas
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {gestor ? (
          <>
            <ActionTile icon="megaphone" label="Publicar aviso" tone="primary" onPress={() => router.push('/(app)/comunicados/novo')} />
            <ActionTile icon="construct" label="Chamados" tone="warning" onPress={() => router.push('/(app)/(tabs)/chamados')} />
            <ActionTile icon="cube" label="Achados" tone="info" onPress={() => router.push('/(app)/achados')} />
          </>
        ) : porteiro ? (
          <>
            <ActionTile icon="person-add" label="Visitante avulso" tone="info" onPress={() => router.push('/(app)/portaria/visitante-avulso')} />
            <ActionTile icon="cube" label="Nova encomenda" tone="warning" onPress={() => router.push('/(app)/portaria/encomenda-nova')} />
            <ActionTile icon="car" label="Veículos" tone="primary" onPress={() => router.push('/(app)/portaria/veiculos')} />
          </>
        ) : (
          <>
            <ActionTile icon="add-circle" label="Abrir chamado" tone="warning" onPress={() => router.push('/(app)/chamados/novo')} />
            <ActionTile icon="calendar" label="Reservar" tone="info" onPress={() => router.push('/(app)/reservas/nova')} />
            <ActionTile icon="documents" label="Central" tone="primary" onPress={() => router.push('/(app)/central')} />
          </>
        )}
      </View>

      {/* Comunicados recentes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <AppText variant="subtitle">Comunicados</AppText>
        <AppText color="primary" variant="label" onPress={() => router.push('/(app)/comunicados')}>
          Ver todos
        </AppText>
      </View>

      {dados.loading ? (
        <Loading />
      ) : comunicados.length === 0 ? (
        <Card>
          <AppText color="muted" center>
            Nenhum comunicado por aqui ainda.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {comunicados.slice(0, 4).map((c) => (
            <Card key={c.id} onPress={() => router.push(`/(app)/comunicados/${c.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 }}>
                {c.fixado ? <Ionicons name="pin" size={14} color={palette.primary} /> : null}
                {!c.lido ? <Badge label="Novo" tone="primary" /> : null}
                <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
                  {tempoRelativo(c.created_at)}
                </AppText>
              </View>
              <AppText variant="subtitle" numberOfLines={1}>
                {c.titulo}
              </AppText>
              <AppText color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                {c.corpo}
              </AppText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function StatCard({
  label,
  valor,
  icon,
  tone = 'primary',
  onPress,
}: {
  label: string;
  valor: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress?: () => void;
}) {
  const t = tones[tone];
  return (
    <Card onPress={onPress} style={{ flexGrow: 1, flexBasis: '46%', minWidth: 150 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.md,
            backgroundColor: t.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={20} color={t.fg} />
        </View>
        <AppText variant="title">{valor}</AppText>
      </View>
      <AppText color="muted" variant="caption" style={{ marginTop: spacing.sm }}>
        {label}
      </AppText>
    </Card>
  );
}
