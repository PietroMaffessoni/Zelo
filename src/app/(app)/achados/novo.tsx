import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Button, Input, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';
import { criarAchado } from '@/lib/db';
import { mascaraData, parseData } from '@/lib/format';
import { useVoltar } from '@/lib/navegacao';
import { enviarArquivo, escolherImagem } from '@/lib/storage';

export default function NovoAchado() {
  const { palette } = useAppTheme();
  const voltar = useVoltar();
  const { condominioId, user } = useAuth();
  const [foto, setFoto] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dia, setDia] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function selecionarFoto() {
    const uri = await escolherImagem();
    if (uri) setFoto(uri);
  }

  async function registrar() {
    if (!titulo.trim()) return setErro('Informe o que foi encontrado.');
    if (!dia.trim()) return setErro('Informe quando foi encontrado.');
    const data = parseData(dia);
    if (!data.isValid()) return setErro('Informe quando foi encontrado no formato DD/MM/AAAA.');
    if (data.isAfter(dayjs(), 'day')) return setErro('A data em que foi encontrado não pode ser no futuro.');
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
        data_encontrado: data.format('YYYY-MM-DD'),
      });
      voltar();
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
            borderWidth: 1,
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

        <Input
          label="Quando foi encontrado?"
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          value={dia}
          onChangeText={(v) => setDia(mascaraData(v))}
          icon="calendar-outline"
        />

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Registrar" icon="checkmark" onPress={registrar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
