import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { ZeloMark } from '@/components/Brand';
import {
  ActionRow,
  ActionTile,
  AppText,
  Avatar,
  Badge,
  Card,
  ErrorState,
  MetaLine,
  Panel,
  Row,
  Screen,
  Section,
  SectionHeader,
  SkeletonList,
} from '@/components/ui';
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

  const temPainel = gestor || zelador || porteiro || (!!resumoFin && resumoFin.pendentes > 0);

  return (
    <Screen refreshing={dados.refreshing} onRefresh={dados.refetch}>
      {/* Identificação: quem está usando e em que papel. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.lg,
        }}
      >
        <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color="subtle">
            {gestor ? 'Painel do síndico' : porteiro ? 'Painel da portaria' : zelador ? 'Painel do zelador' : 'Bem-vindo(a)'}
          </AppText>
          <AppText variant="heading" numberOfLines={1} style={{ marginTop: 3 }}>
            {primeiroNome(profile?.nome_completo) || 'Morador'}
          </AppText>
        </View>
      </View>

      {/*
        Barra de contexto: em que condomínio o usuário está operando. Era um card
        com o símbolo dentro de um bloco colorido; virou uma faixa delimitada por
        fios, que é o que uma barra de contexto faz em software de trabalho — situa
        sem disputar atenção. O contador de moradores mora aqui porque é informação
        de contexto, não uma pendência: no lugar antigo ele competia em tamanho com
        "boletos atrasados", que é o oposto da prioridade real.
      */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: palette.border,
        }}
      >
        <ZeloMark height={24} color={palette.primary} windowColor={palette.background} />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" numberOfLines={1}>
            {cond?.nome ?? 'Meu condomínio'}
          </AppText>
          <MetaLine
            itens={[
              cond?.cidade ? `${cond.cidade}${cond.uf ? `/${cond.uf}` : ''}` : null,
              gestor && resumo ? `${resumo.moradores} ${resumo.moradores === 1 ? 'morador' : 'moradores'}` : null,
            ]}
            style={{ marginTop: 2 }}
          />
        </View>
        {gestor && cond?.codigo_convite ? (
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="caption" color="subtle">
              Código de convite
            </AppText>
            <View
              style={{
                marginTop: 3,
                backgroundColor: palette.surfaceAlt,
                borderWidth: 1,
                borderColor: palette.border,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.sm,
              }}
            >
              <AppText variant="label" style={{ color: palette.text, letterSpacing: 1.5 }}>
                {cond.codigo_convite}
              </AppText>
            </View>
          </View>
        ) : null}
      </View>

      {/*
        Assembleia é o único item com hora marcada no painel — o compromisso que o
        usuário perde se não vir. Ganha o destaque de um card com barra lateral na
        cor da marca: o recurso de ênfase mais contido que existe, e o único bloco
        da tela que o recebe, para que "destaque" continue querendo dizer algo.
      */}
      {proximaAssembleia ? (
        <Section>
          <Card
            onPress={() => router.push(`/(app)/assembleias/${proximaAssembleia.id}`)}
            style={{ borderLeftWidth: 3, borderLeftColor: palette.primary, paddingLeft: spacing.lg - 3 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppText variant="overline" color="primary">
                  Próxima assembleia
                </AppText>
                <AppText variant="subtitle" numberOfLines={1} style={{ marginTop: 4 }}>
                  {proximaAssembleia.titulo}
                </AppText>
                <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                  {formatDataHora(proximaAssembleia.data_hora)}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} />
            </View>
          </Card>
        </Section>
      ) : null}

      {/*
        Pendências. A grade de seis blocos com número gigante virou uma lista:
        números alinhados numa coluna à esquerda (tabulares, então "7" e "143" batem
        na mesma margem), assunto ao lado e destino à direita. Dá para varrer de cima
        a baixo em um movimento do olho, e a linha zerada sai de vista sozinha porque
        o número dela fica apagado — sem esconder dado nenhum.
      */}
      {temPainel ? (
        <Section>
          <SectionHeader title="Precisa de atenção" />
          <Panel>
            {gestor ? (
              <>
                <LinhaIndicador
                  valor={resumo?.boletosAtrasados ?? 0}
                  label="Boletos atrasados"
                  tone="danger"
                  onPress={() => router.push('/(app)/financeiro/inadimplencia')}
                />
                <LinhaIndicador
                  valor={resumo?.manutencoesVencidas ?? 0}
                  label="Manutenção vencida"
                  tone="danger"
                  onPress={() => router.push('/(app)/manutencao')}
                />
                <LinhaIndicador
                  valor={resumo?.chamadosAbertos ?? 0}
                  label="Chamados abertos"
                  onPress={() => router.push('/(app)/(tabs)/chamados')}
                />
                <LinhaIndicador
                  valor={resumo?.reservasPendentes ?? 0}
                  label="Reservas pendentes"
                  onPress={() => router.push('/(app)/(tabs)/reservas')}
                />
                <LinhaIndicador
                  valor={resumo?.solicitacoesAbertas ?? 0}
                  label="Solicitações"
                  onPress={() => router.push('/(app)/central')}
                />
              </>
            ) : null}

            {zelador ? (
              <>
                <LinhaIndicador
                  valor={resumo?.manutencoesVencidas ?? 0}
                  label="Manutenção vencida"
                  tone="danger"
                  onPress={() => router.push('/(app)/manutencao')}
                />
                <LinhaIndicador
                  valor={resumo?.chamadosAbertos ?? 0}
                  label="Chamados abertos"
                  onPress={() => router.push('/(app)/(tabs)/chamados')}
                />
              </>
            ) : null}

            {porteiro ? (
              <>
                <LinhaIndicador
                  valor={resumoPort?.encomendasAguardando ?? 0}
                  label="Encomendas aguardando"
                  onPress={() => router.push('/(app)/portaria/encomendas')}
                />
                <LinhaIndicador
                  valor={resumoPort?.visitantesAutorizadosHoje ?? 0}
                  label="Autorizados hoje"
                  onPress={() => router.push('/(app)/portaria/visitantes')}
                />
              </>
            ) : null}

            {morador && resumoFin && resumoFin.pendentes > 0 ? (
              <LinhaIndicador
                valor={resumoFin.pendentes}
                label="Boletos pendentes"
                tone={resumoFin.atrasados > 0 ? 'danger' : 'neutral'}
                onPress={() => router.push('/(app)/financeiro')}
              />
            ) : null}
          </Panel>
        </Section>
      ) : null}

      {/* Ações rápidas */}
      <Section>
        <SectionHeader title="Ações rápidas" />
        {gestor ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <ActionTile icon="megaphone-outline" label="Publicar aviso" tone="primary" onPress={() => router.push('/(app)/comunicados/novo')} />
            <ActionTile icon="construct-outline" label="Chamados" tone="warning" onPress={() => router.push('/(app)/(tabs)/chamados')} />
            <ActionTile icon="cube-outline" label="Achados" tone="info" onPress={() => router.push('/(app)/achados')} />
          </View>
        ) : porteiro ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <ActionTile icon="cube-outline" label="Nova encomenda" tone="warning" onPress={() => router.push('/(app)/portaria/encomenda-nova')} />
            <ActionTile icon="car-outline" label="Veículos" tone="primary" onPress={() => router.push('/(app)/portaria/veiculos')} />
          </View>
        ) : zelador ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <ActionTile icon="construct-outline" label="Chamados" tone="warning" onPress={() => router.push('/(app)/(tabs)/chamados')} />
            <ActionTile icon="build-outline" label="Manutenção" tone="primary" onPress={() => router.push('/(app)/manutencao')} />
          </View>
        ) : (
          <Panel>
            <ActionRow
              icon="construct-outline"
              label="Chamados"
              descricao="Abrir e acompanhar solicitações"
              tone="warning"
              onPress={() => router.push('/(app)/(tabs)/chamados')}
            />
            <ActionRow
              icon="calendar-outline"
              label="Reservas"
              descricao="Reservar áreas comuns"
              tone="info"
              onPress={() => router.push('/(app)/(tabs)/reservas')}
            />
            <ActionRow
              icon="cash-outline"
              label="Financeiro"
              descricao="2ª via de boleto e despesas"
              tone="success"
              onPress={() => router.push('/(app)/financeiro')}
            />
          </Panel>
        )}
      </Section>

      {/* Comunicados recentes */}
      <Section>
        <SectionHeader title="Comunicados" action="Ver todos" onAction={() => router.push('/(app)/comunicados')} />

        {dados.loading ? (
          <SkeletonList count={3} />
        ) : dados.error ? (
          <ErrorState
            title="Não foi possível carregar"
            description="Verifique sua conexão para ver os dados do condomínio."
            onRetry={dados.refetch}
          />
        ) : comunicados.length === 0 ? (
          <Panel>
            <Row>
              <AppText variant="caption" color="muted">
                Nenhum comunicado por aqui ainda.
              </AppText>
            </Row>
          </Panel>
        ) : (
          <Panel>
            {comunicados.slice(0, 4).map((c) => (
              <Row key={c.id} onPress={() => router.push(`/(app)/comunicados/${c.id}`)} accessibilityLabel={c.titulo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                  {c.fixado ? <Ionicons name="pin" size={12} color={palette.textSubtle} /> : null}
                  {!c.lido ? <Badge label="Novo" tone="primary" /> : null}
                  <AppText color="subtle" variant="caption" style={{ marginLeft: 'auto' }}>
                    {tempoRelativo(c.created_at)}
                  </AppText>
                </View>
                <AppText variant="subtitle" numberOfLines={1}>
                  {c.titulo}
                </AppText>
                <AppText color="muted" variant="caption" numberOfLines={2} style={{ marginTop: 3 }}>
                  {c.corpo}
                </AppText>
              </Row>
            ))}
          </Panel>
        )}
      </Section>
    </Screen>
  );
}

/**
 * Linha de indicador do painel.
 *
 * A cor do número segue uma regra estreita de propósito: vermelho só em atraso
 * real (dinheiro vencido, manutenção vencida) e só quando há de fato o que ver.
 * Contador em zero fica apagado; contador comum fica na cor do texto. Pintar cada
 * indicador de uma cor diferente — como fazia a grade anterior — devolve tudo ao
 * mesmo nível, e o usuário perde justamente o que deveria olhar primeiro.
 */
function LinhaIndicador({
  valor,
  label,
  tone = 'neutral',
  onPress,
}: {
  valor: number;
  label: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const { palette, tone: tones } = useAppTheme();
  const alerta = tone === 'danger' && valor > 0;
  const cor = valor === 0 ? palette.textSubtle : alerta ? tones.danger.fg : palette.text;

  return (
    <Row onPress={onPress} accessibilityLabel={`${label}: ${valor}`} compact>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <AppText variant="metric" style={{ color: cor, minWidth: 38, textAlign: 'right' }}>
          {valor}
        </AppText>
        <AppText
          variant="subtitle"
          numberOfLines={1}
          style={{ flex: 1, color: valor === 0 ? palette.textMuted : palette.text }}
        >
          {label}
        </AppText>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} /> : null}
      </View>
    </Row>
  );
}
