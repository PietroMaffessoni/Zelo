import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DetalheChamado } from '@/components/chamados/DetalheChamado';

import { AppHeader, AppText, Badge, CampoBusca, CarregarMais, EmptyState, ErrorState, Fab, MetaLine, Panel, Row, Screen, Segmented, SkeletonList } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listarChamados } from '@/lib/db';
import { primeiroNome, tempoRelativo } from '@/lib/format';
import * as L from '@/lib/labels';
import { isGestor, type Chamado, type ChamadoStatus } from '@/lib/types';
import { useLayout } from '@/lib/responsivo';
import { useAppTheme } from '@/lib/theme';
import { useDebounce } from '@/lib/useDebounce';
import { useListaPaginada } from '@/lib/useListaPaginada';

type Filtro = 'todos' | ChamadoStatus;

const filtros: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'aberto', label: 'Abertos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvido', label: 'Resolvidos' },
];

export default function ChamadosTab() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, papel } = useAuth();
  const gestor = isGestor(papel);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  /**
   * Lista e detalhe lado a lado a partir de 1200px.
   *
   * Até aqui a coluna de conteúdo ficava travada em 940px e o resto do monitor
   * virava margem: num 1920 o síndico tinha meia tela vazia e ainda precisava
   * navegar e voltar para ler cada chamado. Na faixa `grande` do Material 3 a
   * resposta é ocupar o espaço com um segundo painel, não esticar o primeiro.
   */
  const { acimaDe } = useLayout();
  const duasColunas = acimaDe('grande');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  // A busca vai ao servidor; sem o atraso, cada tecla viraria uma requisição.
  const buscaAtrasada = useDebounce(busca);

  const {
    itens: lista,
    loading,
    refreshing,
    error,
    carregandoMais,
    temMais,
    carregarMais,
    refetch,
  } = useListaPaginada(
    (pagina) =>
      condominioId
        ? listarChamados(condominioId, pagina, filtro === 'todos' ? undefined : filtro, buscaAtrasada)
        : Promise.resolve([]),
    [condominioId, filtro, buscaAtrasada],
  );

  /**
   * Qual chamado o painel da direita mostra.
   *
   * Derivado, não guardado: `selecionado` registra só a escolha explícita do
   * usuário, e o primeiro da lista entra como padrão. Assim não é preciso um
   * efeito que corrija o estado depois que a lista muda — abrir a tela com o
   * painel vazio ao lado de uma lista cheia parece defeito, e um filtro que
   * elimina o item aberto deixaria a coluna órfã.
   */
  const detalheAberto = duasColunas
    ? selecionado && lista.some((c) => c.id === selecionado)
      ? selecionado
      : (lista[0]?.id ?? null)
    : null;

  function abrir(chamadoId: string) {
    if (duasColunas) setSelecionado(chamadoId);
    else router.push(`/(app)/chamados/${chamadoId}`);
  }

  return (
    <View style={{ flex: 1, flexDirection: duasColunas ? 'row' : 'column' }}>
      <Screen
        refreshing={refreshing}
        onRefresh={refetch}
        edges={['top']}
        // Em duas colunas a lista deixa de ser a coluna centralizada de 940px e
        // passa a ocupar a faixa da esquerda.
        maxWidth={duasColunas ? 560 : undefined}
        style={duasColunas ? { alignSelf: 'flex-start' } : undefined}
      >
        <AppHeader
          title="Chamados"
          subtitle={gestor ? 'Todos os chamados do condomínio' : 'Seus chamados'}
          onRefresh={refetch}
        />

        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar por título ou descrição" />
          <Segmented options={filtros} value={filtro} onChange={setFiltro} />
        </View>

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : lista.length === 0 ? (
          <EmptyState
            icon="construct-outline"
            title="Nenhum chamado"
            description={
              buscaAtrasada
                ? `Nenhum chamado encontrado para "${buscaAtrasada}".`
                : gestor
                  ? 'Não há chamados neste filtro.'
                  : 'Abra um chamado para falar com a administração.'
            }
            actionLabel="Abrir chamado"
            onAction={() => router.push('/(app)/chamados/novo')}
          />
        ) : (
          <Panel>
            {lista.map((c) => (
              <ChamadoLinha
                key={c.id}
                chamado={c}
                gestor={gestor}
                selecionado={c.id === detalheAberto}
                onPress={() => abrir(c.id)}
              />
            ))}
          </Panel>
        )}
        <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
      </Screen>

      {duasColunas ? (
        <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: palette.border }}>
          {detalheAberto ? (
            <Screen key={detalheAberto} edges={['top']}>
              <DetalheChamado id={detalheAberto} embutido />
            </Screen>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
              <AppText color="subtle" variant="caption" center>
                Escolha um chamado à esquerda para ver os detalhes.
              </AppText>
            </View>
          )}
        </View>
      ) : null}

      <Fab icon="add" label="Novo" onPress={() => router.push('/(app)/chamados/novo')} />
    </View>
  );
}

/**
 * Um chamado na lista.
 *
 * Antes: dois selos coloridos no topo, título, duas linhas de descrição e o autor
 * embaixo — cada registro virava um bloco com cinco alturas diferentes, e vinte
 * deles empilhados não davam para varrer. Agora a leitura é sempre a mesma: o
 * título e o status na primeira linha, o resumo na segunda, o resto como metadado.
 * A categoria saiu do selo e virou texto: dois selos por linha faziam status e
 * categoria disputarem o mesmo destaque, e é o status que muda e exige decisão.
 */
function ChamadoLinha({
  chamado,
  gestor,
  onPress,
  selecionado,
}: {
  chamado: Chamado;
  gestor: boolean;
  onPress: () => void;
  /** Em duas colunas: marca qual item está aberto no painel da direita. */
  selecionado?: boolean;
}) {
  const { palette } = useAppTheme();
  const cat = L.chamadoCategoria[chamado.categoria];
  const st = L.chamadoStatus[chamado.status];
  const unidade = chamado.unidade
    ? `${chamado.unidade.bloco ? chamado.unidade.bloco + ' ' : ''}${chamado.unidade.numero}`
    : null;

  return (
    <Row
      onPress={onPress}
      accessibilityLabel={chamado.titulo}
      // Mesma gramática de "selecionado" usada na sidebar e no seletor de
      // condomínio: risco na cor da marca à esquerda e fundo tênue.
      style={
        selecionado
          ? {
              backgroundColor: palette.primarySoft,
              borderLeftWidth: 3,
              borderLeftColor: palette.primary,
              paddingLeft: spacing.lg - 3,
            }
          : undefined
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" numberOfLines={1}>
            {chamado.titulo}
          </AppText>
          <AppText color="muted" variant="caption" numberOfLines={2} style={{ marginTop: 3 }}>
            {chamado.descricao}
          </AppText>
          <MetaLine
            color="subtle"
            style={{ marginTop: 5 }}
            itens={[
              cat.label,
              tempoRelativo(chamado.created_at),
              gestor ? primeiroNome(chamado.autor?.nome_completo) || 'Morador' : null,
              gestor ? unidade : null,
            ]}
          />
        </View>
        <Badge label={st.label} tone={st.tone} />
      </View>
    </Row>
  );
}
