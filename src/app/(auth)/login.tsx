import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Brand } from '@/components/Brand';
import { AppText, Button, Input, Screen } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';

export default function Login() {
  const router = useRouter();
  const { palette } = useAppTheme();
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
    <Screen maxWidth={400}>
      <View style={{ marginTop: spacing.xxxl, marginBottom: spacing.xxl }}>
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
        <View style={{ gap: spacing.sm }}>
          <Input
            label="Senha"
            placeholder="Sua senha"
            icon="lock-closed-outline"
            senha
            value={senha}
            onChangeText={setSenha}
            onSubmitEditing={entrar}
          />
          <Link href="/(auth)/esqueci-senha" asChild>
            <AppText color="primary" variant="label" style={{ alignSelf: 'flex-end' }}>
              Esqueci minha senha
            </AppText>
          </Link>
        </View>

        {erro ? (
          <View
            style={{
              backgroundColor: palette.dangerSoft,
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.md,
            }}
          >
            <AppText variant="caption" style={{ color: palette.danger }}>
              {erro}
            </AppText>
          </View>
        ) : null}

        <Button title="Entrar" onPress={entrar} loading={carregando} size="lg" />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
          <AppText color="muted" variant="caption">
            Ainda não tem conta?
          </AppText>
          <Link href="/(auth)/cadastro" asChild>
            <AppText color="primary" variant="label">
              Criar conta
            </AppText>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
