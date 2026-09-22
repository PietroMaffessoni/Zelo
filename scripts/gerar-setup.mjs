#!/usr/bin/env node
/**
 * Gera `supabase/setup.sql` concatenando as migrations em ordem.
 *
 * O arquivo único continua existindo porque é assim que o esquema é aplicado no
 * painel do Supabase: copia e cola. Mas ele deixou de ser a FONTE — passou a ser
 * a saída. A fonte é `supabase/migrations/`, onde cada mudança tem seu arquivo,
 * seu nome e seu diff.
 *
 * Sem este script os dois formatos divergiriam na primeira pressa: alguém
 * editaria o setup.sql direto e a migration correspondente nunca existiria.
 *
 *   node scripts/gerar-setup.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pastaMigrations = join(raiz, 'supabase', 'migrations');
const destino = join(raiz, 'supabase', 'setup.sql');

const arquivos = readdirSync(pastaMigrations)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (arquivos.length === 0) {
  console.error('Nenhuma migration encontrada em supabase/migrations.');
  process.exit(1);
}

const cabecalho = [
  '-- ============================================================================',
  '-- ARQUIVO GERADO — NÃO EDITE',
  '-- ============================================================================',
  '--',
  '-- Concatenação de supabase/migrations, na ordem. Para mudar o esquema, crie',
  '-- uma migration nova e rode `node scripts/gerar-setup.mjs`. Ver',
  '-- supabase/README.md.',
  '--',
  `-- Migrations incluídas (${arquivos.length}):`,
  ...arquivos.map((f) => `--   ${f}`),
  '',
  '',
].join('\n');

const corpo = arquivos
  .map((f) => readFileSync(join(pastaMigrations, f), 'utf8').replace(/\s+$/, ''))
  .join('\n\n');

writeFileSync(destino, `${cabecalho}${corpo}\n\n-- Fim do setup.\n`, 'utf8');

console.log(`setup.sql gerado a partir de ${arquivos.length} migrations:`);
for (const f of arquivos) console.log(`  ${f}`);
