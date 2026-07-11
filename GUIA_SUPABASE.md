# 🚀 Guia de configuração — CondoOS

Este guia leva o app do zero até rodando na nuvem. Leva ~10 minutos e **não exige saber programar**.

---

## Passo 1 — Criar o projeto no Supabase (grátis)

1. Acesse **https://supabase.com** e clique em **Start your project** (login com GitHub ou e-mail).
2. Clique em **New project**.
3. Preencha:
   - **Name:** `condoos` (ou o nome que quiser)
   - **Database Password:** crie uma senha forte e **guarde-a**.
   - **Region:** escolha **South America (São Paulo)** para menor latência no Brasil.
4. Clique em **Create new project** e aguarde ~2 minutos até o projeto ficar pronto.

---

## Passo 2 — Criar o banco de dados

1. No menu lateral do Supabase, abra **SQL Editor**.
2. Clique em **+ New query**.
3. Abra o arquivo **`supabase/setup.sql`** deste projeto, **copie todo o conteúdo** e cole no editor.
4. Clique em **Run** (ou `Ctrl+Enter`).
5. Deve aparecer **"Success. No rows returned"** — pronto! Tabelas, permissões, funções e áreas de armazenamento de fotos foram criadas.

> Esse arquivo pode ser executado novamente sem problemas caso precise.

---

## Passo 3 — Facilitar o cadastro (recomendado no início)

Por padrão o Supabase exige confirmação de e-mail. Para testar sem fricção:

1. Vá em **Authentication → Sign In / Providers → Email**.
2. Desative **Confirm email**.
3. Salve.

> Em produção, você pode reativar e configurar o envio de e-mails (SMTP).

---

## Passo 4 — Conectar o app ao seu projeto

1. No Supabase, vá em **Project Settings → API**.
2. Copie dois valores:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public key** (uma chave longa)
3. Na pasta **`condoos`**, copie o arquivo **`.env.example`** para **`.env`**.
4. Preencha:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=cole-a-chave-anon-aqui
   ```
5. Salve.

---

## Passo 5 — Rodar o app

Dentro da pasta `condoos`, no terminal:

```bash
npm install      # só na primeira vez
npm run web      # abre no navegador (computador)
```

Para celular:

```bash
npm start        # mostra um QR Code
```

- **Android/iOS:** instale o app **Expo Go** (loja de apps) e escaneie o QR Code.
- Pronto — o mesmo sistema roda no computador, Android e iPhone.

---

## Passo 6 — Testar o fluxo completo

1. **Criar conta** (ex.: seu e-mail).
2. Escolher **"Administrar um condomínio"** → criar um condomínio (você vira **síndico**).
3. Anote o **código de convite** que aparece no painel inicial.
4. Em outro dispositivo/aba anônima, **crie outra conta**, escolha **"Entrar como morador"** e use o código.
5. Teste: publicar comunicado, abrir chamado, reservar área, registrar achado, enviar solicitação.

---

## 📦 Colocar no ar de verdade (quando for vender)

### Web (painel e app pelo navegador)
```bash
npx expo export --platform web    # gera a pasta dist/
```
Suba a pasta `dist/` em **Vercel**, **Netlify** ou **Cloudflare Pages** (arrastar e soltar). Configure as mesmas variáveis `EXPO_PUBLIC_*` no painel do serviço.

### App nas lojas (Android/iOS)
Use o **EAS Build** da Expo:
```bash
npm install -g eas-cli
eas login
eas build --platform android    # gera o APK/AAB para a Play Store
eas build --platform ios        # requer conta Apple Developer
```

---

## ❓ Problemas comuns

| Sintoma | Solução |
|---|---|
| App abre na tela "Conecte o Supabase" | O `.env` não foi preenchido ou o app não foi reiniciado. Pare (`Ctrl+C`) e rode de novo. |
| "E-mail ou senha incorretos" ao criar conta | Confirmação de e-mail ativa (veja Passo 3) ou senha < 6 caracteres. |
| Fotos não sobem | Verifique se o Passo 2 rodou por completo (ele cria os buckets de storage). |
| Erro de permissão nas consultas | Rode o `setup.sql` novamente — ele reconfigura as políticas de segurança (RLS). |
