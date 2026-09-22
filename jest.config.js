/**
 * Testes das regras de negócio.
 *
 * Roda em Node puro, sem o preset do React Native, de propósito: o que está
 * coberto aqui são funções sem dependência de UI — cálculo de status, recorte
 * de página, escape de busca, formatação e leitura do registro de auditoria.
 * São as regras cujo erro não aparece na tela nem na revisão (um "%" não
 * escapado, um intervalo com um item a mais), e justamente por isso valem mais
 * do que testar se um componente renderiza.
 *
 * Sem o preset do RN o `npm test` também não depende de nada nativo e roda em
 * qualquer máquina e em CI.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\.tsx?$': [
      'babel-jest',
      { presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'] },
    ],
  },
};
