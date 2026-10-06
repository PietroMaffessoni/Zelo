import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

import { isConselho, isGestor, veManutencao, type Papel } from '@/lib/types';

export type ItemMenu = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  /** Trecho do caminho que marca o item como ativo. */
  match: string;
};

export type SecaoMenu = { titulo: string | null; itens: ItemMenu[] };

/**
 * Todos os destinos do app, por papel, numa lista só.
 *
 * O menu lateral do celular e a barra lateral do computador montam a navegação
 * daqui. Antes cada um tinha a sua lista escrita à mão e elas já tinham se
 * separado: "Propostas de pauta" e "Prestação de contas" existiam no menu
 * "Mais" do celular e não na barra do computador.
 */
export function montarMenu(papel: Papel | null, unidadeId: string | null): SecaoMenu[] {
  const gestor = isGestor(papel);
  const conselho = isConselho(papel);
  const porteiro = papel === 'porteiro';
  const zelador = papel === 'zelador';
  const morador = !gestor && !porteiro && !zelador;
  const equipe = porteiro || zelador;

  const se = <T,>(condicao: boolean, itens: T[]): T[] => (condicao ? itens : []);

  const secoes: SecaoMenu[] = [
    {
      titulo: null,
      itens: [
        { label: 'Início', icon: 'home-outline', href: '/(app)/(tabs)/inicio', match: '/inicio' },
        { label: 'Notificações', icon: 'notifications-outline', href: '/(app)/(tabs)/notificacoes', match: '/notificacoes' },
        { label: 'Reservas', icon: 'calendar-outline', href: '/(app)/(tabs)/reservas', match: '/reservas' },
        ...se(morador || gestor || zelador, [
          { label: 'Chamados', icon: 'construct-outline', href: '/(app)/(tabs)/chamados', match: '/chamados' } as ItemMenu,
        ]),
        ...se(gestor || porteiro, [
          { label: 'Portaria', icon: 'people-circle-outline', href: '/(app)/(tabs)/portaria', match: '/portaria' } as ItemMenu,
        ]),
        { label: 'Comunicados', icon: 'megaphone-outline', href: '/(app)/comunicados', match: '/comunicados' },
      ],
    },
    {
      titulo: 'Serviços',
      itens: [
        ...se(!equipe, [
          { label: 'Central do morador', icon: 'documents-outline', href: '/(app)/central', match: '/central' },
          { label: 'Financeiro', icon: 'cash-outline', href: '/(app)/financeiro', match: '/financeiro' },
        ] as ItemMenu[]),
        { label: 'Documentos', icon: 'book-outline', href: '/(app)/documentos', match: '/documentos' },
        ...se(!equipe, [
          { label: 'Assembleias', icon: 'podium-outline', href: '/(app)/assembleias', match: '/assembleias' },
          { label: 'Propostas de pauta', icon: 'bulb-outline', href: '/(app)/propostas', match: '/propostas' },
        ] as ItemMenu[]),
        { label: 'Agenda', icon: 'calendar-number-outline', href: '/(app)/agenda', match: '/agenda' },
        ...se(!equipe, [
          { label: 'Advertências e multas', icon: 'alert-circle-outline', href: '/(app)/infracoes', match: '/infracoes' } as ItemMenu,
        ]),
        { label: 'Achados e perdidos', icon: 'cube-outline', href: '/(app)/achados', match: '/achados' },
        // Moradores, visitantes e veículos da unidade numa entrada só.
        ...se(!!unidadeId, [
          { label: 'Cadastros', icon: 'id-card-outline', href: '/(app)/cadastros', match: '/cadastros' } as ItemMenu,
        ]),
      ],
    },
    {
      titulo: 'Gestão',
      itens: [
        ...se(veManutencao(papel), [
          { label: 'Manutenção', icon: 'build-outline', href: '/(app)/manutencao', match: '/manutencao' } as ItemMenu,
        ]),
        ...se(conselho, [
          { label: 'Prestação de contas', icon: 'bar-chart-outline', href: '/(app)/financeiro/prestacao', match: '/financeiro/prestacao' } as ItemMenu,
        ]),
      ],
    },
    {
      titulo: 'Administração',
      itens: se(gestor, [
        { label: 'Moradores e unidades', icon: 'people-outline', href: '/(app)/unidades', match: '/unidades' },
        { label: 'Áreas comuns', icon: 'business-outline', href: '/(app)/areas', match: '/areas' },
        { label: 'Inadimplência', icon: 'trending-down-outline', href: '/(app)/financeiro/inadimplencia', match: '/financeiro/inadimplencia' },
        { label: 'Contas a pagar', icon: 'briefcase-outline', href: '/(app)/financeiro/administradora', match: '/financeiro/administradora' },
        { label: 'Registro de atividades', icon: 'receipt-outline', href: '/(app)/auditoria', match: '/auditoria' },
        { label: 'Privacidade e retenção', icon: 'lock-closed-outline', href: '/(app)/privacidade-dados', match: '/privacidade-dados' },
      ] as ItemMenu[]),
    },
  ];

  return secoes.filter((s) => s.itens.length > 0);
}

/**
 * O item está ativo? Compara pelo começo do caminho, e o mais específico vence:
 * em `/financeiro/inadimplencia`, "Inadimplência" acende e "Financeiro" não.
 */
export function itemAtivo(item: ItemMenu, pathname: string, todos: ItemMenu[]): boolean {
  const casa = (m: string) => pathname === m || pathname.startsWith(`${m}/`);
  if (!casa(item.match)) return false;
  return !todos.some((outro) => outro !== item && outro.match.length > item.match.length && casa(outro.match));
}
