import { Redirect } from 'expo-router';

/** Visitantes passou a ser uma aba de Cadastros. A rota antiga continua valendo e leva para lá. */
export default function Redireciona() {
  return <Redirect href="/(app)/cadastros?aba=visitantes" />;
}
