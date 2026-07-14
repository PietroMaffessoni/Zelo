import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { AppHeader, AppText, Avatar, Badge, Button, Card, Divider, Input, Screen } from '@/components/ui';
import { palette, radius, spacing } from '@/constants/theme';
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
  const { escuro, alternar } = useAppTheme();
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
          <Avatar nome={nome || profile?.nome_completo} url={avatar} size={96} />
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 32,
              height: 32,
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
      <AppText variant="subtitle" style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
        Aparência
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        <Pressable
          onPress={alternar}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: palette.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}
          >
            <Ionicons name={escuro ? 'moon' : 'sunny'} size={18} color={palette.primary} />
          </View>
          <AppText style={{ flex: 1 }}>Modo escuro</AppText>
          <Switch value={escuro} onValueChange={alternar} trackColor={{ true: palette.primary, false: palette.borderStrong }} />
        </Pressable>
      </Card>

      {/* Notificações */}
      <AppText variant="subtitle" style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
        Notificações
      </AppText>
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        {CATEGORIAS_NOTIFICACAO.map((c, i) => (
          <View key={c.chave}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
              <AppText style={{ flex: 1 }}>{c.label}</AppText>
              <Switch
                value={profile?.preferencias_notificacao?.[c.chave] ?? true}
                onValueChange={(v) => alternarNotificacao(c.chave, v)}
                trackColor={{ true: palette.primary, false: palette.borderStrong }}
              />
            </View>
          </View>
        ))}
      </Card>

      {/* Meus condomínios */}
      <AppText variant="subtitle" style={{ marginTop: spacing.xxl, marginBottom: spacing.md }}>
        Meus condomínios
      </AppText>
      <View style={{ gap: spacing.md }}>
        {memberships.map((m) => {
          const ativo = m.condominio_id === condominioId;
          return (
            <Card
              key={m.id}
              onPress={() => selecionarCondominio(m.condominio_id)}
              style={ativo ? { borderColor: palette.primary, borderWidth: 2 } : undefined}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.md,
                    backgroundColor: palette.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="business" size={20} color={palette.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle" numberOfLines={1}>{m.condominio?.nome ?? 'Condomínio'}</AppText>
                  <Badge label={papelLabel[m.papel]} tone={isGestor(m.papel) ? 'primary' : 'neutral'} />
                </View>
                {ativo ? <Ionicons name="checkmark-circle" size={22} color={palette.primary} /> : null}
              </View>
            </Card>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <Button title="Sair da conta" variant="danger" icon="log-out-outline" onPress={signOut} />
      </View>
    </Screen>
  );
}
