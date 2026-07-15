import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Brand } from '@/components/Brand';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function Cadastro() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar() {
    if (!nome || !email || !senha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await signUp(nome, email, senha);
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
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            icon="lock-closed-outline"
            senha
            value={senha}
            onChangeText={setSenha}
          />

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
