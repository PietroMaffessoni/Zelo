#!/usr/bin/env node
/**
 * Roda no começo de todo build do EAS (`eas-build-pre-install`).
 *
 * Por que existe: `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
 * são lidas em tempo de BUNDLE, não em tempo de execução — o valor é colado
 * dentro do JavaScript na hora de empacotar. O `.env` está no .gitignore (e
 * deve continuar), então a máquina do EAS não o recebe: quem define essas
 * variáveis lá é o ambiente do EAS.
 *
 * Sem esta checagem, esquecer disso não quebra nada visível: o build passa, o
 * app instala, abre — e mostra a tela de "configure o Supabase" para todo mundo,
 * porque `isSupabaseConfigured` é falso. Um app publicado inteiramente inerte,
 * sem um único erro no log. É a falha mais cara possível: silenciosa e só
 * detectável depois de submeter.
 *
 * Melhor o build morrer aqui, em dez segundos, dizendo exatamente o que falta.
 *
 * Para definir as variáveis (uma vez por projeto):
 *   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..." --visibility plaintext
 *   eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --visibility plaintext
 */
const OBRIGATORIAS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

const faltando = OBRIGATORIAS.filter((nome) => !process.env[nome]?.trim());

if (faltando.length > 0) {
  console.error('');
  console.error('  Build interrompido: variáveis de ambiente ausentes.');
  console.error('');
  for (const nome of faltando) console.error(`    faltando  ${nome}`);
  console.error('');
  console.error('  Sem elas o app é compilado sem endereço do Supabase e abre');
  console.error('  na tela de configuração para todos os usuários.');
  console.error('');
  console.error('  Defina com:');
  for (const nome of faltando) {
    console.error(`    eas env:create --name ${nome} --value "..." --visibility plaintext`);
  }
  console.error('');
  process.exit(1);
}

console.log('Variáveis de ambiente do Supabase: ok.');
