# CondoOS — o sistema operacional do condomínio

Plataforma completa de gestão de condomínios: **um único app** para moradores e síndicos,
rodando em **Android, iOS e navegador** a partir do mesmo código.

> Objetivo: substituir grupos de WhatsApp, planilhas e ligações por um ambiente central
> onde toda a rotina do condomínio acontece.

---

## ✨ Funcionalidades

**Para moradores**
- 📢 **Comunicados** — avisos do condomínio com destaque e histórico
- 🛠️ **Chamados** — abrir solicitações com categoria, fotos, status e histórico
- 📅 **Reservas** — agendar salão, churrasqueira, quadra, academia
- 📄 **Central do morador** — 2ª via de boleto, autorizações, documentos etc.
- 📦 **Achados e perdidos** — registrar objetos encontrados

**Para síndicos / administração**
- 📊 **Painel gerencial** — chamados abertos, reservas pendentes, solicitações, moradores
- 🛠️ **Gestão de chamados** — status, comentários e histórico
- ✅ **Aprovação de reservas**
- 📢 **Publicação de comunicados**
- 🔑 **Código de convite** para os moradores entrarem

---

## 🧱 Arquitetura

| Camada | Tecnologia |
|---|---|
| App (iOS/Android/Web) | **Expo (React Native)** + expo-router |
| Backend | **Supabase** — Postgres, Auth, Storage, Realtime |
| Multi-condomínio | Isolamento por **Row Level Security (RLS)** |
| Linguagem | TypeScript |

Cada usuário pode pertencer a vários condomínios, com papéis distintos (**morador**, **síndico**,
**admin**, **portaria**). As permissões são garantidas no banco, não só na interface.

```
condoos/
├── src/
│   ├── app/            # telas (rotas por arquivo)
│   │   ├── (auth)/     # login, cadastro
│   │   ├── (app)/      # área logada
│   │   │   ├── (tabs)/ # início, chamados, reservas, mais
│   │   │   ├── comunicados/  chamados/  reservas/  achados/  central/
│   │   │   └── perfil.tsx
│   │   ├── onboarding.tsx    # criar ou entrar em um condomínio
│   │   └── setup.tsx         # tela de configuração inicial
│   ├── components/ui/  # design system (Button, Card, Input, Badge...)
│   ├── constants/      # tema (cores, espaçamentos, tipografia)
│   └── lib/            # supabase, auth, consultas (db.ts), tipos, storage
└── supabase/
    └── setup.sql       # schema + segurança + storage (rodar no Supabase)
```

---

## ▶️ Rodar

```bash
npm install
cp .env.example .env      # e preencha com seu projeto Supabase
npm run web               # navegador
npm start                 # celular (Expo Go via QR Code)
```

👉 **Primeira vez?** Siga o **[GUIA_SUPABASE.md](./GUIA_SUPABASE.md)** — passo a passo para colocar no ar.

---

## 🗺️ Próximos passos (roadmap)

- Notificações push (EAS + Expo Notifications)
- Módulos administrativos: prestadores, manutenções preventivas, gestão de moradores/unidades
- Financeiro (boletos, inadimplência)
- Assinatura/cobrança (SaaS) por condomínio
