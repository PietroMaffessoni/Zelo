import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Badge, Card, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing, tone as tones } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { atualizarStatusLancamento, getLancamento } from '@/lib/db';
import { formatData, formatMoeda } from '@/lib/format';
import { categoriaFinanceira, statusFinanceiro } from '@/lib/labels';
import { urlAssinada } from '@/lib/storage';
import { isGestor, statusFinanceiroEfetivo, type StatusFinanceiro } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

const statusOrdem: StatusFinanceiro[] = ['pendente', 'pago', 'atrasado', 'cancelado'];

export default function FinanceiroDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { papel } = useAuth();
  const gestor = isGestor(papel);
  const [mudando, setMudando] = useState(false);
  const [abrindoAnexo, setAbrindoAnexo] = useState(false);

  const { data: lancamento, loading, refetch } = useFetch(() => getLancamento(id), [id]);

  async function mudarStatus(novo: StatusFinanceiro) {
    if (!lancamento || novo === lancamento.status) return;
    setMudando(true);
    await atualizarStatusLancamento(id, novo);
    setMudando(false);
    refetch();
  }

  async function abrirAnexo() {
    if (!lancamento?.anexo_path) return;
    setAbrindoAnexo(true);
    try {
      const url = await urlAssinada('financeiro', lancamento.anexo_path);
      await WebBrowser.openBrowserAsync(url);
    } finally {
      setAbrindoAnexo(false);
    }
  }

  if (loading || !lancamento)
    return (
      <Screen>
        <AppHeader title="Lançamento" back />
        {loading ? <Loading /> : <AppText color="muted" center>Lançamento não encontrado.</AppText>}
      </Screen>
    );

  const status = statusFinanceiroEfetivo(lancamento);
  const stMeta = statusFinanceiro[status];
  const catMeta = categoriaFinanceira[lancamento.categoria];

  return (
    <Screen>
      <AppHeader title={lancamento.tipo === 'boleto' ? 'Boleto' : 'Despesa'} back />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Badge label={catMeta.label} tone={catMeta.tone} />
        <Badge label={stMeta.label} tone={stMeta.tone} />
      </View>

      <AppText variant="title">{lancamento.descricao}</AppText>
      <AppText variant="heading" color="primary" style={{ marginTop: spacing.sm }}>
        {formatMoeda(lancamento.valor)}
      </AppText>

      <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Linha label="Vencimento" valor={formatData(lancamento.vencimento)} />
        {lancamento.pago_em ? <Linha label="Pago em" valor={formatData(lancamento.pago_em)} /> : null}
        {lancamento.unidade ? (
          <Linha
            label="Unidade"
            valor={`${lancamento.unidade.bloco ? 'Bloco ' + lancamento.unidade.bloco + ' · ' : ''}Unidade ${lancamento.unidade.numero}`}
          />
        ) : (
          <Linha label="Unidade" valor="Despesa geral do condomínio" />
        )}
        {lancamento.competencia ? <Linha label="Competência" valor={lancamento.competencia} /> : null}
      </Card>

      {lancamento.observacao ? (
        <AppText color="muted" style={{ marginTop: spacing.md }}>
          {lancamento.observacao}
        </AppText>
      ) : null}

      {lancamento.anexo_path ? (
        <Pressable
          onPress={abrirAnexo}
          disabled={abrindoAnexo}
          style={{
            marginTop: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: palette.border,
          }}
        >
          <Ionicons name="document-attach-outline" size={20} color={palette.primary} />
          <AppText color="primary" variant="label">
            {abrindoAnexo ? 'Abrindo...' : 'Ver comprovante/boleto anexado'}
          </AppText>
        </Pressable>
      ) : null}

      {gestor ? (
        <View style={{ marginTop: spacing.xl }}>
          <AppText variant="label" color="muted" style={{ marginBottom: spacing.sm }}>
            Alterar status
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {statusOrdem.map((s) => {
              const meta = statusFinanceiro[s];
              const ativo = lancamento.status === s;
              return (
                <Pressable
                  key={s}
                  disabled={mudando}
                  onPress={() => mudarStatus(s)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.full,
                    borderWidth: 1.5,
                    borderColor: ativo ? tones[meta.tone].fg : palette.border,
                    backgroundColor: ativo ? tones[meta.tone].bg : palette.surface,
                  }}
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
    </Screen>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText color="muted" variant="label">
        {label}
      </AppText>
      <AppText variant="label">{valor}</AppText>
    </View>
  );
}
