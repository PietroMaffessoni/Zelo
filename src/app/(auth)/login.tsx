import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Brand } from '@/components/Brand';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await signIn(email, senha);
    setCarregando(false);
    if (error) setErro(error);
    else router.replace('/');
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: spacing.xxxl, marginBottom: spacing.xl }}>
          <Brand size="lg" tagline />
        </View>

        <View style={{ gap: spacing.lg }}>
          <AppText variant="heading">Entrar</AppText>

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
            placeholder="Sua senha"
            icon="lock-closed-outline"
            senha
            value={senha}
            onChangeText={setSenha}
            onSubmitEditing={entrar}
          />

          {erro ? (
            <AppText color="danger" variant="label">
              {erro}
            </AppText>
          ) : null}

          <Button title="Entrar" onPress={entrar} loading={carregando} size="lg" />

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            <AppText color="muted">Ainda não tem conta?</AppText>
            <Link href="/(auth)/cadastro" asChild>
              <AppText color="primary" weight="semibold">
                Criar conta
              </AppText>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
