import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppHeader, AppText, Button, Card, Input, Screen, Segmented } from '@/components/ui';
import { palette, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarComunicado } from '@/lib/db';
import type { Prioridade } from '@/lib/types';

const prioridades: { value: Prioridade; label: string }[] = [
  { value: 'baixa', label: 'Informativo' },
  { value: 'media', label: 'Normal' },
  { value: 'alta', label: 'Urgente' },
];

export default function NovoComunicado() {
  const router = useRouter();
  const { condominioId, user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [fixado, setFixado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function publicar() {
    if (!titulo.trim() || !corpo.trim()) return setErro('Preencha título e mensagem.');
    if (!condominioId || !user) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarComunicado({
        condominio_id: condominioId,
        autor_id: user.id,
        titulo: titulo.trim(),
        corpo: corpo.trim(),
        prioridade,
        fixado,
      });
      router.back();
    } catch (e: any) {
      setErro(e?.message ?? 'Não foi possível publicar.');
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Novo comunicado" back />

      <View style={{ gap: spacing.lg }}>
        <Input label="Título" placeholder="Ex.: Manutenção do elevador" value={titulo} onChangeText={setTitulo} />
        <Input
          label="Mensagem"
          placeholder="Escreva o comunicado..."
          value={corpo}
          onChangeText={setCorpo}
          multiline
          numberOfLines={6}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">
            Prioridade
          </AppText>
          <Segmented options={prioridades} value={prioridade} onChange={setPrioridade} />
        </View>

        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Fixar no topo</AppText>
            <AppText color="muted" variant="caption">
              Mantém o aviso em destaque na lista.
            </AppText>
          </View>
          <Switch
            value={fixado}
            onValueChange={setFixado}
            trackColor={{ true: palette.primary, false: palette.borderStrong }}
          />
        </Card>

        {erro ? (
          <AppText color="danger" variant="label">
            {erro}
          </AppText>
        ) : null}

        <Button title="Publicar comunicado" icon="megaphone" onPress={publicar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
