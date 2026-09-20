import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Button, Input, Panel, Row, Screen, SectionHeader } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { atualizarPreferenciasNotificacao } from '@/lib/db';
import { enviarImagem, escolherImagem } from '@/lib/storage';
import { papelLabel } from '@/lib/labels';
import { useAppTheme } from '@/lib/theme';
import { isGestor, type PreferenciasNotificacao } from '@/lib/types';

const CATEGORIAS_NOTIFICACAO: { chave: keyof PreferenciasNotificacao; label: string }[] = [
  { chave: 'comunicados', label: 'Comunicados' },
  { chave: 'chamados', label: 'Chamados' },
  { chave: 'encomendas', label: 'Encomendas' },
  { chave: 'reservas', label: 'Reservas' },
  { chave: 'assembleias', label: 'Assembleias' },
];

export default function Perfil() {
  const { user, profile, memberships, condominioId, selecionarCondominio, recarregar, signOut } = useAuth();
  const { escuro, alternar, palette } = useAppTheme();
  const [nome, setNome] = useState(profile?.nome_completo ?? '');
  const [telefone, setTelefone] = useState(profile?.telefone ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function alternarNotificacao(chave: keyof PreferenciasNotificacao, valor: boolean) {
    if (!user || !profile) return;
    const preferencias = { ...profile.preferencias_notificacao, [chave]: valor };
    await atualizarPreferenciasNotificacao(user.id, preferencias);
    await recarregar();
  }

  async function trocarAvatar() {
    const uri = await escolherImagem();
    if (!uri) return;
    setSalvando(true);
    try {
      const url = await enviarImagem('avatars', uri);
      setAvatar(url);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user!.id);
      await recarregar();
    } catch {
      setMsg('Não foi possível enviar a foto.');
    }
    setSalvando(false);
  }

  async function salvar() {
    if (!user) return;
    setSalvando(true);
    setMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({ nome_completo: nome.trim(), telefone: telefone.trim() || null })
      .eq('id', user.id);
    await recarregar();
    setSalvando(false);
    setMsg(error ? 'Erro ao salvar.' : 'Dados atualizados!');
  }

  return (
    <Screen>
      <AppHeader title="Meu perfil" back />

      <View style={{ alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg }}>
        <Pressable onPress={trocarAvatar}>
          <Avatar nome={nome || profile?.nome_completo} url={avatar} size={76} />
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 28,
              height: 28,
              borderRadius: radius.full,
              backgroundColor: palette.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: palette.background,
            }}
          >
            <Ionicons name="camera" size={16} color={palette.white} />
          </View>
        </Pressable>
        <AppText color="subtle" variant="caption">{user?.email}</AppText>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Input label="Nome completo" value={nome} onChangeText={setNome} icon="person-outline" />
        <Input label="Telefone" value={telefone} onChangeText={setTelefone} icon="call-outline" keyboardType="phone-pad" />
        {msg ? (
          <AppText color={msg.includes('atualiz') ? 'success' : 'danger'} variant="label">
            {msg}
          </AppText>
        ) : null}
        <Button title="Salvar alterações" onPress={salvar} loading={salvando} />
      </View>

      {/* Aparência */}
      <SectionHeader title="Aparência" style={{ marginTop: spacing.xxl }} />
      <Panel>
        <Row onPress={alternar} accessibilityLabel="Modo escuro" compact>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons
              name={escuro ? 'moon-outline' : 'sunny-outline'}
              size={19}
              color={palette.textSubtle}
              style={{ width: 22, textAlign: 'center' }}
            />
            <AppText variant="subtitle" style={{ flex: 1 }}>
              Modo escuro
            </AppText>
            <Switch value={escuro} onValueChange={alternar} trackColor={{ true: palette.primary, false: palette.borderStrong }} />
          </View>
        </Row>
      </Panel>

      {/* Notificações */}
      <SectionHeader title="Notificações" style={{ marginTop: spacing.xxl }} />
      <Panel>
        {CATEGORIAS_NOTIFICACAO.map((c) => (
          <Row key={c.chave} compact>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <AppText variant="subtitle" style={{ flex: 1 }}>
                {c.label}
              </AppText>
              <Switch
                value={profile?.preferencias_notificacao?.[c.chave] ?? true}
                onValueChange={(v) => alternarNotificacao(c.chave, v)}
                trackColor={{ true: palette.primary, false: palette.borderStrong }}
              />
            </View>
          </Row>
        ))}
      </Panel>

      {/* Meus condomínios */}
      <SectionHeader title="Meus condomínios" style={{ marginTop: spacing.xxl }} />
      {/*
        Seletor de condomínio. A borda de 2px no item ativo engordava a caixa e
        desalinhava a lista; o ativo agora se marca com um risco na cor da marca à
        esquerda, fundo tênue e a marca de seleção à direita — a mesma gramática de
        "selecionado" usada na sidebar, o que torna o estado reconhecível de tela
        para tela.
      */}
      <Panel>
        {memberships.map((m) => {
          const ativo = m.condominio_id === condominioId;
          return (
            <Row
              key={m.id}
              onPress={() => selecionarCondominio(m.condominio_id)}
              accessibilityLabel={m.condominio?.nome ?? 'Condomínio'}
              compact
              style={
                ativo
                  ? {
                      backgroundColor: palette.primarySoft,
                      borderLeftWidth: 3,
                      borderLeftColor: palette.primary,
                      paddingLeft: spacing.lg - 3,
                    }
                  : undefined
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Ionicons
                  name="business-outline"
                  size={19}
                  color={ativo ? palette.primary : palette.textSubtle}
                  style={{ width: 22, textAlign: 'center' }}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="subtitle" numberOfLines={1}>
                    {m.condominio?.nome ?? 'Condomínio'}
                  </AppText>
                  <Badge label={papelLabel[m.papel]} tone={isGestor(m.papel) ? 'primary' : 'neutral'} />
                </View>
                {ativo ? <Ionicons name="checkmark-circle" size={19} color={palette.primary} /> : null}
              </View>
            </Row>
          );
        })}
      </Panel>

      <View style={{ marginTop: spacing.xxl }}>
        <Button title="Sair da conta" variant="danger" icon="log-out-outline" onPress={signOut} />
      </View>
    </Screen>
  );
}
