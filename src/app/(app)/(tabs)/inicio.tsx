import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ZeloMark } from '@/components/Brand';
import { ActionTile, AppText, Avatar, Badge, Card, ErrorState, Screen, SkeletonList } from '@/components/ui';
import { radius, spacing, type Tone } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import {
  listarAssembleias,
  listarComunicados,
  resumoFinanceiroMorador,
  resumoGestor,
  resumoPortaria,
  type ResumoFinanceiro,
  type ResumoGestor,
  type ResumoPortaria,
} from '@/lib/db';
import { formatDataHora, primeiroNome, tempoRelativo } from '@/lib/format';
import { useFetch } from '@/lib/useFetch';
import { isGestor, type Comunicado } from '@/lib/types';

export default function Inicio() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { profile, membershipAtual, condominioId, user, papel } = useAuth();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';
  const zelador = papel === 'zelador';
  const morador = !gestor && !porteiro && !zelador;
  const cond = membershipAtual?.condominio;
  const unidadeId = membershipAtual?.unidade_id ?? null;

  const dados = useFetch(async () => {
    if (!condominioId || !user)
      return {
        comunicados: [] as Comunicado[],
        resumo: null as ResumoGestor | null,
        resumoPortaria: null as ResumoPortaria | null,
        resumoFinanceiro: null as ResumoFinanceiro | null,
      };
    const [comunicados, resumo, resumoPort, resumoFin, assembleias] = await Promise.all([
      listarComunicados(condominioId, user.id),
      // Zelador reaproveita o resumo do gestor por chamados/manutenção (os demais
      // contadores ficam ocultos no painel dele).
      gestor || zelador ? resumoGestor(condominioId) : Promise.resolve(null),
      porteiro ? resumoPortaria(condominioId) : Promise.resolve(null),
      morador ? resumoFinanceiroMorador(condominioId, unidadeId) : Promise.resolve(null),
      listarAssembleias(condominioId),
    ]);
    return { comunicados, resumo, resumoPortaria: resumoPort, resumoFinanceiro: resumoFin, assembleias };
  }, [condominioId, gestor, porteiro, zelador, morador, unidadeId]);

  const comunicados = dados.data?.comunicados ?? [];
  const resumo = dados.data?.resumo ?? null;
  const resumoPort = dados.data?.resumoPortaria ?? null;
  const resumoFin = dados.data?.resumoFinanceiro ?? null;
  const proximaAssembleia = (dados.data?.assembleias ?? [])
    .filter((a) => (a.status === 'convocada' || a.status === 'em_andamento') && new Date(a.data_hora).getTime() >= Date.now())
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0];

  return (
    <Screen refreshing={dados.refreshing} onRefresh={dados.refetch}>
      {/* Cabeçalho */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
        <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={48} />
        <View style={{ flex: 1 }}>
          <AppText color="muted" variant="caption">
            {gestor ? 'Painel do síndico' : porteiro ? 'Painel da portaria' : zelador ? 'Painel do zelador' : 'Bem-vindo(a)'}
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
            <ZeloMark height={26} color={palette.white} windowColor={palette.primary} />
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

      {/* Próxima assembleia */}
      {proximaAssembleia ? (
        <Card
          onPress={() => router.push(`/(app)/assembleias/${proximaAssembleia.id}`)}
          style={{ marginTop: spacing.lg, borderColor: palette.primary, borderWidth: 1.5 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: palette.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="podium" size={22} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText color="primary" variant="caption">Próxima assembleia</AppText>
              <AppText variant="subtitle" numberOfLines={1}>{proximaAssembleia.titulo}</AppText>
              <AppText color="muted" variant="caption">{formatDataHora(proximaAssembleia.data_hora)}</AppText>
            </View>
          </View>
        </Card>
      ) : null}

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
          <StatCard
            label="Boletos atrasados"
            valor={resumo?.boletosAtrasados ?? 0}
            icon="cash"
            tone="danger"
            onPress={() => router.push('/(app)/financeiro/inadimplencia')}
          />
          <StatCard
            label="Manutenção vencida"
            valor={resumo?.manutencoesVencidas ?? 0}
            icon="construct"
            tone={resumo && resumo.manutencoesVencidas > 0 ? 'danger' : 'success'}
            onPress={() => router.push('/(app)/manutencao')}
          />
        </View>
      ) : null}

      {/* Dashboard do zelador */}
      {zelador ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg }}>
          <StatCard
            label="Chamados abertos"
            valor={resumo?.chamadosAbertos ?? 0}
            icon="construct"
            tone="warning"
            onPress={() => router.push('/(app)/(tabs)/chamados')}
          />
          <StatCard
            label="Manutenção vencida"
            valor={resumo?.manutencoesVencidas ?? 0}
            icon="build"
            tone={resumo && resumo.manutencoesVencidas > 0 ? 'danger' : 'success'}
            onPress={() => router.push('/(app)/manutencao')}
          />
        </View>
      ) : null}

      {/* Dashboard da portaria */}
      {porteiro ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg }}>
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

      {/* Financeiro do morador */}
      {morador && resumoFin && resumoFin.pendentes > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg }}>
          <StatCard
            label="Boletos pendentes"
            valor={resumoFin.pendentes}
            icon="cash"
            tone={resumoFin.atrasados > 0 ? 'danger' : 'warning'}
            onPress={() => router.push('/(app)/financeiro')}
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
            <ActionTile icon="cube" label="Nova encomenda" tone="warning" onPress={() => router.push('/(app)/portaria/encomenda-nova')} />
            <ActionTile icon="car" label="Veículos" tone="primary" onPress={() => router.push('/(app)/portaria/veiculos')} />
          </>
        ) : zelador ? (
          <>
            <ActionTile icon="construct" label="Chamados" tone="warning" onPress={() => router.push('/(app)/(tabs)/chamados')} />
            <ActionTile icon="build" label="Manutenção" tone="primary" onPress={() => router.push('/(app)/manutencao')} />
          </>
        ) : (
          <>
            <ActionTile icon="construct" label="Chamados" tone="warning" onPress={() => router.push('/(app)/(tabs)/chamados')} />
            <ActionTile icon="calendar" label="Reservas" tone="info" onPress={() => router.push('/(app)/(tabs)/reservas')} />
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
        <SkeletonList count={3} />
      ) : dados.error ? (
        <ErrorState
          title="Não foi possível carregar"
          description="Verifique sua conexão para ver os dados do condomínio."
          onRetry={dados.refetch}
        />
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
  const { tone: tones } = useAppTheme();
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
