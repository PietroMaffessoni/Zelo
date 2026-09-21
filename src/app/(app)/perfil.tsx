import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Acoes, AppHeader, AppText, Avatar, Badge, Button, Input, Panel, Row, Screen, Section, SectionHeader } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { useToast } from '@/lib/toast';
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
  const router = useRouter();
  const confirmar = useConfirm();
  const toast = useToast();
  const {
    user,
    profile,
    contato,
    memberships,
    condominioId,
    selecionarCondominio,
    recarregar,
    signOut,
    alterarSenha,
    excluirConta,
  } = useAuth();
  const { escuro, alternar, palette } = useAppTheme();
  const [nome, setNome] = useState(profile?.nome_completo ?? '');
  const [telefone, setTelefone] = useState(contato?.telefone ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Troca de senha
  const [formSenha, setFormSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirma, setSenhaConfirma] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  const [excluindo, setExcluindo] = useState(false);

  function fecharFormSenha() {
    setFormSenha(false);
    setSenhaAtual('');
    setSenhaNova('');
    setSenhaConfirma('');
    setErroSenha(null);
  }

  async function confirmarTrocaSenha() {
    setErroSenha(null);
    if (!senhaAtual || !senhaNova) return setErroSenha('Preencha a senha atual e a nova.');
    if (senhaNova !== senhaConfirma) return setErroSenha('A confirmação não confere com a nova senha.');

    setTrocandoSenha(true);
    const { error } = await alterarSenha(senhaAtual, senhaNova);
    setTrocandoSenha(false);

    if (error) return setErroSenha(error);
    fecharFormSenha();
    toast.sucesso('Senha alterada ✓');
  }

  /**
   * Exclusão de conta em dois passos: o diálogo explica o que sai e o que
   * permanece, e só então chama a RPC. Se o usuário for o único síndico de algum
   * condomínio, a RPC recusa e devolve a lista — o toast mostra essa mensagem, que
   * já vem pronta do banco.
   */
  async function pedirExclusao() {
    const ok = await confirmar({
      titulo: 'Excluir sua conta?',
      mensagem:
        'Seus dados pessoais e seus vínculos com os condomínios serão apagados e não há como desfazer. ' +
        'Registros da administração que você criou (comunicados, lançamentos, atas) permanecem no condomínio, sem o seu nome.',
      confirmar: 'Excluir conta',
      cancelar: 'Cancelar',
      destrutivo: true,
    });
    if (!ok) return;

    setExcluindo(true);
    const { error } = await excluirConta();
    setExcluindo(false);

    if (error) {
      toast.erro(error);
      return;
    }
    router.replace('/(auth)/login');
  }

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
    // Nome e telefone vivem em tabelas diferentes desde que o contato saiu do
    // perfil público (ver `PerfilContato`). São duas escritas, cada uma com a
    // própria RLS — ambas restritas ao próprio usuário.
    const [{ error: erroPerfil }, { error: erroContato }] = await Promise.all([
      supabase.from('profiles').update({ nome_completo: nome.trim() }).eq('id', user.id),
      supabase
        .from('perfis_contato')
        .upsert({ user_id: user.id, telefone: telefone.trim() || null }, { onConflict: 'user_id' }),
    ]);
    const error = erroPerfil ?? erroContato;
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

      {/* Segurança */}
      <SectionHeader title="Segurança" style={{ marginTop: spacing.xxl }} />
      <Panel>
        <Row onPress={formSenha ? undefined : () => setFormSenha(true)} accessibilityLabel="Alterar senha" compact>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color={palette.textSubtle}
              style={{ width: 22, textAlign: 'center' }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="subtitle">Alterar senha</AppText>
              <AppText variant="caption" color="muted" style={{ marginTop: 2 }}>
                Pede a senha atual para confirmar que é você
              </AppText>
            </View>
            {!formSenha ? <Ionicons name="chevron-forward" size={16} color={palette.textSubtle} /> : null}
          </View>

          {formSenha ? (
            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <Input
                label="Senha atual"
                senha
                value={senhaAtual}
                onChangeText={setSenhaAtual}
                autoComplete="current-password"
                textContentType="password"
              />
              <Input
                label="Nova senha"
                senha
                hint="Mínimo de 8 caracteres"
                value={senhaNova}
                onChangeText={setSenhaNova}
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Input
                label="Repita a nova senha"
                senha
                value={senhaConfirma}
                onChangeText={setSenhaConfirma}
                error={erroSenha ?? undefined}
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={confirmarTrocaSenha}
              />
              <Acoes minimo={130}>
                <Button title="Cancelar" variant="secondary" size="sm" onPress={fecharFormSenha} />
                <Button
                  title="Salvar senha"
                  size="sm"
                  icon="checkmark"
                  loading={trocandoSenha}
                  onPress={confirmarTrocaSenha}
                />
              </Acoes>
            </View>
          ) : null}
        </Row>
      </Panel>

      <Section>
        <Button title="Sair da conta" variant="secondary" icon="log-out-outline" onPress={signOut} />
      </Section>

      {/*
        Zona de risco. Fica no fim da tela, separada por um fio e com o rótulo
        explícito: excluir conta não é uma ação que se ofereça no mesmo nível de
        "sair", e a App Store exige que ela exista e seja encontrável dentro do app.
      */}
      <Section>
        <SectionHeader title="Zona de risco" />
        <Panel padded>
          <AppText variant="subtitle">Excluir minha conta</AppText>
          <AppText variant="caption" color="muted" style={{ marginTop: 4 }}>
            Apaga seus dados pessoais e seus vínculos com os condomínios. Não há como desfazer.
          </AppText>
          <View style={{ marginTop: spacing.md, alignItems: 'flex-start' }}>
            <Button
              title="Excluir minha conta"
              variant="danger"
              size="sm"
              icon="trash-outline"
              fullWidth={false}
              loading={excluindo}
              onPress={pedirExclusao}
            />
          </View>
        </Panel>
      </Section>
    </Screen>
  );
}
