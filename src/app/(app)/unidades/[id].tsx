import { useLocalSearchParams } from 'expo-router';

import { DetalheUnidade } from '@/components/cadastros/DetalheUnidade';

export default function UnidadeDetalheTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetalheUnidade id={id} />;
}
