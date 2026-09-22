/**
 * Acesso a dados do Zelo.
 *
 * Era um arquivo único de 1.366 linhas com 119 consultas de quinze domínios
 * diferentes — financeiro, portaria, assembleia e agenda no mesmo lugar. Para
 * mexer numa consulta de boleto era preciso rolar por encomendas e vistorias, e
 * qualquer alteração tocava o arquivo que todas as telas importam.
 *
 * Agora cada domínio tem seu arquivo e este índice reexporta tudo, então nenhuma
 * tela precisou mudar: `import { listarChamados } from '@/lib/db'` continua
 * valendo. A divisão é por ASSUNTO, não por tipo de operação — quem for mexer em
 * inadimplência quer ver o cálculo do boleto ao lado, não junto de todos os
 * outros `select` do app.
 */
export * from '@/lib/db/achados';
export * from '@/lib/db/agenda';
export * from '@/lib/db/assembleias';
export * from '@/lib/db/auditoria';
export * from '@/lib/db/central';
export * from '@/lib/db/chamados';
export * from '@/lib/db/comunicados';
export * from '@/lib/db/documentos';
export * from '@/lib/db/financeiro';
export * from '@/lib/db/infracoes';
export * from '@/lib/db/manutencao';
export * from '@/lib/db/painel';
export * from '@/lib/db/perfil';
export * from '@/lib/db/portaria';
export * from '@/lib/db/reservas';
export * from '@/lib/db/unidades';
