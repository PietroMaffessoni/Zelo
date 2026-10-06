import { Redirect } from 'expo-router';

/** "Meu perfil" virou a própria aba Configurações. A rota antiga continua valendo e leva para lá. */
export default function Perfil() {
  return <Redirect href="/(app)/(tabs)/configuracoes" />;
}
