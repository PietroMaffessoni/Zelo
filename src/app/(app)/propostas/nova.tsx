import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Card, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarProposta } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';

export default function NovaProposta() {
  const voltar = useVoltar();
  const { condominioId, user, membershipAtual } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar() {
    if (!titulo.trim()) return setErro('Dê um título à sua proposta.');
    if (!descricao.trim()) return setErro('Explique sua ideia.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarProposta({
        condominio_id: condominioId,
        autor_id: user.id,
        unidade_id: membershipAtual?.unidade_id ?? null,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível enviar a proposta.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Propor pauta" back />
      <View style={{ gap: spacing.lg }}>
        <Card>
          <AppText color="muted" variant="caption">
            Sua proposta fica visível a todos os moradores, que podem apoiá-la. O síndico avalia e, se aprovada, ela entra como pauta em uma assembleia.
          </AppText>
        </Card>

        <Input label="Título" placeholder="Ex.: Instalar câmeras na garagem" value={titulo} onChangeText={setTitulo} />
        <Input
          label="Descrição"
          placeholder="Explique a ideia, o problema que resolve e por que é importante..."
          value={descricao}
          onChangeText={setDescricao}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
        <Button title="Enviar proposta" icon="send" onPress={enviar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
