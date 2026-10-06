import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FormAssembleia } from '@/components/assembleias/FormAssembleia';
import { AppHeader, AppText, Button, Loading, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { cancelarAssembleia, getAssembleia } from '@/lib/db';
import { useVoltar } from '@/lib/navegacao';
import { isGestor } from '@/lib/types';
import { useFetch } from '@/lib/useFetch';

/**
 * Edição de uma assembleia já convocada: corrigir data, local, link, descrição
 * ou quórum — ou cancelá-la. Só o síndico chega aqui (a regra do banco
 * `assembleias_write` também só deixa o gestor gravar).
 */
export default function EditarAssembleia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { papel } = useAuth();
  const voltar = useVoltar();
  const confirmar = useConfirm();
  const acao = useAcao();
  const [cancelando, setCancelando] = useState(false);
  const { data: assembleia, loading } = useFetch(() => getAssembleia(id), [id]);

  async function cancelar() {
    const ok = await confirmar({
      titulo: 'Cancelar esta assembleia?',
      mensagem: 'Ela deixa de aparecer como próxima no início e não aceita mais votos. Não dá para desfazer.',
      confirmar: 'Cancelar assembleia',
      cancelar: 'Voltar',
      destrutivo: true,
    });
    if (!ok) return;
    setCancelando(true);
    const feito = await acao(() => cancelarAssembleia(id), {
      sucesso: 'Assembleia cancelada.',
      sempre: () => setCancelando(false),
    });
    if (feito) voltar();
  }

  if (!isGestor(papel))
    return (
      <Screen>
        <AppHeader title="Editar assembleia" back />
        <AppText color="muted" center>
          Só o síndico pode editar assembleias.
        </AppText>
      </Screen>
    );

  if (loading || !assembleia)
    return (
      <Screen>
        <AppHeader title="Editar assembleia" back />
        {loading ? <Loading /> : <AppText color="muted" center>Assembleia não encontrada.</AppText>}
      </Screen>
    );

  const fechada = assembleia.status === 'encerrada' || assembleia.status === 'cancelada';

  return (
    <Screen>
      <AppHeader title="Editar assembleia" back />
      {fechada ? (
        <AppText color="muted" center>
          Esta assembleia já foi {assembleia.status === 'encerrada' ? 'encerrada' : 'cancelada'} e não pode mais ser editada.
        </AppText>
      ) : (
        <>
          <FormAssembleia key={assembleia.id} inicial={assembleia} />
          <View style={{ marginTop: spacing.xxl }}>
            <Button
              title="Cancelar assembleia"
              variant="danger"
              icon="close-circle-outline"
              loading={cancelando}
              onPress={cancelar}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
