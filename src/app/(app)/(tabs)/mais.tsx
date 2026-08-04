import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Card, Divider, ListItem, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { gerarCodigoPortaria, gerarCodigoZelador } from '@/lib/db';
import { papelLabel } from '@/lib/labels';
import { isConselho as ehConselho, isGestor as ehGestor, veManutencao } from '@/lib/types';

export default function Mais() {
  const router = useRouter();
  const confirmar = useConfirm();
  const { profile, papel, membershipAtual, memberships, condominioId, recarregar, signOut } = useAuth();
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
    await gerarCodigoPortaria(condominioId);
    await recarregar();
    setGerandoCodigo(false);
  }

  async function gerarCodigoDoZelador() {
    if (!condominioId) return;
    setGerandoZelador(true);
    await gerarCodigoZelador(condominioId);
    await recarregar();
    setGerandoZelador(false);
  }

  return (
    <Screen>
      <AppHeader title="Mais" />

      {/* Perfil */}
      <Card onPress={() => router.push('/(app)/perfil')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar nome={profile?.nome_completo} url={profile?.avatar_url} size={52} />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" numberOfLines={1}>
              {profile?.nome_completo || 'Meu perfil'}
            </AppText>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <Badge label={papel ? papelLabel[papel] : 'Morador'} tone={gestor ? 'primary' : 'neutral'} />
            </View>
          </View>
        </View>
      </Card>

      {/* Serviços */}
      <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
        SERVIÇOS
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        <ListItem icon="megaphone-outline" iconTone="primary" title="Comunicados" subtitle="Avisos do condomínio" onPress={() => router.push('/(app)/comunicados')} />
        {!equipe ? (
          <>
            <Divider />
            <ListItem icon="documents-outline" iconTone="info" title="Central do morador" subtitle="Solicitações à administração" onPress={() => router.push('/(app)/central')} />
            <Divider />
            <ListItem icon="cash-outline" iconTone="success" title="Financeiro" subtitle="Boletos e despesas do condomínio" onPress={() => router.push('/(app)/financeiro')} />
          </>
        ) : null}
        <Divider />
        <ListItem icon="book-outline" iconTone="info" title="Regimento interno" subtitle="Regimento interno do condomínio" onPress={() => router.push('/(app)/documentos')} />
        {!equipe ? (
          <>
            <Divider />
            <ListItem icon="podium-outline" iconTone="primary" title="Assembleias" subtitle="Convocações e votações" onPress={() => router.push('/(app)/assembleias')} />
            <Divider />
            <ListItem icon="bulb-outline" iconTone="warning" title="Propostas de pauta" subtitle="Sugira e apoie ideias para o condomínio" onPress={() => router.push('/(app)/propostas')} />
          </>
        ) : null}
        <Divider />
        <ListItem icon="calendar-outline" iconTone="info" title="Agenda" subtitle="Eventos e datas importantes" onPress={() => router.push('/(app)/agenda')} />
        {!equipe ? (
          <>
            <Divider />
            <ListItem icon="alert-circle-outline" iconTone="danger" title="Advertências e multas" subtitle={gestor ? 'Aplicar e gerenciar infrações' : 'Infrações da sua unidade'} onPress={() => router.push('/(app)/infracoes')} />
          </>
        ) : null}
        <Divider />
        <ListItem icon="cube-outline" iconTone="warning" title="Achados e perdidos" subtitle="Objetos encontrados no condomínio" onPress={() => router.push('/(app)/achados')} />
        {membershipAtual?.unidade_id ? (
          <>
            <Divider />
            <ListItem icon="people-outline" iconTone="info" title="Visitantes" subtitle="Autorizar entrada de visitas" onPress={() => router.push('/(app)/visitantes')} />
            <Divider />
            <ListItem icon="car-outline" iconTone="primary" title="Veículos" subtitle="Meus veículos cadastrados" onPress={() => router.push('/(app)/veiculos')} />
          </>
        ) : null}
      </Card>

      {/* Gestão — síndico, conselho fiscal e zelador (operação/manutenção) */}
      {veManutencao(papel) ? (
        <>
          <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
            GESTÃO
          </AppText>
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            <ListItem icon="construct-outline" iconTone="warning" title="Manutenção" subtitle="Equipamentos e manutenção preventiva" onPress={() => router.push('/(app)/manutencao')} />
            {conselho ? (
              <>
                <Divider />
                <ListItem icon="bar-chart-outline" iconTone="success" title="Prestação de contas" subtitle="Receitas e despesas por mês" onPress={() => router.push('/(app)/financeiro/prestacao')} />
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Administração */}
      {gestor ? (
        <>
          <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
            ADMINISTRAÇÃO
          </AppText>
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            <ListItem icon="add-circle-outline" iconTone="primary" title="Publicar comunicado" onPress={() => router.push('/(app)/comunicados/novo')} />
            <Divider />
            <ListItem icon="people-outline" iconTone="info" title="Moradores e unidades" subtitle="Cadastro, ficha (CPF/RG) e busca de moradores" onPress={() => router.push('/(app)/unidades')} />
            <Divider />
            <ListItem icon="business-outline" iconTone="warning" title="Áreas comuns" subtitle="Taxa de uso, limites e disponibilidade" onPress={() => router.push('/(app)/areas')} />
            <Divider />
            <ListItem icon="trending-down-outline" iconTone="danger" title="Inadimplência" subtitle="Unidades com boletos vencidos" onPress={() => router.push('/(app)/financeiro/inadimplencia')} />
            <Divider />
            <ListItem icon="briefcase-outline" iconTone="primary" title="Contas a pagar" subtitle="Enviar despesas para a administradora" onPress={() => router.push('/(app)/financeiro/administradora')} />
            <Divider />
            <ListItem
              icon="key-outline"
              iconTone="success"
              title="Código de convite"
              subtitle={membershipAtual?.condominio?.codigo_convite ?? '—'}
              chevron={false}
            />
            <Divider />
            <ListItem
              icon="shield-checkmark-outline"
              iconTone="warning"
              title="Código da portaria"
              subtitle={membershipAtual?.condominio?.codigo_portaria ?? (gerandoCodigo ? 'Gerando...' : 'Toque para gerar')}
              onPress={gerarCodigoDaPortaria}
            />
            <Divider />
            <ListItem
              icon="construct-outline"
              iconTone="info"
              title="Código do zelador"
              subtitle={membershipAtual?.condominio?.codigo_zelador ?? (gerandoZelador ? 'Gerando...' : 'Toque para gerar')}
              onPress={gerarCodigoDoZelador}
            />
          </Card>
        </>
      ) : null}

      {/* Conta */}
      <AppText variant="label" color="muted" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
        CONTA
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        <ListItem icon="person-outline" iconTone="neutral" title="Meu perfil" onPress={() => router.push('/(app)/perfil')} />
        {membershipAtual?.unidade_id ? (
          <>
            <Divider />
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
            <Divider />
            <ListItem icon="swap-horizontal-outline" iconTone="info" title="Trocar de condomínio" onPress={() => router.push('/(app)/perfil')} />
          </>
        ) : null}
        <Divider />
        <ListItem icon="log-out-outline" iconTone="danger" title="Sair" chevron={false} onPress={sair} />
      </Card>

      <AppText color="subtle" center variant="caption" style={{ marginTop: spacing.xxl }}>
        Zelo · versão 1.0
      </AppText>
    </Screen>
  );
}
