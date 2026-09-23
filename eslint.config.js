// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions roda em Deno, com globais e imports que nao existem
    // no app. Conferir esse codigo com as regras do React Native so produz
    // erro falso.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
