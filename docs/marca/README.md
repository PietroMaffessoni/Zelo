# Zelo — Guia de Marca

Identidade visual do app (antigo “CondoOS”). Este documento é a **fonte da verdade**
para cores, logo, nome e tipografia. Tudo já está aplicado no código — os apontamentos
abaixo dizem **onde** e **como** mexer.

## Apresentações (para mostrar/compartilhar)

- **[apresentacao-identidade.html](apresentacao-identidade.html)** — a proposta aprovada
  (prédio no “l”, opções de logo e nome, paleta, tipografia e mockup). Abra no navegador.
- **[apresentacao-conceitos-iniciais.html](apresentacao-conceitos-iniciais.html)** — as
  explorações iniciais de ícone (folha/casa/escudo), mantidas como histórico.
- Versões online (alternam tema claro/escuro):
  - Final: https://claude.ai/code/artifact/5554c8e8-af29-4459-839c-36f05e56311c
  - Conceitos: https://claude.ai/code/artifact/c68b0ff6-4b3b-431e-8dae-13fa68f60380

---

## Nome

- **Zelo** — sempre assim. Uma palavra só, inicial maiúscula.
- **Não** usar “ZeloOS”, “Zelo OS”, “ZELO” em caixa alta no corpo, nem “condoos”.
- Quando precisar sinalizar que é um sistema completo, use um **descritor** ao lado, não no nome:
  **“Zelo · gestão de condomínios”**.
- Motivo: “zelo” = zelar/cuidar do condomínio (mesma raiz de “zelador”). O sufixo “OS” foi
  removido de propósito — dava a cara genérica/tech do nome antigo.

## Logo

- **Símbolo:** um **prédio** ocupa o lugar da letra **“l”** em “Ze**l**o”. Versão limpa
  (com janelas e porta), **sem folha**.
- **Ícone isolado** (quando o wordmark não cabe, ex.: ícone do app): só o prédio, branco
  sobre o verde da marca.
- Implementado em [`src/components/Brand.tsx`](../../src/components/Brand.tsx), sem dependência de SVG:
  - `Brand` — logotipo completo (wordmark + tagline opcional), usado em login/cadastro.
  - `ZeloWordmark` — o wordmark “Zelo” com o prédio; usado na sidebar e onde precisar.
  - `ZeloMark` — só o prédio (props `height`, `color`, `windowColor`); use `windowColor`
    = a cor do fundo atrás dele para as janelas parecerem recortes.
- **Regras:** manter respiro ao redor; não distorcer; não trocar a cor do prédio por fora da
  paleta; não adicionar sombra/gradiente ao wordmark.

## Cores

Azul-marinho profundo (confiança & instituição) sobre neutros frios e limpos — **não** é o
índigo genérico. A primária azul contrasta com o verde/vermelho/âmbar das cores semânticas.
Fonte no código: [`src/constants/theme.ts`](../../src/constants/theme.ts)
(`paletteLight` / `paletteDark`). **Nunca** escreva hex direto nas telas — use os tokens via `useAppTheme()`.

### Tema claro
| Token | Hex | Uso |
|---|---|---|
| `primary` | `#12568F` | Marca, botões, links |
| `primaryDark` | `#0E4373` | Pressionado/hover |
| `primarySoft` | `#E2ECF6` | Fundo de ícones/chips selecionados |
| `background` | `#F3F5F9` | Fundo das telas |
| `surface` | `#FFFFFF` | Cards |
| `surfaceAlt` | `#EBEFF6` | Fundo secundário |
| `border` | `#E0E5EE` | Bordas |
| `text` | `#111C2B` | Texto principal |
| `textMuted` | `#516175` | Texto secundário |
| `textSubtle` | `#7B8798` | Legendas |
| `success` | `#2E7D46` | Pago/aprovado |
| `warning` | `#B45309` | Atenção/pendente |
| `danger` | `#C0392B` | Erro/atraso/vencido |
| `info` | `#0E7490` | Informativo (teal, distinto da primária) |

### Tema escuro (principais)
| Token | Hex |
|---|---|
| `primary` | `#5AA6E8` |
| `onPrimary` | `#08121E` |
| `background` | `#0C121C` |
| `surface` | `#151D28` |
| `text` | `#EAF0F7` |
| `success` / `danger` | `#54CC82` / `#E8776B` |

## Tipografia

Hoje o app usa a **fonte do sistema** (peso forte + tracking negativo nos títulos e no
wordmark). A recomendação de marca é uma fonte **humanista arredondada** —
**Plus Jakarta Sans** — nos títulos.

Para adotá-la (precisa dos arquivos `.ttf`, ainda não incluídos):

1. Colocar os `.ttf` em `assets/fonts/` (ex.: `PlusJakartaSans-Bold.ttf`, `-ExtraBold.ttf`).
2. Carregar no boot com `expo-font` (`useFonts`) em `src/app/_layout.tsx`.
3. Adicionar um token `fonts.display` em `theme.ts` e aplicar o `fontFamily` nas variantes
   `display`/`title`/`heading` de [`src/components/ui/Text.tsx`](../../src/components/ui/Text.tsx)
   e no `ZeloWordmark`.

## Pendências de assets (design)

- **Ícone do app / splash / adaptive icon**: os PNGs em `assets/images/` ainda são os
  antigos. Regenerar a partir do **prédio branco sobre o azul `#12568F`** (`icon.png`,
  `splash-icon.png`, `android-icon-foreground.png`, `favicon.png`). As **cores** de splash
  e adaptive-icon já foram atualizadas em `app.json`.
- Sugestão: exportar o `ZeloMark` como SVG e gerar os PNGs nos tamanhos exigidos pelo Expo.

## Onde a identidade vive no código

- Cores/tokens: `src/constants/theme.ts`
- Logo/nome: `src/components/Brand.tsx`
- Nome de exibição / splash / cores nativas: `app.json`
- Título das abas no web: `src/components/ui/Layout.tsx`
