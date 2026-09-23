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

### Conferindo

Depois de aplicar, cole `verificar.sql` no SQL Editor. Ele lista um objeto por
linha com `ok` ou `FALTA`, o que falta primeiro, e não escreve nada. Reaplicar o
`setup.sql` para corrigir uma falta é seguro: as migrations são idempotentes.

### O passo que o SQL não faz sozinho

A 0008 agenda o expurgo da LGPD, mas só se a extensão **pg_cron** já estiver
ativa — ativar extensão pede superusuário e é decisão de projeto, não de
esquema. Uma vez só, em **Database → Extensions**, procure `pg_cron` e ligue.
Depois reaplique o `setup.sql` (ou só a 0008) para o agendamento pegar.

Sem isso o resto do esquema entra normalmente: a 0008 avisa e segue.

## Notificações push

A 0009 cria a fila (`push_fila`) e os gatilhos. Quem entrega é a Edge Function
`functions/enviar-push`. Para sair do papel, quatro passos — os três primeiros
uma vez só:

**1. Ligue a extensão `pg_net`** em Database → Extensions. É ela que permite ao
banco chamar a Edge Function. Sem ela, os gatilhos continuam enfileirando e nada
sai.

**2. Guarde dois segredos no Vault** (Database → Vault, ou por SQL). A função
`cutucar_push` os lê por nome — se faltarem, ela desiste em silêncio:

```sql
select vault.create_secret('https://SEU-PROJETO.supabase.co/functions/v1', 'zelo_functions_url');
select vault.create_secret('SUA-SERVICE-ROLE-KEY', 'zelo_service_role_key');
```

A chave de serviço está em Project Settings → API. Ela ignora todo o RLS: não
coloque no app, no Git nem em variável `EXPO_PUBLIC_`.

**3. Publique a função:**

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJETO
npx supabase functions deploy enviar-push
```

**4. Credenciais de push no EAS.** Apple e Google não aceitam notificação de
quem não se identifica: é preciso uma chave APNs (Apple) e uma conta de serviço
FCM v1 (Google), entregues à Expo. `eas credentials` conduz os dois.

Sem o passo 4 o resto funciona e nada chega ao aparelho — o token nem é emitido,
e o app volta a avisar localmente enquanto estiver aberto.

### Conferindo

```sql
-- Deve ter as duas linhas, ativas.
select jobname, schedule, active from cron.job where jobname like 'zelo-push%';

-- O que está preso na fila e por quê.
select id, titulo, criado_em, tentativas, erro from public.push_fila
where enviado_em is null order by criado_em limit 20;
```

Fila sempre vazia e `push_tokens` vazia ao mesmo tempo significa que ninguém
registrou aparelho ainda — normal antes do passo 4.

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
