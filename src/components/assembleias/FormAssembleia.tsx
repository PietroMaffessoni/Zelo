import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, FormRow, Input } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { atualizarAssembleia, criarAssembleia } from '@/lib/db';
import { formatData, formatHora, mascaraData, mascaraHora, parseData } from '@/lib/format';
import { useVoltar } from '@/lib/navegacao';
import { useToast } from '@/lib/toast';
import type { Assembleia } from '@/lib/types';

/**
 * Formulário de assembleia — o mesmo para convocar e para editar.
 *
 * Com `inicial`, edita: os campos nascem preenchidos e salvar atualiza em vez de
 * criar. Quem monta passa `key={assembleia.id}`, então o estado inicial vem da
 * montagem e não de um efeito copiando dado carregado para o formulário.
 */
export function FormAssembleia({ inicial }: { inicial?: Assembleia }) {
  const router = useRouter();
  const voltar = useVoltar();
  const toast = useToast();
  const { condominioId, user } = useAuth();
  const editando = !!inicial;

  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [data, setData] = useState(inicial ? formatData(inicial.data_hora) : '');
  const [hora, setHora] = useState(inicial ? formatHora(inicial.data_hora) : '');
  const [local, setLocal] = useState(inicial?.local ?? '');
  const [linkOnline, setLinkOnline] = useState(inicial?.link_online ?? '');
  const [quorum, setQuorum] = useState(inicial?.quorum_minimo_unidades ? String(inicial.quorum_minimo_unidades) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo.trim()) return setErro('Informe o título da assembleia.');
    const dataHora = parseData(data, hora);
    if (!dataHora.isValid()) return setErro('Informe data e hora válidas (DD/MM/AAAA e HH:MM).');
    const quorumNumero = quorum.trim() ? Number(quorum) : null;
    if (quorumNumero !== null && (!Number.isInteger(quorumNumero) || quorumNumero < 1))
      return setErro('O quórum mínimo deve ser um número inteiro de unidades.');
    if (!condominioId || !user) return;

    const campos = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      data_hora: dataHora.toISOString(),
      local: local.trim() || null,
      link_online: linkOnline.trim() || null,
      quorum_minimo_unidades: quorumNumero,
    };

    setSalvando(true);
    setErro(null);
    try {
      if (inicial) {
        await atualizarAssembleia(inicial.id, campos);
        toast.sucesso('Assembleia atualizada.');
        voltar();
      } else {
        const assembleia = await criarAssembleia({ ...campos, condominio_id: condominioId, criado_por: user.id });
        router.replace(`/(app)/assembleias/${assembleia.id}`);
      }
    } catch (e: any) {
      setErro(e?.message ?? (editando ? 'Não foi possível salvar.' : 'Não foi possível convocar a assembleia.'));
      setSalvando(false);
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Input label="Título" placeholder="Ex.: Assembleia geral ordinária" value={titulo} onChangeText={setTitulo} />
      <Input
        label="Descrição (opcional)"
        placeholder="Contexto da convocação..."
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />
      {/* Data e hora seguem juntas mesmo no celular pequeno: são dois campos
          curtos e separá-las quebraria a leitura de "quando". */}
      <FormRow minimo={[150, 104]}>
        <Input
          label="Data"
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          value={data}
          onChangeText={(v) => setData(mascaraData(v))}
        />
        <Input
          label="Hora"
          placeholder="HH:MM"
          keyboardType="number-pad"
          maxLength={5}
          value={hora}
          onChangeText={(v) => setHora(mascaraHora(v))}
        />
      </FormRow>
      <Input label="Local (opcional)" placeholder="Ex.: Salão de festas" value={local} onChangeText={setLocal} />
      <Input
        label="Link online (opcional)"
        placeholder="Ex.: link do Google Meet"
        autoCapitalize="none"
        keyboardType="url"
        value={linkOnline}
        onChangeText={setLinkOnline}
      />
      <Input
        label="Quórum mínimo de unidades (opcional)"
        placeholder="Ex.: 10"
        keyboardType="number-pad"
        value={quorum}
        onChangeText={(v) => setQuorum(v.replace(/\D/g, ''))}
      />

      {erro ? (
        <AppText color="danger" variant="label">
          {erro}
        </AppText>
      ) : null}

      <Button
        title={editando ? 'Salvar alterações' : 'Convocar'}
        icon="checkmark"
        onPress={salvar}
        loading={salvando}
        size="lg"
      />
    </View>
  );
}
