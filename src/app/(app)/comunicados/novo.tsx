import { useState } from 'react';
import { Switch, View } from 'react-native';

import { AppHeader, AppText, Button, Card, Input, Screen, Segmented } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { criarComunicado } from '@/lib/db';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { useVoltar } from '@/lib/navegacao';
import { useAppTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Prioridade } from '@/lib/types';

const prioridades: { value: Prioridade; label: string }[] = [
  { value: 'baixa', label: 'Informativo' },
  { value: 'alta', label: 'Urgente' },
];

export default function NovoComunicado() {
  const voltar = useVoltar();
  const { palette } = useAppTheme();
  const toast = useToast();
  const { condominioId, user } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('baixa');
  const [fixado, setFixado] = useState(false);
  const [erros, setErros] = useState<{ titulo?: string; corpo?: string }>({});
  const [salvando, setSalvando] = useState(false);

  async function publicar() {
    const e: { titulo?: string; corpo?: string } = {};
    if (!titulo.trim()) e.titulo = 'Informe um título.';
    if (!corpo.trim()) e.corpo = 'Escreva a mensagem do comunicado.';
    setErros(e);
    if (Object.keys(e).length > 0) {
      hapticError();
      return;
    }
    if (!condominioId || !user) return;
    setSalvando(true);
    try {
      await criarComunicado({
        condominio_id: condominioId,
        autor_id: user.id,
        titulo: titulo.trim(),
        corpo: corpo.trim(),
        prioridade,
        fixado,
      });
      toast.sucesso('Comunicado publicado ✓');
      hapticSuccess();
      voltar();
    } catch (e: any) {
      toast.erro(e?.message ?? 'Não foi possível publicar.');
      hapticError();
      setSalvando(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Novo comunicado" back />

      <View style={{ gap: spacing.lg }}>
        <Input
          label="Título"
          placeholder="Ex.: Manutenção do elevador"
          value={titulo}
          onChangeText={(t) => {
            setTitulo(t);
            if (erros.titulo) setErros((e) => ({ ...e, titulo: undefined }));
          }}
          error={erros.titulo}
        />
        <Input
          label="Mensagem"
          placeholder="Escreva o comunicado..."
          value={corpo}
          onChangeText={(t) => {
            setCorpo(t);
            if (erros.corpo) setErros((e) => ({ ...e, corpo: undefined }));
          }}
          error={erros.corpo}
          multiline
          numberOfLines={6}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="muted">
            Prioridade
          </AppText>
          <Segmented options={prioridades} value={prioridade} onChange={setPrioridade} shape="box" />
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

        <Button title="Publicar comunicado" icon="megaphone" onPress={publicar} loading={salvando} size="lg" />
      </View>
    </Screen>
  );
}
