import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Acoes, AppHeader, AppText, Badge, Button, Card, DataRow, IconButton, Input, Loading, Screen, SectionHeader } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';
import { useConfirm } from '@/lib/confirm';
import { alterarStatusReserva, anexarComprovanteReserva, getReserva, listarVistorias, salvarVistoria } from '@/lib/db';
import { formatData, formatHora, formatMoeda, primeiroNome } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';
import { useToast } from '@/lib/toast';
import { reservaStatus, tipoVistoriaLabel } from '@/lib/labels';
import { enviarArquivo, escolherDocumento, urlAssinada } from '@/lib/storage';
import { isGestor, type ItemVistoria, type ReservaStatus, type TipoVistoria, type VistoriaReserva } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const statusOrdem: ReservaStatus[] = ['pendente', 'aprovada', 'rejeitada', 'cancelada'];

export default function ReservaDetalhe() {
  const { palette, tone: tones } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, papel } = useAuth();
  const acao = useAcao();
  const confirmar = useConfirm();
  const toast = useToast();
  const gestor = isGestor(papel);
  const porteiro = papel === 'porteiro';
  const podeVistoriar = gestor || porteiro;
  const [mudando, setMudando] = useState(false);
  const [enviandoComprovante, setEnviandoComprovante] = useState(false);

  const { data, loading, refetch } = useFetch(async () => {
    const [reserva, vistorias] = await Promise.all([getReserva(id), listarVistorias(id)]);
    return { reserva, vistorias };
  }, [id]);

  async function mudarStatus(novo: ReservaStatus) {
    if (!data?.reserva || novo === data.reserva.status) return;
    const destrutivo = novo === 'cancelada' || novo === 'rejeitada';
    if (destrutivo) {
      const ok = await confirmar({
        titulo: novo === 'cancelada' ? 'Cancelar reserva?' : 'Rejeitar reserva?',
        mensagem: 'O morador será notificado da alteração.',
        confirmar: novo === 'cancelada' ? 'Cancelar reserva' : 'Rejeitar',
        cancelar: 'Voltar',
        destrutivo: true,
      });
      if (!ok) return;
    }
    setMudando(true);
    try {
      await alterarStatusReserva(id, novo);
      toast.sucesso('Status atualizado ✓');
      hapticSuccess();
    } catch (e: any) {
      toast.erro(e?.message ?? 'Não foi possível alterar o status.');
    }
    setMudando(false);
    refetch();
  }

  async function anexarComprovante() {
    if (!data?.reserva) return;
    const doc = await escolherDocumento();
    if (!doc) return;
    setEnviandoComprovante(true);
    // O envio falhava em silêncio: o morador anexava o comprovante, o upload
    // quebrava e a tela voltava ao normal como se tivesse dado certo.
    const reserva = data.reserva;
    const ok = await acao(
      async () => {
        const path = await enviarArquivo('financeiro', doc.uri, reserva.condominio_id, doc.nome);
        await anexarComprovanteReserva(id, path);
      },
      { erro: 'Não foi possível enviar o comprovante.', sempre: () => setEnviandoComprovante(false) },
    );
    if (ok) refetch();
  }

  async function abrirComprovante(path: string) {
    await acao(
      async () => {
        const url = await urlAssinada('financeiro', path);
        await Linking.openURL(url);
      },
      { erro: 'Não foi possível abrir o comprovante.' },
    );
  }

  if (loading || !data?.reserva)
    return (
      <Screen>
        <AppHeader title="Reserva" back />
        {loading ? <Loading /> : <AppText color="muted" center>Reserva não encontrada.</AppText>}
      </Screen>
    );

  const { reserva, vistorias } = data;
  const st = reservaStatus[reserva.status];
  const vistoriaEntrada = vistorias.find((v) => v.tipo === 'entrada') ?? null;
  const vistoriaSaida = vistorias.find((v) => v.tipo === 'saida') ?? null;

  return (
    <Screen>
      <AppHeader title="Reserva" back />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Badge label={st.label} tone={st.tone} />
      </View>

      <AppText variant="title">{reserva.area?.nome ?? 'Área'}</AppText>
      <AppText color="muted" style={{ marginTop: spacing.xs }}>
        {formatData(reserva.inicio)} · {formatHora(reserva.inicio)} às {formatHora(reserva.fim)}
      </AppText>

      <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <DataRow label="Morador" valor={primeiroNome(reserva.morador?.nome_completo) || 'Morador'} />
        {reserva.unidade ? (
          <DataRow label="Unidade" valor={`${reserva.unidade.bloco ? 'Bloco ' + reserva.unidade.bloco + ' · ' : ''}${reserva.unidade.numero}`} />
        ) : null}
        {reserva.taxa_cobrada ? <DataRow label="Taxa de uso" valor={formatMoeda(reserva.taxa_cobrada)} /> : null}
      </Card>

      {reserva.observacao ? (
        <AppText color="muted" style={{ marginTop: spacing.md }}>
          “{reserva.observacao}”
        </AppText>
      ) : null}

      {/* Comprovante de pagamento (quando há taxa de uso) */}
      {reserva.taxa_cobrada && reserva.taxa_cobrada > 0 ? (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons
              name={reserva.comprovante_path ? 'checkmark-circle' : 'alert-circle-outline'}
              size={20}
              color={reserva.comprovante_path ? palette.success : palette.warning}
            />
            <AppText variant="subtitle" style={{ flex: 1 }}>
              Comprovante de pagamento
            </AppText>
            <Badge
              label={reserva.comprovante_path ? 'Anexado' : 'Pendente'}
              tone={reserva.comprovante_path ? 'success' : 'warning'}
            />
          </View>
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {reserva.comprovante_path ? (
              <Button
                title="Ver comprovante"
                variant="secondary"
                size="sm"
                icon="document-attach-outline"
                onPress={() => abrirComprovante(reserva.comprovante_path!)}
              />
            ) : null}
            {user?.id === reserva.morador_id ? (
              <Button
                title={reserva.comprovante_path ? 'Substituir comprovante' : 'Anexar comprovante'}
                size="sm"
                icon="cloud-upload-outline"
                loading={enviandoComprovante}
                onPress={anexarComprovante}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {gestor ? (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Alterar status" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {statusOrdem.map((s) => {
              const meta = reservaStatus[s];
              const ativo = reserva.status === s;
              return (
                <Pressable
                  key={s}
                  disabled={mudando}
                  onPress={() => mudarStatus(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={meta.label}
                  style={({ hovered }: any) => ({
                    minHeight: 32,
                    justifyContent: 'center',
                    paddingHorizontal: spacing.md - 1,
                    paddingVertical: 6,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: ativo ? tones[meta.tone].fg : hovered ? palette.borderStrong : palette.border,
                    backgroundColor: ativo ? tones[meta.tone].bg : hovered ? palette.surfaceAlt : palette.surface,
                  })}
                >
                  <AppText variant="label" style={{ color: ativo ? tones[meta.tone].fg : palette.textMuted }}>
                    {meta.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {reserva.status === 'aprovada' ? (
        <>
          <VistoriaSecao
            tipo="entrada"
            reservaId={id}
            condominioId={reserva.condominio_id}
            vistoria={vistoriaEntrada}
            podeEditar={podeVistoriar}
            userId={user?.id}
            onSalvo={refetch}
          />
          <VistoriaSecao
            tipo="saida"
            reservaId={id}
            condominioId={reserva.condominio_id}
            vistoria={vistoriaSaida}
            podeEditar={podeVistoriar}
            userId={user?.id}
            onSalvo={refetch}
          />
        </>
      ) : null}
    </Screen>
  );
}

function VistoriaSecao({
  tipo,
  reservaId,
  condominioId,
  vistoria,
  podeEditar,
  userId,
  onSalvo,
}: {
  tipo: TipoVistoria;
  reservaId: string;
  condominioId: string;
  vistoria: VistoriaReserva | null;
  podeEditar: boolean;
  userId?: string;
  onSalvo: () => void;
}) {
  const { palette } = useAppTheme();
  const acao = useAcao();
  const meta = tipoVistoriaLabel[tipo];
  const [editando, setEditando] = useState(false);
  const [itens, setItens] = useState<ItemVistoria[]>(vistoria?.itens ?? []);
  const [novoItem, setNovoItem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const itensAtuais = useMemo(() => (editando ? itens : vistoria?.itens ?? []), [editando, itens, vistoria]);

  function iniciarEdicao() {
    setItens(vistoria?.itens ?? []);
    setEditando(true);
  }

  function adicionarItem() {
    if (!novoItem.trim()) return;
    setItens((prev) => [...prev, { item: novoItem.trim(), ok: true }]);
    setNovoItem('');
  }

  function alternarOk(i: number) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ok: !it.ok } : it)));
  }

  function removerItem(i: number) {
    setItens((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    if (!userId) return;
    setSalvando(true);
    const ok = await acao(
      () => salvarVistoria({ reserva_id: reservaId, condominio_id: condominioId, tipo, itens, respondida_por: userId }),
      { sempre: () => setSalvando(false) },
    );
    if (!ok) return;
    setEditando(false);
    onSalvo();
  }

  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText variant="overline" color="subtle" style={{ flex: 1 }}>
          {meta.label}
        </AppText>
        {podeEditar && !editando ? (
          <IconButton
            icon={vistoria ? 'create-outline' : 'add-outline'}
            label={vistoria ? `Editar ${meta.label.toLowerCase()}` : `Registrar ${meta.label.toLowerCase()}`}
            tone="primary"
            onPress={iniciarEdicao}
          />
        ) : null}
      </View>

      {editando ? (
        <Card style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {itens.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pressable
                onPress={() => alternarOk(i)}
                hitSlop={12}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: it.ok }}
                accessibilityLabel={it.item}
                style={{ minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={it.ok ? 'checkmark-circle' : 'close-circle'} size={19} color={it.ok ? palette.success : palette.danger} />
              </Pressable>
              <AppText variant="caption" style={{ flex: 1 }}>{it.item}</AppText>
              <IconButton icon="trash-outline" label={`Remover ${it.item}`} onPress={() => removerItem(i)} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Input placeholder="Ex.: Piso limpo" value={novoItem} onChangeText={setNovoItem} onSubmitEditing={adicionarItem} />
            </View>
            <IconButton icon="add-circle" label="Adicionar item ao checklist" tone="primary" size={22} onPress={adicionarItem} />
          </View>
          <Acoes minimo={140}>
            <Button title="Cancelar" variant="secondary" size="sm" onPress={() => setEditando(false)} />
            <Button title="Salvar checklist" size="sm" loading={salvando} onPress={salvar} />
          </Acoes>
        </Card>
      ) : itensAtuais.length === 0 ? (
        <AppText color="subtle" variant="caption" style={{ marginTop: spacing.xs }}>
          Nenhum checklist registrado ainda.
        </AppText>
      ) : (
        <Card style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {itensAtuais.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={it.ok ? 'checkmark-circle' : 'close-circle'} size={18} color={it.ok ? palette.success : palette.danger} />
              <AppText color="muted">{it.item}</AppText>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
