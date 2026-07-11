import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarSolicitacao } from '@/lib/db';
import * as L from '@/lib/labels';
import type { SolicitacaoCategoria } from '@/lib/types';

const categorias = (Object.keys(L.solicitacaoCategoria) as SolicitacaoCategoria[]).map((value) => ({
  value,
  ...L.solicitacaoCategoria[value],
}));

export default function NovaSolicitacao() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const [categoria, setCategoria] = useState<SolicitacaoCategoria>('boleto');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar() {
    if (!titulo.trim() || !descricao.trim()) return setErro('Preencha o assunto e a descrição.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarSolicitacao({
        condominio_id: condominioId,
        morador_id: user.id,
        categoria,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
      });
      router.back();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível enviar.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Nova solicitação" back />

      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Tipo de solicitação</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {categorias.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                icon={c.icon as any}
                selected={categoria === c.value}
                onPress={() => setCategoria(c.value)}
              />
            ))}
          </View>
        </View>

        <Input label="Assunto" placeholder="Ex.: 2ª via do boleto de julho" value={titulo} onChangeText={setTitulo} />
        <Input
          label="Descrição"
          placeholder="Explique sua solicitação..."
          value={descricao}
          onChangeText={setDescricao}
          multiline
          numberOfLines={5}
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Enviar solicitação" icon="send" onPress={enviar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
