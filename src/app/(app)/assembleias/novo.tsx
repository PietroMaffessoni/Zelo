import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarAssembleia } from '@/lib/db';
import { mascaraData, mascaraHora, parseData } from '@/lib/format';

export default function NovaAssembleia() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [local, setLocal] = useState('');
  const [linkOnline, setLinkOnline] = useState('');
  const [quorum, setQuorum] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo.trim()) return setErro('Informe o título da assembleia.');
    const dataHora = parseData(data, hora);
    if (!dataHora.isValid()) return setErro('Informe data e hora válidas (DD/MM/AAAA e HH:MM).');
    if (!condominioId || !user) return;

    setSalvando(true);
    setErro(null);
    try {
      const assembleia = await criarAssembleia({
        condominio_id: condominioId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        data_hora: dataHora.toISOString(),
        local: local.trim() || null,
        link_online: linkOnline.trim() || null,
        quorum_minimo_unidades: quorum.trim() ? Number(quorum) : null,
        criado_por: user.id,
      });
      router.replace(`/(app)/assembleias/${assembleia.id}`);
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível convocar a assembleia.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Convocar assembleia" back subtitle="Depois de criar, adicione as pautas" />
      <View style={{ gap: spacing.lg }}>
        <Input label="Título" placeholder="Ex.: Assembleia geral ordinária" value={titulo} onChangeText={setTitulo} />
        <Input label="Descrição (opcional)" placeholder="Contexto da convocação..." value={descricao} onChangeText={setDescricao} multiline />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Data"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              value={data}
              onChangeText={(v) => setData(mascaraData(v))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Hora"
              placeholder="HH:MM"
              keyboardType="number-pad"
              maxLength={5}
              value={hora}
              onChangeText={(v) => setHora(mascaraHora(v))}
            />
          </View>
        </View>
        <Input label="Local (opcional)" placeholder="Ex.: Salão de festas" value={local} onChangeText={setLocal} />
        <Input label="Link online (opcional)" placeholder="Ex.: link do Google Meet" value={linkOnline} onChangeText={setLinkOnline} />
        <Input label="Quórum mínimo de unidades (opcional)" placeholder="Ex.: 10" keyboardType="number-pad" value={quorum} onChangeText={setQuorum} />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Convocar" icon="checkmark" onPress={salvar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
