import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, Button, Card, Divider, Input, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  adicionarPauta,
  encerrarAssembleia,
  encerrarPauta,
  getAssembleia,
  listarPautas,
  meuVoto,
  votar,
} from '@/lib/db';
import { formatDataHora } from '@/lib/format';
import { assembleiaStatus } from '@/lib/labels';
import { isGestor, type AssembleiaPauta } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function AssembleiaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, papel, condominioId, membershipAtual } = useAuth();
  const gestor = isGestor(papel);
  const unidadeId = membershipAtual?.unidade_id ?? null;

  const [formPauta, setFormPauta] = useState(false);
  const [tituloPauta, setTituloPauta] = useState('');
  const [descricaoPauta, setDescricaoPauta] = useState('');
  const [opcoesPauta, setOpcoesPauta] = useState<string[]>(['', '']);
  const [salvandoPauta, setSalvandoPauta] = useState(false);
  const [votando, setVotando] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);

  const { data, loading, refetch } = useFetch(async () => {
    const [assembleia, pautas] = await Promise.all([getAssembleia(id), listarPautas(id)]);
    const meusVotos: Record<string, string> = {};
    if (unidadeId) {
      await Promise.all(
        pautas.map(async (p) => {
          const v = await meuVoto(p.id, unidadeId);
          if (v) meusVotos[p.id] = v.opcao_id;
        }),
      );
    }
    return { assembleia, pautas, meusVotos };
  }, [id, unidadeId]);

  async function votarNaOpcao(pauta: AssembleiaPauta, opcaoId: string) {
    if (!condominioId || !user || !unidadeId) return;
    setVotando(opcaoId);
    try {
      await votar({ pauta_id: pauta.id, opcao_id: opcaoId, condominio_id: condominioId, unidade_id: unidadeId, user_id: user.id });
      refetch();
    } catch {
      // erro exibido implicitamente via estado não atualizado; unidade já votou nessa pauta
    }
    setVotando(null);
  }

  function alterarOpcaoPauta(i: number, texto: string) {
    setOpcoesPauta((prev) => prev.map((o, idx) => (idx === i ? texto : o)));
  }

  async function salvarPauta() {
    if (!tituloPauta.trim() || !condominioId) return;
    setSalvandoPauta(true);
    await adicionarPauta({
      assembleia_id: id,
      condominio_id: condominioId,
      titulo: tituloPauta.trim(),
      descricao: descricaoPauta.trim() || null,
      opcoes: opcoesPauta.map((o) => o.trim()).filter(Boolean),
    });
    setTituloPauta('');
    setDescricaoPauta('');
    setOpcoesPauta(['', '']);
    setFormPauta(false);
    setSalvandoPauta(false);
    refetch();
  }

  async function encerrar() {
    setEncerrando(true);
    await encerrarAssembleia(id);
    setEncerrando(false);
    refetch();
  }

  if (loading || !data?.assembleia)
    return (
      <Screen>
        <AppHeader title="Assembleia" back />
        {loading ? <Loading /> : <AppText color="muted" center>Assembleia não encontrada.</AppText>}
      </Screen>
    );

  const { assembleia, pautas, meusVotos } = data;
  const st = assembleiaStatus[assembleia.status];
  const encerradaOuCancelada = assembleia.status === 'encerrada' || assembleia.status === 'cancelada';

  return (
    <Screen>
      <AppHeader title="Assembleia" back />

      <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
        <Badge label={st.label} tone={st.tone} />
      </View>
      <AppText variant="title">{assembleia.titulo}</AppText>
      <AppText color="muted" style={{ marginTop: spacing.xs }}>
        {formatDataHora(assembleia.data_hora)}
        {assembleia.local ? ` · ${assembleia.local}` : ''}
      </AppText>
      {assembleia.link_online ? (
        <AppText color="primary" variant="caption" style={{ marginTop: 4 }}>
          {assembleia.link_online}
        </AppText>
      ) : null}
      {assembleia.descricao ? (
        <AppText color="muted" style={{ marginTop: spacing.sm }}>
          {assembleia.descricao}
        </AppText>
      ) : null}
      {assembleia.quorum_minimo_unidades ? (
        <AppText color="subtle" variant="caption" style={{ marginTop: spacing.xs }}>
          Quórum mínimo: {assembleia.quorum_minimo_unidades} unidades
        </AppText>
      ) : null}

      {gestor && !encerradaOuCancelada ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            title="Anexar ata"
            variant="secondary"
            size="sm"
            icon="document-attach-outline"
            onPress={() => router.push(`/(app)/documentos/novo?assembleiaId=${id}`)}
          />
          <Button title="Encerrar assembleia" variant="danger" size="sm" loading={encerrando} onPress={encerrar} />
        </View>
      ) : null}

      {/* Pautas */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <AppText variant="subtitle" style={{ flex: 1 }}>Pautas</AppText>
        {gestor && !encerradaOuCancelada ? (
          <Pressable onPress={() => setFormPauta((v) => !v)} hitSlop={8}>
            <Ionicons name={formPauta ? 'close-outline' : 'add-circle-outline'} size={24} color={palette.primary} />
          </Pressable>
        ) : null}
      </View>

      {formPauta ? (
        <Card style={{ marginBottom: spacing.md, gap: spacing.md }}>
          <Input label="Título da pauta" placeholder="Ex.: Aprovação do orçamento 2026" value={tituloPauta} onChangeText={setTituloPauta} />
          <Input label="Descrição (opcional)" value={descricaoPauta} onChangeText={setDescricaoPauta} multiline />
          <AppText variant="label" color="muted">Opções de voto</AppText>
          {opcoesPauta.map((o, i) => (
            <Input key={i} placeholder={`Opção ${i + 1}`} value={o} onChangeText={(t) => alterarOpcaoPauta(i, t)} />
          ))}
          <Button
            title="+ opção"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => setOpcoesPauta((prev) => [...prev, ''])}
          />
          <Button title="Adicionar pauta" size="sm" onPress={salvarPauta} loading={salvandoPauta} />
        </Card>
      ) : null}

      {pautas.length === 0 ? (
        <AppText color="subtle" variant="caption">Nenhuma pauta cadastrada ainda.</AppText>
      ) : (
        <View style={{ gap: spacing.md }}>
          {pautas.map((p) => {
            const totalVotos = (p.opcoes ?? []).reduce((s, o) => s + (o.votos ?? 0), 0);
            const meuVotoOpcaoId = meusVotos[p.id];
            return (
              <Card key={p.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText variant="subtitle" style={{ flex: 1 }}>{p.titulo}</AppText>
                  {p.encerrada ? <Badge label="Encerrada" tone="neutral" /> : null}
                </View>
                {p.descricao ? (
                  <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>{p.descricao}</AppText>
                ) : null}
                <AppText color="subtle" variant="caption" style={{ marginTop: 4 }}>
                  {totalVotos} unidade{totalVotos === 1 ? '' : 's'} votou/votaram
                </AppText>

                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  {(p.opcoes ?? []).map((o) => {
                    const pct = totalVotos > 0 ? Math.round(((o.votos ?? 0) / totalVotos) * 100) : 0;
                    const votei = meuVotoOpcaoId === o.id;
                    const podeVotar = !p.encerrada && !meuVotoOpcaoId && !!unidadeId;
                    return (
                      <Pressable
                        key={o.id}
                        disabled={!podeVotar || votando === o.id}
                        onPress={() => votarNaOpcao(p, o.id)}
                        style={{
                          borderRadius: radius.md,
                          borderWidth: 1.5,
                          borderColor: votei ? palette.primary : palette.border,
                          backgroundColor: votei ? palette.primarySoft : palette.surface,
                          padding: spacing.md,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${pct}%`,
                            backgroundColor: palette.primarySoft,
                          }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <AppText variant="label" style={{ color: votei ? palette.primary : palette.text }}>
                            {o.texto} {votei ? '✓' : ''}
                          </AppText>
                          <AppText color="muted" variant="caption">
                            {o.votos ?? 0} · {pct}%
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {meuVotoOpcaoId ? (
                  <AppText color="subtle" variant="caption" style={{ marginTop: spacing.sm }}>
                    Sua unidade já votou nesta pauta.
                  </AppText>
                ) : !unidadeId ? (
                  <AppText color="subtle" variant="caption" style={{ marginTop: spacing.sm }}>
                    Você precisa estar vinculado a uma unidade para votar.
                  </AppText>
                ) : null}

                {gestor && !p.encerrada ? (
                  <View style={{ marginTop: spacing.md }}>
                    <Divider style={{ marginBottom: spacing.md }} />
                    <Button
                      title="Encerrar votação desta pauta"
                      variant="secondary"
                      size="sm"
                      onPress={() => encerrarPauta(p.id).then(refetch)}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
