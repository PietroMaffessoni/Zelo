import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { UnidadeSeletor } from '@/components/UnidadeSeletor';
import { useAuth } from '@/lib/auth';
import { listarUnidades, registrarEntradaVisitante } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';
import { useFetch } from '@/lib/useFetch';

export default function VisitanteAvulso() {
  const voltar = useVoltar();
  const { condominioId, user } = useAuth();
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { data: unidades } = useFetch(async () => (condominioId ? listarUnidades(condominioId) : []), [condominioId]);

  async function registrar() {
    if (!nome.trim()) return setErro('Informe o nome do visitante.');
    if (!unidadeId) return setErro('Selecione a unidade visitada.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      await registrarEntradaVisitante({
        condominio_id: condominioId,
        unidade_id: unidadeId,
        nome_visitante: nome.trim(),
        documento: documento.trim() || null,
        observacao: observacao.trim() || null,
        registrado_por: user.id,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível registrar a entrada.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Visitante avulso" back subtitle="Registrar entrada sem pré-autorização" />
      <View style={{ gap: spacing.lg }}>
        <UnidadeSeletor unidades={unidades ?? []} value={unidadeId} onChange={setUnidadeId} label="Unidade visitada" />
        <Input label="Nome do visitante" placeholder="Nome completo" value={nome} onChangeText={setNome} />
        <Input label="Documento (opcional)" placeholder="RG ou CPF" value={documento} onChangeText={setDocumento} />
        <Input label="Observação (opcional)" placeholder="Ex.: prestador de serviço" value={observacao} onChangeText={setObservacao} multiline />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Registrar entrada" icon="log-in-outline" onPress={registrar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
