import { createContext, useContext } from 'react';

/**
 * Verdadeiro quando a tela está sob o cabeçalho fixo do celular (voltar · Zelo ·
 * menu), montado em `(app)/_layout`.
 *
 * O `Screen` e o `AppHeader` leem isto para não fazer o trabalho em dobro: o
 * cabeçalho global já ocupa a área segura do topo e já tem a seta de voltar.
 * Sem esta informação cada tela somaria de novo o recuo da barra de status e
 * mostraria uma segunda seta logo abaixo da primeira.
 *
 * Fora de `(app)` (login, onboarding, termos) e na versão de computador, que
 * usa a barra lateral fixa, o valor é falso e as telas seguem como antes.
 */
export const CabecalhoGlobalContext = createContext(false);

export function useCabecalhoGlobal() {
  return useContext(CabecalhoGlobalContext);
}
