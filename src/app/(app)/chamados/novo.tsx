import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen, Segmented } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarChamado } from '@/lib/db';
import { escolherImagem, enviarImagem } from '@/lib/storage';
import * as L from '@/lib/labels';
import type { ChamadoCategoria, Prioridade } from '@/lib/types';

const categorias = (Object.keys(L.chamadoCategoria) as ChamadoCategoria[]).map((value) => ({
  value,
  ...L.chamadoCategoria[value],
}));

const prioridades: { value: Prioridade; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

export default function NovoChamado() {
  const router = useRouter();
  const { condominioId, user, membershipAtual } = useAuth();
  const [categoria, setCategoria] = useState<ChamadoCategoria>('manutencao');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [fotos, setFotos] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function adicionarFoto() {
    const uri = await escolherImagem();
    if (uri) setFotos((f) => [...f, uri]);
  }

  async function enviar() {
    if (!titulo.trim() || !descricao.trim()) return setErro('Preencha título e descrição.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      const urls: string[] = [];
      for (const uri of fotos) urls.push(await enviarImagem('chamados', uri));
      await criarChamado({
        condominio_id: condominioId,
        autor_id: user.id,
        unidade_id: membershipAtual?.unidade_id ?? null,
        categoria,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
        fotos: urls,
      });
      router.back();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível abrir o chamado.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Abrir chamado" back />

      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">
            Categoria
          </AppText>
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

        <Input label="Título" placeholder="Resuma o problema" value={titulo} onChangeText={setTitulo} />
        <Input
          label="Descrição"
          placeholder="Descreva com detalhes o que está acontecendo..."
          value={descricao}
          onChangeText={setDescricao}
          multiline
          numberOfLines={5}
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">
            Prioridade
          </AppText>
          <Segmented options={prioridades} value={prioridade} onChange={setPrioridade} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">
            Fotos (opcional)
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {fotos.map((uri, i) => (
              <View key={uri + i}>
                <Image source={{ uri }} style={{ width: 84, height: 84, borderRadius: radius.md }} contentFit="cover" />
                <Pressable
                  onPress={() => setFotos((f) => f.filter((_, idx) => idx !== i))}
                  style={{ position: 'absolute', top: -6, right: -6, backgroundColor: palette.danger, borderRadius: radius.full }}
                >
                  <Ionicons name="close-circle" size={22} color={palette.white} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={adicionarFoto}
              style={{
                width: 84,
                height: 84,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: palette.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="camera-outline" size={26} color={palette.textSubtle} />
            </Pressable>
          </ScrollView>
        </View>

        {erro ? (
          <AppText color="danger" variant="label">
            {erro}
          </AppText>
        ) : null}

        <Button title="Abrir chamado" icon="send" onPress={enviar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
