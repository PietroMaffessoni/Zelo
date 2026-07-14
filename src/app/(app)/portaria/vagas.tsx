import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Card, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { definirVagasVisitante, resumoPortaria } from '@/lib/db';
import { isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

export default function VagasVisitante() {
  const { condominioId, papel, membershipAtual, recarregar } = useAuth();
  const gestor = isGestor(papel);
  const total = membershipAtual?.condominio?.total_vagas_visitante ?? 0;

  const { data } = useFetch(async () => (condominioId ? resumoPortaria(condominioId) : null), [condominioId]);
  const noLocal = data?.visitantesNoLocal ?? 0;
  const livres = Math.max(0, total - noLocal);

  const [valor, setValor] = useState(String(total));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    if (!condominioId) return;
    const n = parseInt(valor, 10);
    if (isNaN(n) || n < 0) return setMsg('Informe um número válido.');
    setSalvando(true);
    setMsg(null);
    await definirVagasVisitante(condominioId, n);
    await recarregar();
    setSalvando(false);
    setMsg('Vagas atualizadas.');
  }

  return (
    <Screen>
      <AppHeader title="Vagas de visitante" back />
      <View style={{ gap: spacing.lg }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="title" color="success">{total > 0 ? livres : '—'}</AppText>
              <AppText color="muted" variant="caption">Livres</AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="title">{noLocal}</AppText>
              <AppText color="muted" variant="caption">Ocupadas</AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="title">{total}</AppText>
              <AppText color="muted" variant="caption">Total</AppText>
            </View>
          </View>
          <AppText color="subtle" variant="caption" center style={{ marginTop: spacing.md }}>
            A ocupação considera os visitantes atualmente no local (registrados na entrada e ainda sem saída).
          </AppText>
        </Card>

        {gestor ? (
          <View style={{ gap: spacing.sm }}>
            <Input label="Total de vagas de visitante" value={valor} onChangeText={setValor} keyboardType="number-pad" />
            {msg ? <AppText color={msg.includes('atualiz') ? 'success' : 'danger'} variant="label">{msg}</AppText> : null}
            <Button title="Salvar" icon="checkmark" onPress={salvar} loading={salvando} />
          </View>
        ) : (
          <AppText color="muted" center>Apenas o síndico pode configurar o total de vagas.</AppText>
        )}
      </View>
    </Screen>
  );
}
