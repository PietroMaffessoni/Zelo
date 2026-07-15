import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, Chip, Input, Loading, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { vinculoLabel } from '@/lib/labels';
import type { Vinculo } from '@/lib/types';

type Modo = 'escolha' | 'criar' | 'entrar' | 'portaria';

export default function Onboarding() {
  const router = useRouter();
  const {
    ready,
    session,
    memberships,
    membershipsPendentes,
    profile,
    criarCondominio,
    entrarCondominio,
    entrarComoPorteiro,
    recarregar,
    signOut,
  } = useAuth();
  const [modo, setModo] = useState<Modo>('escolha');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  // campos criar
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  // campos entrar
  const [codigo, setCodigo] = useState('');
  const [bloco, setBloco] = useState('');
  const [numero, setNumero] = useState('');
  const [vinculo, setVinculo] = useState<Vinculo>('proprietario');
  // campo portaria
  const [codigoPortaria, setCodigoPortaria] = useState('');

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (memberships.length > 0) return <Redirect href="/(app)/(tabs)/inicio" />;

  if (membershipsPendentes.length > 0) {
    return (
      <Screen>
        <View style={{ marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.full,
              backgroundColor: palette.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="time-outline" size={34} color={palette.primary} />
          </View>
          <AppText variant="title" center>
            Aguardando aprovação
          </AppText>
          <AppText color="muted" center style={{ marginTop: spacing.xs }}>
            Seu pedido para entrar em{' '}
            <AppText weight="semibold">{membershipsPendentes[0].condominio?.nome ?? 'o condomínio'}</AppText> foi
            enviado ao síndico. Assim que ele aprovar, você terá acesso automaticamente.
          </AppText>
          <Button
            title="Verificar novamente"
            variant="secondary"
            icon="refresh-outline"
            onPress={verificar}
            loading={verificando}
            style={{ marginTop: spacing.lg }}
          />
          <Pressable onPress={signOut} style={{ marginTop: spacing.lg }}>
            <AppText color="muted">Sair da conta</AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  async function criar() {
    if (!nome.trim()) return setErro('Informe o nome do condomínio.');
    setCarregando(true);
    setErro(null);
    const { error } = await criarCondominio({ nome, cidade, uf });
    setCarregando(false);
    if (error) setErro(error);
    else router.replace('/(app)/(tabs)/inicio');
  }

  async function entrar() {
    if (!codigo.trim()) return setErro('Informe o código de convite.');
    setCarregando(true);
    setErro(null);
    const { error } = await entrarCondominio({ codigo, bloco, numero, vinculo });
    setCarregando(false);
    // Entra como 'pendente' — não redireciona; assim que recarregar() atualizar o
    // contexto, este componente já cai sozinho na tela de "aguardando aprovação" acima.
    if (error) setErro(error);
  }

  async function entrarPortaria() {
    if (!codigoPortaria.trim()) return setErro('Informe o código da portaria.');
    setCarregando(true);
    setErro(null);
    const { error } = await entrarComoPorteiro(codigoPortaria);
    setCarregando(false);
    if (error) setErro(error);
    else router.replace('/(app)/(tabs)/inicio');
  }

  async function verificar() {
    setVerificando(true);
    await recarregar();
    setVerificando(false);
  }

  return (
    <Screen>
      <View style={{ marginTop: spacing.xxl, marginBottom: spacing.lg }}>
        <AppText variant="title">Olá, {profile?.nome_completo?.split(' ')[0] || 'bem-vindo'} 👋</AppText>
        <AppText color="muted" style={{ marginTop: spacing.xs }}>
          Vamos conectar você a um condomínio para começar.
        </AppText>
      </View>

      {modo === 'escolha' ? (
        <View style={{ gap: spacing.md }}>
          <OpcaoCard
            icon="business"
            titulo="Administrar um condomínio"
            descricao="Sou síndico ou administrador e quero criar o condomínio."
            onPress={() => {
              setErro(null);
              setModo('criar');
            }}
          />
          <OpcaoCard
            icon="home"
            titulo="Entrar como morador"
            descricao="Tenho um código de convite do meu condomínio."
            onPress={() => {
              setErro(null);
              setModo('entrar');
            }}
          />
          <OpcaoCard
            icon="shield-checkmark"
            titulo="Sou da portaria"
            descricao="Tenho um código de acesso da equipe de portaria."
            onPress={() => {
              setErro(null);
              setModo('portaria');
            }}
          />
          <Pressable onPress={signOut} style={{ alignSelf: 'center', marginTop: spacing.lg }}>
            <AppText color="muted">Sair da conta</AppText>
          </Pressable>
        </View>
      ) : modo === 'criar' ? (
        <Card style={{ gap: spacing.lg }}>
          <AppText variant="subtitle">Novo condomínio</AppText>
          <Input label="Nome do condomínio" placeholder="Ex.: Residencial Jardins" value={nome} onChangeText={setNome} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 2 }}>
              <Input label="Cidade" placeholder="Cidade" value={cidade} onChangeText={setCidade} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="UF" placeholder="SP" autoCapitalize="characters" maxLength={2} value={uf} onChangeText={setUf} />
            </View>
          </View>
          {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
          <Button title="Criar condomínio" onPress={criar} loading={carregando} size="lg" icon="add" />
          <Voltar onPress={() => setModo('escolha')} />
        </Card>
      ) : modo === 'entrar' ? (
        <Card style={{ gap: spacing.lg }}>
          <AppText variant="subtitle">Entrar no condomínio</AppText>
          <Input
            label="Código de convite"
            placeholder="Ex.: A1B2C3"
            autoCapitalize="characters"
            value={codigo}
            onChangeText={setCodigo}
            icon="key-outline"
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input label="Bloco (opcional)" placeholder="A" value={bloco} onChangeText={setBloco} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Apto/Casa" placeholder="101" value={numero} onChangeText={setNumero} />
            </View>
          </View>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="muted">Você é...</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {(['proprietario', 'inquilino', 'dependente'] as Vinculo[]).map((v) => (
                <Chip key={v} label={vinculoLabel[v].label} selected={vinculo === v} onPress={() => setVinculo(v)} />
              ))}
            </View>
          </View>
          {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
          <Button title="Entrar" onPress={entrar} loading={carregando} size="lg" icon="enter-outline" />
          <Voltar onPress={() => setModo('escolha')} />
        </Card>
      ) : (
        <Card style={{ gap: spacing.lg }}>
          <AppText variant="subtitle">Acesso da portaria</AppText>
          <Input
            label="Código da portaria"
            placeholder="Ex.: P1A2B3C4"
            autoCapitalize="characters"
            value={codigoPortaria}
            onChangeText={setCodigoPortaria}
            icon="shield-checkmark-outline"
          />
          {erro ? <AppText color="danger" variant="label">{erro}</AppText> : null}
          <Button title="Entrar" onPress={entrarPortaria} loading={carregando} size="lg" icon="enter-outline" />
          <Voltar onPress={() => setModo('escolha')} />
        </Card>
      )}
    </Screen>
  );
}

function OpcaoCard({
  icon,
  titulo,
  descricao,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.md,
            backgroundColor: palette.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={26} color={palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">{titulo}</AppText>
          <AppText color="muted" variant="caption" style={{ marginTop: 2 }}>
            {descricao}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={palette.textSubtle} />
      </View>
    </Card>
  );
}

function Voltar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignSelf: 'center' }}>
      <AppText color="muted">Voltar</AppText>
    </Pressable>
  );
}
