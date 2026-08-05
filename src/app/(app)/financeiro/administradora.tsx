import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, EmptyState, Input, Loading, Screen, Segmented } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { atualizarAdministradora, atualizarStatusLancamento, listarLancamentos, marcarDespesasEnviadas } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { categoriaFinanceira } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useFetch } from '@/lib/useFetch';
import type { LancamentoFinanceiro } from '@/lib/types';

type Aba = 'a_enviar' | 'enviadas';

export default function ContasAdministradora() {
  const { palette } = useAppTheme();
  const toast = useToast();
  const { condominioId, membershipAtual, recarregar } = useAuth();
  const cond = membershipAtual?.condominio;

  const [aba, setAba] = useState<Aba>('a_enviar');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);

  // Config da administradora
  const [editandoAdm, setEditandoAdm] = useState(false);
  const [nomeAdm, setNomeAdm] = useState(cond?.administradora ?? '');
  const [contatoAdm, setContatoAdm] = useState(cond?.administradora_contato ?? '');
  const [salvandoAdm, setSalvandoAdm] = useState(false);

  const { data, loading, refreshing, refetch } = useFetch(
    async () => (condominioId ? listarLancamentos(condominioId, { tipo: 'despesa' }) : []),
    [condominioId],
  );

  const despesas = data ?? [];
  const aEnviar = despesas.filter((d) => (d.status === 'pendente' || d.status === 'atrasado') && !d.enviado_administradora_em);
  const enviadas = despesas.filter((d) => d.enviado_administradora_em && d.status !== 'cancelado');
  const lista = aba === 'a_enviar' ? aEnviar : enviadas;

  const totalSelecionado = aEnviar.filter((d) => selecionadas.has(d.id)).reduce((s, d) => s + Number(d.valor), 0);

  function alternar(id: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function salvarAdministradora() {
    if (!condominioId) return;
    setSalvandoAdm(true);
    await atualizarAdministradora(condominioId, {
      administradora: nomeAdm.trim() || null,
      administradora_contato: contatoAdm.trim() || null,
    });
    await recarregar();
    setSalvandoAdm(false);
    setEditandoAdm(false);
    toast.sucesso('Administradora atualizada ✓');
  }

  function resumoTexto(itens: LancamentoFinanceiro[]): string {
    const linhas = itens.map(
      (d) => `• ${d.descricao} — ${formatMoeda(d.valor)} (venc. ${formatData(d.vencimento)})`,
    );
    const total = itens.reduce((s, d) => s + Number(d.valor), 0);
    const cabecalho = `Contas para pagamento — ${cond?.nome ?? 'Condomínio'}`;
    return [cabecalho, '', ...linhas, '', `Total: ${formatMoeda(total)}`].join('\n');
  }

  async function enviarSelecionadas() {
    const itens = aEnviar.filter((d) => selecionadas.has(d.id));
    if (itens.length === 0) return toast.erro('Selecione ao menos uma conta.');
    setEnviando(true);
    try {
      await marcarDespesasEnviadas(itens.map((d) => d.id), true);
      // Abre o compartilhamento com o resumo — o síndico envia à administradora
      // por WhatsApp/e-mail. Se cancelar o share, as contas já ficam marcadas.
      await Share.share({ message: resumoTexto(itens) }).catch(() => undefined);
      setSelecionadas(new Set());
      toast.sucesso('Contas marcadas como enviadas ✓');
      await refetch();
    } catch (e: any) {
      toast.erro(e?.message ?? 'Não foi possível enviar.');
    }
    setEnviando(false);
  }

  async function marcarPaga(id: string) {
    setProcessando(id);
    await atualizarStatusLancamento(id, 'pago');
    setProcessando(null);
    refetch();
  }

  async function reabrir(id: string) {
    setProcessando(id);
    await marcarDespesasEnviadas([id], false);
    setProcessando(null);
    refetch();
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refetch}>
      <AppHeader title="Contas a pagar" back subtitle="Envio para a administradora" onRefresh={refetch} />

      {/* Administradora */}
      <Card style={{ marginBottom: spacing.md }}>
        {editandoAdm ? (
          <View style={{ gap: spacing.sm }}>
            <Input label="Administradora" placeholder="Ex.: Lello, Moras, Benedetti..." value={nomeAdm} onChangeText={setNomeAdm} />
            <Input label="Contato (WhatsApp/e-mail)" placeholder="(11) 90000-0000" value={contatoAdm} onChangeText={setContatoAdm} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Cancelar" variant="secondary" size="sm" fullWidth={false} onPress={() => setEditandoAdm(false)} />
              <Button title="Salvar" size="sm" icon="checkmark" fullWidth={false} onPress={salvarAdministradora} loading={salvandoAdm} />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="briefcase-outline" size={20} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{cond?.administradora || 'Administradora não definida'}</AppText>
              {cond?.administradora_contato ? (
                <AppText color="muted" variant="caption">{cond.administradora_contato}</AppText>
              ) : (
                <AppText color="subtle" variant="caption">Toque para configurar a administradora do condomínio.</AppText>
              )}
            </View>
            <Pressable onPress={() => { setNomeAdm(cond?.administradora ?? ''); setContatoAdm(cond?.administradora_contato ?? ''); setEditandoAdm(true); }} hitSlop={8}>
              <Ionicons name="create-outline" size={20} color={palette.primary} />
            </Pressable>
          </View>
        )}
      </Card>

      <Segmented
        value={aba}
        onChange={(v) => { setAba(v); setSelecionadas(new Set()); }}
        options={[
          { value: 'a_enviar', label: `A enviar (${aEnviar.length})` },
          { value: 'enviadas', label: `Enviadas (${enviadas.length})` },
        ]}
      />

      <View style={{ marginTop: spacing.md }}>
        {loading ? (
          <Loading />
        ) : lista.length === 0 ? (
          <EmptyState
            icon="cash-outline"
            title={aba === 'a_enviar' ? 'Nada a enviar' : 'Nenhuma conta enviada'}
            description={aba === 'a_enviar' ? 'As despesas pendentes aparecerão aqui para envio à administradora.' : undefined}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {lista.map((d) => {
              const cat = categoriaFinanceira[d.categoria];
              const marcada = selecionadas.has(d.id);
              return (
                <Card key={d.id} onPress={aba === 'a_enviar' ? () => alternar(d.id) : undefined}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    {aba === 'a_enviar' ? (
                      <Ionicons name={marcada ? 'checkbox' : 'square-outline'} size={24} color={marcada ? palette.primary : palette.textSubtle} />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" numberOfLines={1}>{d.descricao}</AppText>
                      <AppText color="muted" variant="caption">
                        {cat.label} · venc. {formatData(d.vencimento)}
                      </AppText>
                      {aba === 'enviadas' && d.status !== 'pago' ? (
                        <Pressable onPress={() => marcarPaga(d.id)} disabled={processando === d.id} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="checkmark-circle-outline" size={15} color={palette.success} />
                          <AppText variant="caption" color="primary">Marcar como paga</AppText>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <AppText variant="label">{formatMoeda(d.valor)}</AppText>
                      {aba === 'enviadas' ? (
                        d.status === 'pago' ? <Badge label="Paga" tone="success" /> : <Badge label="Enviada" tone="info" />
                      ) : null}
                    </View>
                    {aba === 'enviadas' && d.status !== 'pago' ? (
                      <Pressable onPress={() => reabrir(d.id)} disabled={processando === d.id} hitSlop={8}>
                        <Ionicons name="arrow-undo-outline" size={18} color={palette.textSubtle} />
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      {aba === 'a_enviar' && selecionadas.size > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Button
            title={`Enviar ${selecionadas.size} conta(s) · ${formatMoeda(totalSelecionado)}`}
            icon="share-social-outline"
            onPress={enviarSelecionadas}
            loading={enviando}
            size="lg"
          />
        </View>
      ) : null}
    </Screen>
  );
}
