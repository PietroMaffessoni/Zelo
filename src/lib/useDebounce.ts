import { useEffect, useState } from 'react';

/**
 * Atrasa a propagação de um valor até ele parar de mudar.
 *
 * Usado na busca das listas: sem isso, cada tecla digitada dispararia uma
 * consulta ao servidor — "manutenção" seriam dez requisições, das quais nove
 * chegariam obsoletas. 350ms é o intervalo em que uma pessoa ainda está
 * digitando a mesma palavra; passado ele, ela parou para ler o resultado.
 */
export function useDebounce<T>(valor: T, ms = 350): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);

  return atrasado;
}
