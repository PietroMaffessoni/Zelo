import { useLocalSearchParams } from 'expo-router';

import { DetalheChamado } from '@/components/chamados/DetalheChamado';

/** Página do chamado. O conteúdo mora em `DetalheChamado`, que também é usado
 *  como coluna da direita na lista quando a tela é larga. */
export default function ChamadoDetalheRota() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetalheChamado id={id} />;
}
