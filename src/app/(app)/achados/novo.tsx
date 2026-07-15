import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader, AppText, Button, Chip, Input, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarAchado } from '@/lib/db';
import { enviarArquivo, escolherImagem } from '@/lib/storage';

export default function NovoAchado() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const [foto, setFoto] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dia, setDia] = useState(dayjs().format('YYYY-MM-DD'));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const dias = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const d = dayjs().subtract(i, 'day');
        return {
          value: d.format('YYYY-MM-DD'),
          label: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : d.format('ddd DD/MM'),
        };
      }),
    [],
  );

  async function selecionarFoto() {
    const uri = await escolherImagem();
    if (uri) setFoto(uri);
  }

  async function registrar() {
    if (!titulo.trim()) return setErro('Informe o que foi encontrado.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      const foto_url = foto ? await enviarArquivo('achados', foto, condominioId) : null;
      await criarAchado({
        condominio_id: condominioId,
        registrado_por: user.id,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        local_encontrado: local.trim() || null,
        foto_url,
        data_encontrado: dia,
      });
      router.back();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível registrar.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Registrar objeto" back />

      <View style={{ gap: spacing.lg }}>
        <Pressable
          onPress={selecionarFoto}
          style={{
            height: 160,
            borderRadius: radius.lg,
            backgroundColor: palette.surface,
            borderWidth: 1.5,
            borderStyle: foto ? 'solid' : 'dashed',
            borderColor: palette.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {foto ? (
            <Image source={{ uri: foto }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={34} color={palette.textSubtle} />
              <AppText color="subtle" style={{ marginTop: spacing.xs }}>
                Adicionar foto
              </AppText>
            </>
          )}
        </Pressable>

        <Input label="O que foi encontrado?" placeholder="Ex.: Chave com chaveiro azul" value={titulo} onChangeText={setTitulo} />
        <Input label="Onde foi encontrado?" placeholder="Ex.: Garagem, bloco B" value={local} onChangeText={setLocal} icon="location-outline" />
        <Input label="Descrição (opcional)" placeholder="Detalhes do objeto..." value={descricao} onChangeText={setDescricao} multiline />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">Quando foi encontrado?</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {dias.map((d) => (
              <Chip key={d.value} label={d.label} selected={dia === d.value} onPress={() => setDia(d.value)} />
            ))}
          </ScrollView>
        </View>

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Registrar" icon="checkmark" onPress={registrar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
