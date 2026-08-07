import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen, Segmented } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarChamado } from '@/lib/db';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useVoltar } from '@/lib/navegacao';
import { escolherImagem, enviarArquivo } from '@/lib/storage';
import * as L from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
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
  const voltar = useVoltar();
  const { palette } = useAppTheme();
  const toast = useToast();
  const { condominioId, user, membershipAtual } = useAuth();
  const [categoria, setCategoria] = useState<ChamadoCategoria>('manutencao');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [fotos, setFotos] = useState<string[]>([]);
  const [erros, setErros] = useState<{ titulo?: string; descricao?: string }>({});
  const [salvando, setSalvando] = useState(false);

  async function adicionarFoto() {
    const uri = await escolherImagem();
    if (uri) setFotos((f) => [...f, uri]);
  }

  function validar() {
    const e: { titulo?: string; descricao?: string } = {};
    if (!titulo.trim()) e.titulo = 'Informe um título para o chamado.';
    if (!descricao.trim()) e.descricao = 'Descreva o que está acontecendo.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    if (!validar()) {
      hapticError();
      return;
    }
    if (!condominioId || !user) return;
    setSalvando(true);
    try {
      const urls: string[] = [];
      for (const uri of fotos) urls.push(await enviarArquivo('chamados', uri, condominioId));
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
      toast.sucesso('Chamado aberto ✓');
      hapticSuccess();
      voltar();
    } catch (e: any) {
      toast.erro(e?.message ?? 'Não foi possível abrir o chamado.');
      hapticError();
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

        <Input
          label="Título"
          placeholder="Resuma o problema"
          value={titulo}
          onChangeText={(t) => {
            setTitulo(t);
            if (erros.titulo) setErros((e) => ({ ...e, titulo: undefined }));
          }}
          error={erros.titulo}
        />
        <Input
          label="Descrição"
          placeholder="Descreva com detalhes o que está acontecendo..."
          value={descricao}
          onChangeText={(t) => {
            setDescricao(t);
            if (erros.descricao) setErros((e) => ({ ...e, descricao: undefined }));
          }}
          error={erros.descricao}
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
                  accessibilityRole="button"
                  accessibilityLabel="Remover foto"
                  hitSlop={8}
                  style={{ position: 'absolute', top: -6, right: -6, backgroundColor: palette.danger, borderRadius: radius.full }}
                >
                  <Ionicons name="close-circle" size={22} color={palette.white} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={adicionarFoto}
              accessibilityRole="button"
              accessibilityLabel="Adicionar foto"
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

        <Button title="Abrir chamado" icon="send" onPress={enviar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
