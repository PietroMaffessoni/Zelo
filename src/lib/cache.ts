import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache local de leitura — "mostra o que já se sabe, confirma com a rede".
 *
 * O app não guardava nada: sem rede, toda tela abria vazia. Morador no subsolo,
 * no elevador ou com o dado móvel ruim via uma lista em branco onde deveria
 * estar o comunicado que acabou de receber por push.
 *
 * O padrão aqui é hidratar-e-revalidar: a tela pinta imediatamente com a última
 * resposta conhecida e a requisição continua correndo por baixo; quando ela
 * chega, o conteúdo é substituído. O cache nunca é a fonte da verdade, só
 * encurta a espera e cobre a queda.
 *
 * O QUE NÃO ENTRA AQUI: o AsyncStorage é texto puro no disco do aparelho (só a
 * sessão é cifrada, em `supabase.ts`). Por isso o cache é OPT-IN por tela, e a
 * regra é guardar o que o condomínio já publica a todos — comunicados,
 * documentos, agenda, áreas — e deixar de fora o que identifica pessoa ou
 * dinheiro: financeiro, ficha cadastral, infrações, portaria. Ver `CHAVE`.
 */

/** Versão do formato. Subir invalida tudo o que foi gravado antes. */
const VERSAO = 'v1';
const PREFIXO = `zelo.cache.${VERSAO}.`;

/**
 * Validade do conteúdo guardado.
 *
 * Não é "de quanto em quanto tempo atualiza" — a revalidação acontece sempre, a
 * cada abertura. É até quando um dado velho ainda vale a pena ser mostrado
 * enquanto a rede não responde. Passada uma semana, é mais honesto mostrar o
 * estado de carregamento do que um retrato que pode ter pouco a ver com hoje.
 */
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

type Envelope<T> = { em: number; dado: T };

export async function lerCache<T>(chave: string): Promise<T | null> {
  try {
    const bruto = await AsyncStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;
    const envelope = JSON.parse(bruto) as Envelope<T>;
    if (!envelope || typeof envelope.em !== 'number') return null;
    if (Date.now() - envelope.em > VALIDADE_MS) {
      AsyncStorage.removeItem(PREFIXO + chave).catch(() => undefined);
      return null;
    }
    return envelope.dado;
  } catch {
    // Disco cheio, JSON corrompido, formato antigo: cache é um extra, e falhar
    // ao lê-lo nunca pode impedir a tela de buscar na rede.
    return null;
  }
}

export async function gravarCache<T>(chave: string, dado: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIXO + chave, JSON.stringify({ em: Date.now(), dado } as Envelope<T>));
  } catch {
    // idem: gravar é oportunista.
  }
}

/**
 * Apaga todo o cache. Chamado ao sair da conta — o próximo usuário do aparelho
 * não pode abrir o app e encontrar os comunicados do condomínio anterior.
 */
export async function limparCache(): Promise<void> {
  try {
    const chaves = await AsyncStorage.getAllKeys();
    const nossas = chaves.filter((k) => k.startsWith('zelo.cache.'));
    if (nossas.length) await AsyncStorage.multiRemove(nossas);
  } catch {
    // ignora
  }
}
