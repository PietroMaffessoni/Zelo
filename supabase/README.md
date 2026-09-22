# Banco do Zelo

## Como o esquema é versionado

O esquema vive em `migrations/`, uma pasta de arquivos numerados que são
aplicados **em ordem**. `setup.sql`, na raiz desta pasta, é a concatenação de
todos eles — gerado, não editado à mão.

```
supabase/
  migrations/
    0001_base.sql                      estado anterior à auditoria
    0002_conta_exclusao_e_senha.sql
    0003_privacidade_dados_pessoais.sql
    ...
  setup.sql                            GERADO — não edite
```

### Por que não um arquivo só

Até setembro de 2026 havia apenas `setup.sql`, reeditado a cada mudança. Isso
funcionava para aplicar, mas custava caro em tudo o mais: não dava para saber o
que mudou entre duas versões do app (o `git diff` de um arquivo de 2.500 linhas
não responde "o que essa release mexeu no banco"), não havia como reverter uma
alteração isolada, e revisar significava reler o arquivo inteiro procurando o
que era novo.

Cada mudança em seu próprio arquivo resolve os três: o nome do arquivo diz o que
ele faz, o diff é do tamanho da mudança, e voltar atrás é escrever a migration
inversa em vez de caçar linhas.

### Por que `0001_base` vem tudo junto

Porque esse histórico nunca existiu. Reconstruir uma sequência de migrations
para o que foi escrito como arquivo único seria inventar uma cronologia falsa —
pior do que admitir o ponto de partida. Da 0002 em diante cada mudança tem a
sua.

## Aplicando

**No painel do Supabase** (é o fluxo usado hoje): abra o SQL Editor e cole o
conteúdo de `setup.sql`. Ele já traz tudo, na ordem.

**Com a CLI**, aplicando só o que falta:

```bash
supabase db push
```

## Fazendo uma mudança

1. Crie `migrations/000N_descricao_curta.sql` com o próximo número.
2. Escreva o SQL. **Toda migration precisa ser idempotente** — `create table if
   not exists`, `drop policy if exists` antes de `create policy`, `add column if
   not exists`. Esta é a regra que sustenta o resto: sem ela, reaplicar o
   `setup.sql` (que é o fluxo do painel) quebraria na metade.
3. Nunca edite uma migration já aplicada. Corrija criando a próxima.
4. Regenere o `setup.sql`:

```bash
node scripts/gerar-setup.mjs
```

5. Commite a migration e o `setup.sql` juntos.
