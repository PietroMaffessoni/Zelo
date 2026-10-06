import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import {
  AppHeader,
  AppText,
  Button,
  CarregarMais,
  EmptyState,
  ErrorState,
  Panel,
  Row,
  Screen,
  SkeletonList,
} from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useCaixaEntrada } from '@/lib/caixaEntrada';
import { listarNotificacoes, marcarNotificacaoLida, marcarTodasNotificacoesLidas } from '@/lib/db';
import { tempoRelativo } from '@/lib/format';
import { useAppTheme } from '@/lib/theme';
import type { Notificacao } from '@/lib/types';
import { useListaPaginada } from '@/lib/useListaPaginada';

/** Ícone pelo destino do aviso — a rota já diz de que assunto ele é. */
function iconeDe(n: Notificacao): keyof typeof Ionicons.glyphMap {
  const rota = n.dados?.rota ?? '';
  if (rota.startsWith('/comunicados')) return 'megaphone-outline';
  if (rota.startsWith('/portaria/encomendas')) return 'cube-outline';
  if (rota.startsWith('/chamados')) return 'construct-outline';
  if (rota.startsWith('/reservas')) return 'calendar-outline';
  return 'notifications-outline';
}

/**
 * Aba "Notificações": tudo o que o condomínio avisou a esta pessoa.
 *
 * Os avisos são escritos pelo banco junto com o push (migration 0014), então
 * aparecem aqui mesmo para quem não recebeu a notificação no celular — sem
 * permissão, no Expo Go, ou porque dispensou o aviso sem ler.
 */
export default function Notificacoes() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { condominioId, user } = useAuth();
  const { naoLidas, atualizar } = useCaixaEntrada();
  const acao = useAcao();
  const userId = user?.id ?? null;
  // Marcadas como lidas nesta visita: a linha muda na hora, sem esperar a lista
  // voltar do servidor.
  const [lidasAgora, setLidasAgora] = useState<Set<number>>(() => new Set());
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const { itens, loading, refreshing, carregandoMais, temMais, error, carregarMais, refetch } = useListaPaginada(
    async (pagina) => (condominioId && userId ? listarNotificacoes(condominioId, userId, pagina) : []),
    [condominioId, userId],
  );

  // Chegou aviso novo com a tela aberta (o contador subiu pelo tempo real):
  // traz a lista de novo para ele aparecer no topo.
  const anteriorRef = useRef(naoLidas);
  useEffect(() => {
    if (naoLidas > anteriorRef.current) refetch();
    anteriorRef.current = naoLidas;
  }, [naoLidas, refetch]);

  const lida = (n: Notificacao) => !!n.lida_em || lidasAgora.has(n.id);

  function abrir(n: Notificacao) {
    if (!lida(n)) {
      setLidasAgora((s) => new Set(s).add(n.id));
      // Marcar não pode segurar a navegação: se falhar, o aviso só continua
      // como não lido na próxima visita.
      marcarNotificacaoLida(n.id)
        .then(atualizar)
        .catch(() => undefined);
    }
    // A rota nasce no banco, então é string comum: o tipo de rota do
    // expo-router não tem como ser verificado aqui.
    if (n.dados?.rota) router.push(n.dados.rota as never);
  }

  async function marcarTodas() {
    if (!condominioId || !userId) return;
    setMarcandoTodas(true);
    const ok = await acao(() => marcarTodasNotificacoesLidas(condominioId, userId), {
      sempre: () => setMarcandoTodas(false),
    });
    if (ok) {
      setLidasAgora(new Set(itens.map((n) => n.id)));
      atualizar();
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader
        title="Notificações"
        subtitle={naoLidas > 0 ? `${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : 'Tudo em dia'}
        onRefresh={refetch}
      />

      {naoLidas > 0 ? (
        <View style={{ alignItems: 'flex-end', marginBottom: spacing.md }}>
          <Button
            title="Marcar todas como lidas"
            variant="ghost"
            size="sm"
            icon="checkmark-done-outline"
            fullWidth={false}
            loading={marcandoTodas}
            onPress={marcarTodas}
          />
        </View>
      ) : null}

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : itens.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Nenhuma notificação"
          description="Comunicados, encomendas e atualizações dos seus chamados e reservas aparecem aqui."
        />
      ) : (
        <Panel>
          {itens.map((n) => {
            const naoLida = !lida(n);
            return (
              <Row
                key={n.id}
                onPress={() => abrir(n)}
                accessibilityLabel={`${naoLida ? 'Não lida. ' : ''}${n.titulo}. ${n.corpo}`}
              >
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <Ionicons
                    name={iconeDe(n)}
                    size={20}
                    color={naoLida ? palette.primary : palette.textSubtle}
                    style={{ marginTop: 1 }}
                  />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <AppText variant="subtitle" weight={naoLida ? 'bold' : 'medium'} style={{ flex: 1 }} numberOfLines={1}>
                        {n.titulo}
                      </AppText>
                      {/* Só a marca de não lida carrega cor: o resto da linha
                          fica neutro para o ponto ser o que o olho encontra. */}
                      {naoLida ? (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary }} />
                      ) : null}
                    </View>
                    {n.corpo ? (
                      <AppText variant="caption" color="muted" numberOfLines={2}>
                        {n.corpo}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" color="subtle" style={{ marginTop: 2 }}>
                      {tempoRelativo(n.criado_em)}
                    </AppText>
                  </View>
                </View>
              </Row>
            );
          })}
        </Panel>
      )}
      <CarregarMais temMais={temMais} carregando={carregandoMais} onPress={carregarMais} />
    </Screen>
  );
}
