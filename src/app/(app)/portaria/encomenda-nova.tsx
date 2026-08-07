import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppHeader, AppText, Button, Input, Screen } from '@/components/ui';
import { UnidadeSeletor } from '@/components/UnidadeSeletor';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarEncomenda, listarUnidades } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';
import { enviarArquivo, escolherImagem } from '@/lib/storage';
import { useFetch } from '@/lib/useFetch';

export default function NovaEncomenda() {
  const voltar = useVoltar();
  const { condominioId, user } = useAuth();
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [remetente, setRemetente] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { data: unidades } = useFetch(async () => (condominioId ? listarUnidades(condominioId) : []), [condominioId]);

  async function selecionarFoto() {
    const uri = await escolherImagem();
    if (uri) setFoto(uri);
  }

  async function registrar() {
    if (!descricao.trim()) return setErro('Descreva a encomenda.');
    if (!unidadeId) return setErro('Selecione a unidade destinatária.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      const foto_url = foto ? await enviarArquivo('portaria', foto, condominioId) : null;
      await criarEncomenda({
        condominio_id: condominioId,
        unidade_id: unidadeId,
        descricao: descricao.trim(),
        remetente: remetente.trim() || null,
        foto_url,
        registrado_por: user.id,
      });
      voltar();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível registrar a encomenda.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Nova encomenda" back />
      <View style={{ gap: spacing.lg }}>
        <UnidadeSeletor unidades={unidades ?? []} value={unidadeId} onChange={setUnidadeId} label="Unidade destinatária" />
        <Input label="O que chegou?" placeholder="Ex.: Caixa dos Correios" value={descricao} onChangeText={setDescricao} />
        <Input label="Remetente (opcional)" placeholder="Ex.: Mercado Livre" value={remetente} onChangeText={setRemetente} />

        <Pressable
          onPress={selecionarFoto}
          style={{
            height: 140,
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
              <Ionicons name="camera-outline" size={30} color={palette.textSubtle} />
              <AppText color="subtle" style={{ marginTop: spacing.xs }}>
                Adicionar foto (opcional)
              </AppText>
            </>
          )}
        </Pressable>

        {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}

        <Button title="Registrar encomenda" icon="checkmark" onPress={registrar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
