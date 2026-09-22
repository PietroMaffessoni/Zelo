import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Card, ListItem, Panel, Screen, SectionHeader } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAcao } from '@/lib/acao';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { gerarCodigoPortaria, gerarCodigoZelador } from '@/lib/db';
import { validadeCodigo } from '@/lib/format';
import { papelLabel } from '@/lib/labels';
import { isConselho as ehConselho, isGestor as ehGestor, veManutencao } from '@/lib/types';

export default function Mais() {
  const router = useRouter();
  const confirmar = useConfirm();
  const { profile, papel, membershipAtual, memberships, condominioId, recarregar, signOut } = useAuth();
  const acao = useAcao();
  const gestor = ehGestor(papel);
  const conselho = ehConselho(papel);
  const porteiro = papel === 'porteiro';
  const zelador = papel === 'zelador';
  const equipe = porteiro || zelador; // funcionários: menu enxuto, sem itens de morador
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [gerandoZelador, setGerandoZelador] = useState(false);

  async function sair() {
    const ok = await confirmar({
      titulo: 'Sair da conta?',
      mensagem: 'Você precisará entrar novamente com e-mail e senha.',
      confirmar: 'Sair',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (ok) await signOut();
  }

  async function gerarCodigoDaPortaria() {
    if (!condominioId) return;
    setGerandoCodigo(true);
    await acao(async () => {
      await gerarCodigoPortaria(condominioId);
      await recarregar();
    }, { sempre: () => setGerandoCodigo(false) });
  }

  async function gerarCodigoDoZelador() {
    if (!condominioId) return;
    setGerandoZelador(true);
    await acao(async () => {
      await gerarCodigoZelador(condominioId);
      await recarregar();
    }, { sempre: () => setGerandoZelador(false) });
  }

  return (
    <Screen>
      <AppHeader title="Mais" />

      {/* Perfil */}
      <Card onPress={() => router.push('/(app)/perfil')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={42} />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" numberOfLines={1}>
              {profile?.nome_completo || 'Meu perfil'}
            </AppText>
            <View style={{ flexDirection: 'row', marginTop: 5 }}>
              <Badge label={papel ? papelLabel[papel] : 'Morador'} tone={gestor ? 'primary' : 'neutral'} />
            </View>
          </View>
        </View>
      </Card>

      {/* Serviços */}
      <SectionHeader title="Serviços" style={{ marginTop: spacing.xl }} />
      <Panel style={{ paddingHorizontal: spacing.lg }}>
        <ListItem icon="megaphone-outline" iconTone="primary" title="Comunicados" subtitle="Avisos do condomínio" onPress={() => router.push('/(app)/comunicados')} />
        {!equipe ? (
          <>
            <ListItem icon="documents-outline" iconTone="info" title="Central do morador" subtitle="Solicitações à administração" onPress={() => router.push('/(app)/central')} />
            <ListItem icon="cash-outline" iconTone="success" title="Financeiro" subtitle="Boletos e despesas do condomínio" onPress={() => router.push('/(app)/financeiro')} />
          </>
        ) : null}
        <ListItem icon="book-outline" iconTone="info" title="Documentos" subtitle="Regimento, convenção, atas e editais" onPress={() => router.push('/(app)/documentos')} />
        {!equipe ? (
          <>
            <ListItem icon="podium-outline" iconTone="primary" title="Assembleias" subtitle="Convocações e votações" onPress={() => router.push('/(app)/assembleias')} />
            <ListItem icon="bulb-outline" iconTone="warning" title="Propostas de pauta" subtitle="Sugira e apoie ideias para o condomínio" onPress={() => router.push('/(app)/propostas')} />
          </>
        ) : null}
        <ListItem icon="calendar-outline" iconTone="info" title="Agenda" subtitle="Eventos e datas importantes" onPress={() => router.push('/(app)/agenda')} />
        {!equipe ? (
          <>
            <ListItem icon="alert-circle-outline" iconTone="danger" title="Advertências e multas" subtitle={gestor ? 'Aplicar e gerenciar infrações' : 'Infrações da sua unidade'} onPress={() => router.push('/(app)/infracoes')} />
          </>
        ) : null}
        <ListItem icon="cube-outline" iconTone="warning" title="Achados e perdidos" subtitle="Objetos encontrados no condomínio" onPress={() => router.push('/(app)/achados')} />
        {membershipAtual?.unidade_id ? (
          <>
            <ListItem icon="people-outline" iconTone="info" title="Visitantes" subtitle="Autorizar entrada de visitas" onPress={() => router.push('/(app)/visitantes')} />
            <ListItem icon="car-outline" iconTone="primary" title="Veículos" subtitle="Meus veículos cadastrados" onPress={() => router.push('/(app)/veiculos')} />
          </>
        ) : null}
      </Panel>

      {/* Gestão — síndico, conselho fiscal e zelador (operação/manutenção) */}
      {veManutencao(papel) ? (
        <>
          <SectionHeader title="Gestão" style={{ marginTop: spacing.xl }} />
          <Panel style={{ paddingHorizontal: spacing.lg }}>
            <ListItem icon="construct-outline" iconTone="warning" title="Manutenção" subtitle="Equipamentos e manutenção preventiva" onPress={() => router.push('/(app)/manutencao')} />
            {conselho ? (
              <>
                <ListItem icon="bar-chart-outline" iconTone="success" title="Prestação de contas" subtitle="Receitas e despesas por mês" onPress={() => router.push('/(app)/financeiro/prestacao')} />
              </>
            ) : null}
          </Panel>
        </>
      ) : null}

      {/* Administração */}
      {gestor ? (
        <>
          <SectionHeader title="Administração" style={{ marginTop: spacing.xl }} />
          <Panel style={{ paddingHorizontal: spacing.lg }}>
            <ListItem icon="add-circle-outline" iconTone="primary" title="Publicar comunicado" onPress={() => router.push('/(app)/comunicados/novo')} />
            <ListItem icon="people-outline" iconTone="info" title="Moradores e unidades" subtitle="Cadastro, ficha (CPF/RG) e busca de moradores" onPress={() => router.push('/(app)/unidades')} />
            <ListItem icon="business-outline" iconTone="warning" title="Áreas comuns" subtitle="Taxa de uso, limites e disponibilidade" onPress={() => router.push('/(app)/areas')} />
            <ListItem icon="trending-down-outline" iconTone="danger" title="Inadimplência" subtitle="Unidades com boletos vencidos" onPress={() => router.push('/(app)/financeiro/inadimplencia')} />
            <ListItem icon="briefcase-outline" iconTone="primary" title="Contas a pagar" subtitle="Enviar despesas para a administradora" onPress={() => router.push('/(app)/financeiro/administradora')} />
            <ListItem icon="receipt-outline" iconTone="neutral" title="Registro de atividades" subtitle="Quem fez o quê na administração" onPress={() => router.push('/(app)/auditoria')} />
            <ListItem icon="lock-closed-outline" iconTone="neutral" title="Privacidade e retenção" subtitle="Por quanto tempo guardar dados de portaria" onPress={() => router.push('/(app)/privacidade-dados')} />
            <ListItem
              icon="key-outline"
              iconTone="success"
              title="Código de convite"
              subtitle={membershipAtual?.condominio?.codigo_convite ?? '—'}
              chevron={false}
            />
            <ListItem
              icon="shield-checkmark-outline"
              iconTone="warning"
              title="Código da portaria"
              subtitle={legendaCodigo(
                membershipAtual?.condominio?.codigo_portaria,
                membershipAtual?.condominio?.codigo_portaria_expira_em,
                gerandoCodigo,
              )}
              onPress={gerarCodigoDaPortaria}
            />
            <ListItem
              icon="construct-outline"
              iconTone="info"
              title="Código do zelador"
              subtitle={legendaCodigo(
                membershipAtual?.condominio?.codigo_zelador,
                membershipAtual?.condominio?.codigo_zelador_expira_em,
                gerandoZelador,
              )}
              onPress={gerarCodigoDoZelador}
            />
          </Panel>
        </>
      ) : null}

      {/* Conta */}
      <SectionHeader title="Conta" style={{ marginTop: spacing.xl }} />
      <Panel style={{ paddingHorizontal: spacing.lg }}>
        <ListItem icon="person-outline" iconTone="neutral" title="Meu perfil" onPress={() => router.push('/(app)/perfil')} />
        {membershipAtual?.unidade_id ? (
          <>
            <ListItem
              icon="home-outline"
              iconTone="primary"
              title="Minha unidade"
              subtitle="Moradores, dependentes e pets"
              onPress={() => router.push(`/(app)/unidades/${membershipAtual.unidade_id}`)}
            />
          </>
        ) : null}
        {memberships.length > 1 ? (
          <>
            <ListItem icon="swap-horizontal-outline" iconTone="info" title="Trocar de condomínio" onPress={() => router.push('/(app)/perfil')} />
          </>
        ) : null}
        <ListItem icon="log-out-outline" iconTone="danger" title="Sair" chevron={false} onPress={sair} />
      </Panel>

      <AppText color="subtle" center variant="caption" style={{ marginTop: spacing.xxl }}>
        Zelo · versão 1.0
      </AppText>
    </Screen>
  );
}

/**
 * Legenda de um código de equipe: o código em si e, quando houver prazo, até
 * quando ele vale. Um código expirado precisa dizer isso na própria linha —
 * senão o síndico só descobre quando o funcionário não consegue entrar.
 */
function legendaCodigo(codigo: string | null | undefined, expiraEm: string | null | undefined, gerando: boolean) {
  if (gerando) return 'Gerando...';
  if (!codigo) return 'Toque para gerar';
  const validade = validadeCodigo(expiraEm);
  return validade ? `${codigo} · ${validade.texto}` : codigo;
}
