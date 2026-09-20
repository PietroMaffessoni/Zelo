import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Avatar, Button, EmptyState, ErrorState, Fab, Input, MetaLine, Panel, Row, Screen, SectionHeader, SkeletonList } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { aprovarMembership, listarMembershipsPendentes, listarMoradores, listarUnidades, recusarMembership } from '@/lib/db';
import { vinculoLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import type { Membership, Unidade } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

/** Normaliza para busca: minúsculas, sem acentos e sem pontuação (casa CPF "123.456"). */
function normalizar(txt: string): string {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export default function UnidadesLista() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const confirmar = useConfirm();
  const { condominioId } = useAuth();
  const [processando, setProcessando] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const { data, loading, refreshing, error, refetch } = useFetch<[Unidade[], Membership[], Membership[]]>(
    async () =>
      condominioId
        ? Promise.all([listarUnidades(condominioId), listarMembershipsPendentes(condominioId), listarMoradores(condominioId)])
        : [[], [], []],
    [condominioId],
  );

  const [unidades, pendentes, moradores] = data ?? [[], [], []];

  // Índice unidade -> texto pesquisável dos seus moradores (nome/CPF/e-mail).
  const textoMoradores = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const m of moradores) {
      if (!m.unidade_id) continue;
      const trecho = normalizar([m.profile?.nome_completo, m.cpf, m.profile?.email].filter(Boolean).join(' '));
      mapa.set(m.unidade_id, (mapa.get(m.unidade_id) ?? '') + ' ' + trecho);
    }
    return mapa;
  }, [moradores]);

  const termo = normalizar(busca);
  const unidadesFiltradas = termo
    ? unidades.filter((u) => {
        const alvo = normalizar([u.bloco, u.numero, u.observacoes].filter(Boolean).join(' ')) + (textoMoradores.get(u.id) ?? '');
        return alvo.includes(termo);
      })
    : unidades;

  async function aprovar(id: string) {
    setProcessando(id);
    await aprovarMembership(id);
    setProcessando(null);
    refetch();
  }

  async function recusar(id: string) {
    const ok = await confirmar({
      titulo: 'Recusar pedido de acesso?',
      mensagem: 'O usuário precisará entrar com o código de convite novamente para tentar de novo.',
      confirmar: 'Recusar',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (!ok) return;
    setProcessando(id);
    await recusarMembership(id);
    setProcessando(null);
    refetch();
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={refetch}>
        <AppHeader title="Moradores e unidades" back subtitle="Unidades do condomínio" onRefresh={refetch} />

        {!loading && unidades.length > 0 ? (
          <View style={{ marginBottom: spacing.md }}>
            <Input
              placeholder="Buscar por unidade, morador ou CPF"
              icon="search-outline"
              value={busca}
              onChangeText={setBusca}
              autoCapitalize="none"
            />
          </View>
        ) : null}

        {!loading && pendentes.length > 0 ? (
          <View style={{ marginBottom: spacing.xl }}>
            <SectionHeader title={`Pedidos de acesso pendentes (${pendentes.length})`} />
            {/*
              Fila de aprovação: as duas ações ficam na própria linha, à direita,
              em vez de empilhadas embaixo de cada card. Assim o síndico despacha a
              fila inteira sem que o olho precise voltar ao início a cada registro.
            */}
            <Panel>
              {pendentes.map((m) => (
                <Row key={m.id} compact>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                    <Avatar nome={m.profile?.nome_completo} url={m.profile?.avatar_url} size={34} />
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <AppText variant="subtitle" numberOfLines={1}>
                        {m.profile?.nome_completo || 'Morador'}
                      </AppText>
                      <MetaLine
                        style={{ marginTop: 2 }}
                        itens={[
                          m.unidade
                            ? `${m.unidade.bloco ? `Bloco ${m.unidade.bloco} · ` : ''}Unidade ${m.unidade.numero}`
                            : null,
                          vinculoLabel[m.vinculo].label,
                        ]}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button
                        title="Recusar"
                        variant="secondary"
                        size="sm"
                        fullWidth={false}
                        onPress={() => recusar(m.id)}
                        loading={processando === m.id}
                      />
                      <Button
                        title="Aprovar"
                        size="sm"
                        fullWidth={false}
                        icon="checkmark"
                        onPress={() => aprovar(m.id)}
                        loading={processando === m.id}
                      />
                    </View>
                  </View>
                </Row>
              ))}
            </Panel>
          </View>
        ) : null}

        {loading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : unidades.length === 0 ? (
          <EmptyState
            icon="home-outline"
            title="Nenhuma unidade cadastrada"
            description="Cadastre as unidades para organizar moradores, dependentes e pets."
            actionLabel="Cadastrar unidade"
            onAction={() => router.push('/(app)/unidades/novo')}
          />
        ) : unidadesFiltradas.length === 0 ? (
          <EmptyState icon="search-outline" title="Nada encontrado" description={`Nenhuma unidade ou morador corresponde a "${busca}".`} />
        ) : (
          <Panel>
            {unidadesFiltradas.map((u) => (
              <Row
                key={u.id}
                onPress={() => router.push(`/(app)/unidades/${u.id}`)}
                accessibilityLabel={`${u.bloco ? `Bloco ${u.bloco} ` : ''}Unidade ${u.numero}`}
                compact
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Ionicons name="home-outline" size={18} color={palette.textSubtle} style={{ width: 22, textAlign: 'center' }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle" numberOfLines={1}>
                      {u.bloco ? `Bloco ${u.bloco} · ` : ''}Unidade {u.numero}
                    </AppText>
                    {u.observacoes ? (
                      <AppText color="muted" variant="caption" numberOfLines={1} style={{ marginTop: 2 }}>
                        {u.observacoes}
                      </AppText>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} />
                </View>
              </Row>
            ))}
          </Panel>
        )}
      </Screen>
      <Fab icon="add" label="Unidade" onPress={() => router.push('/(app)/unidades/novo')} />
    </View>
  );
}
