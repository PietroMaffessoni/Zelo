import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarRegra } from '@/lib/db';
import { categoriaRegra, opcoes } from '@/lib/labels';
import { type CategoriaRegra } from '@/lib/types';

export default function NovoInforme() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const [categoria, setCategoria] = useState<CategoriaRegra>('horarios');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function publicar() {
    if (!titulo.trim()) return setErro('Informe o título.');
    if (!conteudo.trim()) return setErro('Descreva a regra ou informe.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarRegra({
        condominio_id: condominioId,
        categoria,
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        atualizado_por: user.id,
      });
      router.back();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível publicar.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Novo informe" back />
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {opcoes(categoriaRegra).map((o) => (
              <Chip key={o.value} label={o.label} selected={categoria === o.value} onPress={() => setCategoria(o.value)} />
            ))}
          </ScrollView>
        </View>

        <Input label="Título" placeholder="Ex.: Horário permitido para obras" value={titulo} onChangeText={setTitulo} />
        <Input
          label="Conteúdo"
          placeholder="Ex.: Obras são permitidas de segunda a sexta, das 8h às 17h, e aos sábados das 9h às 13h."
          value={conteudo}
          onChangeText={setConteudo}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
        <Button title="Publicar informe" icon="checkmark" onPress={publicar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
