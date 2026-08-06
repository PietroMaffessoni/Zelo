import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Brand } from '@/components/Brand';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/theme';

export default function Cadastro() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    if (!nome || !email || !telefone || !senha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (!aceito) {
      setErro('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await signUp(nome, email, senha, telefone);
    if (error) {
      setCarregando(false);
      setErro(error);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setCarregando(false);
    if (data.session) {
      router.replace('/onboarding');
    } else {
      setAviso('Conta criada! Confirme seu e-mail e depois faça login.');
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
          <Brand size="lg" />
        </View>

        <View style={{ gap: spacing.lg }}>
          <AppText variant="heading">Criar conta</AppText>

          <Input label="Nome completo" placeholder="Seu nome" icon="person-outline" value={nome} onChangeText={setNome} />
          <Input
            label="E-mail"
            placeholder="voce@email.com"
            icon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Telefone"
            placeholder="(00) 00000-0000"
            icon="call-outline"
            keyboardType="phone-pad"
            value={telefone}
            onChangeText={setTelefone}
          />
          <Input
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            icon="lock-closed-outline"
            senha
            value={senha}
            onChangeText={setSenha}
          />
          <Input
            label="Confirmar senha"
            placeholder="Repita a senha"
            icon="lock-closed-outline"
            senha
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
          />

          <Pressable
            onPress={() => setAceito((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: radius.sm,
                borderWidth: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: aceito ? palette.primary : palette.border,
                backgroundColor: aceito ? palette.primary : 'transparent',
              }}
            >
              {aceito ? <Ionicons name="checkmark" size={16} color={palette.onPrimary} /> : null}
            </View>
            <AppText variant="label" color="muted" style={{ flex: 1 }}>
              Li e aceito os{' '}
              <AppText variant="label" color="primary" weight="semibold" onPress={() => router.push('/termos')}>
                Termos de Uso
              </AppText>{' '}
              e a{' '}
              <AppText
                variant="label"
                color="primary"
                weight="semibold"
                onPress={() => router.push('/privacidade')}
              >
                Política de Privacidade
              </AppText>
              .
            </AppText>
          </Pressable>

          {erro ? (
            <AppText color="danger" variant="label">
              {erro}
            </AppText>
          ) : null}
          {aviso ? (
            <AppText color="success" variant="label">
              {aviso}
            </AppText>
          ) : null}

          <Button title="Criar conta" onPress={cadastrar} loading={carregando} size="lg" />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            <AppText color="muted">Já tem conta?</AppText>
            <Link href="/(auth)/login" asChild>
              <AppText color="primary" weight="semibold">
                Entrar
              </AppText>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
